-- Invoices v1: link to contracts + default issued status
ALTER TABLE "invoices" ADD COLUMN "contractId" TEXT;
ALTER TABLE "invoices" ALTER COLUMN "status" SET DEFAULT 'issued';

CREATE INDEX "invoices_contractId_idx" ON "invoices"("contractId");

ALTER TABLE "invoices"
ADD CONSTRAINT "invoices_contractId_fkey"
FOREIGN KEY ("contractId") REFERENCES "contracts"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
