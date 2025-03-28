"use client";

import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

export default function TerminalLog({ id: clusterId }: { id: string }) {
  const [logs, setLogs] = useState<string[]>([]);
  const [socket, setSocket] = useState<any>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const s = io({ path: "/api/socket" });
    setSocket(s);

    s.on("log", (msg: string) => {
      setLogs((prev) => [...prev, msg]);
    });

    const handleTrigger = (e: CustomEvent) => {
      const targetId = e.detail;
      if (targetId === clusterId) {
        setLogs([]);
        s.emit("run-script", clusterId);
      }
    };

    window.addEventListener("trigger-run-script", handleTrigger as EventListener);

    return () => {
      s.disconnect();
      window.removeEventListener("trigger-run-script", handleTrigger as EventListener);
    };
  }, [clusterId]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="p-4">
      <div
        ref={terminalRef}
        className="mt-4 bg-black text-green-400 font-mono p-4 rounded h-96 overflow-y-auto whitespace-pre-wrap border border-gray-700 shadow-inner"
      >
        {logs.map((line, idx) => {
          const isError =
            line.includes("stderr") ||
            line.toLowerCase().includes("error") ||
            line.includes("❌");
          const isSuccess = line.includes("✅");
          const lineColor = isError
            ? "text-red-400"
            : isSuccess
            ? "text-green-400"
            : "";

          return (
            <div key={idx} className={lineColor}>
              {line}
            </div>
          );
        })}
      </div>
    </div>
  );
}
