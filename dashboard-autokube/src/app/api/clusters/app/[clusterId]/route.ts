import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server";
import { getServerSession } from "next-auth";

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = new URL(req.url);
    const clusterId = url.pathname.split("/").pop(); // Extract from /clusters/app/[clusterId]

    if (!clusterId) {
      return NextResponse.json({ error: "Missing cluster ID" }, { status: 400 });
    }
    const appData = await req.json();

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
      }
    });

    if (!existingCluster) {
      return NextResponse.json({ error: "Cluster not found or unauthorized" }, { status: 404 });
    }

    // Either create or update the nested App
    const updatedApp = await prisma.clusterApp.upsert({
      where: { clusterProfileId: clusterId },
      update: {
        kubesphere: { update: { enabled: appData.kubesphere.enabled } },
        
      },
      create: {
        clusterProfile: { connect: { id: clusterId } },
        kubesphere: { create: { enabled: appData.kubesphere.enabled } }
      },
    });

    return NextResponse.json({ success: true, app: updatedApp }, { status: 200 });
  } catch (err) {
    console.error("PUT /clusters/app error:", err);
    return NextResponse.json({ error: "Failed to update Application" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
