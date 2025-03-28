import { zod as z } from "@/lib/client"
const baseNodeSchema = z.object({
    hostname: z.string().min(1, "Hostname is required"),
    ipAddress: z.string().regex(
      /^(25[0-5]|2[0-4][0-9]|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4][0-9]|1\d{2}|[1-9]?\d)){3}$/,
      "Invalid IP address"
    ),
    role: z.enum(["MASTER", "WORKER"]),
  });
  
  // Discriminated union based on authMode
  const nodeSchema = z.discriminatedUnion("authMode", [
    z.object({
      authMode: z.literal("default"),
      username: z.string().optional(),
      password: z.string().optional(),
      sshKey: z.any().optional(),
    }),
    z.object({
      authMode: z.literal("username_password"),
      username: z.string().min(1, "Username is required"),
      password: z.string().min(1, "Password is required"),
      sshKey: z.any().optional(),
    }),
    z.object({
      authMode: z.literal("ssh_key"),
      sshKey: z.any().refine((file) => file instanceof File || typeof file === "string", {
        message: "SSH Key is required",
      }),
      username: z.string().optional(),
      password: z.string().optional(),
    }),
  ]);
  const globalAuthSchema = z.discriminatedUnion("mode", [
    z.object({
      mode: z.literal("username_password"),
      username: z.string().min(1, "Global username is required"),
      password: z.string().min(1, "Global password is required"),
      sshKey: z.any().optional(),
    }),
    z.object({
      mode: z.literal("ssh_key"),
      sshKey: z.any().refine((file) => file instanceof File || typeof file === "string", {
        message: "SSH Key is required",
      }),
      username: z.string().optional(),
      password: z.string().optional(),
    }),
  ]);
  
  

  export const fullNodeSchema = baseNodeSchema.and(nodeSchema);

  export const clusterSchema = z.object({
    clusterName: z.string().min(1, "Cluster name is required"),
    toolInstallation: z.string().min(1),
    kubernetesVersion: z.string().min(1, "Kubernetes version is required"),
    containerRuntime: z.string().min(1),
    containerVersion: z.string().min(1, "Container version is required"),
    globalAuth: globalAuthSchema,
    nodes: z.array(fullNodeSchema).min(1, "At least one node is required"),
  });
  
  