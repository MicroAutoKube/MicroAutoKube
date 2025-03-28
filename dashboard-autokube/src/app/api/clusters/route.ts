import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/server';
import { AuthType, ContainerRuntime, NodeRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import { decodeBase64SSHKey, encryptSSHKey } from "@/utils";

export async function POST(req: NextRequest) {
    try {
        const {
            clusterName,
            kubernetesVersion,
            containerRuntime,
            containerVersion,
            globalAuth,
            nodes,
        } = await req.json();

        const session = await getServerSession();
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const userId = user.id;

        if (!clusterName || !kubernetesVersion || !containerRuntime || !containerVersion || !nodes.length || !globalAuth.mode) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const existingCluster = await prisma.clusterProfile.findUnique({
            where: { name: clusterName },
        });

        if (existingCluster) {
            return NextResponse.json({ error: "Cluster name already exists" }, { status: 409 });
        }


        // Encrypt SSH key before saving
        const getNodeAuthDetails = async (node: any) => {
            const mode = node.authMode === "default" ? globalAuth.mode : node.authMode;

            if (mode === "username_password") {
                return {
                    authType: AuthType.PASSWORD,
                    username: node.authMode === "default" ? globalAuth.username : node.username,
                    password: node.authMode === "default" ? globalAuth.password : node.password,
                    sshKey: null,
                };
            } else if (mode === "ssh_key") {
                const sshKeyEncoded = node.authMode === "default" ? globalAuth.sshKey : node.sshKey;
                if (!sshKeyEncoded) throw new Error("SSH Key required but not provided");

                const sshKeyText = decodeBase64SSHKey(sshKeyEncoded);
                const encryptedSSHKey = encryptSSHKey(sshKeyText); // Encrypt before storing

                return {
                    authType: AuthType.SSH_KEY,
                    username: node.authMode === "default" ? globalAuth.username : node.username,
                    password: null,
                    sshKey: encryptedSSHKey, // Store encrypted SSH key
                };
            } else {
                throw new Error(`Invalid authentication mode: ${mode}`);
            }
        };

        const nodesData = await Promise.all(nodes.map(async (node: any) => ({
            hostname: node.hostname,
            ipAddress: node.ipAddress,
            role: node.role as NodeRole,
            ...(await getNodeAuthDetails(node)),
        })));

        const cluster = await prisma.clusterProfile.create({
            data: {
                name: clusterName,
                kubernetesVersion,
                containerRuntime: containerRuntime as ContainerRuntime,
                containerVersion,
                userId,
                nodes: { create: nodesData },
            },
            include: { nodes: true },
        });

        return NextResponse.json(cluster, { status: 201 });
    } catch (error: any) {
        console.error("Cluster creation error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}
