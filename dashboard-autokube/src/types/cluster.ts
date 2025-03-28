import type { Prisma } from '@prisma/client';

export interface ClusterPayload {
  clusterName: string;
  toolInstallation: string;
  kubernetesVersion: string;
  containerRuntime: string;
  containerVersion: string;
  globalAuth: GlobalAuth;
  nodes: Node[];
}

export interface GlobalAuth {
  mode: string;
  username: string;
  password: string;
  sshKey: File | String | null;
}

export interface Node {
  hostname: string;
  ipAddress: string;
  role: string;
  authMode: string;
  username: string;
  password: string;
  sshKey: File | String | null;
}


export type ClusterProfileWithNodes = Prisma.ClusterProfileGetPayload<{
  include: {
    nodes: true;
    clusterConfig: {
      include: {
        helm: true;
        registry: true;
        metrics: true;
        localPathProvisioner: true;
        k8sCluster: true;
        globalCluster: true;
      };
    };
  };
}>;
