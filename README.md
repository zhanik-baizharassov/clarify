# Clarify

Платформа отзывов о местах и компаниях Казахстана: поиск мест с фильтрами (город, категория), карточки мест с рейтингом и отзывами, отзывы только от пользователей с подтверждённой почтой (OTP), кабинет компании (филиалы и ответы на отзывы), чарты и карта.

## Технологии

- Next.js 16 (App Router), React 19, Tailwind CSS 4
- Prisma 7 + PostgreSQL (драйвер `@prisma/adapter-pg`)
- Zod (валидация), Nodemailer (OTP по email), MapLibre GL (карта, тайлы OpenFreeMap)

## Локальный запуск

Нужны Node.js 20+, Docker (для Postgres) и Git.

```bash
git clone https://github.com/zhanik-baizharassov/clarify
cd clarify
npm install
```

1. Создайте файл с переменными окружения из примера (`.env.local` не коммитится):

   ```bash
   cp .env.example .env.local          # macOS/Linux
   Copy-Item .env.example .env.local   # Windows PowerShell
   ```

   Next.js читает `.env.local`; Prisma CLI (`prisma.config.ts`) тоже читает `.env.local`, а затем `.env`. Приоритет: реальные переменные окружения, затем `.env.local`, затем `.env`.
   Для локальной работы достаточно заменить `EMAIL_CODE_PEPPER` на случайную строку 32+ символа; `MAIL_MODE="console"` печатает OTP-код в терминал, где запущен `npm run dev`.

2. Поднимите базу, примените миграции и сиды:

   ```bash
   docker compose up -d
   npm run prisma:migrate
   npm run prisma:seed
   ```

3. Запустите приложение: `npm run dev` и откройте http://localhost:3000.

Проверки: `npm run typecheck`, `npm run lint`.

## Переменные окружения

| Переменная | Назначение |
| --- | --- |
| `DATABASE_URL` | Строка подключения к PostgreSQL (обязательна). |
| `APP_ORIGIN` | Публичный адрес сайта, например `https://example.com` (canonical, Open Graph, проверка источника запросов). |
| `APP_NAME` | Название в письмах (по умолчанию `Clarify`). |
| `MAIL_MODE` | `console` (код в терминал, только dev), `smtp` (реальная отправка), `disabled`. В production должен быть `smtp`, иначе отправка кода завершается ошибкой. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Параметры SMTP (нужны при `MAIL_MODE=smtp`). Для Gmail нужен App Password. |
| `EMAIL_CODE_PEPPER` | Секрет для хеширования OTP-кодов (обязателен, 32+ символа). |
| `EMAIL_CODE_TTL_MIN` | Срок жизни кода, минут (по умолчанию 10). |
| `CRON_SECRET` | Секрет для `/api/cron/cleanup`; обязателен в production (без него endpoint отвечает 500). |
| `GOOGLE_SITE_VERIFICATION`, `YANDEX_VERIFICATION` | Необязательно: meta-теги верификации Search Console / Яндекс Вебмастер. |
| `NEXT_PUBLIC_YM_ID` | Необязательно: ID счётчика Яндекс Метрики. |

Секреты (`SMTP_PASS`, `CRON_SECRET`, строки подключения) не храните в репозитории: он публичный. Если секрет утёк, перевыпустите его.

## Деплой (Vercel Hobby + Neon, бесплатно)

- Приложение деплоится на Vercel из ветки `main`; функции работают в регионе `fra1` (см. `vercel.json`). Все переменные из таблицы выше задаются в Vercel -> Settings -> Environment Variables.
- База: Neon (бесплатный план, Франкфурт). У Neon две строки подключения:
  - **pooled** (хост с `-pooler`) используйте как `DATABASE_URL` в Vercel;
  - **direct** (без `-pooler`) используйте для `npx prisma migrate deploy` и для бэкапов.
