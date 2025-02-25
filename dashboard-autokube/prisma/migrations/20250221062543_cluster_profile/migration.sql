-- CreateEnum
CREATE TYPE "AuthType" AS ENUM ('PASSWORD', 'SSH_KEY');

-- CreateEnum
CREATE TYPE "NodeRole" AS ENUM ('MASTER', 'WORKER', 'DATABASE', 'STORAGE');

-- CreateEnum
CREATE TYPE "ContainerRuntime" AS ENUM ('DOCKER', 'CONTAINERD', 'CRI_O');

-- CreateTable
CREATE TABLE "ClusterProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kubernetesVersion" TEXT NOT NULL,
    "containerRuntime" "ContainerRuntime" NOT NULL,
    "containerVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ClusterProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Node" (
    "id" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "authType" "AuthType" NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT,
    "sshKey" TEXT,
    "role" "NodeRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clusterId" TEXT NOT NULL,

    CONSTRAINT "Node_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClusterProfile_name_key" ON "ClusterProfile"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Node_hostname_key" ON "Node"("hostname");

-- CreateIndex
CREATE UNIQUE INDEX "Node_ipAddress_key" ON "Node"("ipAddress");

-- AddForeignKey
ALTER TABLE "ClusterProfile" ADD CONSTRAINT "ClusterProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Node" ADD CONSTRAINT "Node_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "ClusterProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
