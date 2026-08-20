# ARC Intellectual Property Management Portal

[![CI/CD](https://github.com/agriculturalresearchcouncil/arc-ip-portal/actions/workflows/deploy.yml/badge.svg)](https://github.com/agriculturalresearchcouncil/arc-ip-portal/actions/workflows/deploy.yml)

A secure, enterprise-grade digital platform for managing the complete intellectual property lifecycle within the Agricultural Research Council (ARC).

---

## Overview

The ARC IP Portal provides a centralized, secure, and standardized digital platform to support the management of intellectual property across all ARC institutes. The system supports the full IP lifecycle from disclosure and evaluation through protection, licensing, commercialization, revenue generation, and compliance reporting.

### Key Features

- Invention Disclosure Management - Submit, track, and manage invention disclosures
- IP Asset Management - Register and track patents, trademarks, designs, copyrights, and plant breeders rights
- Technology Evaluation - Score and evaluate technologies for protection decisions
- Licensing Management - Create and manage licence agreements with obligation tracking
- Royalty and Revenue Tracking - Record and track royalty payments and revenue
- Commercialisation Monitoring - Track commercialisation progress and revenue
- Document Management - Store and manage IP-related documents with version control
- Reporting and Dashboards - Comprehensive reports for all stakeholders
- Audit Trail - Complete audit logging for compliance with IPR Act and POPIA
- Integration - Seamless integration with ARC Centralized Authentication Service

---

## Tech Stack

| Layer | Technology | Version |
| :--- | :--- | :--- |
| Frontend | Angular + Ionic | 17+ / 7+ |
| Backend | Node.js + Express.js | 20 LTS / 4.x |
| ORM | Prisma | 5+ |
| Database | PostgreSQL | 16+ |
| Web Server | IIS | 10+ |
| Authentication | ARC Centralized Auth Service | v1.0 |
| Cache | Redis | 7+ |
| Logging | Winston | 3+ |
| Monitoring | Prometheus + Grafana | - |
| CI/CD | GitHub Actions | - |

---

## Project Structure

```

arc-ip-portal/
│
├── backend/                    # Node.js + Express.js API
│   ├── src/
│   │   ├── config/            # Configuration files
│   │   ├── controllers/       # Route controllers
│   │   ├── middleware/        # Express middleware
│   │   ├── models/            # Data models
│   │   ├── routes/            # API routes
│   │   ├── services/          # Business logic
│   │   ├── utils/             # Utility functions
│   │   ├── validators/        # Request validators
│   │   └── index.js           # Application entry point
│   ├── prisma/                # Prisma ORM schema
│   ├── logs/                  # Application logs
│   ├── uploads/               # File uploads
│   ├── .env.example           # Environment variables template
│   └── package.json           # Backend dependencies
│
├── frontend/                   # Ionic + Angular SPA
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/          # Singleton services
│   │   │   ├── features/      # Feature modules
│   │   │   ├── shared/        # Reusable components
│   │   │   └── layouts/       # Layout components
│   │   ├── assets/            # Static assets
│   │   ├── environments/      # Environment configs
│   │   ├── theme/             # Theme styles
│   │   ├── index.html         # Entry point
│   │   └── main.ts            # Bootstrap
│   ├── .env.example           # Environment variables template
│   ├── package.json           # Frontend dependencies
│   ├── angular.json           # Angular configuration
│   └── ionic.config.json      # Ionic configuration
│
├── deployment/                 # Deployment scripts
│   ├── scripts/
│   │   ├── server-setup.ps1   # Windows Server setup
│   │   ├── deploy.ps1         # Deployment script
│   │   └── rollback.ps1       # Rollback script
│   └── iis/
│       └── web.config         # IIS configuration
│
├── docs/                       # Project documentation
│   ├── Business Case.docx
│   ├── SRS.docx
│   ├── SDD.docx
│   ├── User Manual.docx
│   └── Deployment Guide.docx
│
├── .github/
│   └── workflows/
│       └── deploy.yml         # GitHub Actions CI/CD workflow
│
├── .gitignore                  # Git ignore file
├── README.md                   # This file
└── LICENSE                     # License file

```

---

## Development Setup

### Prerequisites

- Node.js 20 LTS or higher
- PostgreSQL 16 or higher
- Redis 7 or higher
- Git
- VS Code (recommended) or any code editor
- Ionic CLI (for frontend development)

### Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your database credentials
# Update DATABASE_URL, JWT_SECRET, etc.

# Run database migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Seed database (optional)
npx prisma db seed

# Start development server
npm run dev
```

The backend API will be available at: http://localhost:3000

Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
ionic serve
```

The frontend will be available at: http://localhost:4200

Database Setup

```sql
-- Create databases
CREATE DATABASE arc_ip_portal_dev;
CREATE DATABASE arc_ip_portal_test;
CREATE DATABASE arc_ip_portal_prod;

-- Create user
CREATE USER arc_user WITH PASSWORD 'your_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE arc_ip_portal_dev TO arc_user;
GRANT ALL PRIVILEGES ON DATABASE arc_ip_portal_test TO arc_user;
GRANT ALL PRIVILEGES ON DATABASE arc_ip_portal_prod TO arc_user;
```

---

Environment Variables

Backend (.env)

```
# Database
DATABASE_URL="postgresql://arc_user:password@localhost:5432/arc_ip_portal_dev"

# ARC Centralized Authentication Service
ARC_AUTH_URL="http://155.240.161.22:3010"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="8h"

# Redis
REDIS_HOST="localhost"
REDIS_PORT="6379"

# Email
SMTP_HOST="smtp.arc.agric.za"
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="ip-portal@arc.agric.za"
```

Frontend (.env)

```
API_URL="http://localhost:3000/api"
ARC_AUTH_URL="http://155.240.161.22:3010"
APP_NAME="ARC IP Portal"
```

---

API Documentation

Authentication Endpoints

Method Endpoint Description
POST /api/auth/login Login with AD credentials
POST /api/auth/logout Logout and clear session
POST /api/auth/refresh Refresh JWT token
GET /api/auth/me Get current user info

Core Endpoints

Method Endpoint Description Access
GET /api/disclosures List disclosures Researcher, TTO, Admin
POST /api/disclosures Create disclosure Researcher, TTO, Admin
GET /api/ip-assets List IP assets TTO, Legal, Admin
POST /api/ip-assets Create IP asset TTO, Admin
GET /api/licences List licences TTO, Legal, Finance, Admin
POST /api/licences Create licence TTO, Finance, Admin
GET /api/reports/ip-portfolio IP portfolio report TTO, Executive, Admin
GET /api/reports/revenue-tracking Revenue report Finance, Executive, Admin

---

Branch Strategy

Branch Purpose Protection
main Production-ready code 2 approvals required
develop Integration branch 1 approval required
feature/* Individual features -
bugfix/* Bug fixes -
release/* Release preparation -
hotfix/* Emergency production fixes 2 approvals required

Workflow

```bash
# Start a new feature
git checkout develop
git pull origin develop
git checkout -b feature/disclosure-module

# After making changes
git add .
git commit -m "feat: Add disclosure management module"
git push -u origin feature/disclosure-module

# Create Pull Request on GitHub
# Base: develop | Compare: feature/disclosure-module
```

---

CI/CD Pipeline

Automated deployment via GitHub Actions:

Environment URL Trigger Approval
Development https://dev.ip-portal.arc.agric.za Push to develop Auto-deploy
Staging https://staging.ip-portal.arc.agric.za Push to develop 1 approval
Production https://ip.arc.agric.za Push to main 2 approvals

Pipeline Stages

1. Build and Test
   · Install dependencies
   · Run unit tests
   · Build frontend and backend
   · Upload artifacts
2. Deploy to Development
   · Deploy to dev server
   · Run database migrations
   · Health check
3. Deploy to Staging (manual approval)
   · Deploy to staging server
   · Run database migrations
   · Health check
4. Deploy to Production (manual approval)
   · Backup database
   · Deploy to production servers
   · Run database migrations
   · Health check
   · Create GitHub Release

---

Testing

Backend Tests

```bash
cd backend
npm test           # Run unit tests
npm run test:ci    # Run tests with coverage
```

Frontend Tests

```bash
cd frontend
npm test           # Run unit tests
npm run test:headless  # Run tests in CI
```

---

Deployment

Manual Deployment (if CI/CD unavailable)

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

---

Documentation

Document Location
Business Case docs/Business Case.docx
Requirements Specification docs/SRS.docx
Software Design Document docs/SDD.docx
User Manual docs/User Manual.docx
Deployment Guide docs/Deployment Guide.docx

---

Security

The system implements multiple layers of security:

· Authentication: ARC Centralized Authentication Service + JWT
· Authorization: Role-Based Access Control (RBAC)
· Data Security: PostgreSQL Row-Level Security (RLS)
· Transport: HTTPS/TLS 1.3
· Headers: Helmet for security headers
· Input Validation: express-validator + sanitization
· Audit Trail: Complete logging of all actions
· Compliance: IPR Act and POPIA compliance

---

Monitoring

The system uses Prometheus + Grafana for monitoring:

· API Metrics: Response time, error rate, request count
· System Metrics: CPU, Memory, Disk usage
· Database Metrics: Connections, query time
· Business Metrics: Disclosures, licences, revenue
· Alerting: Automated alerts for critical events

---

Troubleshooting

Common Issues

Port 3000 already in use:

```bash
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

Database connection failed:

```bash
pg_isready
net start postgresql-x64-16
```

Redis connection failed:

```bash
redis-cli ping
Start-Service redis
```

---

Contributors

Role Name
Project Manager Dr Keoagile William Modisakeng
Lead Developer / Solution Architect Zibusiso Ncube
TTO Representative To be assigned
Legal Representative To be assigned
Finance Representative To be assigned
ICT Representative To be assigned

---

Contact

· Main Contact: enquiry@arc.agric.za
· Developer Contact: ncubez@arc.agric.za
· Phone: +27 (0)12 427 9700
· Address: 1134 Park Street, Hatfield, Pretoria
· PO Box: PO Box 8783, Pretoria, 0001

---

License

This project is for ARC Internal Use Only. All rights reserved.

---

Changelog

Version 1.0.0 (Expected: December 2026)

· Initial release
· Core IP management features
· Disclosure management
· IP asset tracking
· Licence management
· Royalty tracking
· Reporting dashboard
· Integration with ARC Centralized Authentication Service
· CI/CD pipeline with GitHub Actions

---

Acknowledgments

· Agricultural Research Council (ARC) for funding and support
· Technology Transfer Office (TTO) for requirements definition
· ICT Department for infrastructure support
· Legal Services for compliance guidance
· Finance Department for financial requirements

---

Quick Start

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

# Setup frontend (in a new terminal)
cd frontend
npm install
cp .env.example .env
ionic serve

# Open browser to http://localhost:4200
```

---

Status Badges

https://github.com/agriculturalresearchcouncil/arc-ip-portal/actions/workflows/deploy.yml/badge.svg
https://img.shields.io/badge/license-ARC%20Internal-blue.svg
https://img.shields.io/badge/node-v20-green.svg
https://img.shields.io/badge/postgresql-16-blue.svg
https://img.shields.io/badge/angular-17-red.svg
https://img.shields.io/badge/ionic-7-blue.svg
https://img.shields.io/badge/express-4.x-lightgrey.svg
https://img.shields.io/badge/prisma-5-blue.svg
https://img.shields.io/badge/redis-7-red.svg
https://img.shields.io/badge/IIS-10-blue.svg
https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-blue.svg

---

ARC Intellectual Property Management Portal — Protecting and commercializing ARC innovations.
