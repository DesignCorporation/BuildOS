# BuildOS — Invoice Workflow (v1)

## Назначение

Invoice Management — система выставления счетов и контроля оплат для строительных проектов. Позволяет:
- Выставлять счета клиентам
- Отслеживать оплаты
- Блокировать работы при просрочке платежа (Payment Gating)
- Интегрироваться с бухгалтерией (Phase 2)

---

## 1) Типы инвойсов

### Client Invoice (Счет клиенту)
Основной тип — счет от компании клиенту за выполненные работы.

**Сущности:**
- Project (проект)
- Contract (договор, опционально)
- Invoice (счет)

**Workflow:**
```
Draft → Issued → (Paid | Overdue) → Closed
```

---

## 2) Жизненный цикл инвойса

### 2.1 Создание (Draft)
- Создается вручную Owner/PM через UI
- Привязывается к проекту (обязательно)
- Может привязываться к контракту (опционально)
- Заполняются поля: номер, сумма, валюта, даты

### 2.2 Выставление (Issued)
- Статус меняется на "issued" при создании
- Invoice отправляется клиенту (email/PDF)
- Начинается отсчет до due date

### 2.3 Оплата (Paid)
- Owner/PM помечает как "paid" вручную
- Или автоматически при интеграции с PSP (Phase 2)
- Блокировка снимается

### 2.4 Просрочка (Overdue)
**Автоматический переход:**
- Если `dueDate < today` и `status != paid`
- Проверка через BullMQ job каждые 6 часов
- Триггерит Payment Gating

### 2.5 Закрытие (Closed)
- Архивация оплаченного invoice
- Не участвует в отчетах "активных"

---

## 3) Статусы инвойса

| Статус | Описание | Автоматический переход |
|--------|----------|------------------------|
| `issued` | Выставлен, ожидает оплаты | Создание |
| `paid` | Оплачен | Вручную или webhook |
| `overdue` | Просрочен (due date прошел) | Автоматически (cron) |
| `cancelled` | Отменен | Вручную |

**Переходы:**
```
issued → paid
       ↘ overdue → paid
       ↘ cancelled
```

---

## 4) Сущности в системе

### Invoice Entity
```typescript
{
  id: string;
  tenantId: string;           // Мультитенантность
  projectId: string;          // Привязка к проекту
  contractId?: string;        // Опционально к договору
  number: string;             // Номер счета (unique per tenant)
  status: "issued" | "paid" | "overdue" | "cancelled";
  issueDate: Date;            // Дата выставления
  dueDate?: Date;             // Срок оплаты (опционально)
  amount: Decimal;            // Сумма
  currency: "PLN" | "EUR" | "USD";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;           // Soft delete
}
```

**Database Constraints:**
- UNIQUE (tenantId, number) - номер уникален в рамках tenant
- INDEX (tenantId, deletedAt) - для soft delete фильтрации
- INDEX (tenantId, status, dueDate) - для overdue queries

---

## 5) Бизнес-правила

### Создание инвойса
1. Номер автоматический (`INV-0001`, `INV-0002`, ...) или ручной
2. Обязательные поля: `projectId`, `number`, `amount`, `issueDate`
3. Валюта по умолчанию: PLN (настройка tenant)
4. Статус при создании: `issued`

### Overdue Logic
```typescript
if (invoice.dueDate < today && invoice.status !== "paid") {
  invoice.status = "overdue";
}
```

**Проверка:**
- BullMQ cron job каждые 6 часов (prod) / 5 минут (dev)
- Bulk update через `updateMany` для производительности
- Работает автоматически БЕЗ синхронных проверок

### Payment Gating
**Правило:**
- Если у проекта есть хотя бы 1 invoice со статусом `overdue`
- → Показывается красный banner на странице проекта
- Сообщение: "Payments overdue: work is paused until invoices are settled."

**UI:**
- Banner видна только Owner/PM (не клиентам)
- Красный фон (alert-danger)
- Видна на странице проекта в разделе Details

---

## 6) Роли и права (RBAC)

| Роль | Просмотр | Создание | Изменение статуса | Примечание |
|------|----------|----------|-------------------|------------|
| **Owner** | ✅ Все | ✅ | ✅ | Полный доступ |
| **Project Manager** | ✅ Все | ✅ | ✅ | Полный доступ |
| **Accountant** | ✅ Все | ✅ | ✅ | Финансовая роль |
| **Client** | ❌ Нет | ❌ | ❌ | НЕТ доступа к invoices |

**Permissions:**
- `invoices:view` - Просмотр списка invoices
- `invoices:create` - Создание новых invoices
- `invoices:update` - Изменение статуса (mark paid)

**Важно:** Клиенты НЕ видят invoices — это финансовая информация (себестоимость, маржа).

---

## 7) UI/UX Flow