- **Vercel не применяет миграции.** После слияния PR, который добавляет миграцию, выполните вручную (с direct-URL в `DATABASE_URL`):

  ```bash
  npx prisma migrate deploy
  ```

- **Никогда не запускайте `prisma migrate dev` (`npm run prisma:migrate`) против production.** Две миграции содержат SQL-индексы вручную (частичные уникальные индексы на `Place`, расширение `pg_trgm`), которые Prisma считает расхождением схемы (drift) и предложит удалить.
- Ежедневная очистка: Vercel Cron вызывает `/api/cron/cleanup` в 03:00 UTC (`vercel.json`) с заголовком `Authorization: Bearer $CRON_SECRET`. Задайте `CRON_SECRET` в Vercel.

### Как сделать администратора

Зарегистрируйтесь на сайте как обычный пользователь, затем в SQL-редакторе Neon выполните:

```sql
UPDATE "User" SET role='ADMIN' WHERE email='you@example.com';
```

## Мониторинг

Для аптайм-монитора (например UptimeRobot, бесплатно) используйте:

- `GET /api/health?shallow=1` каждые 5 минут: отвечает `{"ok":true}` без обращения к базе, поэтому не будит Neon;
- `GET /api/health` (полная проверка с `SELECT 1`, при проблемах с БД отвечает 503) запускайте редко, например раз в несколько часов.

Причина: бесплатная база Neon засыпает при простое (scale-to-zero) и лимитирована ~100 CU-часами в месяц; частые запросы к БД держат её запущенной и тратят этот лимит.

## Бэкапы

Workflow `.github/workflows/backup.yml` раз в неделю (и вручную: Actions -> Backup database -> Run workflow) делает `pg_dump` production-базы, **шифрует** его (AES-256) и сохраняет как artifact на 30 дней. Шифрование обязательно: репозиторий публичный, а дамп содержит email-адреса и хеши паролей.

Настройка: Settings -> Secrets and variables -> Actions -> New repository secret:

- `NEON_DIRECT_URL`: **direct** (не pooled) строка подключения Neon;
- `BACKUP_PASSPHRASE`: длинная случайная фраза. Сохраните её отдельно (менеджер паролей): без неё бэкап не расшифровать.

### Как восстановить

Восстанавливайте только в **новую пустую** базу (например, новый проект/ветка Neon или локальный Postgres), никогда поверх production.

```bash
# 1. скачайте artifact clarify-db-backup из запуска workflow и распакуйте zip
# 2. расшифруйте (спросит/возьмёт фразу из переменной BACKUP_PASSPHRASE)
export BACKUP_PASSPHRASE='...'
openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 \
  -pass env:BACKUP_PASSPHRASE -in clarify-YYYYMMDD-HHMMSS.dump.enc -out clarify.dump

# 3. восстановите в новую пустую базу (pg_restore версии 17+)
pg_restore --no-owner --no-privileges --dbname="postgresql://USER:PASS@HOST/NEWDB" clarify.dump

# 4. удалите расшифрованный файл
rm clarify.dump
```

## Особенности бесплатных тарифов

- Neon free: база засыпает при простое, первый запрос после паузы медленнее; месячный лимит вычислений около 100 CU-часов (см. раздел «Мониторинг»); автоматических бэкапов с долгой историей нет, поэтому нужен workflow выше.
- Vercel Hobby: один cron в сутки (этого хватает для очистки), ограниченное время выполнения функций.

## Если что-то не работает

- OTP не печатается в терминал: проверьте `MAIL_MODE="console"`, перезапустите `npm run dev` (env читается при старте) и убедитесь, что задан `EMAIL_CODE_PEPPER`.
- `Cannot resolve environment variable: DATABASE_URL` при `npm run prisma:migrate`: создайте `.env.local` (или `.env`) с `DATABASE_URL`.
- Локальную базу можно сбросить (удалит данные, **только локально**): `npx prisma migrate reset`.

## Лицензия

Private / internal (MVP)
