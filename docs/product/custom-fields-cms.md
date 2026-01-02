# BuildOS — Конструктор полей и расширяемость (CMS-подход) v0

## 1) Цель
Сделать систему «как конструктор», чтобы:
- добавлять новые поля (например «тип отделки», «серия плитки», «прораб на объекте»)
- не делать миграции Prisma под каждое новое поле
- настраивать формы и справочники в админке

Ключевая идея: **ядро — типизированные таблицы**, расширения — через **metadata + JSONB**.

## 2) Что обязательно держать в «жёсткой схеме» (таблицы)
Это то, что нужно часто фильтровать/джойнить/считать:
- tenant, user, role
- project, room, stage
- estimate, items
- invoices, payments
- assignments

## 3) Custom Fields Framework (основа конструктора)
### Таблицы
- CustomFieldDefinition
  - tenant_id
  - entity_type (Project/Room/Stage/Estimate/Client/Worker …)
  - key (строка, уникальная в рамках entity+tenant)
  - label_i18n (RU/PL/…)
  - field_type (text, number, date, select, multi-select, boolean, file)
  - options (JSON — для select)
  - validations (JSON — required/min/max/regex)
  - is_indexed (bool, для ускорения поиска)

- CustomFieldValue
  - tenant_id
  - entity_type
  - entity_id
  - field_key
  - value_json (JSONB)

### Как это работает
- В админке клиент добавляет поле → создаётся Definition
- В формах UI рендерится поле по Definition
- Значение хранится в Value

## 4) Вариант «дешевле и быстрее»
Для некоторых сущностей можно хранить `custom_data JSONB` прямо в таблице (например Project.custom_data).
Плюсы: меньше таблиц.
Минусы: сложнее индексировать и валидировать.

## 5) Поиск и индексация
- Для полей, которые важны для фильтров, используем:
  - is_indexed + materialized view / отдельную таблицу индекса
  - либо GIN-индексы по JSONB (Postgres)

## 6) Конструктор ролей и прав (без миграций)
### Таблицы
- Role (tenant_id, code, name_i18n)
- Permission (code, description)
- RolePermission (role_id, permission_code)

Добавление роли/права = запись в таблице.
В коде остаётся только набор базовых permission codes.

## 7) Конструктор этапов (templates)
- StageTemplate (tenant_id, type, name)
- StageTemplateItem (template_id, code, order, checklist_template_id)

Клиент настраивает шаблоны этапов, не трогая схему.

## 8) Границы конструктора
- Конструктор не должен ломать отчёты: важные числовые поля лучше держать типизированно.
- Для расчёта сметы критичные данные (qty, price, totals) — только в схеме.
- Custom fields — для «бизнес-атрибутов», которые меняются у разных компаний.

