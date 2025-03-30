"use client";

import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

export default function TerminalLog({ id: clusterId }: { id: string }) {
    const [logs, setLogs] = useState<string[]>([]);
    const [socket, setSocket] = useState<any>(null);
    const [followScroll, setFollowScroll] = useState(true);
    const terminalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const s = io({
            path: "/api/socket",
        });
        setSocket(s);

        s.on("log", (msg: string) => {
            setLogs((prev) => [...prev, msg]);
        });

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
            window.removeEventListener("trigger-run-script", handleTrigger as EventListener);
            s.disconnect();
        };
    }, []);

    useEffect(() => {
        if (!followScroll) return;
        const terminal = terminalRef.current;
        if (!terminal) return;

        requestAnimationFrame(() => {
            terminal.scrollTop = terminal.scrollHeight;
        });
    }, [logs, followScroll]);

    return (
        <div className="p-4">
            <div
                ref={terminalRef}
                className="mt-4 bg-black w-full text-green-400 font-mono p-4 rounded h-[50vh] overflow-y-auto whitespace-pre-wrap border border-gray-700 shadow-inner"
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

            <div className="flex flex-wrap gap-4 mt-10">
            <button
                    onClick={() => {
                        const blob = new Blob([logs.join("\n")], { type: "text/plain;charset=utf-8" });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `cluster-${clusterId}-logs.txt`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        window.URL.revokeObjectURL(url);
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                >
                    📥 Download Logs
                </button>
                
                <button
                    onClick={() => setFollowScroll((prev) => !prev)}
                    className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded"
                >
                    {followScroll ? "🛑 Stop Scroll" : "📜 Follow Scroll"}
                </button>

                <button
                    onClick={() => socket?.emit("kill-script", clusterId)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                >
                    Kill Script
                </button>

                <button
                    onClick={() => {
                        socket?.emit("clear-logs", clusterId);
                        setLogs([]);
                    }}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
                >
                    Clear Logs
                </button>

                



            </div>
        </div>
    );
}
