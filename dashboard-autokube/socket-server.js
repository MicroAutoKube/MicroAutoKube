const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const { Server } = require('socket.io');

let io = null;
const runningProcesses = {}; // { clusterId: { py, ansible, app } }

require('dotenv').config({ path: path.resolve(__dirname, '../dashboard-autokube/.env') });

function initializeSocket(server) {
  if (io) return io;

  io = new Server(server, {
    path: '/api/socket',
    cors: {
      origin: [
        process.env.NEXTAUTH_URL,
        `http://${process.env.SERVER_IP}`,
        'http://localhost',
        'http://localhost:3000',
      ],
      methods: ['GET', 'POST'],
    },
  });

  function logAndEmit(clusterId, msg) {
    const clean = msg.toString().replace(/\r?\n$/, '');
    const logFilePath = path.join(__dirname, '..', 'logs', `deploy-${clusterId}.log`);
    fs.mkdirSync(path.dirname(logFilePath), { recursive: true });
    fs.appendFileSync(logFilePath, clean + '\n');
    io.to(clusterId).emit('log', clean);
  }

  function attachProcessListeners(clusterId, proc, prefix) {
    if (proc.__listenersAttached) return;

    proc.stdout.on('data', (data) => {
      logAndEmit(clusterId, `[${prefix}] ${data}`);
    });

    proc.stderr.on('data', (data) => {
      logAndEmit(clusterId, `[${prefix} stderr] ${data}`);
    });

    proc.__listenersAttached = true;
  }

  io.on('connection', (socket) => {
    console.log('✅ Client connected');

    socket.on('request-logs', (clusterId) => {
      const logFilePath = path.join(__dirname, '..', 'logs', `deploy-${clusterId}.log`);
      if (fs.existsSync(logFilePath)) {
        const logs = fs.readFileSync(logFilePath, 'utf8').split('\n').filter(Boolean);
        logs.forEach((line) => socket.emit('log', line));
      }

      socket.join(clusterId);
      socket.data.clusterId = clusterId;

      const running = runningProcesses[clusterId];
      if (running?.py) socket.emit('log', '📡 Re-attached to running Python script...');
      if (running?.ansible) socket.emit('log', '📡 Re-attached to running Ansible...');
      if (running?.app) socket.emit('log', '📡 Re-attached to running application...');
    });

    socket.on('run-script', (clusterId) => {
      if (!clusterId) return;

      if (runningProcesses[clusterId]) {
        socket.emit('log', `⚠️ Deployment already running for cluster ${clusterId}`);
        return;
      }

      logAndEmit(clusterId, '📦 Starting deployment...');

      const basePath = path.resolve(__dirname, '../scripts');
      const venvPath = path.join(basePath, 'venv');
      const pythonPath = fs.existsSync(path.join(venvPath, 'bin/python3'))
        ? path.join(venvPath, 'bin/python3')
        : path.join(venvPath, 'bin/python');
      const pipPath = path.join(venvPath, 'bin/pip3');
      const requirementsPath = path.join(basePath, 'kubespray/requirements.txt');

      if (!fs.existsSync(venvPath)) {
        logAndEmit(clusterId, '📦 Creating virtual environment...');
        const venv = spawn('python3', ['-m', 'venv', venvPath]);
        attachProcessListeners(clusterId, venv, 'venv');

        venv.on('close', (code) => {
          if (code !== 0) {
            logAndEmit(clusterId, `❌ Failed to create venv (code ${code})`);
            delete runningProcesses[clusterId];
            return;
          }
          installDeps();
        });
      } else {
        logAndEmit(clusterId, '✅ Virtual environment exists.');
        installDeps();
      }

      function installDeps() {
        if (!fs.existsSync(pipPath)) {
          logAndEmit(clusterId, '⚠️ pip not found. Installing using ensurepip...');
          const ensure = spawn(pythonPath, ['-m', 'ensurepip']);
          attachProcessListeners(clusterId, ensure, 'ensurepip');

          ensure.on('close', (code) => {
            if (code !== 0) {
              logAndEmit(clusterId, `❌ ensurepip failed (code ${code})`);
              delete runningProcesses[clusterId];
              return;
            }

            const upgrade = spawn(pipPath, ['install', '--upgrade', 'pip']);
            attachProcessListeners(clusterId, upgrade, 'pip-upgrade');

            upgrade.on('close', () => installDeps());
          });

          return;
        }

        const pip = spawn(pipPath, ['install', '-r', requirementsPath]);
        attachProcessListeners(clusterId, pip, 'pip');

        pip.on('close', (code) => {
          if (code !== 0) {
            logAndEmit(clusterId, `❌ Pip install failed (code ${code})`);
            delete runningProcesses[clusterId];
            return;
          }

          logAndEmit(clusterId, '📦 Dependencies installed.');
          runPython();
        });
      }

      function runPython() {
        const pyScript = path.resolve(__dirname, '../scripts/myscript.py');
        const nextAuthUrl = process.env.NEXTAUTH_URL;
        const python = path.join(venvPath, 'bin/python');

        const py = spawn(python, [pyScript, nextAuthUrl, clusterId]);
        runningProcesses[clusterId] = { py };

        attachProcessListeners(clusterId, py, 'python');
        logAndEmit(clusterId, `🐍 Python script started: ${python} ${pyScript}`);

        py.on('error', (err) => {
          logAndEmit(clusterId, `❌ Failed to start Python process: ${err.message}`);
          delete runningProcesses[clusterId];
        });

        py.on('close', (code) => {
          logAndEmit(clusterId, `🐍 Python script finished (code ${code})`);
          runAnsible();
        });
      }

      function runAnsible() {
        logAndEmit(clusterId, `🧰 Starting Ansible...`);

        const ansiblePlaybookPath = path.join(venvPath, 'bin/ansible-playbook');
        const inventoryPath = path.join('inventory', clusterId, 'hosts.yaml');
        const playbookPath = 'cluster.yml';
        const workingDir = path.join(basePath, 'kubespray');

        const ansible = spawn(
          ansiblePlaybookPath,
          ['-i', inventoryPath, playbookPath, '-b', '-v'],
          {
            cwd: workingDir,
          },
        );

        runningProcesses[clusterId].ansible = ansible;
        attachProcessListeners(clusterId, ansible, 'ansible');

        ansible.on('error', (err) => {
          logAndEmit(clusterId, `❌ Failed to start Ansible: ${err.message}`);
        });

        ansible.on('close', (code) => {
          logAndEmit(clusterId, `✅ Ansible finished (code ${code})`);
          runInstallApp();
        });
      }

      function runInstallApp() {
        logAndEmit(clusterId, `🧰 Starting Install Application Script...`);

        const appScript = path.resolve(__dirname, '../scripts/application.py');
        const python = path.join(venvPath, 'bin/python');
        const app = spawn(python, [appScript, process.env.NEXTAUTH_URL, clusterId]);

        runningProcesses[clusterId].app = app;
        attachProcessListeners(clusterId, app, 'python');

        app.on('error', (err) => {
          logAndEmit(clusterId, `❌ Failed to start App installer: ${err.message}`);
        });

        app.on('close', (code) => {
          logAndEmit(clusterId, `🐍 Application installer finished (code ${code})`);
          delete runningProcesses[clusterId];
        });
      }
    });

    socket.on('kill-script', (clusterId) => {
      const processes = runningProcesses[clusterId];
      if (!processes) {
        socket.emit('log', `⚠️ No running script for cluster ${clusterId}`);
        return;
      }

      if (processes.py && !processes.py.killed) {
        processes.py.kill();
        socket.emit('log', `🛑 Python script killed`);
      }

      if (processes.ansible && !processes.ansible.killed) {
        processes.ansible.kill();
        socket.emit('log', `🛑 Ansible process killed`);
      }

      if (processes.app && !processes.app.killed) {
        processes.app.kill();
        socket.emit('log', `🛑 App installer killed`);
      }

      delete runningProcesses[clusterId];
    });

    socket.on('clear-logs', (clusterId) => {
      const logFilePath = path.join(__dirname, '..', 'logs', `deploy-${clusterId}.log`);
      try {
        if (fs.existsSync(logFilePath)) {
          fs.unlinkSync(logFilePath);
          socket.emit('log', `🧹 Logs cleared for cluster ${clusterId}`);
        } else {
          socket.emit('log', `⚠️ No logs to clear for cluster ${clusterId}`);
        }
      } catch (err) {
        socket.emit('log', `❌ Failed to clear logs: ${err.message}`);
      }
    });

    socket.on('disconnect', () => {
      const cluster = socket.data?.clusterId;
      if (cluster) console.log(`❌ Disconnected from cluster ${cluster}`);
      else console.log('❌ Client disconnected');
    });
  });

  return io;
}

module.exports = { initializeSocket };
