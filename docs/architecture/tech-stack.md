# BuildOS - Technology Stack

Полный перечень технологий используемых в BuildOS.

---

## 🎨 Frontend

### Core Framework
- **Next.js 15** (App Router) - React framework для production
- **React 18+** - UI библиотека
- **TypeScript 5+** - Типизированный JavaScript

### UI / Styling
- **shadcn/ui** - Компонентная библиотека (Radix UI + Tailwind)
- **TailwindCSS 3+** - Utility-first CSS framework
- **Radix UI** - Headless UI components
- **Lucide Icons** - Иконки

### Forms & Validation
- **react-hook-form** - Управление формами
- **zod** - Schema validation

### State Management
- **zustand** - UI state management (легковесный)
- **TanStack Query (React Query)** - Server state management
- **Next.js built-in** - Server state (Server Components, Server Actions)

### Data Visualization
- **recharts** или **tremor** - Charts и графики (выбрать при реализации)

---

## ⚙️ Backend

### Runtime & Framework
- **Node.js 20+** - JavaScript runtime
- **Next.js API Routes** - API endpoints
- **Next.js Server Actions** - Server mutations

### Database & ORM
- **PostgreSQL 16** - Relational database
- **Prisma 6** - Type-safe ORM
- **Prisma Migrate** - Database migrations

### Caching & Jobs
- **Redis 7** - Cache и pub/sub
- **BullMQ** - Background job processing (PDF generation, emails, webhooks)

### Storage
- **MinIO** (dev) - S3-compatible object storage
- **AWS S3 / DigitalOcean Spaces** (prod) - Cloud storage для production

### Authentication
- **NextAuth.js v5** (Auth.js) - Authentication
- **bcrypt** - Password hashing
- **JWT** - Token-based authentication

### File Generation
- **@react-pdf/renderer** - PDF generation (клиентские КП)
- **Puppeteer** - Альтернатива для сложных PDF (если нужно)

### Email
- **Resend** или **SendGrid** - Transactional emails
- **React Email** - Email templates

---

## 🗄️ Data & Services

### Business Logic
- **packages/services** - Изолированный service layer
- **packages/estimate-engine** - Calculation engine (ядро продукта!)

### Security & Access Control
- **packages/rbac** - Role-based access control
- **packages/auth** - Authentication utilities

### Internationalization
- **next-intl** - i18n для Next.js
- **@formatjs/intl** - Number/Date formatting

---

## 🏗️ Infrastructure

### Containerization
- **Docker 29+** - Containerization
- **Docker Compose v5+** - Multi-container orchestration

### Web Server
- **Nginx 1.24+** - Reverse proxy и static files
- **Let's Encrypt (Certbot)** - Free SSL certificates

### Process Management
- **systemd** - Service orchestration на production

### Monorepo
- **Turborepo** - Monorepo build system
- **npm workspaces** - Package management

---

## 🔄 CI/CD & DevOps

### Version Control
- **Git** - Source control
- **GitHub** - Repository hosting

### CI/CD
- **GitHub Actions** - Automated workflows
- **GitHub Container Registry (GHCR)** - Docker image registry

### Deployment
- **Self-hosted server** (Ubuntu 24.04)
- **SSH deployment** - Automated via GitHub Actions
- **Docker Compose** - Production orchestration

---

## 🧪 Testing

### Test Frameworks
- **Vitest** - Unit и integration тесты
- **Playwright** (Phase 2) - E2E тесты

### Test Utilities
- **@testing-library/react** - React component testing
- **msw** - API mocking

---

## 📊 Monitoring & Logging

### Error Tracking
- **Sentry** (рекомендуется) - Error monitoring

### Logging
- **Pino** или **Winston** - Structured logging
- **journalctl** - systemd logs на production

### Analytics
- **PostHog** (опционально) - Product analytics

---

## 🔐 Security

### Security Tools
- **helmet** - Security headers для Next.js
- **rate-limiter-flexible** - Rate limiting
- **Trivy** - Container vulnerability scanning (в CI)

### Secret Management
- **Environment Variables** (.env файлы)
- **GitHub Secrets** - CI/CD secrets

---

## 📦 Package Management

### Build Tools
- **Turborepo** - Monorepo orchestration
- **tsup** или **tsconfig** - TypeScript compilation
- **ESLint** - Linting
- **Prettier** - Code formatting

### Dependencies Management
- **npm** - Package manager (можно переключиться на pnpm)
- **Dependabot** - Automated dependency updates

---

## 🌐 External Services

### Payment Processing
- **Stripe** или **Paddle** - Subscription billing (Phase 2)

### Communication
- **Twilio** или **WhatsApp Business API** (опционально) - Notifications

---

## 📝 Development Tools

### IDE
- **VSCode** - Recommended IDE
- **ESLint extension**
- **Prettier extension**
- **Prisma extension**

### Database Management
- **Prisma Studio** - Database GUI
- **pgAdmin** или **TablePlus** - PostgreSQL client

### API Testing
- **Postman** или **Insomnia** - API testing
- **curl** - Command-line testing

---

## 🗂️ Project Structure

```
BuildOS/
├── apps/
│   └── web/                 # Next.js app
├── packages/
│   ├── database/           # Prisma + migrations
│   ├── services/           # Business logic
│   ├── auth/               # Auth utilities
│   ├── rbac/               # RBAC engine
│   ├── estimate-engine/   # Calculation engine
│   ├── ui/                 # Shared UI components
│   ├── i18n/               # i18n utilities
│   └── config/             # Shared configs
└── infra/
    ├── docker/             # Docker files
    ├── nginx/              # Nginx configs
    └── systemd/            # systemd units
```

---

## 🔄 Version Requirements

| Tool | Minimum Version | Recommended |
|------|----------------|-------------|
| Node.js | 20.0.0 | 20.19.6+ |
| npm | 10.0.0 | 10.8.2+ |
| PostgreSQL | 15.0 | 16.0+ |
| Redis | 7.0 | 7.2+ |
| Docker | 24.0 | 29.0+ |
| Docker Compose | 2.20 | 5.0+ |

---

## 📚 Learning Resources

### Next.js
- https://nextjs.org/docs
- https://nextjs.org/learn

### Prisma
- https://www.prisma.io/docs
- https://www.prisma.io/docs/guides

### Turborepo
- https://turbo.build/repo/docs

### shadcn/ui
- https://ui.shadcn.com

---

**Обновлено:** 2026-01-02
**Статус:** ✅ Актуально для MVP 1.0
