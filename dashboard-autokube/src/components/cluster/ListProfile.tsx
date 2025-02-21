"use client"
import React, { useState } from "react";
import ClusterModal from "./Modal";
import { BackgroundLooper } from "@/components/background";

const ListProfile = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const createCluster = async (clusterData: any) => {
    const response = await fetch("/api/clusters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clusterData),
    });

    if (!response.ok) {
      console.error("Failed to create cluster");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="border-2 border-[#696796] rounded-md shadow-md p-12 flex flex-col items-center gap-4 bg-gray-900">
        <button className="bg-blue-500 px-4 py-2 text-white rounded" onClick={() => setIsModalOpen(true)}>+ Create Cluster</button>
      </div>
      <ClusterModal isOpen={isModalOpen} setIsOpen={setIsModalOpen} createCluster={createCluster} />
      <BackgroundLooper />
    </div>
  );
};

export default ListProfile;
