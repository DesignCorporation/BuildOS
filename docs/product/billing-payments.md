# BuildOS — Биллинг и платежи (Subscriptions) v0

## 1) Требования
- Продажа подписки на доступ к BuildOS (тенант)
- Trial, upgrade/downgrade, отмена, пауза
- Инвойсы, история платежей
- Webhooks для синхронизации статусов
- Поддержка нескольких валют (но без «привязки к РФ»; RU — только язык UI)

## 2) Подходы
### A) Stripe Billing (PSP)
- Stripe Billing для подписок/инвойсов
- Хорошо подходит для B2B SaaS

### B) Paddle как Merchant of Record
- Paddle берёт на себя часть налоговой/платёжной сложности
- Удобно для международных продаж

### C) Локальные методы для Польши (опционально)
- Przelewy24 / PayU для локальных предпочтений (BLIK, быстрые переводы)

## 3) Сущности в системе
- Plan (код, цена, лимиты)
- Subscription (tenant_id, plan_id, status, current_period_end)
- PaymentProviderCustomer (tenant_id, provider, external_id)
- Invoice (provider_id, amount, status)

## 4) Статусы подписки
- trialing
- active
- past_due
- canceled
- paused
- suspended (ручная блокировка)

## 5) Webhook flow
Provider → webhook → verify signature → update subscription/invoice → log event

## 6) Мультиязычность checkout
- Checkout может быть локализован провайдером
- Внутренние письма/страницы — через i18n

## 7) Operator Console
- просмотр подписок
- ручная блокировка/разблокировка tenant
- возврат/коррекция (если провайдер поддерживает)

