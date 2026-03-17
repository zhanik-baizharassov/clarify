import "dotenv/config";
import slugify from "slugify";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

const s = (v: string) => slugify(v, { lower: true, strict: true });

async function main() {
  const categories = [
    { name: "Кафе", slug: "cafe", sortOrder: 10 },
    { name: "Рестораны", slug: "restaurants", sortOrder: 20 },
    { name: "Доставка еды", slug: "food-delivery", sortOrder: 30 },
    { name: "Фастфуд", slug: "fast-food", sortOrder: 40 },
    { name: "Кофейни", slug: "coffee", sortOrder: 50 },
    { name: "Пекарни и кондитерские", slug: "bakery", sortOrder: 60 },

    { name: "Продуктовые магазины", slug: "grocery", sortOrder: 70 },
    { name: "Одежда и обувь", slug: "clothes", sortOrder: 80 },
    { name: "Техника и электроника", slug: "electronics", sortOrder: 90 },
    { name: "Цветочные магазины", slug: "flowers", sortOrder: 100 },
    { name: "Аптеки", slug: "pharmacy", sortOrder: 110 },
    { name: "Зоомагазины", slug: "pets", sortOrder: 120 },
    { name: "Косметика и парфюм", slug: "cosmetics", sortOrder: 130 },
    { name: "Детские товары", slug: "kids", sortOrder: 140 },

    { name: "Ремонт телефонов", slug: "phone-repair", sortOrder: 150 },
    { name: "Ремонт компьютеров", slug: "pc-repair", sortOrder: 160 },
    { name: "Салоны красоты", slug: "beauty", sortOrder: 170 },
    { name: "SPA центры", slug: "spa", sortOrder: 180 },
    { name: "Фитнес клубы", slug: "fitness", sortOrder: 190 },
    { name: "Автосервисы", slug: "auto-repair", sortOrder: 200 },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        isActive: true,
        sortOrder: category.sortOrder,
      },
      create: {
        name: category.name,
        slug: category.slug,
        isActive: true,
        sortOrder: category.sortOrder,
      },
    });
  }

  const tags = [
    "долго",
    "грубо",
    "грязно",
    "дорого",
    "вкусно",
    "не вкусно",
    "чисто",
    "быстро",
    "качество",
    "обман",
    "хороший персонал",
    "плохой персонал",
  ].map((name, index) => ({
    name,
    slug: s(name),
    sortOrder: (index + 1) * 10,
  }));

  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: {
        name: tag.name,
        isActive: true,
        sortOrder: tag.sortOrder,
      },
      create: {
        name: tag.name,
        slug: tag.slug,
        isActive: true,
        sortOrder: tag.sortOrder,
      },
    });
  }

  console.log("Seed OK");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });