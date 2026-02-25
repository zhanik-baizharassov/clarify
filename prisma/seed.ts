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
  // Категории верхнего уровня
  const roots = [
    { name: "Еда и напитки", slug: "food" },
    { name: "Магазины", slug: "shops" },
    { name: "Сервисы и услуги", slug: "services" },
  ];

  for (const r of roots) {
    await prisma.category.upsert({
      where: { slug: r.slug },
      update: {},
      create: { name: r.name, slug: r.slug },
    });
  }

  const food = await prisma.category.findUnique({ where: { slug: "food" } });
  const shops = await prisma.category.findUnique({ where: { slug: "shops" } });
  const services = await prisma.category.findUnique({ where: { slug: "services" } });

  const children = [
    // Еда
    { parentId: food!.id, name: "Кафе", slug: "cafe" },
    { parentId: food!.id, name: "Рестораны", slug: "restaurants" },
    { parentId: food!.id, name: "Доставка еды", slug: "food-delivery" },

    // Магазины
    { parentId: shops!.id, name: "Продукты", slug: "grocery" },
    { parentId: shops!.id, name: "Одежда", slug: "clothes" },
    { parentId: shops!.id, name: "Техника", slug: "electronics" },

    // Сервисы
    { parentId: services!.id, name: "Ремонт телефонов", slug: "phone-repair" },
    { parentId: services!.id, name: "Ремонт компьютеров", slug: "pc-repair" },
    { parentId: services!.id, name: "Салоны красоты", slug: "beauty" },
    { parentId: services!.id, name: "Автосервисы", slug: "auto-repair" },
  ];

  for (const c of children) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { parentId: c.parentId, name: c.name },
      create: c,
    });
  }

  // Теги причин (универсальные)
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
  ].map((name) => ({ name, slug: s(name) }));

  for (const t of tags) {
    await prisma.tag.upsert({
      where: { slug: t.slug },
      update: { name: t.name },
      create: t,
    });
  }
    // --- ТЕСТОВЫЕ МЕСТА (Place) ---
  const cafeCat = await prisma.category.findUnique({ where: { slug: "cafe" } });
  const phoneRepairCat = await prisma.category.findUnique({ where: { slug: "phone-repair" } });
  const groceryCat = await prisma.category.findUnique({ where: { slug: "grocery" } });

  if (!cafeCat || !phoneRepairCat || !groceryCat) {
    throw new Error("Не найдены нужные категории (cafe/phone-repair/grocery).");
  }

  await prisma.place.upsert({
    where: { slug: "coffee-hub-almaty" },
    update: {},
    create: {
      name: "Coffee Hub",
      slug: "coffee-hub-almaty",
      categoryId: cafeCat.id,
      city: "Алматы",
      address: "ул. Абая, 10",
      description: "Тестовая карточка кофейни.",
      phone: "+7 777 000 00 00",
    },
  });

  await prisma.place.upsert({
    where: { slug: "fix-phone-almaty" },
    update: {},
    create: {
      name: "FixPhone",
      slug: "fix-phone-almaty",
      categoryId: phoneRepairCat.id,
      city: "Алматы",
      address: "ул. Толе би, 55",
      description: "Тестовая карточка ремонта телефонов.",
    },
  });

  await prisma.place.upsert({
    where: { slug: "freshmart-almaty" },
    update: {},
    create: {
      name: "FreshMart",
      slug: "freshmart-almaty",
      categoryId: groceryCat.id,
      city: "Алматы",
      address: "пр. Достык, 100",
      description: "Тестовый продуктовый магазин.",
    },
  });
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