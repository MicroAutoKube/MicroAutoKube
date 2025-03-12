"use client";
import { Dialog, Transition } from "@headlessui/react";
import { useState, Fragment } from "react";
import { FaPlus, FaTimes, FaBars, FaExclamationCircle, FaTrash } from "react-icons/fa";

const ClusterModal = ({ isOpen, setIsOpen, createCluster }: any) => {
  const [clusterName, setClusterName] = useState("");
  const [toolInstallation, setToolInstallation] = useState("kubespray");
  const [kubernetesVersion, setKubernetesVersion] = useState("");
  const [containerRuntime, setContainerRuntime] = useState("DOCKER");
  const [containerVersion, setContainerVersion] = useState("");
  const [nodes, setNodes] = useState([
    { id: crypto.randomUUID(), hostname: "", ipAddress: "", role: "MASTER" },
  ]);
  const addNode = () => {
    const newNode = {
      id: crypto.randomUUID(), // Ensure ID is always unique
      hostname: "",
      ipAddress: "",
      role: "WORKER",
    };
    setNodes((prevNodes) => [...prevNodes, newNode]);
  };

  // Remove Node
  const removeNode = (id: string) => {
    if (nodes.length === 1) return;
    setNodes((prevNodes) => prevNodes.filter((node) => node.id !== id));
  };

  // Handle Node Input Changes
  const handleNodeChange = (id: string, key: keyof typeof nodes[0], value: string) => {
    setNodes((prevNodes) =>
      prevNodes.map((node) => (node.id === id ? { ...node, [key]: value } : node))
    );
  };

  // Submit Cluster
  const handleSubmit = async () => {
    await createCluster({ clusterName, kubernetesVersion, containerRuntime, containerVersion, nodes });
    setIsOpen(false);
  };

  // Cancel & Reset
  const handleCancel = () => {
    setIsOpen(false);
    setClusterName("");
    setKubernetesVersion("");
    setContainerRuntime("DOCKER");
    setContainerVersion("");
    setNodes([{ id: "1", hostname: "", ipAddress: "", role: "WORKER" }]);
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-20 " onClose={handleCancel}>
        {/* Overlay */}
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

        {/* Modal Content */}
        <div className="fixed inset-0 flex items-center justify-center ">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="scale-95 opacity-0"
            enterTo="scale-100 opacity-100"
            leave="ease-in duration-200"
            leaveFrom="scale-100 opacity-100"
            leaveTo="scale-95 opacity-0"
          >
            <Dialog.Panel className="bg-gray-900 p-12 rounded-lg shadow-2xl min-w-[50vw] w-96 border border-gray-700">
              {/* Header */}
              <div className="flex justify-between items-center">
                <h2 className="text-white text-lg font-semibold">Create Cluster</h2>
                <button onClick={handleCancel} className="text-gray-400 hover:text-white transition">
                  <FaTimes size={18} />
                </button>
              </div>

              {/* Cluster Name */}
              <input
                className="w-full p-2 mt-4 rounded bg-gray-800 text-white border border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
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

              {/* Nodes Section */}
              <h3 className="text-white mt-6 text-md font-medium">Nodes</h3>

              <div className="mt-3 space-y-3">
                {nodes.map((node, index) => (
                  <div
                    key={node.id}  className="p-2 bg-gray-800 rounded border border-gray-700 flex items-center justify-between"
                  >
                    <div className="flex-1">
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
                    </div>
                    <div className="flex items-center pl-4 pr-2">
                      <button
                        className="text-red-500 hover:text-red-700"
                        onClick={() => removeNode(node.id)}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                )
                )}
              </div>



              <button
                className="mt-4 w-full bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 transition"
                onClick={addNode}
              >
                + Add Node
              </button>

              {/* Actions */}
              <div className="flex justify-end mt-6">
                <button className="bg-gray-500 px-4 py-2 text-white rounded" onClick={handleCancel}>
                  Cancel
                </button>
                <button className="bg-green-500 px-4 py-2 text-white rounded ml-2" onClick={handleSubmit}>
                  Create
                </button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ClusterModal;
