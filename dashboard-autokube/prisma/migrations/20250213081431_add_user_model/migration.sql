-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");


INSERT INTO "User" ("id", "email", "name", "password", "createdAt", "updatedAt") 
VALUES 
('cm7ectf1a000041r6k58u6ilt', 'admin@example.com', 'admin', 
 '$2b$12$oEMTaQc2zfYU9Gd9/rat7OL7Umj3IQi3OdQAm/GtDnzMk0yrttnQ6', 
 '2025-02-21T05:52:20.831Z', '2025-02-21T05:52:20.831Z')
ON CONFLICT ("email") DO NOTHING;

