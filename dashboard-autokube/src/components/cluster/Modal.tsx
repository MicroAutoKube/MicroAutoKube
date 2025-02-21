"use client"
import { Dialog, Transition } from "@headlessui/react";
import { useState, Fragment } from "react";

const ClusterModal = ({ isOpen, setIsOpen, createCluster }: any) => {
  const [clusterName, setClusterName] = useState("");
  const [kubernetesVersion, setKubernetesVersion] = useState("");
  const [containerRuntime, setContainerRuntime] = useState("DOCKER");
  const [containerVersion, setContainerVersion] = useState("");
  const [nodes, setNodes] = useState([{ hostname: "", ipAddress: "", role: "WORKER" }]);

  const addNode = () => {
    setNodes([...nodes, { hostname: "", ipAddress: "", role: "WORKER" }]);
  };

  const handleNodeChange = (index: number, key: keyof typeof nodes[0], value: string) => {
    const newNodes = [...nodes];
    newNodes[index][key] = value;
    setNodes(newNodes);
  };

  const handleSubmit = async () => {
    await createCluster({ clusterName, kubernetesVersion, containerRuntime, containerVersion, nodes });
    setIsOpen(false);
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={() => setIsOpen(false)}>
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-gray-900 p-6 rounded-md shadow-lg w-96">
            <h2 className="text-white text-lg font-semibold">Create Cluster</h2>
            <input className="w-full p-2 mt-2 rounded bg-gray-800 text-white" placeholder="Cluster Name" onChange={(e) => setClusterName(e.target.value)} />
            <input className="w-full p-2 mt-2 rounded bg-gray-800 text-white" placeholder="Kubernetes Version" onChange={(e) => setKubernetesVersion(e.target.value)} />
            <select className="w-full p-2 mt-2 rounded bg-gray-800 text-white" onChange={(e) => setContainerRuntime(e.target.value)}>
              <option value="DOCKER">Docker</option>
              <option value="CONTAINERD">Containerd</option>
              <option value="CRI_O">CRI-O</option>
            </select>
            <input className="w-full p-2 mt-2 rounded bg-gray-800 text-white" placeholder="Container Version" onChange={(e) => setContainerVersion(e.target.value)} />

            <h3 className="text-white mt-4">Nodes</h3>
            {nodes.map((node, index) => (
              <div key={index} className="mt-2">
                <input className="w-full p-2 rounded bg-gray-800 text-white" placeholder="Hostname" onChange={(e) => handleNodeChange(index, "hostname", e.target.value)} />
                <input className="w-full p-2 mt-2 rounded bg-gray-800 text-white" placeholder="IP Address" onChange={(e) => handleNodeChange(index, "ipAddress", e.target.value)} />
              </div>
            ))}
            <button className="mt-2 bg-blue-500 text-white px-3 py-1 rounded" onClick={addNode}>+ Add Node</button>

            <div className="flex justify-end mt-4">
              <button className="bg-gray-500 px-4 py-2 text-white rounded" onClick={() => setIsOpen(false)}>Cancel</button>
              <button className="bg-green-500 px-4 py-2 text-white rounded ml-2" onClick={handleSubmit}>Create</button>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ClusterModal;
