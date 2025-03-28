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

        // 👇 fetch logs if file exists
        s.emit("request-logs", clusterId);

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
    }, []);

    useEffect(() => {
        const terminal = terminalRef.current;
        if (!terminal) return;

        requestAnimationFrame(() => {
            terminal.scrollTop = terminal.scrollHeight;
        });
    }, [logs]);


    return (
        <div className="p-4">
            <div
                ref={terminalRef}
                className="mt-4 bg-black w-full  text-green-400 font-mono p-4 rounded h-[50vh] overflow-y-auto whitespace-pre-wrap border border-gray-700 shadow-inner"
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
            <button
                onClick={() => socket?.emit("kill-script", clusterId)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 mt-10 py-2 rounded"
            >
                Kill Script
            </button>
        </div>
    );
}
