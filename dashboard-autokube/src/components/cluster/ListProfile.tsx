"use client"
import React, { useState } from "react";
import ClusterModal from "./Modal";

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
    <div>

      {/* <button className="bg-blue-500 px-4 py-2 text-white rounded" onClick={() => setIsModalOpen(true)}>+ Create Cluster</button> */}
      <ClusterModal isOpen={isModalOpen} setIsOpen={setIsModalOpen} createCluster={createCluster} />
    </div>
  );
};

export default ListProfile;
