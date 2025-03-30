"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ClusterProfileWithNodes } from "@/types/cluster";

interface ProfileProps {
  cluster: ClusterProfileWithNodes;
}

const Profile: React.FC<ProfileProps> = ({ cluster }) => {
  const router = useRouter();
  const [status, setStatus] = useState("Pending");

  const handleClick = () => {
    router.push(`/dashboard/profile/${cluster.id}`);
  };

  const masterNodes = cluster.nodes.filter((node) => node.role === "MASTER");
  const firstMasterIp = masterNodes[0]?.ipAddress;
  const ips = masterNodes.length
    ? masterNodes.map((node) => `${node.ipAddress}:6443`).join(", ")
    : "N/A";

  useEffect(() => {
    if (!firstMasterIp) return;

    // Try to fetch Kubernetes API root
    fetch(`https://${firstMasterIp}:6443`, { method: "GET" })
      .then((res) => {
        if (res.ok) {
          setStatus("Running");
        } else {
          setStatus("Pending");
        }
      })
      .catch(() => {
        setStatus("Pending");
      });
  }, [firstMasterIp]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Running":
        return "text-green-500";
      case "Error":
        return "text-red-500";
      case "Pending":
      default:
        return "text-yellow-400";
    }
  };

  return (
    <div
      className="bg-black/50 rounded-xl p-5 text-white shadow-xl hover:bg-black hover:border-blue-700 border border-white/10 cursor-pointer transition"
      onClick={handleClick}
    >
      <h3 className="text-xl font-bold mb-2">{cluster.name}</h3>
      <p className="text-sm mb-1">IP: {ips}</p>
      <p className={`text-sm font-medium ${getStatusColor(status)}`}>
        ● {status}
      </p>
    </div>
  );
};

export default Profile;
