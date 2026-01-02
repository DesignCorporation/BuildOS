# BuildOS — Модель данных v0 (Prisma-ready)

## Core
- Tenant(id, name, locale, currency)
- User(id, tenant_id, name, email, status)
- Role(id, code)
- UserRole(user_id, role_id)

## Objects
- Project(id, tenant_id, type, address, status)
- Room(id, project_id, name, area)
- Stage(id, project_id, code, status, order)

## Estimate
- Estimate(id, project_id, version, total_client, total_cost)
- EstimateItem(id, estimate_id, type, qty, price_client, price_cost)

## Materials
- Material(id, tenant_id, unit, price)
- MaterialUsage(id, project_id, material_id, qty)

## Workforce
- WorkerProfile(user_id, skill, rate)
- Assignment(project_id, user_id, stage_id)

## Media
- Media(id, project_id, stage_id, type, url)

## Finance
- Invoice(id, project_id, client_id, amount, status)
- Payment(id, invoice_id, amount, date)

> Все таблицы содержат tenant_id (явно или через связь).

