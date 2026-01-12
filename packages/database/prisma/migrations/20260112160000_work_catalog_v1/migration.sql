-- Work Catalog v1 fields
ALTER TABLE "work_types" ADD COLUMN "code" TEXT;
ALTER TABLE "work_types" ADD COLUMN "clientUnitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "work_types" ADD COLUMN "laborNormHoursPerUnit" DECIMAL(10,3) NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "work_types_tenantId_code_key" ON "work_types"("tenantId", "code");
