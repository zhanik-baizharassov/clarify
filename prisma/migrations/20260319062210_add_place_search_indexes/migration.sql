CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Place_name_trgm_idx"
ON "Place"
USING GIN ("name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Place_city_trgm_idx"
ON "Place"
USING GIN ("city" gin_trgm_ops);