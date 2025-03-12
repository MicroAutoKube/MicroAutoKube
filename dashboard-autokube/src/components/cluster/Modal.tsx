"use client";
import { ClusterPayload } from "@/types/cluster";
import { Dialog, Transition } from "@headlessui/react";
import { useState, Fragment } from "react";
import { FaPlus, FaTimes, FaExclamationCircle, FaTrash } from "react-icons/fa";

interface ClusterModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  createCluster: (payload: ClusterPayload) => Promise<void>;
}



const ClusterModal = ({ isOpen, setIsOpen, createCluster }: ClusterModalProps) => {
  const [clusterName, setClusterName] = useState("");
  const [toolInstallation, setToolInstallation] = useState("kubespray");
  const [kubernetesVersion, setKubernetesVersion] = useState("");
  const [containerRuntime, setContainerRuntime] = useState("DOCKER");
  const [containerVersion, setContainerVersion] = useState("");
  const [globalAuthMode, setGlobalAuthMode] = useState("username_password");
  const [globalUsername, setGlobalUsername] = useState("");
  const [globalPassword, setGlobalPassword] = useState("");
  const [globalSSHKey, setGlobalSSHKey] = useState<File | null>(null);

  const [nodes, setNodes] = useState([
    {
      id: crypto.randomUUID(),
      hostname: "",
      ipAddress: "",
      role: "MASTER",
      authMode: "default",
      username: "",
      password: "",
      sshKey: null as File | null,
    },
  ]);

  const addNode = () => {
    setNodes((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        hostname: "",
        ipAddress: "",
        role: "WORKER",
        authMode: "default",
        username: "",
        password: "",
        sshKey: null,
      },
    ]);
  };

  const removeNode = (id: string) => {
    if (nodes.length === 1) return;
    setNodes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleNodeChange = (id: string, key: string, value: any) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, [key]: value } : n))
    );
  };

  const handleSubmit = async () => {
    const payload = {
      clusterName,
      toolInstallation,
      kubernetesVersion,
      containerRuntime,
      containerVersion,
      globalAuth: {
        mode: globalAuthMode,
        username: globalUsername,
        password: globalPassword,
        sshKey: globalSSHKey,
      },
      nodes: nodes.map((node) => ({
        hostname: node.hostname,
        ipAddress: node.ipAddress,
        role: node.role,
        authMode: node.authMode,
        username: node.username,
        password: node.password,
        sshKey: node.sshKey,
      })),
    };

    await createCluster(payload);
    handleCancel();
  };

  const handleCancel = () => {
    setClusterName("");
    setKubernetesVersion("");
    setContainerRuntime("DOCKER");
    setContainerVersion("");
    setGlobalAuthMode("username_password");
    setGlobalUsername("");
    setGlobalPassword("");
    setGlobalSSHKey(null);
    setNodes([
      {
        id: crypto.randomUUID(),
        hostname: "",
        ipAddress: "",
        role: "MASTER",
        authMode: "default",
        username: "",
        password: "",
        sshKey: null,
      },
    ]);
    setIsOpen(false);
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-20" onClose={handleCancel}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-md" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="scale-95 opacity-0"
            enterTo="scale-100 opacity-100"
            leave="ease-in duration-200"
            leaveFrom="scale-100 opacity-100"
            leaveTo="scale-95 opacity-0"
          >
            <Dialog.Panel className="bg-gray-900 p-10 rounded-lg shadow-2xl w-[60vw] border border-gray-700 overflow-auto max-h-[90vh]">
              <div className="flex justify-between items-center">
                <h2 className="text-white text-xl font-semibold">Create Cluster</h2>
                <button onClick={handleCancel} className="text-gray-400 hover:text-white">
                  <FaTimes size={18} />
                </button>
              </div>

              <input
                className="w-full p-2 mt-4 rounded bg-gray-800 text-white border border-gray-700"
                placeholder="Cluster Name"
                value={clusterName}
                onChange={(e) => setClusterName(e.target.value)}
              />
              {/* Tool Installation Selection */}
              <div className="relative">
                <select
                  className="w-full p-2 mt-4 rounded bg-gray-800 text-white border border-gray-700"
                  value={toolInstallation}
                  onChange={(e) => setToolInstallation(e.target.value)}
                >
                  <option value="kubespray">Kubespray</option>
                  <option value="kubekey" disabled>Kubekey (Coming Soon)</option>
                </select>
                <div className="absolute right-5 top-5 text-yellow-400">
                  <FaExclamationCircle title="Kubekey is coming soon!" />
                </div>
              </div>

              {/* Kubernetes Version */}
              <input
                className="w-full p-2 mt-4 rounded bg-gray-800 text-white border border-gray-700"
                placeholder="Kubernetes Version"
                value={kubernetesVersion}
                onChange={(e) => setKubernetesVersion(e.target.value)}
              />

              {/* Container Runtime Selection */}
              <select
                className="w-full p-2 mt-4 rounded bg-gray-800 text-white border border-gray-700"
                value={containerRuntime}
                onChange={(e) => setContainerRuntime(e.target.value)}
              >
                <option value="DOCKER">Docker</option>
                <option value="CONTAINERD">Containerd</option>
                <option value="CRI_O">CRI-O</option>
              </select>

              {/* Container Version */}
              <input
                className="w-full p-2 mt-4 rounded bg-gray-800 text-white border border-gray-700"
                placeholder="Container Version"
                value={containerVersion}
                onChange={(e) => setContainerVersion(e.target.value)}
              />

              {/* Global Authentication */}
              <div className="mt-4">
                <label className="text-white">Global Authentication Mode</label>
                <select
                  className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700 mt-1"
                  value={globalAuthMode}
                  onChange={(e) => setGlobalAuthMode(e.target.value)}
                >
                  <option value="username_password">Username & Password</option>
                  <option value="ssh_key">SSH Key</option>
                </select>

                {globalAuthMode === "username_password" && (
                  <>
                    <input
                      className="w-full p-2 mt-2 rounded bg-gray-800 text-white border border-gray-700"
                      placeholder="Global Username"
                      value={globalUsername}
                      onChange={(e) => setGlobalUsername(e.target.value)}
                    />
                    <input
                      type="password"
                      className="w-full p-2 mt-2 rounded bg-gray-800 text-white border border-gray-700"
                      placeholder="Global Password"
                      value={globalPassword}
                      onChange={(e) => setGlobalPassword(e.target.value)}
                    />
                  </>
                )}

                {globalAuthMode === "ssh_key" && (
                  <input
                    type="file"
                    className="w-full p-2 mt-2 bg-gray-800 text-white border border-gray-700 rounded"
                    onChange={(e) => setGlobalSSHKey(e.target.files?.[0] || null)}
                  />
                )}
              </div>

              {/* Nodes */}
              <h3 className="text-white mt-6 font-medium">Nodes</h3>
              {nodes.map((node, idx) => (
                <div key={node.id} className="mt-3 bg-gray-800 rounded p-4 relative">
                  <div className="flex flex-col mr-10">
                    <input
                      className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600"
                      placeholder="Hostname"
                      value={node.hostname}
                      onChange={(e) => handleNodeChange(node.id, "hostname", e.target.value)}
                    />
                    <input
                      className="w-full p-2 mt-2 rounded bg-gray-700 text-white border border-gray-600"
                      placeholder="IP Address"
                      value={node.ipAddress}
                      onChange={(e) => handleNodeChange(node.id, "ipAddress", e.target.value)}
                    />
                    <select
                      className="w-full p-2 mt-2 rounded bg-gray-700 text-white border border-gray-600"
                      value={node.role}
                      onChange={(e) => handleNodeChange(node.id, "role", e.target.value)}
                    >
                      <option value="MASTER">Master</option>
                      <option value="WORKER">Worker</option>
                    </select>

                    {/* Node Auth Override */}
                    <select
                      className="w-full p-2 mt-2 rounded bg-gray-700 text-white border border-gray-600"
                      value={node.authMode}
                      onChange={(e) => handleNodeChange(node.id, "authMode", e.target.value)}
                    >
                      <option value="default">Default (Global)</option>
                      <option value="username_password">Custom Username & Password</option>
                      <option value="ssh_key">Custom SSH Key</option>
                    </select>


                    {node.authMode === "username_password" && (
                      <>
                        <input
                          className="w-full p-2 mt-2 rounded bg-gray-800 text-white border border-gray-700"
                          placeholder="Global Username"
                          value={globalUsername}
                          onChange={(e) => setGlobalUsername(e.target.value)}
                        />
                        <input
                          type="password"
                          className="w-full p-2 mt-2 rounded bg-gray-800 text-white border border-gray-700"
                          placeholder="Global Password"
                          value={globalPassword}
                          onChange={(e) => setGlobalPassword(e.target.value)}
                        />
                      </>
                    )}

                    {node.authMode === "ssh_key" && (
                      <input
                        type="file"
                        className="w-full p-2 mt-2 bg-gray-800 text-white border border-gray-700 rounded"
                        onChange={(e) => setGlobalSSHKey(e.target.files?.[0] || null)}
                      />
                    )}

                  </div>
                  <button className="absolute top-4 right-4 text-red-400" onClick={() => removeNode(node.id)}>
                    <FaTrash />
                  </button>
                </div>
              ))}

              <button className="mt-4 bg-blue-500 text-white p-2 rounded w-full" onClick={addNode}>
                + Add Node
              </button>

              <div className="flex justify-end mt-6 space-x-2">
                <button className="bg-gray-500 text-white px-4 py-2 rounded" onClick={handleCancel}>Cancel</button>
                <button className="bg-green-500 text-white px-4 py-2 rounded" onClick={handleSubmit}>Create</button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ClusterModal;
