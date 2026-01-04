# Issue #15 - Estimate Engine v1 ✅

**Статус:** Завершено (Этапы 1-4)
**Дата:** 2026-01-04

## Что реализовано

### ✅ Этап 1: Server Actions (API)

**Файлы:**
- `apps/web/app/actions/estimates.ts` (374 строки)

**Функционал:**
- 9 Server Actions для работы со сметами
- Zod валидация всех входных данных
- Интеграция с EstimateService (БЕЗ прямого Prisma!)
- RBAC-aware `getEstimateForUserAction` с фильтрацией cost полей
- Mock auth context (будет заменен на NextAuth в Issue #4)

**Actions:**
1. `createEstimateAction` - создать смету с items
2. `addItemToEstimateAction` - добавить item (auto-recalc)
3. `updateItemAction` - обновить item (auto-recalc)
4. `deleteItemAction` - удалить item (auto-recalc)
5. `sendEstimateAction` - отправить клиенту (status → sent)
6. `approveEstimateAction` - утвердить (status → approved)
7. `getEstimateForUserAction` - получить с RBAC фильтрацией
8. `createNewVersionAction` - создать новую версию
9. `generatePdfAction` - запустить PDF генерацию (BullMQ job)

---

### ✅ Этап 2: UI Estimate Builder

**Файлы:**
- `apps/web/app/(dashboard)/projects/[id]/estimates/new/page.tsx`
- `apps/web/app/(dashboard)/projects/[id]/estimates/new/estimate-builder.tsx` (395 строк)

**Функционал:**
- Таблица items с inline редактированием
- Добавление/удаление элементов (работы, материалы, субподряд)
- **Автоматический пересчёт totals/margin** в реальном времени
- Кнопки:
  - "Сохранить черновик" → `createEstimateAction`
  - "Сохранить и отправить клиенту" → `createEstimateAction` + `sendEstimateAction`
- Error/Success уведомления
- Client-side state (React useState)

**UI не содержит бизнес-логики** - все расчёты через EstimateService!

---

### ✅ Этап 3: BullMQ + PDF Generation

**Файлы:**
- `apps/web/lib/queue.ts` - BullMQ queue config
- `apps/web/lib/pdf/estimate-template.tsx` - React-PDF template
- `apps/web/lib/workers/pdf-worker.ts` - PDF worker
- `apps/web/app/api/pdfs/[filename]/route.ts` - PDF download API
- `packages/database/prisma/schema.prisma` - добавлены `pdfUrl`, `pdfGeneratedAt`

**Функционал:**

1. **BullMQ Queue:**
   - Queue name: `pdf-generation`
   - Retry: 3 раза с exponential backoff
   - Auto-cleanup: completed (24h), failed (7 days)

2. **React-PDF Template:**
   - ❌ **БЕЗ cost полей!** (CLIENT-SAFE)
   - ✅ Только: `unitClient`, `totalClient`
   - Поддержка: версионность, описания, типы работ
   - Красивое форматирование (A4, таблица, totals)

3. **PDF Worker:**
   - Concurrency: 5 параллельных PDF
   - Генерация через `@react-pdf/renderer`
   - Хранение: `/tmp/buildos-pdfs` (MVP), позже MinIO/S3
   - Обновление Estimate с `pdfUrl` и `pdfGeneratedAt`

4. **API Endpoint:**
   - Route: `/api/pdfs/[filename]`
   - Security: валидация filename (защита от path traversal)
   - Headers: Content-Type, Cache-Control

5. **Database Schema:**
   ```prisma
   model Estimate {
     // ...
     pdfUrl         String?
     pdfGeneratedAt DateTime?
     // ...
   }
   ```

---

### ✅ Этап 4: Client View (Read-only)

**Файлы:**
- `apps/web/app/(client)/estimate/[id]/page.tsx` (237 строк)

**Функционал:**
- Route: `/estimate/[id]` (route group: `(client)`)
- **Публичный доступ** для sent/approved смет
- **RBAC Protection:**
  - Prisma select: ТОЛЬКО `unitClient`, `totalClient`
  - ❌ НЕТ: `unitCost`, `totalCost`, `margin`, `marginPercent`
  - Security check: `status in ["sent", "approved"]`

**UI для клиента:**
- Минимальный дизайн (не для админа!)
- Таблица items с описаниями
- Общая сумма к оплате
- Кнопка "Скачать PDF" (если сгенерирован)
- Информация о проекте, версии, статусе

**КРИТИЧНО:** Клиент НЕ видит себестоимость и маржу!

---

## Архитектурные решения

### 1. Service Layer изоляция (ADR-02)
- ✅ UI → Server Actions → EstimateService
- ✅ НЕТ прямого Prisma/Repository в UI

### 2. Margin материализуется (ADR-09)
- ✅ Все totals/margin сохраняются в БД
- ✅ Auto-recalc при изменении items

### 3. Background Jobs (ADR-05)
- ✅ PDF генерация через BullMQ
- ✅ НЕ блокирует UI

### 4. RBAC (ADR-06)
- ✅ Client НИКОГДА не видит cost/margin
- ✅ Фильтрация на уровне Prisma select
- ✅ Security check в Client View

### 5. Tenant Isolation
- ✅ Все операции с `tenantId` из context
- ✅ PDF worker проверяет tenant при fetch

---

## Что НЕ сделано (выходит за scope Issue #15)

❌ **Этап 5: Integration Tests**
- Требует тестовую инфраструктуру (Issue #3 - не завершен)
- Будет реализовано позже

❌ **Material/Work Catalog integration**
- Пока simple input fields
- Каталог будет в следующих issues

❌ **Real Auth (NextAuth)**
- Используется mock `getCurrentContext()`
- Будет заменен в Issue #4 (Authentication)

❌ **MinIO/S3 для PDF**
- MVP использует `/tmp/buildos-pdfs`
- Production storage - позже

❌ **Email уведомления**
- "Отправить клиенту" пока только меняет status
- Email integration - в Issue #21 (Client Portal)

---

## Следующие шаги (Production-Grade)

### Development (локально)

1. **Создать и применить Prisma migration:**
   ```bash
   cd packages/database
   npx prisma migrate dev --name add_pdf_fields_to_estimate
   npx prisma generate
   ```

2. **Установить зависимости:**
   ```bash
   npm install
   ```

3. **Запустить dev окружение через Docker Compose:**
   ```bash
   # Запустить всё (postgres, redis, minio, web, worker-pdf)
   docker compose -f docker-compose.dev.yml up -d

   # Проверить логи worker
   docker compose -f docker-compose.dev.yml logs -f worker-pdf
   ```

4. **Тестирование:**
   - Создать проект
   - Создать смету через `/projects/[id]/estimates/new`
   - Отправить клиенту
   - Открыть Client View: `/estimate/[estimateId]`
   - **Проверить Network tab:** JSON не должен содержать `unitCost`, `totalCost`, `margin`, `marginPercent`

### Production (сервер)

1. **Применить миграции (БЕЗ migrate dev!):**
   ```bash
   # В CI/CD или вручную на сервере
   cd packages/database
   npx prisma migrate deploy
   npx prisma generate
   ```

2. **Запустить production окружение:**
   ```bash
   # Убедиться что .env файл настроен
   # Запустить весь стек (включая worker-pdf)
   docker compose -f docker-compose.prod.yml up -d

   # Проверить что worker запустился
   docker compose -f docker-compose.prod.yml ps
   docker compose -f docker-compose.prod.yml logs worker-pdf
   ```

3. **Проверить healthchecks:**
   ```bash
   docker compose -f docker-compose.prod.yml ps
   # Все сервисы должны быть "healthy"
   ```

### Контрольные проверки

- [ ] **DB migrations applied:** `prisma migrate deploy` выполнен без ошибок
- [ ] **Redis доступен:** `docker exec buildos-web-dev redis-cli -h redis ping` → PONG
- [ ] **Worker обрабатывает jobs:** В логах `docker logs buildos-worker-pdf` видны "[PDF Worker] Processing job..."
- [ ] **PDF генерируется:** `pdfUrl` и `pdfGeneratedAt` сохраняются в БД
- [ ] **Client view безопасен:** Network tab не показывает cost/margin поля
- [ ] **PDF доступен для скачивания:** `/api/pdfs/estimate-XXX.pdf` возвращает PDF файл

---

## Commits

1. **4a2cabb** - feat: Issue #15 Этап 1 - Server Actions для Estimate Engine
2. **d68e5f7** - feat: Issue #15 Этап 2 - UI для Estimate Builder
3. **d71d345** - feat: Issue #15 Этап 3 - BullMQ + PDF Generation
4. **5ed5204** - feat: Issue #15 Этап 4 - Client View (Read-only)

---

## Статистика

**Файлов создано:** 9
**Файлов изменено:** 2
**Строк кода:** ~1800
**Время разработки:** 1 сессия (поэтапно)

---

## Security Checklist ✅

- [x] Client НЕ видит cost/margin (RBAC)
- [x] Prisma select фильтрует поля
- [x] Tenant isolation во всех операциях
- [x] PDF filename validation (path traversal защита)
- [x] Status check в Client View (только sent/approved)
- [x] Zod валидация всех inputs

---

**Готово к production после:**
- [ ] Prisma migration applied
- [ ] Redis запущен
- [ ] PDF Worker запущен как systemd service
- [ ] Issue #4 (NextAuth) - real auth
- [ ] Issue #3 (Testing) - integration tests
- [ ] MinIO/S3 integration для PDF storage
