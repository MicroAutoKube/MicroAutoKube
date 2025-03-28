"use client";
import { ClusterProfileWithNodes } from "@/types/cluster";
import React from "react";

const Configuration = ({ cluster }: { cluster: ClusterProfileWithNodes }) => {
  return (
    <div className="flex-1 px-10 py-6 text-white">
      <h2 className="text-3xl font-bold mb-6">🛠️ Cluster Configuration</h2>

      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-inner mb-6">
        <h3 className="text-xl font-semibold mb-4 border-b border-gray-600 pb-2">General Info</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
          <p><span className="text-gray-400">Name:</span> {cluster.name}</p>
          <p><span className="text-gray-400">Kubernetes Version:</span> {cluster.kubernetesVersion}</p>
          <p><span className="text-gray-400">Container Runtime:</span> {cluster.containerRuntime}</p>
          <p><span className="text-gray-400">Container Version:</span> {cluster.containerVersion}</p>
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-inner">
        <h3 className="text-xl font-semibold mb-4 border-b border-gray-600 pb-2">🔗 Nodes</h3>
        {cluster.nodes.length === 0 ? (
          <p className="text-gray-400">No nodes found.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cluster.nodes.map((node) => (
              <div
                key={node.id}
                className="bg-gray-900 border border-gray-700 rounded-lg p-4 hover:border-blue-500 transition"
              >
                <p><span className="text-gray-400">Hostname:</span> {node.hostname}</p>
                <p><span className="text-gray-400">IP Address:</span> {node.ipAddress}</p>
                <p><span className="text-gray-400">Role:</span> {node.role}</p>
                <p><span className="text-gray-400">Auth Type:</span> {node.authType}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Configuration;
