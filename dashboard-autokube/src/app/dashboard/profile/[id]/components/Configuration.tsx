"use client";
import { ClusterProfileWithNodes } from "@/types/cluster";
import React, { useState } from "react";

const Configuration = ({ cluster }: { cluster: ClusterProfileWithNodes }) => {
  const [helmEnabled, setHelmEnabled] = useState(cluster.clusterConfig?.helm?.enabled ?? false);
  const [registry, setRegistry] = useState({
    enabled: cluster.clusterConfig?.registry?.enabled ?? false,
    namespace: cluster.clusterConfig?.registry?.namespace ?? "kube-system",
    storageClass: cluster.clusterConfig?.registry?.storageClass ?? "",
    diskSize: cluster.clusterConfig?.registry?.diskSize ?? "10Gi",
  });
  const [metrics, setMetrics] = useState({
    enabled: cluster.clusterConfig?.metrics?.enabled ?? false,
    containerPort: cluster.clusterConfig?.metrics?.containerPort ?? 10250,
    kubeletInsecureTls: cluster.clusterConfig?.metrics?.kubeletInsecureTls ?? false,
    metricResolution: cluster.clusterConfig?.metrics?.metricResolution ?? 15,
    hostNetwork: cluster.clusterConfig?.metrics?.hostNetwork ?? false,
    replicas: cluster.clusterConfig?.metrics?.replicas ?? 1,
  });
  const [localPathProvisioner, setLocalPathProvisioner] = useState({
    enabled: cluster.clusterConfig?.localPathProvisioner?.enabled ?? false,
    namespace: cluster.clusterConfig?.localPathProvisioner?.namespace ?? "local-path-storage",
    storageClass: cluster.clusterConfig?.localPathProvisioner?.storageClass ?? "local-path",
    reclaim_policy: cluster.clusterConfig?.localPathProvisioner?.reclaim_policy ?? "Delete",
    claimRoot: cluster.clusterConfig?.localPathProvisioner?.claimRoot ?? "/opt/local-path-provisioner/",
    debug: cluster.clusterConfig?.localPathProvisioner?.debug ?? false,
  });
  const handleSaveConfig = () => {
    const configUpdates = { helmEnabled, registry, metrics, localPathProvisioner };

    console.log("Saving Config:", configUpdates);
    // TODO: Add your API call here to save configuration
  };

  return (
    <div className="flex-1 px-10 py-6 text-white w-full">
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

      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-inner mb-6">
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

      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-inner mb-6">
        <h3 className="text-xl font-semibold mb-4 border-b border-gray-600 pb-2">⚙️ Add-ons Configuration</h3>
        <div className="space-y-4">
          <label className="flex gap-3 flex-col justify-center items-start">
            <input type="checkbox" checked={helmEnabled} onChange={() => setHelmEnabled(!helmEnabled)} />
            Enable Helm
          </label>
          <label className="flex gap-3 flex-col justify-center items-start">
            <input type="checkbox" checked={registry.enabled} onChange={() => setRegistry({ ...registry, enabled: !registry.enabled })} />
            Enable Registry
          </label>

          {registry.enabled && (
            <div className="flex gap-3 items-center">
              <label className="flex gap-3 flex-col justify-center items-start">
                <span className="text-sm text-gray-400">Namespace</span>
                <input
                  className="p-2 bg-gray-900 border border-gray-700 rounded"
                  value={registry.namespace}
                  onChange={(e) => setRegistry({ ...registry, namespace: e.target.value })}
                  placeholder="Namespace"
                />
              </label>
              <label className="flex gap-3 flex-col justify-center items-start">
                <span className="text-sm text-gray-400">Storage Class</span>
                <input
                  className="p-2 bg-gray-900 border border-gray-700 rounded"
                  value={registry.storageClass}
                  onChange={(e) => setRegistry({ ...registry, storageClass: e.target.value })}
                  placeholder="Storage Class"
                />
              </label>
              <label className="flex gap-3 flex-col justify-center items-start">
                <span className="text-sm text-gray-400">Disk Size</span>
                <input
                  className="p-2 bg-gray-900 border border-gray-700 rounded"
                  value={registry.diskSize}
                  onChange={(e) => setRegistry({ ...registry, diskSize: e.target.value })}
                  placeholder="Disk Size"
                />
              </label>
            </div>
          )}

          <label className="flex gap-3 flex-col justify-center items-start">
            <input type="checkbox" checked={metrics.enabled} onChange={() => setMetrics({ ...metrics, enabled: !metrics.enabled })} />
            Enable Metrics
          </label>

          {metrics.enabled && (
            <div className="flex gap-5 items-start">
              <label className="flex gap-3 flex-col justify-center items-start">
                <span className="text-sm text-gray-400">Container Port</span>
                <input
                  className="p-2 bg-gray-900 border border-gray-700 rounded"
                  value={metrics.containerPort}
                  onChange={(e) => setMetrics({ ...metrics, containerPort: Number(e.target.value) })}
                  placeholder="Container Port"
                />
              </label>
              <label className="flex gap-3 flex-col justify-center items-start">
                <span className="text-sm text-gray-400">Kubelet Insecure TLS</span>
                <input
                  type="checkbox"
                  checked={metrics.kubeletInsecureTls}
                  onChange={(e) => setMetrics({ ...metrics, kubeletInsecureTls: e.target.checked })}
                />
              </label>
              <label className="flex gap-3 flex-col justify-center items-start">
                <span className="text-sm text-gray-400">Metric Resolution</span>
                <input
                  className="p-2 bg-gray-900 border border-gray-700 rounded"
                  value={metrics.metricResolution}
                  onChange={(e) => setMetrics({ ...metrics, metricResolution: Number(e.target.value) })}
                  placeholder="Metric Resolution"
                />
              </label>
              <label className="flex gap-3 flex-col justify-center items-start">
                <span className="text-sm text-gray-400">Host Network</span>
                <input
                  type="checkbox"
                  checked={metrics.hostNetwork}
                  onChange={(e) => setMetrics({ ...metrics, hostNetwork: e.target.checked })}
                />
              </label>
              <label className="flex gap-3 flex-col justify-center items-start">
                <span className="text-sm text-gray-400">Replicas</span>
                <input
                  className="p-2 bg-gray-900 border border-gray-700 rounded"
                  value={metrics.replicas}
                  onChange={(e) => setMetrics({ ...metrics, replicas: Number(e.target.value) })}
                  placeholder="Replicas"
                />
              </label>
            </div>
          )}

          <label className="flex gap-3 flex-col justify-center items-start">
            <input type="checkbox" checked={localPathProvisioner.enabled} onChange={() => setLocalPathProvisioner({ ...localPathProvisioner, enabled: !localPathProvisioner.enabled })} />
            Enable Local Path Provisioner
          </label>

          {localPathProvisioner.enabled && (
            <div className="flex gap-3 items-center">
              <label className="flex gap-3 flex-col justify-center items-start">
                <span className="text-sm text-gray-400">Namespace</span>
                <input
                  className="p-2 bg-gray-900 border border-gray-700 rounded"
                  value={localPathProvisioner.namespace}
                  onChange={(e) => setLocalPathProvisioner({ ...localPathProvisioner, namespace: e.target.value })}
                  placeholder="Namespace"
                />
              </label>
              <label className="flex gap-3 flex-col justify-center items-start">
                <span className="text-sm text-gray-400">Storage Class</span>
                <input
                  className="p-2 bg-gray-900 border border-gray-700 rounded"
                  value={localPathProvisioner.storageClass}
                  onChange={(e) => setLocalPathProvisioner({ ...localPathProvisioner, storageClass: e.target.value })}
                  placeholder="Storage Class"
                />
              </label>
              <label className="flex gap-3 flex-col justify-center items-start">
                <span className="text-sm text-gray-400">Reclaim Policy</span>
                <input
                  className="p-2 bg-gray-900 border border-gray-700 rounded"
                  value={localPathProvisioner.reclaim_policy}
                  onChange={(e) => setLocalPathProvisioner({ ...localPathProvisioner, reclaim_policy: e.target.value })}
                  placeholder="Reclaim Policy"
                />
              </label>
              <label className="flex gap-3 flex-col justify-center items-start">
                <span className="text-sm text-gray-400">Claim Root</span>
                <input
                  className="p-2 bg-gray-900 border border-gray-700 rounded"
                  value={localPathProvisioner.claimRoot}
                  onChange={(e) => setLocalPathProvisioner({ ...localPathProvisioner, claimRoot: e.target.value })}
                  placeholder="Claim Root"
                />
              </label>
            </div>
          )}




        </div>
      </div>

      <button
        onClick={handleSaveConfig}
        className="mt-4 bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-md transition"
      >
        Save Configuration
      </button>
    </div>
  );
};

export default Configuration;