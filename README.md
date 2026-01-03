# BuildOS

Multi-tenant SaaS platform for construction companies.

> **👉 For Claude Code:** See [CLAUDE.md](./CLAUDE.md) for project context and guidelines.

---

## 🏗️ Project Overview

BuildOS is a comprehensive management system for construction companies, providing:

- **Project Management** - Manage construction projects, rooms, and stages
- **Estimate Engine** - Advanced cost estimation with client/cost separation
- **Multi-tenancy** - Isolated data per company with RBAC
- **Client Portal** - Real-time project visibility for clients
- **QA System** - Quality assurance checklists and photo documentation
- **i18n Ready** - Support for RU/PL/EN languages
- **Multi-currency** - PLN, EUR, USD support

**Target Market:** Poland | **Languages:** RU + PL

---

## 📚 Documentation

- **[Architecture Decision Records (ADR)](./docs/architecture/adr/ADR_PACK_V1.md)** - Key architectural decisions
- **[Deployment Guide](./docs/development/deploy.md)** - Complete deployment instructions
- **[Product Requirements](./docs/product/)** - Detailed product documentation

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 15 (App Router)
- **UI:** shadcn/ui + TailwindCSS
- **Forms:** react-hook-form + zod
- **State:** zustand + React Query

### Backend
- **Runtime:** Node.js 20+
- **ORM:** Prisma 6
- **Database:** PostgreSQL 16
- **Cache/Jobs:** Redis 7 + BullMQ
- **Storage:** MinIO (S3-compatible)

### Infrastructure
- **Monorepo:** Turborepo + npm workspaces
- **Deployment:** Self-hosted (Docker + Nginx)
- **CI/CD:** GitHub Actions + GHCR
- **SSL:** Let's Encrypt
- **Orchestration:** systemd

---

## 🚀 Quick Start

### Development

```bash
# Install dependencies
npm install

# Setup database
docker compose -f docker-compose.dev.yml up -d postgres redis minio

# Run migrations (after Issue #2)
npx prisma migrate dev

# Start dev server
npm run dev
```

Visit `http://localhost:3000`

### Production

See **[Deployment Guide](./docs/development/deploy.md)** for complete instructions.

---

## 📦 Project Structure

```
BuildOS/
├── apps/
│   └── web/                 # Next.js 15 application
├── packages/
│   ├── database/           # Prisma schema & migrations
│   ├── services/           # Business logic
│   ├── auth/               # Authentication
│   ├── rbac/               # Role-based access control
│   ├── estimate-engine/   # Core calculation engine
│   ├── ui/                 # Shared UI components (shadcn/ui)
│   ├── i18n/               # Internationalization
│   └── config/             # Shared configuration
├── infra/
│   ├── docker/             # Docker configurations
│   ├── nginx/              # Nginx vhosts & SSL
│   └── systemd/            # systemd units
├── docs/                   # Documentation
│   ├── architecture/       # ADR, tech stack, data model
│   ├── product/            # PRD, RBAC, formulas
│   └── development/        # Deploy guide
├── .github/
│   └── workflows/          # CI/CD pipelines
├── turbo.json              # Turborepo configuration
└── package.json            # Root package with workspaces
```

---

## 🔧 Development Commands

```bash
# Development
npm run dev          # Start all apps in dev mode
npm run build        # Build all packages and apps
npm run lint         # Lint all packages
npm run typecheck    # Type check all packages
npm run test         # Run all tests
npm run clean        # Clean all build artifacts

# Package-specific
npm run dev -w @buildos/web        # Dev только web app
npm run build -w @buildos/web      # Build только web app
```

---

## 🔐 Environment Variables

See `.env.example` for all required environment variables.

**Critical variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `NEXTAUTH_SECRET` - Auth secret (32+ chars)
- `MINIO_*` - S3-compatible storage credentials

---

## 🧪 Testing

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# Type checking
npm run typecheck

# Linting
npm run lint
```

---

## 📋 Development Status

### ✅ Completed
- Infrastructure (Docker, Nginx, SSL, systemd)
- CI/CD pipeline (GitHub Actions + GHCR)
- Turborepo monorepo setup
- Next.js 15 application scaffold

### 🚧 In Progress
- **Issue #2:** Prisma schema v1
- **Issue #3:** Testing infrastructure

### ⏳ Next Steps
- Issue #4: Authentication
- Issue #5: Multi-tenancy
- Issue #6: RBAC

**Tracking Issue:** https://github.com/DesignCorporation/BuildOS/issues/14

---

## 🤝 Contributing

1. Create feature branch from `main`
2. Make changes following ADR guidelines
3. Write tests
4. Submit PR with description

**Branch naming:**
- `feature/description`
- `fix/description`
- `docs/description`

---

## 📧 Support

- **Issues:** https://github.com/DesignCorporation/BuildOS/issues
- **Email:** info@designcorp.eu
- **Docs:** https://github.com/DesignCorporation/BuildOS/tree/main/docs

---

## 📄 License

Proprietary - © 2026 DesignCorporation

---

**Built with ❤️ by DesignCorporation**
