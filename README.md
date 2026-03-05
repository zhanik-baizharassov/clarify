# Clarify 🇰🇿
Платформа отзывов по Казахстану.

## Возможности
- **Поиск мест** с фильтрами (город KZ, категория, сортировка)
- **Карточка места**: средний рейтинг, отзывы, теги, ответы компаний
- **Отзывы**: только для пользователей с подтверждённой почтой (OTP)
- **Кабинет компании**: создание филиалов (карточек) + ответы на отзывы
- **Профиль пользователя**: данные аккаунта + ограничение на редактирование (MVP)
- **Аналитика**: totals + топ городов/категорий

## Технологии
- **Next.js (App Router)**, React
- **Prisma** + PostgreSQL
- **Zod** (валидации)
- **Nodemailer** (OTP email)
- Tailwind / shadcn/ui (UI)

# Запуск локально (npm)

## Требования
- Node.js **20+**
- Docker Desktop (рекомендуется для Postgres)
- Git

## 1) Клонирование и зависимости
```bash
git clone <REPO_URL>
cd review
npm install
````

## 2) ENV: создайте `.env.local`

`.env.local` не хранится в репозитории. Создайте его из примера:

**macOS/Linux**

```bash
cp .env.example .env.local
```

**Windows PowerShell**

```powershell
Copy-Item .env.example .env.local
```

Минимально проверьте/заполните в `.env.local`:

* `DATABASE_URL`
* `EMAIL_CODE_PEPPER` (длинная рандом-строка 32+ символа)
* `MAIL_MODE="console"` (для локальной разработки — стабильно у всех)

> В режиме `MAIL_MODE="console"` OTP не отправляется на почту, а печатается в терминал.

## 3) Postgres через Docker (рекомендуется)

Запустите базу:

```bash
docker compose up -d
```

Затем примените миграции и сиды:

```bash
npm run prisma:migrate
npm run prisma:seed
```

## 4) Запуск приложения

```bash
npm run dev
```

Открыть: [http://localhost:3000](http://localhost:3000)

---

# OTP / Email verification

Проект использует OTP-подтверждение email.

## Локальная разработка (рекомендуется)

В `.env.local`:

```env
MAIL_MODE="console"
```

Когда система “отправляет” OTP — он появится **в терминале**, где запущен `npm run dev`, примерно так:

```txt
[MAIL_MODE=console] Email verification code for user@mail.com: 123456 (ttl 10m)
```

## Реальная отправка (smtp)

Для staging/prod поставьте:

MAIL_MODE="smtp"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER="your.smtp@gmail.com"
SMTP_PASS="YOUR_APP_PASSWORD"
MAIL_FROM="Clarify <your.smtp@gmail.com>"

⚠️ Для Gmail нужен **App Password**, обычный пароль аккаунта не подойдёт.

---

## OTP не печатается в консоль

* проверьте `MAIL_MODE="console"` в `.env.local`
* перезапустите `npm run dev` (env читается при старте)
* проверьте `EMAIL_CODE_PEPPER` (обязателен)

## Prisma ошибки / миграции

Если можно сбросить локальную базу:

```bash
npx prisma migrate reset
```

⚠️ Удалит локальные данные и накатит миграции заново.

---

# Безопасность

* `.env.local` **не коммитим**
* `SMTP_PASS` и секреты **не хранить в репозитории**
* если секреты утекли — **перевыпустить** (App Password / токены)

---

# License

Private / internal (MVP)

