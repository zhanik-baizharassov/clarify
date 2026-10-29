-- Restore the duplicate guards for places.
--
-- 20260315195847_add_place_duplicate_guards created these two partial unique
-- indexes, but 20260317022115_cleanup_legacy_schema_tails dropped them because
-- Prisma cannot declare partial indexes in schema.prisma and treated them as
-- drift. Nothing re-added them, so duplicate prevention was left to a
-- check-then-insert in the API (racy on double-click / two tabs) and the
-- P2002 handlers in app/api/company/branches and app/api/admin/places could
-- never fire.
--
-- Like the pg_trgm indexes from 20260319062210_add_place_search_indexes, these
-- live only in migrations. Apply with `prisma migrate deploy`; do not run
-- `prisma migrate dev` against a database that must keep them (it would
-- propose dropping them again).
--
-- IF NOT EXISTS keeps this idempotent. Creation fails if duplicate rows
-- already exist: resolve those first (keep one, delete the rest).

-- A company cannot have two branches with the same city + address.
CREATE UNIQUE INDEX IF NOT EXISTS "Place_company_city_address_unique"
ON "Place" ("companyId", "city", "address")
WHERE "companyId" IS NOT NULL
  AND "address" IS NOT NULL;

-- Catalog cards without a company: same city + address + name is a duplicate.
CREATE UNIQUE INDEX IF NOT EXISTS "Place_admin_city_address_name_unique"
ON "Place" ("city", "address", "name")
WHERE "companyId" IS NULL
  AND "address" IS NOT NULL;
