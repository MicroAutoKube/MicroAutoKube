"use client"
import React, { useState, useEffect } from "react";
import ClusterModal from "./Modal";
import { ClusterPayload } from "@/types/cluster"
import { fileToBase64 } from "@/utils";
import Image from "next/image"
import type { ClusterProfileWithNodes } from "@/types/cluster";
import Profile from "./Profile";
import { toast } from "react-toastify";


const ListProfile = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [clusters, setClusters] = useState<ClusterProfileWithNodes[]>([]);


  const createCluster = async (clusterData: ClusterPayload): Promise<boolean> => {
    try {
      // Convert global SSH key
      if (clusterData.globalAuth.mode === "ssh_key" && clusterData.globalAuth.sshKey instanceof File) {
        clusterData.globalAuth.sshKey = await fileToBase64(clusterData.globalAuth.sshKey);
      } else {
        clusterData.globalAuth.sshKey = null;
      }

      // Convert per-node SSH keys
      clusterData.nodes = await Promise.all(
        clusterData.nodes.map(async (node) => {
          if (node.authMode === "ssh_key" && node.sshKey instanceof File) {
            node.sshKey = await fileToBase64(node.sshKey);
          } else {
            node.sshKey = null;
          }
          return node;
        })
      );

      const response = await fetch("/api/clusters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clusterData),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Failed to create cluster:", error);
        toast.error(`❌ Failed to create cluster: ${error.error || "Unknown error"}`);
        return false;
      }

      const result = await response.json();
      console.log("Cluster created successfully:", result);
      toast.success("✅ Cluster created successfully!");
      getListCluster(); // refresh list
      return true;
    } catch (error) {
      console.error("Error creating cluster:", error);
      toast.error("❌ Error creating cluster");
      return false;
    }

  };

  const getListCluster = async () => {
    try {
      const response = await fetch("/api/clusters");
      if (!response.ok) {
        throw new Error("Failed to fetch clusters");
      }
      const data = await response.json();
      setClusters(data);
    } catch (error) {
      console.error("Error fetching clusters:", error);
      toast.error("❌ Error fetching cluster list");
    }
  };


  useEffect(() => {
    getListCluster();
  }, []);

  return (
    <div className="w-full">
      <button className="px-4 py-10 text-white rounded-2xl border-dashed border-2 w-full hover:bg-gray-700 text-4xl flex justify-center gap-5 font-bold" onClick={() => setIsModalOpen(true)}><Image src="/icons/plus.svg" alt="Plus Icon" width={30} height={30} /> Create Cluster</button>
      <div className="grid grid-cols-3 gap-6 mt-10">
        {clusters.map((cluster) => (
          <Profile key={cluster.id} cluster={cluster} />
        ))}
      </div>

      <ClusterModal isOpen={isModalOpen} setIsOpen={setIsModalOpen} createCluster={createCluster} />
      
    </div>
  );
};

export default ListProfile;
