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
  const rootCategories = [
    { name: "Еда и напитки", slug: "food", sortOrder: 10 },
    { name: "Магазины", slug: "shops", sortOrder: 20 },
    { name: "Сервисы и услуги", slug: "services", sortOrder: 30 },
  ];

  for (const category of rootCategories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        parentId: null,
        isActive: true,
        sortOrder: category.sortOrder,
      },
      create: {
        name: category.name,
        slug: category.slug,
        parentId: null,
        isActive: true,
        sortOrder: category.sortOrder,
      },
    });
  }

  const parentMap = new Map<string, string>();

  const existingRoots = await prisma.category.findMany({
    where: {
      slug: { in: rootCategories.map((item) => item.slug) },
    },
    select: {
      id: true,
      slug: true,
    },
  });

  for (const item of existingRoots) {
    parentMap.set(item.slug, item.id);
  }

  const childCategories = [
    { parentSlug: "food", name: "Кафе", slug: "cafe", sortOrder: 10 },
    {
      parentSlug: "food",
      name: "Рестораны",
      slug: "restaurants",
      sortOrder: 20,
    },
    {
      parentSlug: "food",
      name: "Доставка еды",
      slug: "food-delivery",
      sortOrder: 30,
    },
    { parentSlug: "food", name: "Фастфуд", slug: "fast-food", sortOrder: 40 },
    { parentSlug: "food", name: "Кофейни", slug: "coffee", sortOrder: 50 },
    {
      parentSlug: "food",
      name: "Пекарни и кондитерские",
      slug: "bakery",
      sortOrder: 60,
    },

    {
      parentSlug: "shops",
      name: "Продуктовые магазины",
      slug: "grocery",
      sortOrder: 10,
    },
    {
      parentSlug: "shops",
      name: "Одежда и обувь",
      slug: "clothes",
      sortOrder: 20,
    },
    {
      parentSlug: "shops",
      name: "Техника и электроника",
      slug: "electronics",
      sortOrder: 30,
    },
    {
      parentSlug: "shops",
      name: "Цветочные магазины",
      slug: "flowers",
      sortOrder: 40,
    },
    { parentSlug: "shops", name: "Аптеки", slug: "pharmacy", sortOrder: 50 },
    {
      parentSlug: "shops",
      name: "Зоомагазины",
      slug: "pets",
      sortOrder: 60,
    },
    {
      parentSlug: "shops",
      name: "Косметика и парфюм",
      slug: "cosmetics",
      sortOrder: 70,
    },
    {
      parentSlug: "shops",
      name: "Детские товары",
      slug: "kids",
      sortOrder: 80,
    },

    {
      parentSlug: "services",
      name: "Ремонт телефонов",
      slug: "phone-repair",
      sortOrder: 10,
    },
    {
      parentSlug: "services",
      name: "Ремонт компьютеров",
      slug: "pc-repair",
      sortOrder: 20,
    },
    {
      parentSlug: "services",
      name: "Салоны красоты",
      slug: "beauty",
      sortOrder: 30,
    },
    {
      parentSlug: "services",
      name: "SPA центры",
      slug: "spa",
      sortOrder: 40,
    },
    {
      parentSlug: "services",
      name: "Фитнес клубы",
      slug: "fitness",
      sortOrder: 50,
    },
    {
      parentSlug: "services",
      name: "Автосервисы",
      slug: "auto-repair",
      sortOrder: 60,
    },
  ];

  for (const category of childCategories) {
    const parentId = parentMap.get(category.parentSlug);

    if (!parentId) {
      throw new Error(`Не найден parent category: ${category.parentSlug}`);
    }

    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        parentId,
        isActive: true,
        sortOrder: category.sortOrder,
      },
      create: {
        name: category.name,
        slug: category.slug,
        parentId,
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