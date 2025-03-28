'use client'
import { useEffect, useState } from "react"
import Menu from "./Menu";
import { toast } from "react-toastify";
import { ClusterProfileWithNodes } from "@/types/cluster";
import Configuration from "./Configuration";
import TerminalLog from "./Logs";

const Mode = ({ id }: { id: string }) => {
  const [mode, setMode] = useState("configuration");

  const [cluster, setCluster] = useState<ClusterProfileWithNodes>();

  const getClusterInfo = async () => {
      try {
        const response = await fetch(`/api/clusters?id=${id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch clusters");
        }
        const data = await response.json();
        setCluster(data);
      } catch (error) {
        console.error("Error fetching clusters:", error);
        toast.error("❌ Error fetching cluster list");
      }
    };
  
    
  
    useEffect(() => {
      getClusterInfo();
    }, []);

  return (
    <div className="grid grid-cols-7 min-h-screen">
    {/* Sidebar Menu */}
    <div className="col-span-1">
      <Menu mode={mode} setMode={setMode} />
    </div>
  
    {/* Main Content */}
    <div className="col-span-6">
      {mode === "configuration" && cluster && (
        <Configuration cluster={cluster} setMode={setMode} />

      )}
      { mode === "logs" && cluster && (
        <TerminalLog id={id}/>
      )
      }
    </div>
  </div>
  
  )
}

export default Mode