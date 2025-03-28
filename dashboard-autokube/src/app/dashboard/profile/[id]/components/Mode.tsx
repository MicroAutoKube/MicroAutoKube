'use client'
import { useEffect, useState } from "react"
import Menu from "./Menu";
import { toast } from "react-toastify";
import { ClusterProfileWithNodes } from "@/types/cluster";
import Configuration from "./Configuration";

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
    <div className="flex">
      <Menu mode={mode} setMode={setMode} />

    
    { mode === "configuration" && cluster && <Configuration cluster={cluster} />}
      
    </div>
  )
}

export default Mode