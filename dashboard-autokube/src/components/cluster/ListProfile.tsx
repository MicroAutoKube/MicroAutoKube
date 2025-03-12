"use client"
import React, { useState } from "react";
import ClusterModal from "./Modal";
import { ClusterPayload } from "@/types/cluster"

const ListProfile = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const createCluster = async (clusterData: ClusterPayload) => {

    const response = await fetch("/api/clusters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(clusterData),
    });

    if (!response.ok) {
      console.error("Failed to create cluster");
    }

    console.log(response);
  };

  return (
    <div className="w-full">
      <button className="px-4 py-10 text-white rounded-2xl border-dashed border-2 w-full  text-2xl" onClick={() => setIsModalOpen(true)}>+ Create Cluster</button>
      <ClusterModal isOpen={isModalOpen} setIsOpen={setIsModalOpen} createCluster={createCluster} />
    </div>
  );
};

export default ListProfile;
