CREATE UNIQUE INDEX "Place_company_city_address_unique"
ON "Place" ("companyId", "city", "address")
WHERE "companyId" IS NOT NULL
  AND "address" IS NOT NULL;

CREATE UNIQUE INDEX "Place_admin_city_address_name_unique"
ON "Place" ("city", "address", "name")
WHERE "companyId" IS NULL
  AND "address" IS NOT NULL;