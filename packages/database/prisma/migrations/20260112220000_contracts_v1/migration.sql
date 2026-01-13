-- Contracts v1
CREATE TABLE "contracts" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "signedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'draft',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contract_milestones" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "contractId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "dueDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'pending',
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "contract_milestones_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "contracts_tenantId_number_key" ON "contracts"("tenantId", "number");
CREATE INDEX "contracts_tenantId_idx" ON "contracts"("tenantId");
CREATE INDEX "contracts_projectId_idx" ON "contracts"("projectId");
CREATE INDEX "contracts_tenantId_deletedAt_idx" ON "contracts"("tenantId", "deletedAt");

CREATE INDEX "contract_milestones_tenantId_idx" ON "contract_milestones"("tenantId");
CREATE INDEX "contract_milestones_contractId_idx" ON "contract_milestones"("contractId");

ALTER TABLE "contracts" ADD CONSTRAINT "contracts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contract_milestones" ADD CONSTRAINT "contract_milestones_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
