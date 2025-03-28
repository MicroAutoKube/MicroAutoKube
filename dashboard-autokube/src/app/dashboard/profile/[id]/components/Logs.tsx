// components/TerminalLog.tsx
import { useTerminalSocket } from "@/hooks/useTerminalSocket";

const TerminalLog = () => {
  const { logs, runScript } = useTerminalSocket();

  return (
    <div>
      <button
        onClick={runScript}
        className="mt-4 flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2 px-6 rounded-md transition"
      >
        Run Script
      </button>

      <div className="bg-black text-green-400 font-mono p-4 rounded h-96 overflow-y-auto whitespace-pre-wrap border border-gray-700 mt-4">
        {logs.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </div>
  );
};

export default TerminalLog;
