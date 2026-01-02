# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 📋 Обзор проекта

**BuildOS** - Multi-tenant SaaS платформа для управления строительными компаниями.

- **Стартовый рынок:** Польша
- **Языки:** RU + PL (+ EN fallback)
- **Статус:** Infrastructure готова, начинается разработка MVP 1.0
- **Цель MVP 1.0:** Estimate Engine + Client Portal (2-3 недели)

---

## 🏗️ Ключевые архитектурные решения (ADR)

**ОБЯЗАТЕЛЬНО прочитать:** `docs/architecture/adr/ADR_PACK_V1.md`

### Критичные ADR:
1. **ADR-01:** Monorepo (Turborepo), apps/web, client portal НЕ отдельное приложение
2. **ADR-02:** Service Layer изолирован от Next.js
3. **ADR-03:** Soft delete только для бизнес-сущностей (Project, Room, Stage, Estimate, Invoice)
4. **ADR-04:** AuditLog обязателен для всех критичных операций
5. **ADR-05:** Background jobs (BullMQ) обязательны с первого дня
6. **ADR-06:** MVP roadmap: 1.0 → 1.1 → 1.2
7. **ADR-08:** i18n: searchable сущности → таблицы переводов, остальное → JSONB
8. **ADR-09:** Margin **материализуется** (сохраняется в БД, не вычисляется)
9. **ADR-10:** Тесты обязательны: Unit (Estimate Engine), Integration (RBAC + tenant isolation)

---

## 🚨 Критичные правила безопасности

### Tenant Isolation
- **ВСЕГДА** фильтровать по `tenant_id`
- Prisma middleware **обязателен**
- Тесты изоляции **100% coverage** обязательны

### RBAC - Клиент НЕ видит себестоимость!
- ❌ Клиент НЕ должен видеть: `total_cost`, `price_cost`, `margin`, `margin_pct`
- ✅ Клиент видит только: `total_client`, `price_client`
- Permission `estimates:view_cost` - только для Owner/PM
- **Ownership checks** обязательны (не только роли!)

---

## 📁 Структура проекта

```
BuildOS/
├── apps/
│   └── web/                    # Next.js 15 App Router
│       ├── app/
│       │   ├── (auth)/        # Auth routes
│       │   ├── (dashboard)/   # Main app
│       │   └── (client)/      # Client portal
│       └── components/
├── packages/
│   ├── database/              # Prisma schema + migrations
│   ├── services/              # Business logic (изолирован!)
│   ├── auth/                  # Auth utilities
│   ├── rbac/                  # RBAC engine
│   ├── estimate-engine/      # ⭐ ЯДРО ПРОДУКТА
│   ├── ui/                    # Shared components (shadcn/ui)
│   ├── i18n/                  # i18n utilities
│   └── config/                # Shared configs
├── docs/                      # 📚 Документация
│   ├── architecture/          # ADR, tech stack, data model
│   ├── product/               # PRD, RBAC, formulas, etc.
│   ├── development/           # Deploy guide
│   └── README.md              # Навигация
├── infra/
│   ├── docker/                # Dockerfiles
│   ├── nginx/                 # Nginx vhosts + SSL scripts
│   └── systemd/               # systemd units
└── .github/workflows/         # CI/CD (deploy, PR checks)
```

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** (App Router)
- **TypeScript 5+**
- **shadcn/ui** + TailwindCSS
- **react-hook-form** + **zod**
- **zustand** (UI state) + **React Query** (server state)

### Backend
- **Node.js 20+**
- **Prisma 6** + **PostgreSQL 16**
- **Redis 7** + **BullMQ**
- **NextAuth.js v5**
- **@react-pdf/renderer** (PDF generation)

### Infrastructure
- **Docker 29+** + **Docker Compose v5**
- **Nginx 1.24** + Let's Encrypt
- **systemd** (production)
- **GitHub Actions** + **GHCR**

**Полный список:** `docs/architecture/tech-stack.md`

---

## 🎯 Текущий статус проекта

### ✅ Готово:
- Infrastructure (Docker, Nginx, SSL, systemd)
- CI/CD pipeline (GitHub Actions + GHCR)
- Deployment automation
- Documentation structure
- 14 GitHub Issues для MVP 1.0

### 🚧 В работе:
- **НИЧЕГО** (awaiting start)

