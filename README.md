# ARC Intellectual Property Management Portal

[![CI/CD](https://github.com/agriculturalresearchcouncil/arc-ip-portal/actions/workflows/deploy.yml/badge.svg)](https://github.com/agriculturalresearchcouncil/arc-ip-portal/actions/workflows/deploy.yml)
[![License](https://img.shields.io/badge/license-ARC%20Internal-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-v20-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/postgresql-16-blue.svg)](https://www.postgresql.org/)
[![Angular](https://img.shields.io/badge/angular-17-red.svg)](https://angular.io/)
[![Ionic](https://img.shields.io/badge/ionic-7-blue.svg)](https://ionicframework.com/)
[![Express](https://img.shields.io/badge/express-4.x-lightgrey.svg)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/prisma-5-blue.svg)](https://www.prisma.io/)
[![Redis](https://img.shields.io/badge/redis-7-red.svg)](https://redis.io/)
[![IIS](https://img.shields.io/badge/IIS-10-blue.svg)](https://www.iis.net/)
[![GitHub Actions](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-blue.svg)](https://github.com/features/actions)

A secure, enterprise-grade digital platform for managing the complete Intellectual Property (IP) lifecycle within the Agricultural Research Council (ARC).

The system provides a centralized, standardized, secure, and auditable platform for managing innovation from invention disclosure through technology evaluation, intellectual property protection, commercialisation, licensing, royalty management, revenue tracking, and compliance reporting.

---

## Table of Contents

- [Overview](#overview)
- [Solution Summary](#solution-summary)
- [Solution Architecture](#solution-architecture)
  - [Architecture Layers](#architecture-layers)
  - [Backend Architecture](#backend-architecture)
  - [Frontend Architecture](#frontend-architecture)
  - [Infrastructure Architecture](#infrastructure-architecture)
- [Key Features](#key-features)
  - [Invention Disclosure Management](#invention-disclosure-management)
  - [Intellectual Property Asset Management](#intellectual-property-asset-management)
  - [Technology Evaluation](#technology-evaluation)
  - [Licensing Management](#licensing-management)
  - [Royalty and Revenue Management](#royalty-and-revenue-management)
  - [Commercialisation Monitoring](#commercialisation-monitoring)
  - [Document Management](#document-management)
  - [Reporting and Dashboards](#reporting-and-dashboards)
  - [Security and Compliance](#security-and-compliance)
- [Technology Stack](#technology-stack)
  - [Backend Technology](#backend-technology)
  - [Frontend Technology](#frontend-technology)
  - [Infrastructure Technology](#infrastructure-technology)
- [Project Structure](#project-structure)
  - [Backend Component](#backend-component)
  - [Frontend Component](#frontend-component)
  - [Deployment Component](#deployment-component)
- [Prerequisites](#prerequisites)
  - [Required Software](#required-software)
  - [Recommended Tools](#recommended-tools)
  - [Windows Server Requirements](#windows-server-requirements)
- [Installation](#installation)
  - [Clone the Repository](#clone-the-repository)
- [Database Setup](#database-setup)
  - [Create Databases](#create-databases)
  - [Create Application User](#create-application-user)
  - [Grant Database Permissions](#grant-database-permissions)
  - [Grant Schema Permissions](#grant-schema-permissions)
- [Environment Variables](#environment-variables)
  - [Backend Environment Variables](#backend-environment-variables)
  - [Frontend Environment Variables](#frontend-environment-variables)
- [Backend Setup](#backend-setup)
- [Frontend Setup](#frontend-setup)
- [API Documentation](#api-documentation)
  - [Authentication Endpoints](#authentication-endpoints)
  - [Core Endpoints](#core-endpoints)
  - [Full API Documentation](#full-api-documentation)
- [Development Workflow](#development-workflow)
  - [Branch Strategy](#branch-strategy)
  - [Workflow Commands](#workflow-commands)
  - [Commit Convention](#commit-convention)
- [Testing](#testing)
  - [Backend Tests](#backend-tests)
  - [Frontend Tests](#frontend-tests)
  - [Test Coverage Requirements](#test-coverage-requirements)
- [Deployment](#deployment)
  - [CI/CD Pipeline](#cicd-pipeline)
  - [Pipeline Stages](#pipeline-stages)
  - [Manual Deployment](#manual-deployment)
  - [PM2 Configuration](#pm2-configuration)
- [Security](#security)
  - [Security Architecture](#security-architecture)
  - [Authentication Flow](#authentication-flow)
  - [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
- [Monitoring](#monitoring)
  - [Monitoring Stack](#monitoring-stack)
  - [Key Metrics](#key-metrics)
  - [Logging Strategy](#logging-strategy)
- [Troubleshooting](#troubleshooting)
  - [Common Issues](#common-issues)
  - [Health Check](#health-check)
- [Contributing](#contributing)
  - [Getting Started](#getting-started)
  - [Code Review Checklist](#code-review-checklist)
- [Contact](#contact)
  - [Primary Contacts](#primary-contacts)
  - [Support](#support)
- [License](#license)
- [Changelog](#changelog)
  - [Version 1.0.0](#version-100)
- [Acknowledgements](#acknowledgements)
- [Quick Start](#quick-start)
- [Maintainers](#maintainers)

---

# Overview

The ARC Intellectual Property Management Portal (IPM) is a secure, enterprise-grade digital platform designed to support the complete innovation and intellectual property lifecycle within the Agricultural Research Council (ARC).

The system supports the full lifecycle from invention disclosure and technology evaluation through intellectual property protection, licensing, commercialisation, revenue generation, royalty management, and compliance reporting.

The portal provides centralized management for:

- Invention Disclosures
- Technology Evaluations
- Intellectual Property Assets
- Licensing Agreements
- Commercialisation Projects
- Royalty and Revenue Tracking
- Compliance and Governance Reporting
- SharePoint Document Management
- Executive and Operational Dashboards

The platform enables collaboration among:

- Researchers
- Technology Transfer Office (TTO)
- Legal Services
- Finance
- Executive Management
- Institute Managers
- ICT Administrators
- System Administrators

Authentication is integrated with the ARC Centralized Authentication Service and Active Directory to support Single Sign-On (SSO). The application backend does not store user passwords or perform Active Directory authentication directly.

---

# Solution Summary

| Component | Technology |
|---|---|
| Frontend | Angular 17 + Ionic 7 |
| Backend | Node.js 20 + Express.js |
| ORM | Prisma 5 |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Authentication | ARC Centralized Authentication Service / Active Directory |
| CI/CD | GitHub Actions |
| Hosting | IIS 10 |
| Monitoring | Prometheus + Grafana |
| Logging | Winston |
| Alerting | AlertManager |
| Document Management | SharePoint |
| Email Notifications | SMTP |

---

# Solution Architecture

```text
┌──────────────────────────────────────────────────────┐
│                      ARC Users                       │
│ Researchers │ TTO │ Legal │ Finance │ Executive │ ICT │
└──────────────────────────┬───────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────┐
│              Angular 17 + Ionic 7 Frontend           │
│                                                      │
│ Dashboards │ Forms │ Workflows │ Reports │ Analytics │
└──────────────────────────┬───────────────────────────┘
                           │ HTTPS / REST API
                           ▼
┌──────────────────────────────────────────────────────┐
│              Node.js + Express.js Backend            │
│                                                      │
│ Authentication │ RBAC │ Workflow Engine              │
│ Business Logic │ Reporting │ Audit Logging           │
│ Email │ SharePoint Integration │ API Services        │
└───────────────┬──────────────────┬───────────────────┘
                │                  │
                ▼                  ▼
     ┌──────────────────┐   ┌──────────────────┐
     │  PostgreSQL 16   │   │     Redis 7      │
     │ IP Data + Audit  │   │ Cache + Sessions │
     └────────┬─────────┘   └──────────────────┘
              │
              ▼
     ┌──────────────────────────────┐
     │ SharePoint Document Library  │
     └──────────────────────────────┘

     External Services:
     ARC Centralized Authentication │ SMTP │ Monitoring
```

## Architecture Layers

The solution consists of three primary layers:

1. **Frontend Layer** — Angular and Ionic user experience.
2. **Application Layer** — Node.js and Express.js APIs, workflows, business rules, and integrations.
3. **Infrastructure and Data Layer** — IIS, PostgreSQL, Redis, SharePoint, monitoring, and CI/CD.

## Backend Architecture

The backend is built using Node.js and Express.js.

Responsibilities include:

- Authentication and authorization integration
- Role-Based Access Control (RBAC)
- Business logic processing
- Workflow management
- Data validation
- Prisma data access
- Reporting services
- Email notifications
- SharePoint integration
- Audit logging
- API rate limiting
- Health monitoring

## Frontend Architecture

The frontend is built using Angular and Ionic.

Responsibilities include:

- Researcher Portal
- TTO Portal
- Executive Dashboards
- Responsive and mobile-friendly user interface
- Workflow forms
- Reporting and analytics
- Role-based navigation
- API integration

## Infrastructure Architecture

Supporting infrastructure provides:

- IIS application hosting
- PostgreSQL database services
- Redis caching and session services
- GitHub Actions CI/CD
- Prometheus monitoring
- Grafana dashboards
- AlertManager notifications
- Environment management
- Backup and recovery procedures

---

# Key Features

## Invention Disclosure Management

- Submit and manage invention disclosures
- Track disclosure status and workflow
- Attach supporting documents and evidence
- Assign inventors and contributors
- Submit disclosures for TTO review
- Collaborate throughout the review lifecycle

## Intellectual Property Asset Management

The system manages:

- Patents
- Plant Breeders' Rights (PBR)
- Trademarks
- Copyright
- Designs
- Trade Secrets
- Other ARC intellectual property assets

Features include:

- Comprehensive IP portfolio management
- Protection and renewal tracking
- Status monitoring
- Jurisdiction management
- Relationship tracking
- Portfolio reporting

## Technology Evaluation

- Technical assessment scoring
- IP assessment scoring
- Commercial assessment scoring
- Multi-dimensional technology evaluation
- Recommendation management
- Evaluation outcome tracking
- Evaluation reporting

## Licensing Management

- Create and manage licensing agreements
- Track licensees and contacts
- Manage territories
- Monitor obligations and milestones
- Manage royalty structures and terms
- Track licence status and lifecycle

## Royalty and Revenue Management

- Track royalty payments
- Generate royalty schedules
- Monitor overdue and outstanding payments
- Revenue reporting and analytics
- Financial performance monitoring

## Commercialisation Monitoring

- Track commercialisation projects
- Manage commercialisation partners
- Monitor market readiness
- Track revenue and milestones
- Monitor commercialisation progress

## Document Management

Integrated document management provides:

- SharePoint integration
- Document storage and retrieval
- Version control
- Metadata management
- Document search
- Document lifecycle management

## Reporting and Dashboards

The platform provides:

- Executive Dashboard
- TTO Operational Dashboard
- Researcher Dashboard
- IP Portfolio Reports
- Revenue Reports
- Compliance Reports
- Financial Reports
- Customizable reporting and analytics

## Security and Compliance

- Active Directory integration
- JWT-based API authorization
- Role-Based Access Control (RBAC)
- Row-Level Security (RLS)
- Complete audit trails
- Input validation
- Rate limiting
- POPIA compliance support
- IPR Act compliance support

---

# Technology Stack

## Backend Technology

| Technology | Version | Purpose |
|---|---|---|
| Node.js | 20 LTS | Runtime environment |
| Express.js | 4.x | Web framework |
| Prisma | 5+ | ORM |
| PostgreSQL | 16+ | Database |
| Redis | 7+ | Cache and session store |
| Winston | 3+ | Logging |
| Jest | Latest | Testing |
| JWT | Latest | API authorization |

## Frontend Technology

| Technology | Version | Purpose |
|---|---|---|
| Angular | 17+ | Web framework |
| Ionic | 7+ | UI and mobile framework |
| NgRx | Latest | State management |
| RxJS | Latest | Reactive programming |
| Capacitor | Latest | Native mobile applications |
| Chart.js | Latest | Charts and analytics |

## Infrastructure Technology

| Technology | Version | Purpose |
|---|---|---|
| IIS | 10+ | Web server and hosting |
| GitHub Actions | - | CI/CD |
| Prometheus | Latest | Metrics collection |
| Grafana | Latest | Monitoring dashboards |
| AlertManager | Latest | Alerting |
| SharePoint | Online / On-Prem | Document management |
| SMTP | ARC Infrastructure | Email notifications |

---

# Project Structure

The solution is organized into backend, frontend, deployment, documentation, and CI/CD components.

```text
arc-ip-portal/
│
├── backend/
│   ├── src/
│   │   ├── auth/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── dto/
│   │   ├── errors/
│   │   ├── logging/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── validators/
│   │   ├── workflows/
│   │   └── app.js
│   │
│   ├── prisma/
│   ├── uploads/
│   ├── logs/
│   ├── tests/
│   ├── scripts/
│   ├── .env.example
│   ├── package.json
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/
│   │   │   ├── features/
│   │   │   ├── shared/
│   │   │   └── layouts/
│   │   ├── assets/
│   │   ├── environments/
│   │   ├── theme/
│   │   ├── index.html
│   │   └── main.ts
│   │
│   ├── tests/
│   ├── angular.json
│   ├── ionic.config.json
│   ├── package.json
│   └── README.md
│
├── deployment/
│   ├── scripts/
│   │   ├── deploy.ps1
│   │   ├── rollback.ps1
│   │   └── server-setup.ps1
│   └── iis/
│       └── web.config
│
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── user-guide/
│   ├── SRS.docx
│   ├── SDD.docx
│   └── Deployment Guide.docx
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
│
├── LICENSE
└── README.md
```

## Backend Component

The backend provides:

- Authentication integration
- Domain business logic
- Workflow engine
- Data access layer
- Audit logging
- Reporting services
- External integrations
- API security controls

## Frontend Component

The frontend provides:

- Researcher user experience
- TTO operational experience
- Executive dashboards
- Workflow interaction
- Responsive user interface
- Analytics visualizations

## Deployment Component

Deployment tooling provides:

- IIS configuration
- Automated deployment scripts
- Environment configuration
- Rollback procedures
- Server setup automation

---

# Prerequisites

## Required Software

| Software | Version | Purpose |
|---|---|---|
| Node.js | 20 LTS or higher | Backend runtime |
| PostgreSQL | 16 or higher | Database |
| Redis | 7 or higher | Cache and session store |
| Git | Latest | Version control |
| Angular CLI | 17+ | Frontend development |
| Ionic CLI | 7+ | Frontend and mobile development |

## Recommended Tools

| Tool | Purpose |
|---|---|
| VS Code | Recommended development environment |
| Postman | API testing |
| pgAdmin | Database administration |
| Redis Insight | Redis administration |

## Windows Server Requirements

| Component | Specification |
|---|---|
| Operating System | Windows Server 2022 |
| IIS | 10+ with ARR module where required |
| Memory | 16 GB minimum |
| CPU | 4 cores minimum |
| Storage | 100 GB minimum |

---

# Installation

The installation process consists of:

1. Clone the repository.
2. Configure PostgreSQL.
3. Configure environment variables.
4. Set up the backend.
5. Set up the frontend.

## Clone the Repository

```bash
git clone https://github.com/agriculturalresearchcouncil/arc-ip-portal.git
cd arc-ip-portal
```

---

# Database Setup

## Create Databases

```sql
CREATE DATABASE arc_ip_portal_dev;
CREATE DATABASE arc_ip_portal_test;
CREATE DATABASE arc_ip_portal_prod;
```

## Create Application User

```sql
CREATE USER arc_user
WITH PASSWORD 'your_secure_password';
```

## Grant Database Permissions

```sql
GRANT ALL PRIVILEGES ON DATABASE arc_ip_portal_dev TO arc_user;

GRANT ALL PRIVILEGES ON DATABASE arc_ip_portal_test TO arc_user;

GRANT ALL PRIVILEGES ON DATABASE arc_ip_portal_prod TO arc_user;
```

## Grant Schema Permissions

```sql
\c arc_ip_portal_dev
GRANT ALL ON SCHEMA public TO arc_user;

\c arc_ip_portal_test
GRANT ALL ON SCHEMA public TO arc_user;

\c arc_ip_portal_prod
GRANT ALL ON SCHEMA public TO arc_user;
```

---

# Environment Variables

## Backend Environment Variables

Create:

```text
backend/.env
```

```env
# Database
DATABASE_URL="postgresql://arc_user:password@localhost:5432/arc_ip_portal_dev"

# ARC Centralized Authentication Service
ARC_AUTH_URL="http://155.240.161.22:3010"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="8h"

# Redis
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""

# Email
SMTP_HOST="smtp.arc.agric.za"
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="ip-portal@arc.agric.za"

# SharePoint
SHAREPOINT_CLIENT_ID=""
SHAREPOINT_CLIENT_SECRET=""
SHAREPOINT_SITE_ID=""
SHAREPOINT_DRIVE_ID=""

# Logging
LOG_LEVEL="info"
LOG_DIR="logs"

# Rate Limiting
RATE_LIMIT_WINDOW="15"
RATE_LIMIT_MAX="100"

# Server
PORT="3000"
NODE_ENV="development"
```

## Frontend Environment Variables

Create:

```text
frontend/.env
```

```env
API_URL="http://localhost:3000/api"
ARC_AUTH_URL="http://155.240.161.22:3010"
APP_NAME="ARC IP Portal"
APP_VERSION="1.0.0"
```

> **Security:** Never commit production secrets, passwords, JWT keys, SMTP credentials, or SharePoint client secrets to Git.

---

# Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Copy the environment configuration:

```bash
cp .env.example .env
```

Update `.env` with the required database and service configuration.

Run database migrations:

```bash
npx prisma migrate dev --name init
```

Generate the Prisma Client:

```bash
npx prisma generate
```

Seed the database if required:

```bash
npx prisma db seed
```

Start the development server:

```bash
npm run dev
```

The backend API will be available at:

```text
http://localhost:3000
```

---

# Frontend Setup

Navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Copy the environment configuration:

```bash
cp .env.example .env
```

Start the application:

```bash
ionic serve
```

The frontend will be available at:

```text
http://localhost:4200
```

---

# API Documentation

## Authentication Endpoints

| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/api/auth/login` | Login with ARC authentication | Public |
| POST | `/api/auth/logout` | Logout and clear session | Authenticated |
| POST | `/api/auth/refresh` | Refresh JWT token | Authenticated |
| GET | `/api/auth/me` | Get current user information | Authenticated |

## Core Endpoints

### Disclosure Management

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/disclosures` | List disclosures | Researcher, TTO, Admin |
| POST | `/api/disclosures` | Create disclosure | Researcher, TTO, Admin |
| GET | `/api/disclosures/{id}` | Get disclosure | Researcher (own), TTO, Admin |
| PUT | `/api/disclosures/{id}` | Update disclosure | Researcher (own), TTO, Admin |
| POST | `/api/disclosures/{id}/submit` | Submit disclosure | Researcher (own) |
| POST | `/api/disclosures/{id}/review` | Review disclosure | TTO, Admin |

### Intellectual Property Assets

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/ip-assets` | List IP assets | TTO, Legal, Admin |
| POST | `/api/ip-assets` | Create IP asset | TTO, Admin |
| GET | `/api/ip-assets/{id}` | Get IP asset | TTO, Legal, Admin |
| PUT | `/api/ip-assets/{id}` | Update IP asset | TTO, Admin |

### Licensing

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/licences` | List licences | TTO, Legal, Finance, Admin |
| POST | `/api/licences` | Create licence | TTO, Finance, Admin |
| GET | `/api/licences/{id}` | Get licence | TTO, Legal, Finance, Admin |
| PUT | `/api/licences/{id}` | Update licence | TTO, Finance, Admin |

### Royalties and Reporting

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/royalties` | List royalties | Finance, Admin |
| POST | `/api/royalties` | Record royalty | Finance, Admin |
| GET | `/api/reports/ip-portfolio` | IP portfolio report | TTO, Executive, Admin |
| GET | `/api/reports/revenue-tracking` | Revenue report | Finance, Executive, Admin |
| GET | `/api/reports/compliance-status` | Compliance report | Legal, TTO, Admin |

### Dashboards

| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/dashboards/executive` | Executive dashboard | Executive, Admin |
| GET | `/api/dashboards/tto` | TTO dashboard | TTO, Admin |
| GET | `/api/dashboards/researcher` | Researcher dashboard | Researcher |

## Full API Documentation

When the backend is running, Swagger documentation is available at:

```text
http://localhost:3000/api/docs
```

---

# Development Workflow

## Branch Strategy

| Branch | Purpose | Protection |
|---|---|---|
| `main` | Production-ready code | 2 approvals required |
| `develop` | Integration branch | 1 approval required |
| `feature/*` | Individual features | - |
| `bugfix/*` | Bug fixes | - |
| `release/*` | Release preparation | - |
| `hotfix/*` | Emergency production fixes | 2 approvals required |

## Workflow Commands

### Start a New Feature

```bash
git checkout develop
git pull origin develop
git checkout -b feature/disclosure-module
```

### Commit and Push Changes

```bash
git add .
git commit -m "feat: Add disclosure management module"
git push -u origin feature/disclosure-module
```

Create a Pull Request with:

- **Base:** `develop`
- **Compare:** `feature/disclosure-module`

After the Pull Request is approved and merged:

```bash
git checkout develop
git pull origin develop
git branch -d feature/disclosure-module
```

### Create a Release

```bash
git checkout develop
git pull origin develop
git checkout -b release/v1.0.0
```

After testing:

```bash
git checkout main
git merge release/v1.0.0
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin main --tags
```

### Create a Hotfix

```bash
git checkout main
git checkout -b hotfix/urgent-fix

# Fix and test

git add .
git commit -m "fix: Urgent production fix"
git push -u origin hotfix/urgent-fix
```

Create Pull Requests to both `main` and `develop` where required by the release process.

## Commit Convention

Follow Conventional Commits:

```text
feat: Add disclosure submission workflow
fix: Fix patent validation logic
docs: Update API documentation
style: Format code with Prettier
refactor: Simplify evaluation service
perf: Optimize database queries
test: Add unit tests for licence service
chore: Update dependencies
ci: Update GitHub Actions workflow
```

Commit types:

- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation changes
- `style` — Code style changes
- `refactor` — Code refactoring
- `perf` — Performance improvements
- `test` — Adding or updating tests
- `chore` — Maintenance tasks
- `ci` — CI/CD changes
- `build` — Build system changes

---

# Testing

## Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run a specific test pattern
npm test -- --testPathPattern=disclosure

# Run tests for CI
npm run test:ci
```

## Frontend Tests

```bash
cd frontend

# Run unit tests
npm test

# Run tests in headless mode
npm run test:headless

# Run tests for CI
npm run test:ci

# Run end-to-end tests
npm run e2e
```

## Test Coverage Requirements

| Category | Minimum Coverage |
|---|---|
| Statements | 80% |
| Branches | 75% |
| Functions | 80% |
| Lines | 80% |

---

# Deployment

## CI/CD Pipeline

Automated deployment is managed through GitHub Actions.

| Environment | URL | Trigger | Approval |
|---|---|---|---|
| Development | `https://dev.ip-portal.arc.agric.za` | Push to `develop` | Auto-deploy |
| Staging | `https://staging.ip-portal.arc.agric.za` | Deployment workflow | 1 approval |
| Production | `https://ip.arc.agric.za` | Push/merge to `main` | 2 approvals |

## Pipeline Stages

### 1. Build and Test

- Install dependencies
- Run unit tests
- Build frontend and backend
- Upload build artifacts

### 2. Deploy to Development

- Deploy to development server
- Run database migrations
- Perform health checks

### 3. Deploy to Staging

- Manual approval
- Deploy to staging server
- Run database migrations
- Perform health checks

### 4. Deploy to Production

- Manual approval
- Back up the database
- Deploy to production servers
- Run database migrations
- Perform health checks
- Create a GitHub Release

## Manual Deployment

If CI/CD is unavailable:

```powershell
# Deploy to Development
.\deployment\scripts\deploy.ps1 -Environment dev

# Deploy to Staging
.\deployment\scripts\deploy.ps1 -Environment staging

# Deploy to Production
.\deployment\scripts\deploy.ps1 -Environment prod

# Rollback Production
.\deployment\scripts\rollback.ps1
```

## PM2 Configuration

Example `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'arc-api',
      script: 'dist/app.js',
      instances: 2,
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      },
      error_file: 'logs/err.log',
      out_file: 'logs/out.log',
      log_file: 'logs/combined.log',
      time: true
    }
  ]
};
```

---

# Security

## Security Architecture

| Layer | Security Controls |
|---|---|
| Client Layer | HTTPS, secure cookie storage, input sanitization |
| Web Server | TLS, HSTS, request filtering, WAF where applicable |
| API Layer | JWT authorization, RBAC, rate limiting, input validation |
| Database Layer | Row-Level Security, encryption at rest where configured, audit controls |
| External Services | OAuth2/service credentials, API keys, IP controls where applicable |

## Authentication Flow

1. The user initiates authentication through the ARC Centralized Authentication Service.
2. The authentication service validates credentials against Active Directory.
3. The authenticated session or token is issued according to the ARC authentication architecture.
4. Subsequent requests include the required authentication credentials.
5. The backend validates authentication and authorization before granting access.

> **Important:** The IP Portal backend does **not** store passwords and does **not** authenticate users directly against Active Directory.

## Role-Based Access Control (RBAC)

| Role | Description | Access Level |
|---|---|---|
| Researcher | Submits IP disclosures | Create and view own disclosures |
| TTO Officer | Manages IP lifecycle | Full CRUD on IP records within assigned authority |
| TTO Manager | Oversees TTO operations | Full access with approval authority |
| Legal Officer | Reviews contracts and compliance | Legal and compliance access |
| Finance Officer | Tracks royalties and revenue | Financial data access |
| Executive | Strategic oversight | Read-only dashboards and reports |
| Institute Manager | Manages institute IP | View institute IP |
| ICT | System support | System maintenance |
| System Administrator | Full system administration | Full system access |

---

# Monitoring

## Monitoring Stack

- **Metrics Collection:** Prometheus
- **Dashboards:** Grafana
- **Logging:** Winston with rotation
- **Alerting:** AlertManager
- **Application Metrics:** Custom application and infrastructure metrics

## Key Metrics

| Metric | Source | Threshold |
|---|---|---|
| API Response Time | Node.js | >500ms → Warning |
| API Error Rate | Node.js | >5% → Critical |
| CPU Usage | Node.js / IIS | >80% → Warning |
| Memory Usage | Node.js / IIS | >85% → Critical |
| Database Connections | PostgreSQL | >80 → Warning |
| Database Query Time | PostgreSQL | >100ms → Warning |
| Active Sessions | Redis | >500 → Scale review |
| Disk Usage | Server | >85% → Warning |
| Authentication Failures | ARC Authentication | >10/min → Alert |

## Logging Strategy

Example Winston configuration:

```javascript
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'logs/combined.log'
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

---

# Troubleshooting

## Common Issues

### Port 3000 Already in Use

**Windows:**

```bash
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Linux:**

```bash
lsof -i :3000
kill -9 <PID>
```

### Database Connection Failed

**Windows:**

```bash
pg_isready
net start postgresql-x64-16
```

**Linux:**

```bash
sudo systemctl status postgresql
sudo systemctl start postgresql
```

### Redis Connection Failed

**Windows:**

```bash
redis-cli ping
```

**Linux:**

```bash
redis-cli ping
sudo systemctl start redis-server
```

### Node.js Memory Issues

Increase the Node.js memory limit:

```bash
node --max-old-space-size=4096 dist/app.js
```

With PM2:

```bash
pm2 start dist/app.js --node-args="--max-old-space-size=4096"
```

## Health Check

```bash
# Backend health check
curl http://localhost:3000/health

# Database health check
npx prisma db execute --file scripts/health-check.sql

# Redis health check
redis-cli ping
```

---

# Contributing

## Getting Started

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Write and run tests.
5. Update documentation where necessary.
6. Submit a Pull Request.

## Code Review Checklist

- [ ] Code follows project style guidelines.
- [ ] Tests are passing.
- [ ] Documentation is updated.
- [ ] Security considerations have been reviewed.
- [ ] Performance impact has been considered.

Please read `CONTRIBUTING.md` for the full contribution process and code of conduct.

---

# Contact

## Primary Contacts

| Role | Name | Email |
|---|---|---|
| Project Manager | Dr Keoagile William Modisakeng | modisakengkw@arc.agric.za |
| Lead Developer | Zibusiso Ncube | ncubez@arc.agric.za |
| ICT Manager | Matodzi Phaswana | phaswanam@arc.agric.za |

## Support

- **Email:** enquiry@arc.agric.za
- **Phone:** +27 (0)12 427 9700
- **Address:** 1134 Park Street, Hatfield, Pretoria
- **PO Box:** PO Box 8783, Pretoria, 0001

---

# License

**ARC Internal Proprietary Software**

This project is proprietary software owned by the Agricultural Research Council (ARC).

All rights reserved.

For internal ARC use only. Unauthorized distribution, modification, or use outside the ARC organization is strictly prohibited.

See [LICENSE](LICENSE) for applicable licensing information.

---

# Changelog

## Version 1.0.0

**Expected Release:** December 2026

### Initial Release Features

- Invention Disclosure Management
- IP Asset Management
- Technology Evaluation
- Licensing Management
- Royalty and Revenue Tracking
- Commercialisation Monitoring
- Document Management with SharePoint integration
- Executive and TTO Dashboards
- Audit Trail and Compliance
- Role-Based Access Control

### Infrastructure

- Node.js and Express.js backend
- Angular and Ionic frontend
- PostgreSQL database
- Redis caching
- IIS web server
- GitHub Actions CI/CD
- Prometheus and Grafana monitoring

### Integrations

- ARC Centralized Authentication Service
- Active Directory
- SharePoint Online / On-Prem
- SMTP email notifications

---

# Acknowledgements

- Agricultural Research Council (ARC) for funding and support
- Technology Transfer Office (TTO) for requirements definition
- ICT Department for infrastructure support
- Legal Services for compliance guidance
- Finance Department for financial requirements
- ARC Researchers for their invaluable feedback

---

# Quick Start

```bash
# Clone the repository
git clone https://github.com/agriculturalresearchcouncil/arc-ip-portal.git
cd arc-ip-portal

# Setup backend
cd backend
npm install
cp .env.example .env

# Edit .env with your database credentials
npx prisma migrate dev
npm run dev
```

In a new terminal:

```bash
# Setup frontend
cd frontend
npm install
cp .env.example .env
ionic serve
```

Open:

```text
http://localhost:4200
```

---

# Maintainers

| Role | Name |
|---|---|
| Project Owner | Dr Keoagile William Modisakeng |
| Solution Architect & Lead Developer | Zibusiso Ncube |
| Technology Transfer Office | ARC TTO |
| ICT Support | ARC ICT Division |

---

**ARC Intellectual Property Management Portal**

*Protecting, managing, commercialising, and preserving ARC innovations through a secure enterprise platform.*

© Agricultural Research Council (ARC). All Rights Reserved.