### Страница проекта
**Вкладка "Invoices"** (если `canViewInvoices`):
1. Таблица всех invoices проекта
2. Колонки: Номер, Сумма, Валюта, Issue Date, Due Date, Статус, Контракт
3. Статусные бейджи:
   - `issued` - синий (blue)
   - `paid` - зеленый (green)
   - `overdue` - красный (red)
   - `cancelled` - серый (gray)
4. Кнопка "Mark as Paid" (если `canManageInvoices`)

### Payment Gating Banner
```tsx
{hasOverdueInvoices && (
  <div className="alert alert-danger">
    Payments overdue: work is paused until invoices are settled.
  </div>
)}
```

**Условия:**
- Видна только пользователям с `invoices:view`
- Если есть >= 1 invoice со статусом `overdue`
- Над основным контентом проекта

### Форма создания Invoice
Поля:
- **Number** - номер счета (auto-generated или manual)
- **Amount** - сумма (number, positive)
- **Currency** - валюта (select: PLN/EUR/USD, default: PLN)
- **Issue Date** - дата выставления (date picker, required)
- **Due Date** - срок оплаты (date picker, optional)
- **Contract** - договор (select, optional)
- **Notes** - примечания (textarea, optional)

---

## 8) Интеграции (Phase 2)

### Payment Service Providers (PSP)
**Для онлайн оплаты:**
- Stripe (международный)
- Przelewy24 (Польша)
- PayU (Польша)

**Webhook flow:**
```
Client pays → PSP webhook → Verify signature → Update invoice.status = "paid" → Notify
```

### Бухгалтерские системы
- Export в CSV/XLSX
- API интеграция (будущее)

---

## 9) Автоматизация (BullMQ Jobs)

### Invoice Overdue Checker
**Задача:** Автоматическая проверка и пометка просроченных invoices

**Параметры:**
- Queue: `invoice-management`
- Job name: `check-overdue-invoices`
- Cron pattern (prod): `0 */6 * * *` (каждые 6 часов)
- Cron pattern (dev): `*/5 * * * *` (каждые 5 минут)
- Concurrency: 1 (только один экземпляр)

**Логика:**
```sql
UPDATE invoices
SET status = 'overdue', updated_at = NOW()
WHERE due_date < NOW()
  AND status NOT IN ('paid', 'overdue')
  AND deleted_at IS NULL
  AND tenant_id = <tenant_id>;
```

**Deployment:**
- Отдельный Docker контейнер: `buildos-worker-invoice`
- Использует тот же Redis и БД как основное приложение
- Логи в stdout (docker logs buildos-worker-invoice)
- Автоматически запускается при старте проекта

---

## 10) Мультивалюта (MVP: Single Currency)

**MVP 1.0:**
- Каждый invoice в одной валюте
- Валюта по умолчанию настраивается в tenant (PLN)
- Поддержка: PLN, EUR, USD

**Phase 2:**
- Конвертация валют
- Фиксация exchange rate при создании
- Multi-currency отчеты

---

## 11) Нумерация инвойсов

### Формат номера
**Рекомендуемый:** `INV-{NNNN}` (например: `INV-0001`, `INV-0002`)

**Генерация:**
```typescript
const lastInvoice = await prisma.invoice.findFirst({
  where: { tenantId },
  orderBy: { createdAt: 'desc' },
});

const lastNumber = lastInvoice ? parseInt(lastInvoice.number.split('-')[1]) : 0;
const newNumber = `INV-${String(lastNumber + 1).padStart(4, '0')}`;
```

**Constraint:** UNIQUE (tenantId, number) - номер должен быть уникален в рамках tenant

---

## 12) Документы и экспорт

### PDF генерация (Phase 2)
- PDF invoice template (польская/русская локализация)
- Email отправка клиенту
- Хранение в MinIO

### Email notifications (Phase 2)
- Invoice issued → email клиенту с PDF
- Reminder за 3 дня до due date
- Overdue notification

---

## 13) Audit Trail

**Обязательное логирование:**
- Создание invoice
- Изменение статуса (issued → paid, issued → overdue)
- Отмена invoice

**Поля в AuditLog:**
```typescript
{
  resource: "invoice",
  resourceId: invoice.id,
  action: "update_status",
  changes: {
    before: { status: "issued" },
    after: { status: "paid" },
  },
  actorId: userId,
  metadata: {
    paymentMethod: "bank_transfer",
    transactionId: "...",
  },
}
```

---

## 14) Soft Delete

**Правило:** Invoice — бизнес-сущность → soft delete обязателен

**Логика:**
```typescript
// Вместо DELETE
await prisma.invoice.update({
  where: { id },
  data: { deletedAt: new Date() },
});

// Фильтрация по умолчанию
where: {
  tenantId,
  deletedAt: null, // Только активные
}
```

---

## 15) Связь с Contract (опционально)