### ⏳ Следующие шаги:
1. Issue #1: Setup Turborepo
2. Issue #2: Prisma schema
3. Issue #3: Testing infrastructure
4. Issue #4: Authentication

**Tracking Issue:** https://github.com/DesignCorporation/BuildOS/issues/14

---

## 📦 Важные команды

### Development
```bash
# Install dependencies
npm install

# Start dev environment (Docker)
docker compose -f docker-compose.dev.yml up -d

# Run dev server
npm run dev

# Run tests
npm run test

# Lint
npm run lint

# Type check
npm run typecheck

# Build
npm run build
```

### Database (Prisma)
```bash
# Create migration
npx prisma migrate dev --name migration_name

# Run migrations
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate

# Open Prisma Studio
npx prisma studio

# Seed database
npx prisma db seed
```

### Production
```bash
# SSH to server
ssh root@188.34.201.9

# View logs
journalctl -u buildos -f
docker compose -f docker-compose.prod.yml logs -f

# Restart services
systemctl restart buildos
docker compose -f docker-compose.prod.yml restart web

# Backup database
docker compose exec postgres pg_dump -U buildos buildos_prod > backup.sql
```

---

## 📚 Ключевая документация

### Обязательно к прочтению:
1. **ADR Pack:** `docs/architecture/adr/ADR_PACK_V1.md`
2. **PRD Poland:** `docs/product/prd-poland-v0.md`
3. **RBAC Matrix:** `docs/product/rbac-matrix.md`
4. **Estimate Formulas:** `docs/product/estimate-formulas.md`
5. **Data Model:** `docs/architecture/data-model.md`

### Deployment:
- **Deploy Guide:** `docs/development/deploy.md`
- **Infrastructure Setup:** `INFRASTRUCTURE_SETUP_COMPLETE.md`

### Navigation:
- **Docs Index:** `docs/README.md`

---

## 💰 Estimate Engine - ЯДРО ПРОДУКТА

**Самая важная часть проекта!**

### Формулы:
- **Area:** `length × width`
- **Walls:** `perimeter × height`
- **Cost:** `Σ(работы + материалы + субподряд)`
- **Revenue:** `Cost × (1 + Margin%)`

### Коэффициенты:
- Сложность: 1.0 – 1.5
- Срочность: 1.0 – 1.3
- Состояние: 1.0 – 1.2
- Этаж: 1.05 – 1.15

### Критично:
- **Margin материализуется** (ADR-09) - сохраняется при записи!
- **Версионность** обязательна (v1, v2, ...)
- **100% test coverage** для Engine

**Детали:** `docs/product/estimate-formulas.md`

---

## 🧪 Тестирование

### Обязательные тесты (ADR-10):

**Unit Tests:**
- Estimate Engine (100% coverage!)
- Business logic в services

**Integration Tests:**
- RBAC (проверка прав доступа)
- Tenant isolation (100% coverage!)
- API endpoints

**E2E Tests:** (Phase 2)

### Test Commands:
```bash
npm run test              # All tests
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
npm run test:coverage     # With coverage report
```

---

## 🚫 Что НЕ делать

### ❌ Запрещено:
1. **НЕ** обходить tenant isolation
2. **НЕ** показывать себестоимость клиенту
3. **НЕ** делать тяжёлые операции в UI thread (PDF → jobs!)
4. **НЕ** хранить secrets в коде
5. **НЕ** создавать Custom Fields в MVP 1.0 (ADR-07)
6. **НЕ** делать миграции без soft delete для бизнес-сущностей
7. **НЕ** skip тесты для Estimate Engine и tenant isolation
8. **НЕ** менять ADR без обсуждения и нового ADR

### ⚠️ Over-engineering:
- НЕ добавлять features, которых нет в issue
- НЕ создавать абстракции "на будущее"
- НЕ добавлять комментарии к коду который не меняли
- Следовать принципу: **минимальная сложность для текущей задачи**

---

## 🔐 Environment Variables

### Development (.env.local):
```env
DATABASE_URL="postgresql://buildos:buildos_dev_password@localhost:5432/buildos_dev"
REDIS_URL="redis://localhost:6379"
NEXTAUTH_SECRET="dev-secret-32-chars-minimum"
NEXTAUTH_URL="http://localhost:3000"
```

