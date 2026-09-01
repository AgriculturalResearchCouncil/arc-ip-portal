# ARC Intellectual Property Management Portal


![License](https://img.shields.io/badge/license-ARC%20Internal-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-v20_LTS-green)
![PostgreSQL](https://img.shields.io/badge/postgresql-16-blue.svg)
[![Angular](https://img.shields.io/badge/angular-17-red.svg)](https://angular.io/)
[![Ionic](https://img.shields.io/badge/ionic-7-blue.svg)](https://ionicframework.com/)
[![Express.js](https://img.shields.io/badge/express-4.x-lightgrey.svg)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/prisma-5-blue.svg)](https://www.prisma.io/)
[![Redis](https://img.shields.io/badge/redis-7-red.svg)](https://redis.io/)
[![IIS](https://img.shields.io/badge/IIS-10-blue.svg)](https://www.iis.net/)
[![GitHub Actions](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-blue.svg)](https://githubs)
[![CI/CD](https://github.com/agriculturalresearchcouncil/arc-ip-portal/actions/workflows/deploy.yml/badge.svg)](https://github.com/agriculturalresearchcouncil/arc-ip-portal/actions/workflows/deploy.yml)

A secure, enterprise-grade digital platform for managing the complete Intellectual Property (IP) lifecycle within the Agricultural Research Council (ARC).

The system provides a centralized, standardized, and auditable platform for managing innovation from invention disclosure through intellectual property protection, commercialization, licensing, royalty management, and revenue reporting.

---

## Table of Contents

- [Overview](#overview)
Architecture
- [Key Features](#key-features)
isclosure Management](#invention-disal Property Asset Management](#intellectual-property-assettechnologyng Management](#licensing-management Management](# [Commercialisation Management](#commercialisation-managementument-management)
ting](#dashboards & Compliance- [Technology Stack
- [Project-structure
- [Prerequisites
- [Installation
- [Database Setup
- [Environment Variables
- [Backend Setup
- [Frontend Setup
- [API Documentation
- [Development Workflow
- [Testing
- [Deployment](#deployment)
[Monitoring
- [Troubleshooting](#troubleshooting [Contact
- [License
- [Changelog](#chcknowledgements](#acknow-start
---

# Overview

The ARC Intellectual Property Management Portal (IPM) is an enterprise system designed to support the full innovation lifecycle within the Agricultural Research Council.

The portal provides centralized management for:

- Invention Disclosures
- Technology Evaluations
- Intellectual Property Assets
- Licensing Agreements
- Commercialisation Projects
- Royalty and Revenue Tracking
- Compliance and Governance Reporting
- SharePoint Document Management

The platform enables collaboration among:

- Researchers
- Technology Transfer Office (TTO)
- Legal Services
- Finance
- Executive Management
- ICT Administrators

Authentication is integrated with the ARC Centralized Authentication Service and Active Directory.

---
## Solution Summary

| Component | Technology |
|------------|------------|
| Frontend | Angular 17 + Ionic 7 |
| Backend | Node.js 20 + Express.js |
| ORM | Prisma 5 |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Authentication | ARC AD / SSO |
| CI/CD | GitHub Actions |
| Hosting | IIS 10 |
| Monitoring | Prometheus + Grafana |
| Document Management | SharePoint |

---
# Solution Architecture

```text
┌────────────────────────────────────────────┐
│                ARC Users                   │
│ Researchers | TTO | Legal | Finance | ICT │
└──────────────────────┬─────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────┐
│        Angular 17 + Ionic Frontend         │
└──────────────────────┬─────────────────────┘
                       │ REST API
                       ▼
┌────────────────────────────────────────────┐
│        Node.js + Express.js Backend        │
│                                            │
│ • Authentication                           │
│ • Workflow Engine                          │
│ • Business Logic                           │
│ • Reporting Services                       │
│ • SharePoint Integration                   │
└───────────────┬──────────────┬─────────────┘
                │              │
                ▼              ▼
     ┌────────────────┐  ┌───────────────┐
     │ PostgreSQL 16  │  │ Redis Cache   │
     └────────────────┘  └───────────────┘
                │
                ▼
     ┌──────────────────────────────┐
     │ SharePoint Document Library  │
     └──────────────────────────────┘
```

---

# Solution Architecture

The solution consists of three primary layers.

## Backend

Built using Node.js and Express.js.

Responsibilities include:

- Authentication and Authorization
- Business Logic Processing
- Workflow Management
- Data Validation
- Reporting Services
- Email Notifications
- SharePoint Integration
- Audit Logging

## Frontend

Built using Angular and Ionic.

Responsibilities include:

- Researcher Portal
- TTO Portal
- Executive Dashboards
- Mobile-Responsive UI
- Reporting and Analytics
- Workflow Forms

## Infrastructure

Supporting infrastructure provides:

- IIS Hosting
- PostgreSQL Database Services
- Redis Caching
- GitHub Actions CI/CD
- Application Monitoring
- Environment Management
- Backup and Recovery

---

# Key Features

## Invention Disclosure Management

- Submit invention disclosures
- Track disclosure workflow status
- Manage inventors and contributors
- Attach supporting evidence
- Collaborate throughout the review lifecycle

## Intellectual Property Asset Management

Manage:

- Patents
- Plant Breeders' Rights (PBR)
- Trademarks
- Copyright
- Designs
- Trade Secrets

Features include:

- Portfolio management
- Renewal tracking
- Status monitoring
- Jurisdiction management
- Relationship tracking

## Technology Evaluation

- Technical assessment scoring
- IP assessment scoring
- Commercial assessment scoring
- Recommendation management
- Evaluation reporting

## Licensing Management

- License agreement management
- Licensee tracking
- Territory management
- Milestone management
- Royalty structure management

## Royalty & Revenue Management

- Royalty schedules
- Revenue analytics
- Payment tracking
- Outstanding payment management

## Commercialisation Management

- Commercialisation projects
- Partner management
- Market readiness tracking
- Revenue generation monitoring

## Document Management

Integrated document management:

- SharePoint integration
- Version control
- Metadata management
- Search capabilities
- Document lifecycle administration

## Dashboards & Reporting

- Executive Dashboard
- TTO Dashboard
- Researcher Dashboard
- Compliance Reports
- Financial Reports
- Portfolio Reports

## Security & Compliance

- Active Directory Authentication
- Role-Based Access Control (RBAC)
- Row-Level Security (RLS)
- Complete Audit Trails
- POPIA Compliance
- IPR Act Compliance

---

# Technology Stack

## Backend

| Technology | Version | Purpose |
|------------|----------|----------|
| Node.js | 20 LTS | Runtime Environment |
| Express.js | 4.x | Web Framework |
| Prisma | 5+ | ORM |
| PostgreSQL | 16+ | Database |
| Redis | 7+ | Session Store & Cache |
| Winston | 3+ | Logging |
| Jest | Latest | Testing |
| JWT | Latest | Authentication |

## Frontend

| Technology | Version | Purpose |
|------------|----------|----------|
| Angular | 17+ | Web Framework |
| Ionic | 7+ | UI Framework |
| NgRx | Latest | State Management |
| RxJS | Latest | Reactive Programming |
| Capacitor | Latest | Mobile Deployment |
| Chart.js | Latest | Visual Analytics |

## Infrastructure

| Technology | Purpose |
|------------|----------|
| IIS | Application Hosting |
| GitHub Actions | CI/CD |
| Prometheus | Monitoring |
| Grafana | Dashboards |
| SharePoint | Document Management |

---

# Project Structure

The solution is organized into backend, frontend, deployment, and documentation layers.

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
│   │   │
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
│   │
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

## Backend

Provides:

- Authentication Services
- Domain Business Logic
- Workflow Engine
- Data Access Layer
- Audit Logging
- Reporting Services

## Frontend

Provides:

- Researcher User Experience
- TTO User Experience
- Executive Dashboards
- Workflow Interaction
- Analytics Visualizations

## Deployment

Provides:

- IIS Configuration
- Deployment Scripts
- Rollback Procedures
- Environment Automation

---

# Prerequisites

## Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 20 LTS+ | Backend Runtime |
| PostgreSQL | 16+ | Database |
| Redis | 7+ | Session Store |
| Git | Latest | Source Control |
| Angular CLI | 17+ | Frontend Development |
| Ionic CLI | 7+ | UI Development |

## Recommended Tools

| Tool | Purpose |
|--------|---------|
| VS Code | Development Environment |
| Postman | API Testing |
| pgAdmin | Database Administration |
| Redis Insight | Redis Administration |

## Windows Server Requirements

| Component | Specification |
|------------|--------------|
| Operating System | Windows Server 2022 |
| IIS | Version 10+ |
| Memory | 16 GB Minimum |
| CPU | 4 Core Minimum |
| Storage | 100 GB Minimum |

---

# Installation

The installation process consists of:

1. Clone the repository
2. Configure PostgreSQL
3. Configure Environment Variables
4. Setup Backend
5. Setup Frontend

---

## Clone Repository

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
DATABASE_URL=postgresql://arc_user:password@localhost:5432/arc_ip_portal_dev

ARC_AUTH_URL=http://155.240.161.22:3010

JWT_SECRET=replace_with_secure_secret
JWT_EXPIRES_IN=8h

REDIS_HOST=localhost
REDIS_PORT=6379

PORT=3000
NODE_ENV=development
```

## Frontend Environment Variables

Create:

```text
frontend/.env
```

```env
API_URL=http://localhost:3000/api

ARC_AUTH_URL=http://155.240.161.22:3010

APP_NAME=ARC IP Portal
APP_VERSION=1.0.0
```

---

# Backend Setup

Install backend dependencies.

```bash
cd backend

npm install

cp .env.example .env
```

Run migrations.

```bash
npx prisma migrate dev --name init
```

Generate Prisma Client.

```bash
npx prisma generate
```

Seed Database (Optional).

```bash
npx prisma db seed
```

Start the backend service.

```bash
npm run dev
```

Backend URL:

```text
http://localhost:3000
```

---

# Frontend Setup

Install frontend dependencies.

```bash
cd frontend

npm install

cp .env.example .env
```

Start the client application.

```bash
ionic serve
```

Frontend URL:

```text
http://localhost:4200
```

---

# API Documentation

## Authentication Endpoints

| Method | Endpoint | Description |
|----------|----------|-------------|
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| POST | `/api/auth/refresh` | Refresh Token |
| GET | `/api/auth/me` | User Profile |

## Core Modules

| Module | Base Endpoint |
|----------|---------------|
| Disclosures | `/api/disclosures` |
| IP Assets | `/api/ip-assets` |
| Licences | `/api/licences` |
| Royalties | `/api/royalties` |
| Reports | `/api/reports` |
| Dashboards | `/api/dashboards` |

## Swagger Documentation

```text
http://localhost:3000/api/docs
```

---

# Development Workflow

## Branch Strategy

| Branch | Purpose |
|----------|---------|
| main | Production |
| develop | Integration |
| feature/* | New Features |
| bugfix/* | Bug Fixes |
| release/* | Releases |
| hotfix/* | Production Fixes |

## Start a Feature

```bash
git checkout develop

git pull origin develop

git checkout -b feature/disclosure-module
```

## Conventional Commits

```bash
feat: add disclosure management module

fix: resolve licence validation issue

docs: update API documentation

refactor: simplify evaluation service
```

---

# Testing

## Backend Tests

```bash
npm test

npm run test:coverage

npm run test:ci
```

## Frontend Tests

```bash
npm test

npm run e2e
```

### Coverage Requirements

| Metric | Minimum |
|----------|----------|
| Statements | 80% |
| Branches | 75% |
| Functions | 80% |
| Lines | 80% |

---

# Deployment

## Environments

| Environment | URL |
|------------|-----|
| Development | https://dev.ip-portal.arc.agric.za |
| Staging | https://staging.ip-portal.arc.agric.za |
| Production | https://ip.arc.agric.za |

## Manual Deployment

```powershell
.\deployment\scripts\deploy.ps1 -Environment dev

.\deployment\scripts\deploy.ps1 -Environment staging

.\deployment\scripts\deploy.ps1 -Environment prod
```

---

# Security

## Security Controls

- Active Directory Authentication
- JWT Authentication
- Role-Based Access Control (RBAC)
- Row-Level Security (RLS)
- Audit Logging
- POPIA Compliance
- IPR Act Compliance

---

# Monitoring

Monitoring stack includes:

- Prometheus
- Grafana
- Winston
- AlertManager

## Metrics

- API Response Time
- API Error Rate
- CPU Utilization
- Memory Utilization
- Database Performance
- Authentication Failures

---

# Troubleshooting

## API Health Check

```bash
curl http://localhost:3000/health
```

## Database Health Check

```bash
pg_isready
```

## Redis Health Check

```bash
redis-cli ping
```

---

# Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes
4. Add tests
5. Submit a Pull Request

### Pull Request Checklist

- [ ] Coding Standards Followed
- [ ] Tests Passing
- [ ] Documentation Updated
- [ ] Security Reviewed

---

# Contact

| Role | Contact |
|--------|----------|
| Project Manager | Dr Keoagile William Modisakeng |
| Lead Developer | Zibusiso Ncube |
| TTO Office | tto@arc.agric.za |
| ICT Manager | Matodzi Phaswana |

### Support

- Email: ip-portal-support@arc.agric.za
- Phone: +27 (0)12 427 9700
- Address: 1134 Park Street, Hatfield, Pretoria

---

# License

**ARC Internal Proprietary Software**

Copyright © Agricultural Research Council (ARC)

All Rights Reserved.

Unauthorized use, distribution, or modification outside ARC is prohibited.

---

# Changelog

## Version 1.0.0 (Planned)

### Features

- Invention Disclosure Management
- Technology Evaluation
- Intellectual Property Management
- Licensing Management
- Royalty Management
- Commercialisation Monitoring
- SharePoint Integration
- Executive Reporting
- Audit Trails
- Role-Based Access Control

---

# Acknowledgements

- Agricultural Research Council (ARC)
- Technology Transfer Office (TTO)
- ICT Division
- Legal Services
- Finance Department
- ARC Research Community

---

## Quick Start

```bash
git clone https://github.com/agriculturalresearchcouncil/arc-ip-portal.git

cd arc-ip-portal

# Backend
cd backend
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev

# Frontend (new terminal)
cd ../frontend
npm install
cp .env.example .env
ionic serve
```

Open:

```text
http://localhost:4200
```

---

## Maintainers

| Role | Name |
|--------|--------|
| Project Owner | Dr Keoagile William Modisakeng |
| Solution Architect & Lead Developer | Zibusiso Ncube |
| Technology Transfer Office | ARC TTO |
| ICT Support | ARC ICT Division |

---

**ARC Intellectual Property Management Portal**

*Protecting, managing, commercialising, and preserving ARC innovations through a secure enterprise platform.*

© Agricultural Research Council (ARC). All Rights Reserved.
