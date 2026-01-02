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

- **[Architecture Decision Records (ADR)](./Docs/adr/ADR_PACK_V1.md)** - Key architectural decisions
- **[Deployment Guide](./docs/deploy.md)** - Complete deployment instructions
- **[Product Requirements](./Docs/)** - Detailed product documentation

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

# Run migrations
npx prisma migrate dev

# Start dev server
npm run dev
```

### Production

See **[Deployment Guide](./docs/deploy.md)** for complete instructions.

```bash
# Clone to server
git clone git@github.com:DesignCorporation/BuildOS.git /opt/buildos

# Configure environment
cp .env.example .env
nano .env

# Setup SSL
cd infra/nginx && sudo bash setup-ssl.sh

# Install systemd unit
cd infra/systemd && sudo bash install.sh

# Start services
sudo systemctl start buildos
```

---

## 📦 Project Structure

```
BuildOS/
├── apps/
│   └── web/                 # Main Next.js application
├── packages/
│   ├── database/           # Prisma schema & migrations
│   ├── services/           # Business logic
│   ├── auth/               # Authentication
│   ├── rbac/               # Role-based access control
│   ├── estimate-engine/   # Core calculation engine
│   ├── ui/                 # Shared UI components
│   ├── i18n/               # Internationalization
│   └── config/             # Shared configuration
├── infra/
│   ├── docker/             # Docker configurations
│   ├── nginx/              # Nginx vhosts & SSL
│   └── systemd/            # systemd units
├── docs/                   # Documentation
├── Docs/                   # Product documentation
│   └── adr/                # Architecture Decision Records
├── .github/
│   └── workflows/          # CI/CD pipelines
└── README.md
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
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Type checking
npm run typecheck

# Linting
npm run lint
```

---

## 📋 MVP Roadmap

### MVP 1.0 (2-3 weeks)
- ✅ Auth + Multi-tenancy + RBAC
- ✅ Projects + Rooms
- ✅ Estimate Engine
- ✅ PDF export
- ✅ Client view (estimates)

### MVP 1.1 (+1 week)
- ⏳ Stages workflow
- ⏳ Photos + timeline
- ⏳ Client view (estimates + photos)

### MVP 1.2 (+1 week)
- ⏳ QA Checklists
- ⏳ Client view (+ QA status)

---

## 🤝 Contributing

1. Create feature branch from `develop`
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
