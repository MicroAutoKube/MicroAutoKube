import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/server';
import { AuthType, ContainerRuntime, NodeRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import { decodeBase64SSHKey, encryptSSHKey , decryptSSHKey } from "@/utils";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession();
        const apiToken = req.headers.get("authorization");

        const isTokenAuthorized = apiToken === `Bearer ${process.env.INTERNAL_API_TOKEN}`;
        const isAuthorized = session?.user?.email || isTokenAuthorized;

        if (!isAuthorized) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const clusterId = searchParams.get("id");

        // 🔍 If ID is provided, fetch one cluster
        if (clusterId) {
            const cluster = await prisma.clusterProfile.findFirst({
                where: { id: clusterId },
                include: {
                    nodes: true,
                    clusterConfig: {
                        include: {
                            helm: true,
                            registry: true,
                            metrics: true,
                            localPathProvisioner: true,
                            k8sCluster: true,
                            globalCluster: true
                        }
                    },
                    clusterApp : {
                        include : {
                            kubesphere : true
                        }
                    }
                }
            });

            if (!cluster) {
                return NextResponse.json({ error: "Cluster not found" }, { status: 404 });
            }

            // 🛡️ Decrypt SSH keys if using internal token
            if (isTokenAuthorized && cluster.nodes) {
                cluster.nodes = await Promise.all(
                    cluster.nodes.map(async (node) => {
                        if (node.sshKey) {
                            try {
                                node.sshKey = await decryptSSHKey(node.sshKey);
                            } catch (err) {
                                console.error(`Failed to decrypt SSH key for node ${node.id}:`, err);
                            }
                        }
                        return node;
                    })
                );
            }

            return NextResponse.json(cluster, { status: 200 });
        }

        // 🧾 Otherwise, fetch all clusters
        const clusters = await prisma.clusterProfile.findMany({
            include: {
                nodes: true,
                clusterConfig: {
                    include: {
                        helm: true,
                        registry: true,
                        metrics: true,
                        localPathProvisioner: true,
                        k8sCluster: true,
                        globalCluster: true
                    }
                }
            }
        });

        // 🛡️ Decrypt SSH keys if using internal token
        if (isTokenAuthorized) {
            for (const cluster of clusters) {
                if (cluster.nodes) {
                    cluster.nodes = await Promise.all(
                        cluster.nodes.map(async (node) => {
                            if (node.sshKey) {
                                try {
                                    node.sshKey = await decryptSSHKey(node.sshKey);
                                } catch (err) {
                                    console.error(`Failed to decrypt SSH key for node ${node.id}:`, err);
                                }
                            }
                            return node;
                        })
                    );
                }
            }
        }

        return NextResponse.json(clusters, { status: 200 });
    } catch (error) {
        console.error("Error fetching clusters:", error);
        return NextResponse.json({ error: "Failed to fetch clusters" }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}


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
export async function PUT(req: NextRequest) {
    try {
        const apiToken = req.headers.get("authorization");
        const isTokenAuthorized = apiToken === `Bearer ${process.env.INTERNAL_API_TOKEN}`;

        if (!isTokenAuthorized) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const clusterId = searchParams.get("id");

        if (!clusterId) {
            return NextResponse.json({ error: "Cluster ID is required" }, { status: 400 });
        }

        const updatedCluster = await prisma.clusterProfile.update({
            where: { id: clusterId },
            data: { ready: true },
        });

        return NextResponse.json({ message: "Cluster marked as ready", cluster: updatedCluster }, { status: 200 });
    } catch (error: any) {
        console.error("Error updating cluster status:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}
