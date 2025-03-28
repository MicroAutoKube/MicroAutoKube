import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server";
import { getServerSession } from "next-auth";

export async function PUT(req: NextRequest, { params }: { params: { clusterId: string } }) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clusterId = params.clusterId;
    const configData = await req.json();

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existingCluster = await prisma.clusterProfile.findFirst({
      where: {
        id: clusterId,
        userId: user.id,
      },
      include: {
        clusterConfig: {
          include: {
            helm: true,
            registry: true,
            metrics: true,
            localPathProvisioner: true,
          },
        },
      },
    });

    if (!existingCluster) {
      return NextResponse.json({ error: "Cluster not found or unauthorized" }, { status: 404 });
    }

    // Either create or update the nested configuration
    const updatedConfig = await prisma.clusterConfig.upsert({
      where: { clusterProfileId: clusterId },
      update: {
        helm: {
          upsert: {
            create: { enabled: configData.helm.enabled },
            update: { enabled: configData.helm.enabled },
          },
        },
        registry: {
          upsert: {
            create: configData.registry,
            update: configData.registry,
          },
        },
        metrics: {
          upsert: {
            create: configData.metrics,
            update: configData.metrics,
          },
        },
        localPathProvisioner: {
          upsert: {
            create: configData.localPathProvisioner,
            update: configData.localPathProvisioner,
          },
        },
      },
      create: {
        clusterProfileId: clusterId,
        helm: { create: { enabled: configData.helm.enabled } },
        registry: { create: configData.registry },
        metrics: { create: configData.metrics },
        localPathProvisioner: { create: configData.localPathProvisioner },
      },
    });

    return NextResponse.json({ success: true, config: updatedConfig }, { status: 200 });
  } catch (err) {
    console.error("PUT /cluster-config error:", err);
    return NextResponse.json({ error: "Failed to update configuration" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
