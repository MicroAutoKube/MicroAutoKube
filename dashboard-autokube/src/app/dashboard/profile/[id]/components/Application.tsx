import { ClusterProfileWithNodes } from '@/types/cluster';
import { ExternalLink } from 'lucide-react';
import Image from 'next/image';

const appList = [
  { key: 'prometheus', name: 'Prometheus', port: 30100, icon: '/icons/prometheus.svg' },
  { key: 'grafana', name: 'Grafana', port: 30300, icon: '/icons/grafana.svg' },
  { key: 'percona', name: 'Percona Everest', port: 30540, icon: '/icons/percona.svg' },
  { key: 'rancher', name: 'Rancher', port: 30240, icon: '/icons/rancher.svg' },
  { key: 'kubesphere', name: 'Kube Sphere', port: 30880, icon: '/icons/kubesphere.png' },
  { key: 'istio', name: 'Istio', port: 30654, icon: '/icons/istio.svg' },
  { key: 'jenkins', name: 'Jenkins', port: 31567, icon: '/icons/jenkins.svg' },
  { key: 'minio', name: 'Minio', port: 31234, icon: '/icons/minio.svg' },
  { key: 'argocd', name: 'ArgoCd', port: 30585, icon: '/icons/argocd.svg' },
];

const Application = ({ cluster }: { cluster: ClusterProfileWithNodes }) => {
  if (!cluster.ready) {
    return <p className="text-center text-gray-500 text-3xl font-bold mt-8">⏳ Cluster is not ready yet...</p>;
  }

  const master = cluster.nodes.find(n => n.role === 'MASTER');
  const ip = master?.ipAddress || '0.0.0.0';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 p-6">
      {appList.filter(app => app.key === "kubesphere" && cluster.clusterApp?.kubesphere?.enabled).map(app => {
        const url = `http://${ip}:${app.port}`;
        return (
          <div
            key={app.key}
            className="rounded-2xl shadow-md bg-gradient-to-b from-black/40 to-black/70 p-4 text-white flex flex-col items-center"
          >
            <Image src={app.icon} alt={app.name} width={48} height={48} className="mb-2" />
            <div className="text-lg font-semibold">{app.name}</div>
            <div className="text-sm text-gray-300 mb-2">IP : {ip}:{app.port}</div>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 rounded-full mt-auto transition"
            >
              Open
            </a>
          </div>
        );
      })}
    </div>
  );
};

export default Application;