**Contract → Invoice связь:**
- Один Contract может иметь несколько Invoices (по милестоунам)
- Invoice может существовать без Contract (разовый счет)

**Пример использования:**
```
Contract "Renovation Villa" (500,000 PLN)
  ├─ Invoice 1: Advance payment (150,000 PLN)
  ├─ Invoice 2: Milestone 1 - Foundation (100,000 PLN)
  ├─ Invoice 3: Milestone 2 - Walls (150,000 PLN)
  └─ Invoice 4: Final payment (100,000 PLN)
```

---

## 16) Безопасность

### Tenant Isolation ✅
- Все запросы фильтруются по `tenantId` через `BaseRepository`
- UNIQUE constraint: `(tenantId, number)`
- Невозможно увидеть invoices другого tenant

### RBAC ✅
- Клиенты НЕ видят invoices (финансовая информация)
- Проверка permissions перед всеми операциями
- Ownership checks (invoice принадлежит проекту tenant)

### Validation ✅
- Zod schema для всех входных данных
- Amount > 0
- Valid currency (PLN/EUR/USD)
- Valid dates (issueDate <= dueDate)

---

## 17) Метрики и мониторинг

**Ключевые метрики:**
- Общая сумма issued invoices
- Общая сумма paid invoices
- Количество overdue invoices
- Средний срок оплаты (days to payment)
- Conversion rate (issued → paid)

**Dashboard cards:**
```
┌─────────────────────┐  ┌─────────────────────┐
│ Total Outstanding   │  │ Overdue Invoices    │
│ 125,000 PLN         │  │ 3 invoices          │
└─────────────────────┘  └─────────────────────┘
```

---

## 18) Тестирование

### Unit Tests
- 7 тестов для `isInvoiceOverdue()` utility функции
- Проверка edge cases (null dates, boundary conditions, string dates)

### Integration Tests
- 13 тестов для `InvoiceService`
- Проверка создания, получения, обновления, tenant isolation
- Мягкие удаления (soft delete)

### Repository Tests
- 15 тестов для `InvoiceRepository`
- Проверка database operations, pagination, bulk updates
- Tenant isolation при markOverdue

**Запуск:**
```bash
cd packages/services
npm test

cd ../database
npm test
```

**Ожидаемый результат:** 35+ тестов, coverage > 80%

---

## 19) Development Setup

### Локальное окружение
1. Убедитесь что запущены PostgreSQL и Redis:
```bash
docker-compose -f docker-compose.dev.yml up postgres redis
```

2. Запустите миграции:
```bash
npm run db:migrate
```

3. Запустите тесты:
```bash
npm test
```

4. Запустите worker (опционально):
```bash
docker-compose -f docker-compose.dev.yml --profile worker up worker-invoice
```

### Production Setup
```bash
# Worker автоматически запускается в отдельном контейнере
docker-compose -f docker-compose.prod.yml up worker-invoice
```

---

## 20) Будущие фичи (Phase 2+)

1. **Online оплата** (Stripe/Przelewy24)
2. **Recurring invoices** (подписки)
3. **Invoice templates** (шаблоны счетов)
4. **Partial payments** (частичная оплата)
5. **Credit notes** (возврат средств)
6. **Multi-currency exchange** (конвертация)
7. **Bank integration** (автоматическая сверка платежей)
8. **Invoice approval workflow** (согласование перед отправкой)

---

## 21) API Endpoints (Phase 2)

```
POST   /api/projects/:id/invoices          - Create invoice
GET    /api/projects/:id/invoices          - List invoices
GET    /api/invoices/:id                   - Get invoice details
PUT    /api/invoices/:id                   - Update invoice
DELETE /api/invoices/:id                   - Soft delete invoice
POST   /api/invoices/:id/mark-paid         - Mark as paid
POST   /api/admin/invoices/check-overdue   - Manual trigger overdue check
```

---

## 22) Миграция данных (при обновлении)

Если у вас уже есть invoices из другой системы:

1. Экспортировать CSV из старой системы
2. Загрузить в BuildOS через API (Phase 2)
3. Или импортировать вручную через админ-панель

---

## Ссылки

- **Тесты:** `packages/services/tests/invoice.service.test.ts`
- **Integration тесты:** `packages/services/tests/invoice.service.integration.test.ts`
- **Repository тесты:** `packages/database/tests/invoice-repository.test.ts`
- **Worker:** `apps/web/lib/workers/invoice-worker.ts`
- **Сервис:** `packages/services/src/invoice.service.ts`
- **RBAC Matrix:** `docs/product/rbac-matrix.md`
- **Contracts:** `docs/product/contracts-workflow.md`
- **Billing & Payments:** `docs/product/billing-payments.md`

---

**Версия:** v1 (MVP 1.0)
**Дата:** 2026-01-13
**Статус:** ✅ Реализовано полностью (Issue #23)