### Production (.env на сервере):
```env
DATABASE_URL="postgresql://buildos:STRONG_PASSWORD@postgres:5432/buildos_prod"
REDIS_URL="redis://:REDIS_PASSWORD@redis:6379"
MINIO_ENDPOINT="minio"
MINIO_PORT="9000"
NEXTAUTH_SECRET="<32-char-secret>"
NEXTAUTH_URL="https://buildos.designcorp.eu"
```

**⚠️ НИКОГДА не коммитить .env файлы!**

---

## 🌍 Deployment

### Production Server:
- **Host:** 188.34.201.9
- **Location:** /opt/buildos
- **Domains:**
  - buildos.designcorp.eu
  - operator.buildos.designcorp.eu

### Deployment Flow:
1. Push to `main` → GitHub Actions triggers
2. Build Docker image → Push to GHCR
3. SSH to server → Pull image
4. Run migrations → Restart services
5. Health check

**Детали:** `docs/development/deploy.md`

---

## 📋 GitHub Issues

**Master Tracking:** https://github.com/DesignCorporation/BuildOS/issues/14

### MVP 1.0 Issues (14 total):

**Infrastructure (#1-3):**
- #1 Turborepo setup
- #2 Prisma schema
- #3 Testing infrastructure

**Security (#4-6):**
- #4 Authentication
- #5 Multi-tenancy
- #6 RBAC

**Core Features (#7-9):**
- #7 Projects CRUD
- #8 Rooms CRUD
- #9 ⭐ Estimate Engine

**Client Experience (#10-11):**
- #10 PDF export
- #11 Client portal

**Finalization (#12-13):**
- #12 i18n (RU/PL)
- #13 Production deployment

---

## 🎯 Definition of Done для Issues

Issue считается завершенным когда:

- ✅ Все задачи выполнены
- ✅ Код соответствует ADR
- ✅ Тесты написаны и проходят
- ✅ RBAC правильно применён
- ✅ Tenant isolation не нарушен
- ✅ TypeScript без ошибок
- ✅ ESLint пройден
- ✅ PR ревью пройден
- ✅ Документация обновлена (если нужно)

---

## 🤝 Coding Conventions

### TypeScript:
- **Строгая типизация** - no `any` без крайней необходимости
- **Interfaces** для публичных API, **Types** для внутренних
- **Zod schemas** для валидации входных данных

### React/Next.js:
- **Server Components** by default
- **Client Components** только где нужна интерактивность
- **Server Actions** для mutations
- **React Query** для client-side data fetching

### Naming:
- **Files:** kebab-case (`estimate-engine.ts`)
- **Components:** PascalCase (`EstimateForm.tsx`)
- **Functions:** camelCase (`calculateMargin()`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_PROJECTS`)

### Database:
- **Tables:** PascalCase (`Project`, `Estimate`)
- **Fields:** camelCase (`totalClient`, `createdAt`)
- **Indexes:** обязательны для `tenant_id`, `createdAt`, foreign keys

---

## 🔗 Полезные ссылки

- **Repo:** https://github.com/DesignCorporation/BuildOS
- **Issues:** https://github.com/DesignCorporation/BuildOS/issues
- **Production:** https://buildos.designcorp.eu
- **Operator:** https://operator.designcorp.eu
- **Email:** info@designcorp.eu

---

## 🆘 Проблемы и решения

### Tenant isolation не работает?
→ Проверь Prisma middleware в `packages/database`
→ Проверь что `tenant_id` есть во всех WHERE

### Клиент видит себестоимость?
→ **КРИТИЧНО!** Проверь RBAC permission `estimates:view_cost`
→ Проверь API endpoint - должен фильтровать поля

### PDF генерация блокирует UI?
→ Используй BullMQ job (ADR-05)
→ Проверь `packages/jobs`

### Тесты падают?
→ Проверь тестовую БД
→ Убедись что seed data загружены
→ Проверь tenant isolation в тестах

---

## 📝 Changelog / Updates

**2026-01-02:**
- ✅ Infrastructure setup complete
- ✅ 14 GitHub Issues created
- ✅ Documentation reorganized
- ✅ CLAUDE.md created

---

**Последнее обновление:** 2026-01-02
**Статус проекта:** 🟡 Ready for MVP 1.0 development
**Следующий шаг:** Issue #1 - Setup Turborepo
