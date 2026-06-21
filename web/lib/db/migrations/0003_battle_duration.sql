ALTER TABLE "battles" ADD COLUMN IF NOT EXISTS "duration_seconds" integer DEFAULT 0 NOT NULL;
