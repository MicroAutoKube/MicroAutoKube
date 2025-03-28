"use client"
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

export const useTerminalSocket = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io("", { path: "/api/socket" });
    setSocket(newSocket);

    newSocket.on("log", (msg: string) => {
      setLogs((prev) => [...prev, msg]);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const runScript = () => {
    socket?.emit("run-script");
  };

  return { logs, runScript };
};
