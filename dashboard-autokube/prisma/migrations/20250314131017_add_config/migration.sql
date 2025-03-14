-- CreateEnum
CREATE TYPE "KubeletPreferredAddressTypes" AS ENUM ('InternalIP', 'ExternalIP', 'Hostname');

-- CreateTable
CREATE TABLE "ClusterConfig" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clusterProfileId" TEXT NOT NULL,

    CONSTRAINT "ClusterConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HelmConfig" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "clusterConfigId" TEXT NOT NULL,

    CONSTRAINT "HelmConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistryConfig" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "namespace" TEXT NOT NULL DEFAULT 'kube-system',
    "storageClass" TEXT DEFAULT '',
    "diskSize" TEXT NOT NULL DEFAULT '10Gi',
    "clusterConfigId" TEXT NOT NULL,

    CONSTRAINT "RegistryConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricsConfig" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "containerPort" INTEGER DEFAULT 10250,
    "kubeletInsecureTls" BOOLEAN DEFAULT false,
    "metricResolution" INTEGER DEFAULT 15,
    "kubeletPreferredAddressType" "KubeletPreferredAddressTypes",
    "hostNetwork" BOOLEAN DEFAULT false,
    "replicas" INTEGER DEFAULT 1,
    "clusterConfigId" TEXT NOT NULL,

    CONSTRAINT "MetricsConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocalPathProvisionerConfig" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "namespace" TEXT DEFAULT 'local-path-storage',
    "storageClass" TEXT DEFAULT 'local-path',
    "reclaim_policy" TEXT DEFAULT 'Delete',
    "claimRoot" TEXT DEFAULT '/opt/local-path-provisioner/',
    "debug" BOOLEAN DEFAULT false,
    "imageRepo" TEXT DEFAULT '{{ docker_image_repo }}/rancher/local-path-provisioner',
    "imageTag" TEXT DEFAULT 'v0.0.24',
    "helperImageRepo" TEXT DEFAULT 'busybox',
    "helperImageTag" TEXT DEFAULT 'latest',
    "clusterConfigId" TEXT NOT NULL,

    CONSTRAINT "LocalPathProvisionerConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalClusterConfig" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "binDir" TEXT DEFAULT '/usr/local/bin',
    "clusterConfigId" TEXT NOT NULL,

    CONSTRAINT "GlobalClusterConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoadbalancerApiserverConfig" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "domain" TEXT DEFAULT 'elb.some.domain',
    "domainEnabled" BOOLEAN DEFAULT false,
    "address" TEXT,
    "port" INTEGER,
    "localPort" INTEGER DEFAULT 6443,
    "healthcheck_port" INTEGER DEFAULT 8081,
    "globalClusterConfigId" TEXT NOT NULL,

    CONSTRAINT "LoadbalancerApiserverConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "K8sClusterConfig" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "configDir" TEXT DEFAULT '/etc/kubernetes',
    "scriptDir" TEXT DEFAULT '{{ bin_dir }}/kubernetes-scripts',
    "manifestDir" TEXT DEFAULT '{{ kube_config_dir }}/manifests',
    "certDir" TEXT DEFAULT '{{ kube_config_dir }}/ssl',
    "tokenDir" TEXT DEFAULT '{{ kube_config_dir }}/tokens',
    "apiAnonymousAuth" BOOLEAN DEFAULT true,
    "version" TEXT DEFAULT 'v1.32.0',
    "localReleaseDir" TEXT DEFAULT '/tmp/releases',
    "retryStagger" INTEGER DEFAULT 5,
    "owner" TEXT DEFAULT 'kube',
    "certGroup" TEXT DEFAULT 'kube-cert',
    "logLevel" INTEGER DEFAULT 2,
    "credentialsDir" TEXT DEFAULT '{{ inventory_dir }}/credentials',
    "containerManager" "ContainerRuntime" DEFAULT 'CONTAINERD',
    "clusterConfigId" TEXT NOT NULL,

    CONSTRAINT "K8sClusterConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClusterConfig_clusterProfileId_key" ON "ClusterConfig"("clusterProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "HelmConfig_clusterConfigId_key" ON "HelmConfig"("clusterConfigId");

-- CreateIndex
CREATE UNIQUE INDEX "RegistryConfig_clusterConfigId_key" ON "RegistryConfig"("clusterConfigId");

-- CreateIndex
CREATE UNIQUE INDEX "MetricsConfig_clusterConfigId_key" ON "MetricsConfig"("clusterConfigId");

-- CreateIndex
CREATE UNIQUE INDEX "LocalPathProvisionerConfig_clusterConfigId_key" ON "LocalPathProvisionerConfig"("clusterConfigId");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalClusterConfig_clusterConfigId_key" ON "GlobalClusterConfig"("clusterConfigId");

-- CreateIndex
CREATE UNIQUE INDEX "LoadbalancerApiserverConfig_globalClusterConfigId_key" ON "LoadbalancerApiserverConfig"("globalClusterConfigId");

-- CreateIndex
CREATE UNIQUE INDEX "K8sClusterConfig_clusterConfigId_key" ON "K8sClusterConfig"("clusterConfigId");

-- AddForeignKey
ALTER TABLE "ClusterConfig" ADD CONSTRAINT "ClusterConfig_clusterProfileId_fkey" FOREIGN KEY ("clusterProfileId") REFERENCES "ClusterProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelmConfig" ADD CONSTRAINT "HelmConfig_clusterConfigId_fkey" FOREIGN KEY ("clusterConfigId") REFERENCES "ClusterConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistryConfig" ADD CONSTRAINT "RegistryConfig_clusterConfigId_fkey" FOREIGN KEY ("clusterConfigId") REFERENCES "ClusterConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricsConfig" ADD CONSTRAINT "MetricsConfig_clusterConfigId_fkey" FOREIGN KEY ("clusterConfigId") REFERENCES "ClusterConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalPathProvisionerConfig" ADD CONSTRAINT "LocalPathProvisionerConfig_clusterConfigId_fkey" FOREIGN KEY ("clusterConfigId") REFERENCES "ClusterConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalClusterConfig" ADD CONSTRAINT "GlobalClusterConfig_clusterConfigId_fkey" FOREIGN KEY ("clusterConfigId") REFERENCES "ClusterConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadbalancerApiserverConfig" ADD CONSTRAINT "LoadbalancerApiserverConfig_globalClusterConfigId_fkey" FOREIGN KEY ("globalClusterConfigId") REFERENCES "GlobalClusterConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "K8sClusterConfig" ADD CONSTRAINT "K8sClusterConfig_clusterConfigId_fkey" FOREIGN KEY ("clusterConfigId") REFERENCES "ClusterConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
