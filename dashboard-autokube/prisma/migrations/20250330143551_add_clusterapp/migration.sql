-- CreateTable
CREATE TABLE "ClusterApp" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clusterProfileId" TEXT NOT NULL,

    CONSTRAINT "ClusterApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KubesphereApp" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "clusterAppId" TEXT NOT NULL,

    CONSTRAINT "KubesphereApp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClusterApp_clusterProfileId_key" ON "ClusterApp"("clusterProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "KubesphereApp_clusterAppId_key" ON "KubesphereApp"("clusterAppId");

-- AddForeignKey
ALTER TABLE "ClusterApp" ADD CONSTRAINT "ClusterApp_clusterProfileId_fkey" FOREIGN KEY ("clusterProfileId") REFERENCES "ClusterProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KubesphereApp" ADD CONSTRAINT "KubesphereApp_clusterAppId_fkey" FOREIGN KEY ("clusterAppId") REFERENCES "ClusterApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;
