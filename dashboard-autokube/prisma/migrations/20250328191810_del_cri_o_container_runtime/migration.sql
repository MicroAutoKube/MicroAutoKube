/*
  Warnings:

  - The values [CRI_O] on the enum `ContainerRuntime` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ContainerRuntime_new" AS ENUM ('DOCKER', 'CONTAINERD');
ALTER TABLE "K8sClusterConfig" ALTER COLUMN "containerManager" DROP DEFAULT;
ALTER TABLE "ClusterProfile" ALTER COLUMN "containerRuntime" TYPE "ContainerRuntime_new" USING ("containerRuntime"::text::"ContainerRuntime_new");
ALTER TABLE "K8sClusterConfig" ALTER COLUMN "containerManager" TYPE "ContainerRuntime_new" USING ("containerManager"::text::"ContainerRuntime_new");
ALTER TYPE "ContainerRuntime" RENAME TO "ContainerRuntime_old";
ALTER TYPE "ContainerRuntime_new" RENAME TO "ContainerRuntime";
DROP TYPE "ContainerRuntime_old";
ALTER TABLE "K8sClusterConfig" ALTER COLUMN "containerManager" SET DEFAULT 'CONTAINERD';
COMMIT;
