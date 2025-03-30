import sys
import requests
import os
import subprocess
from dotenv import load_dotenv
from pathlib import Path

# Load env
env_path = Path(__file__).resolve().parent.parent / "dashboard-autokube" / ".env"
load_dotenv(dotenv_path=env_path)

api_token = os.getenv("INTERNAL_API_TOKEN")
if not api_token:
    print("❌ INTERNAL_API_TOKEN not found in .env!", flush=True)
    sys.exit(1)

# Read CLI args
if len(sys.argv) < 3:
    print("❌ Missing arguments: NEXTAUTH_URL and CLUSTER_ID", flush=True)
    sys.exit(1)

nextauth_url = sys.argv[1].rstrip('/')
cluster_id = sys.argv[2]

print(f"🚀 Application Installer for cluster {cluster_id}", flush=True)

# Fetch cluster data
try:
    headers = { "Authorization": f"Bearer {api_token}" }
    res = requests.get(f"{nextauth_url}/api/clusters/?id={cluster_id}", headers=headers)
    res.raise_for_status()
    cluster_data = res.json()
    print(f"📦 Cluster info fetched", flush=True)
except Exception as e:
    print(f"❌ Failed to fetch cluster info: {e}", flush=True)
    sys.exit(1)

# Check if KubeSphere is enabled
app_config = cluster_data.get("clusterApp", {}).get("kubesphere", {})
if not app_config.get("enabled"):
    print("ℹ️ KubeSphere is not enabled for this cluster. Skipping...", flush=True)
    sys.exit(0)

# Get first MASTER node
nodes = cluster_data.get("nodes", [])
master_node = next((n for n in nodes if n["role"] == "MASTER"), None)

if not master_node:
    print("❌ No MASTER node found to install KubeSphere.", flush=True)
    sys.exit(1)

ip = master_node["ipAddress"]
user = master_node["username"]
auth_type = master_node["authType"]
password = master_node.get("password")

# Helm command as single string (for proper remote shell execution)
helm_cmd = (
    "mkdir -p $HOME/.kube && "
    "sudo -S cp -f /etc/kubernetes/admin.conf $HOME/.kube/config && "
    "sudo chown $(id -u):$(id -g) $HOME/.kube/config && "
    "KUBECONFIG=$HOME/.kube/config helm upgrade --install -n kubesphere-system "
    "--create-namespace ks-core https://charts.kubesphere.io/main/ks-core-1.1.4.tgz "
    "--debug --wait"
)

# Build full SSH command
if auth_type == "PASSWORD":
    if not password:
        print("❌ No password provided for SSH", flush=True)
        sys.exit(1)

    ssh_cmd = [
        "sshpass", "-p", password,
        "ssh", "-tt",
        "-o", "StrictHostKeyChecking=no",
        "-o", "UserKnownHostsFile=/dev/null",
        f"{user}@{ip}",
        f"echo '{password}' | sudo -S bash -c \"{helm_cmd}\""
    ]
elif auth_type == "SSH_KEY":
    ssh_key = master_node.get("sshKey")
    if not ssh_key:
        print("❌ SSH key missing for MASTER node", flush=True)
        sys.exit(1)

    key_path = Path(f"/tmp/{cluster_id}_id_rsa")
    with open(key_path, "w") as f:
        f.write(ssh_key)
    os.chmod(key_path, 0o600)

    ssh_cmd = [
        "ssh", "-tt",
        "-i", str(key_path),
        "-o", "StrictHostKeyChecking=no",
        "-o", "UserKnownHostsFile=/dev/null",
        f"{user}@{ip}",
        f"bash -c \"{helm_cmd}\""
    ]
else:
    print(f"❌ Unsupported auth type: {auth_type}", flush=True)
    sys.exit(1)

# Run it
print(f"🚀 Running KubeSphere install on {ip}...", flush=True)

try:
    result = subprocess.run(ssh_cmd, check=True, capture_output=True, text=True, timeout=300)
    combined_output = result.stdout.strip() + "\n" + result.stderr.strip()
    print(f"✅ KubeSphere installed successfully:\n{combined_output}", flush=True)
    # Update cluster status to ready
    try:
        print("🔄 Marking cluster as ready...", flush=True)
        res = requests.put(
            f"{nextauth_url}/api/clusters/?id={cluster_id}",
            headers={"Authorization": f"Bearer {api_token}"}
        )
        res.raise_for_status()
        print("✅ Cluster status updated to ready", flush=True)
    except Exception as e:
        print(f"❌ Failed to update cluster status: {e}", flush=True)
        sys.exit(1)


except subprocess.CalledProcessError as e:
    print(f"❌ KubeSphere installation failed:\n{e.stderr.strip()}", flush=True)
    sys.exit(1)
