"use client"
import React, { useState } from "react";
import ClusterModal from "./Modal";
import { ClusterPayload } from "@/types/cluster"
import { fileToBase64 } from "@/utils";

const ListProfile = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Corrected createCluster function
  const createCluster = async (clusterData: ClusterPayload) => {
    try {
      // Handle Global SSH Key
      if (clusterData.globalAuth.mode === "ssh_key" && clusterData.globalAuth.sshKey instanceof File) {
        clusterData.globalAuth.sshKey = await fileToBase64(clusterData.globalAuth.sshKey);
      } else {
        clusterData.globalAuth.sshKey = null;
      }

      // Handle Per-Node SSH Keys
      clusterData.nodes = await Promise.all(clusterData.nodes.map(async (node) => {
        if (node.authMode === "ssh_key" && node.sshKey instanceof File) {
          node.sshKey = await fileToBase64(node.sshKey);
        } else {
          node.sshKey = null;
        }
        return node;
      }));

      const response = await fetch("/api/clusters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clusterData),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Failed to create cluster:", error);
        return;
      }

      const result = await response.json();
      console.log("Cluster created successfully:", result);
    } catch (error) {
      console.error("Error creating cluster:", error);
    }
  };

  return (
    <div className="w-full">
      <button className="px-4 py-10 text-white rounded-2xl border-dashed border-2 w-full  text-2xl" onClick={() => setIsModalOpen(true)}>+ Create Cluster</button>
      <ClusterModal isOpen={isModalOpen} setIsOpen={setIsModalOpen} createCluster={createCluster} />
    </div>
  );
};

export default ListProfile;
