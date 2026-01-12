-- Room Geometry v1 additions
ALTER TABLE "rooms" ADD COLUMN "tileHeightMode" TEXT NOT NULL DEFAULT 'full';
ALTER TABLE "rooms" ADD COLUMN "tileHeightValue" DECIMAL(10,3);
ALTER TABLE "rooms" ADD COLUMN "tileWallsSelector" TEXT NOT NULL DEFAULT 'all';
