# BuildOS — Архитектура системы (v0)

## 1) Общая схема
- Frontend: Next.js (App Router)
- Backend: Next.js API Routes / Server Actions
- Auth: Credentials + OAuth (позже)
- ORM: Prisma
- DB: PostgreSQL
- Storage (media): S3-compatible (MinIO / cloud)

## 2) Multi-tenant модель
- Tenant определяется при логине
- Все запросы фильтруются по tenant_id
- RBAC middleware

## 3) Frontend слои
- App layout (sidebar + topbar)
- Feature modules:
  - projects
  - estimates
  - workforce
  - finance
  - media

## 4) Backend слои
- API layer
- Service layer (business logic)
- Data layer (Prisma)

## 5) Безопасность
- RBAC + ownership checks
- Audit log (кто/что/когда)
- Разделение client/admin API

## 6) Медиа
- Фото до/после
- Привязка к объекту/этапу
- Метаданные (дата, автор, стадия)

## 7) Масштабирование (позже)
- Background jobs (очереди)
- Кэширование (Redis)
- Feature flags

## 8) CI/CD
- GitHub Actions
- Preview deploy
- Production deploy

