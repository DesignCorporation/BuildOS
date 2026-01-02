# BuildOS — Architecture Decision Records (ADR Pack v1)

Этот документ фиксирует **ключевые архитектурные решения**, обязательные для исполнения всеми участниками разработки (люди и агенты).

---

## ADR-01 — Monorepo и структура приложений

**Статус:** Accepted

**Решение:**
Используем **Monorepo (Turborepo)**.

- Основное приложение: `apps/web`
- Client Portal НЕ выносится в отдельное приложение на старте
- Используем route groups / access policies внутри `apps/web`

**Причина:**
- Ускорение разработки
- Меньше DevOps и i18n-дублирования
- Отдельный client-portal появится только при необходимости

**Триггеры для пересмотра:**
- отдельный домен для клиентов
- отдельные политики деплоя
- отдельная команда

---

## ADR-02 — Service Layer и изоляция бизнес-логики

**Статус:** Accepted

**Решение:**
Вся бизнес-логика выносится в **Service Layer** и не зависит от Next.js.

Структура:
- `packages/services` — бизнес-логика
- `packages/database` — Prisma + repositories
- `apps/web` — UI + API handlers

**Причина:**
- переиспользование (jobs, CLI, workers)
- тестируемость
- снижение coupling

---

## ADR-03 — Soft Deletes

**Статус:** Accepted

**Решение:**
Soft delete используется **только для бизнес-сущностей**:
- Project
- Room
- Stage
- Estimate
- Invoice

Soft delete НЕ используется:
- join tables
- audit logs
- events

**Причина:**
- B2B требования (восстановление, аудит)
- GDPR (анонимизация отдельно)

---

## ADR-04 — Audit Trail

**Статус:** Accepted

**Решение:**
AuditLog обязателен для всех критичных операций.

Минимальные поля:
- tenant_id
- actor_id
- actor_type (user / operator / system)
- action
- entity + entity_id
- changes (JSON diff)
- trace_id
- created_at

**Причина:**
- безопасность
- разбор инцидентов
- доверие B2B клиентов

---

## ADR-05 — Background Jobs

**Статус:** Accepted

**Решение:**
Background jobs используются **с первого дня**.

Технологии:
- BullMQ + Redis

Обязательные jobs:
- PDF generation
- Email sending
- Webhooks
- Cleanup tasks

**Причина:**
- UI не блокируется
- масштабируемость

---

## ADR-06 — MVP Roadmap

**Статус:** Accepted

### MVP 1.0 (2–3 недели)
- Auth + Multi-tenancy + RBAC
- Projects + Rooms
- Estimate Engine (ядро)
- PDF export
- Client view (смета)

### MVP 1.1 (+1 неделя)
- Stages (simple workflow)
- Photos (upload + timeline)
- Client view (смета + фото)

### MVP 1.2 (+1 неделя)
- QA Checklists (checkbox per stage)
- Client view (+QA статус)

**Причина:**
- быстрое value
- дифференциаторы без переусложнения

---

## ADR-07 — Custom Fields

**Статус:** Accepted

**Решение:**
Custom Fields framework выносится в **Phase 2**.

В MVP:
- notes (Text)
- tags (String[])

**Триггер:**
- 2–3 клиента требуют разные поля

---

## ADR-08 — i18n Strategy

**Статус:** Accepted

**Решение:**

Searchable сущности → таблицы переводов:
- MaterialCatalog
- WorkType
- StageTemplate

Остальное:
- JSONB / i18n files

**Причина:**
- поиск без боли
- минимум миграций позже

---

## ADR-09 — Margin Calculation

**Статус:** Accepted

**Решение:**
- `total_client` и `total_cost` = source of truth
- `margin` и `margin_pct` **материализуются при записи**

**Причина:**
- быстрые отчёты
- простая формула

---

## ADR-10 — Testing Strategy

**Статус:** Accepted

**Решение:**
Тесты обязательны с MVP:
- Unit: Estimate Engine
- Integration: RBAC + tenant isolation

Инструменты:
- Vitest
- Playwright (позже)

**Причина:**
- предотвращение утечек данных
- стабильность ядра

---

## ADR-11 — Deployment & CI/CD

**Статус:** Accepted

**Решение:**
- Self-hosted deployment
- Docker Compose + Nginx
- GitHub Actions CI/CD

Pipeline:
- lint → tests → build → deploy

**Причина:**
- контроль инфраструктуры
- предсказуемые релизы

---

## Финальная фиксация

Этот ADR Pack является **обязательным контрактом**.
Изменения допускаются только через новый ADR.

