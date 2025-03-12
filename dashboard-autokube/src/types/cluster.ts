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
  sshKey: File | null;
}

export interface Node {
  hostname: string;
  ipAddress: string;
  role: string;
  authMode: string;
  username: string;
  password: string;
  sshKey: File | null;
}