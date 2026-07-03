BEGIN;

CREATE TABLE IF NOT EXISTS "models" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "models_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "models_name_key" ON "models"("name");

INSERT INTO "models" ("id", "name", "createdAt", "updatedAt")
VALUES (
    'legacy-default-model',
    'Imported Legacy League',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "modelId" TEXT;
UPDATE "players"
SET "modelId" = 'legacy-default-model'
WHERE "modelId" IS NULL;
ALTER TABLE "players" ALTER COLUMN "modelId" SET NOT NULL;

DROP INDEX IF EXISTS "players_name_key";
CREATE UNIQUE INDEX IF NOT EXISTS "players_modelId_name_key" ON "players"("modelId", "name");
CREATE INDEX IF NOT EXISTS "players_modelId_isActive_idx" ON "players"("modelId", "isActive");

ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "modelId" TEXT;
UPDATE "matches"
SET "modelId" = 'legacy-default-model'
WHERE "modelId" IS NULL;
ALTER TABLE "matches" ALTER COLUMN "modelId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "matches_modelId_matchDate_idx" ON "matches"("modelId", "matchDate");
CREATE INDEX IF NOT EXISTS "matches_matchDate_idx" ON "matches"("matchDate");

ALTER TABLE "players"
ADD CONSTRAINT "players_modelId_fkey"
FOREIGN KEY ("modelId") REFERENCES "models"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "matches"
ADD CONSTRAINT "matches_modelId_fkey"
FOREIGN KEY ("modelId") REFERENCES "models"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

COMMIT;
