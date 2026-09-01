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
[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-blue.svg)](https://github.com/features/actions)

A secure, enterprise-grade digital platform for managing the complete intellectual property lifecycle within the Agricultural Research Council (ARC). The system provides a centralized, standardized solution for IP management from invention disclosure through commercialization and revenue management.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security](#security)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Contact](#contact)
- [License](#license)

---

## 📖 Overview

The ARC IP Portal is a secure, enterprise-grade digital platform designed to manage the complete intellectual property lifecycle within the Agricultural Research Council (ARC). It supports the full IP lifecycle from disclosure and evaluation through protection, licensing, commercialization, revenue generation, and compliance reporting.

The system provides a centralized repository for all ARC IP assets while supporting collaboration among Researchers, TTO personnel, Legal Services, Finance, Executives, and System Administrators. Integration with ARC Centralized Authentication Service ensures seamless Single Sign-On (SSO) and Active Directory integration.

---

## ✨ Key Features

### 🔬 Invention Disclosures
- Submit and manage invention disclosures
- Track disclosure status and workflow
- Attach supporting documents
- Assign inventors and contributors

### 🛡️ IP Asset Management
- Register and track patents, PBR, trademarks, copyright, and more
- View comprehensive IP portfolio
- Track protection status and renewals
- Manage IP relationships

### 📊 Technology Evaluation
- Score and evaluate technologies
- Multi-dimensional evaluation (Technical, IP, Commercial)
- Track evaluation outcomes and recommendations

### 📄 Licensing Management
- Create and manage licensing agreements
- Track licensees and contacts
- Monitor obligations and milestones
- Manage territories and royalty terms

### 💰 Royalty & Revenue Management
- Track royalty payments
- Generate royalty schedules
- Monitor overdue payments
- Revenue reporting and analytics

### 📈 Commercialisation Monitoring
- Track commercialisation projects
- Monitor market readiness
- Track revenue and milestones
- Commercialisation partner management

### 📁 Document Management
- SharePoint integration for document storage
- Version control and metadata management
- Document search and retrieval
- Document lifecycle management

### 📊 Reporting & Dashboards
- Executive dashboard with key metrics
- TTO operational dashboard
- Researcher dashboard
- Customizable reports

### 🔒 Security & Compliance
- Role-Based Access Control (RBAC)
- Row-Level Security (RLS)
- Complete audit trail
- IPR Act and POPIA compliance

---

## 🛠️ Tech Stack

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20 LTS | Runtime environment |
| Express.js | 4.x | Web framework |
| Prisma | 5+ | ORM |
| PostgreSQL | 16+ | Database |
| Redis | 7+ | Cache & session store |
| Winston | 3+ | Logging |
| Jest | Latest | Testing |
| JWT | Latest | Authentication |

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Angular | 17+ | Web framework |
| Ionic | 7+ | Mobile framework |
| NgRx | Latest | State management |
| RxJS | Latest | Reactive programming |
| Capacitor | Latest | Native mobile apps |
| Chart.js | Latest | Charts and graphs |

### Infrastructure
| Technology | Version | Purpose |
|------------|---------|---------|
| IIS | 10+ | Web server |
| GitHub Actions | - | CI/CD |
| Prometheus | Latest | Monitoring |
| Grafana | Latest | Dashboards |
| SharePoint | Online/On-Prem | Document management |

---

## 📁 Project Structure
arc-ip-portal/
│
├── backend/ # Node.js + Express.js API
│ ├── src/
│ │ ├── config/ # Configuration files
│ │ ├── auth/ # Authentication logic
│ │ ├── controllers/ # Route controllers
│ │ ├── middleware/ # Express middleware
│ │ ├── models/ # Data models
│ │ ├── routes/ # API routes
│ │ ├── services/ # Business logic
│ │ ├── workflows/ # Workflow engine
│ │ ├── validators/ # Request validators
│ │ ├── dto/ # Data transfer objects
│ │ ├── utils/ # Utility functions
│ │ ├── logging/ # Logging configuration
│ │ ├── errors/ # Error handling
│ │ └── app.js # Application entry point
│ ├── prisma/ # Prisma ORM schema
│ ├── logs/ # Application logs
│ ├── uploads/ # File uploads
│ ├── tests/ # Test files
│ ├── scripts/ # Utility scripts
│ ├── .env.example # Environment variables template
│ ├── package.json # Backend dependencies
│ └── README.md # Backend documentation
│
├── frontend/ # Ionic + Angular SPA
│ ├── src/
│ │ ├── app/
│ │ │ ├── core/ # Singleton services
│ │ │ ├── features/ # Feature modules
│ │ │ ├── shared/ # Reusable components
│ │ │ ├── layouts/ # Layout components
│ │ │ └── app-routing.module.ts
│ │ ├── assets/ # Static assets
│ │ ├── environments/ # Environment configs
│ │ ├── theme/ # Theme styles
│ │ ├── index.html # Entry point
│ │ └── main.ts # Bootstrap
│ ├── tests/ # Test files
│ ├── .env.example # Environment variables template
│ ├── package.json # Frontend dependencies
│ ├── angular.json # Angular configuration
│ ├── ionic.config.json # Ionic configuration
│ └── README.md # Frontend documentation
│
├── deployment/ # Deployment scripts
│ ├── scripts/
│ │ ├── server-setup.ps1 # Windows Server setup
│ │ ├── deploy.ps1 # Deployment script
│ │ └── rollback.ps1 # Rollback script
│ └── iis/
│ └── web.config # IIS configuration
│
├── docs/ # Project documentation
│ ├── architecture/ # Architecture documentation
│ ├── api/ # API documentation
│ ├── user-guide/ # User guides
│ ├── Business Case.docx
│ ├── SRS.docx
│ ├── SDD.docx
│ └── Deployment Guide.docx
│
├── .github/
│ └── workflows/
│ ├── ci.yml # Continuous Integration
│ └── deploy.yml # Continuous Deployment
│
├── .gitignore # Git ignore file
├── README.md # This file
└── LICENSE # License file

text

---

## 🔧 Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 20 LTS or higher | Backend runtime |
| PostgreSQL | 16 or higher | Database |
| Redis | 7 or higher | Cache and session store |
| Git | Latest | Version control |
| Angular CLI | 17+ | Frontend development |
| Ionic CLI | 7+ | Mobile development |

### Optional Software

| Software | Purpose |
|----------|---------|
| VS Code | Recommended IDE |
| Postman | API testing |
| pgAdmin | Database management |
| Redis Insight | Redis management |

### Windows Server Requirements

| Component | Specification |
|-----------|---------------|
| OS | Windows Server 2022 |
| IIS | 10+ with ARR module |
| RAM | 16GB minimum |
| CPU | 4 cores minimum |
| Storage | 100GB minimum |

---

## 🚀 Installation

### Clone the Repository

```bash
git clone https://github.com/agriculturalresearchcouncil/arc-ip-portal.git
cd arc-ip-portal
Backend Setup
bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your database credentials
# Update DATABASE_URL, JWT_SECRET, etc.

# Run database migrations
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# Seed database (optional)
npx prisma db seed

# Start development server
npm run dev
The backend API will be available at: http://localhost:3000

Frontend Setup
bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
ionic serve
The frontend will be available at: http://localhost:4200

Database Setup
sql
-- Create databases
CREATE DATABASE arc_ip_portal_dev;
CREATE DATABASE arc_ip_portal_test;
CREATE DATABASE arc_ip_portal_prod;

-- Create user
CREATE USER arc_user WITH PASSWORD 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE arc_ip_portal_dev TO arc_user;
GRANT ALL PRIVILEGES ON DATABASE arc_ip_portal_test TO arc_user;
GRANT ALL PRIVILEGES ON DATABASE arc_ip_portal_prod TO arc_user;

-- Grant schema privileges
\c arc_ip_portal_dev
GRANT ALL ON SCHEMA public TO arc_user;

\c arc_ip_portal_test
GRANT ALL ON SCHEMA public TO arc_user;

\c arc_ip_portal_prod
GRANT ALL ON SCHEMA public TO arc_user;
🌍 Environment Variables
Backend (.env)
env
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
Frontend (.env)
env
API_URL="http://localhost:3000/api"
ARC_AUTH_URL="http://155.240.161.22:3010"
APP_NAME="ARC IP Portal"
APP_VERSION="1.0.0"
📚 API Documentation
Authentication Endpoints
Method	Endpoint	Description	Access
POST	/api/auth/login	Login with AD credentials	Public
POST	/api/auth/logout	Logout and clear session	Authenticated
POST	/api/auth/refresh	Refresh JWT token	Authenticated
GET	/api/auth/me	Get current user info	Authenticated
Core Endpoints
Method	Endpoint	Description	Access
GET	/api/disclosures	List disclosures	Researcher, TTO, Admin
POST	/api/disclosures	Create disclosure	Researcher, TTO, Admin
GET	/api/disclosures/{id}	Get disclosure	Researcher (own), TTO, Admin
PUT	/api/disclosures/{id}	Update disclosure	Researcher (own), TTO, Admin
POST	/api/disclosures/{id}/submit	Submit disclosure	Researcher (own)
POST	/api/disclosures/{id}/review	Review disclosure	TTO, Admin
GET	/api/ip-assets	List IP assets	TTO, Legal, Admin
POST	/api/ip-assets	Create IP asset	TTO, Admin
GET	/api/ip-assets/{id}	Get IP asset	TTO, Legal, Admin
PUT	/api/ip-assets/{id}	Update IP asset	TTO, Admin
GET	/api/licences	List licences	TTO, Legal, Finance, Admin
POST	/api/licences	Create licence	TTO, Finance, Admin
GET	/api/licences/{id}	Get licence	TTO, Legal, Finance, Admin
PUT	/api/licences/{id}	Update licence	TTO, Finance, Admin
GET	/api/royalties	List royalties	Finance, Admin
POST	/api/royalties	Record royalty	Finance, Admin
GET	/api/reports/ip-portfolio	IP portfolio report	TTO, Executive, Admin
GET	/api/reports/revenue-tracking	Revenue report	Finance, Executive, Admin
GET	/api/reports/compliance-status	Compliance report	Legal, TTO, Admin
GET	/api/dashboards/executive	Executive dashboard	Executive, Admin
GET	/api/dashboards/tto	TTO dashboard	TTO, Admin
GET	/api/dashboards/researcher	Researcher dashboard	Researcher
Full API Documentation
When the backend is running, Swagger documentation is available at:

text
http://localhost:3000/api/docs
💻 Development Workflow
Branch Strategy
Branch	Purpose	Protection
main	Production-ready code	2 approvals required
develop	Integration branch	1 approval required
feature/*	Individual features	-
bugfix/*	Bug fixes	-
release/*	Release preparation	-
hotfix/*	Emergency production fixes	2 approvals required
Workflow Commands
bash
# Start a new feature
git checkout develop
git pull origin develop
git checkout -b feature/disclosure-module

# Make changes and commit
git add .
git commit -m "feat: Add disclosure management module"
git push -u origin feature/disclosure-module

# Create Pull Request on GitHub
# Base: develop | Compare: feature/disclosure-module

# After PR is approved and merged
git checkout develop
git pull origin develop
git branch -d feature/disclosure-module

# Create a release
git checkout develop
git pull origin develop
git checkout -b release/v1.0.0

# After testing, merge to main
git checkout main
git merge release/v1.0.0
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin main --tags

# Hotfix
git checkout main
git checkout -b hotfix/urgent-fix
# Fix and test
git add .
git commit -m "fix: Urgent production fix"
git push -u origin hotfix/urgent-fix
# Create PR to main and develop
Commit Convention
Follow Conventional Commits:

bash
feat: Add disclosure submission workflow
fix: Fix patent validation logic
docs: Update API documentation
style: Format code with Prettier
refactor: Simplify evaluation service
perf: Optimize database queries
test: Add unit tests for licence service
chore: Update dependencies
ci: Update GitHub Actions workflow
Commit Types:

feat: New feature

fix: Bug fix

docs: Documentation changes

style: Code style changes

refactor: Code refactoring

perf: Performance improvements

test: Adding tests

chore: Maintenance tasks

ci: CI/CD changes

build: Build system changes

🧪 Testing
Backend Tests
bash
# Navigate to backend
cd backend

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- --testPathPattern=disclosure

# Run tests for CI
npm run test:ci
Frontend Tests
bash
# Navigate to frontend
cd frontend

# Run unit tests
npm test

# Run tests in headless mode
npm run test:headless

# Run tests for CI
npm run test:ci

# Run e2e tests
npm run e2e
Test Coverage Requirements
Category	Minimum Coverage
Statements	80%
Branches	75%
Functions	80%
Lines	80%
🚢 Deployment
CI/CD Pipeline
Automated deployment via GitHub Actions:

Environment	URL	Trigger	Approval
Development	https://dev.ip-portal.arc.agric.za	Push to develop	Auto-deploy
Staging	https://staging.ip-portal.arc.agric.za	Push to develop	1 approval
Production	https://ip.arc.agric.za	Push to main	2 approvals
Pipeline Stages
Build and Test

Install dependencies

Run unit tests

Build frontend and backend

Upload artifacts

Deploy to Development (auto)

Deploy to dev server

Run database migrations

Health check

Deploy to Staging (manual approval)

Deploy to staging server

Run database migrations

Health check

Deploy to Production (manual approval)

Backup database

Deploy to production servers

Run database migrations

Health check

Create GitHub Release

Manual Deployment
If CI/CD is unavailable:

powershell
# Deploy to Development
.\deployment\scripts\deploy.ps1 -Environment dev

# Deploy to Staging
.\deployment\scripts\deploy.ps1 -Environment staging

# Deploy to Production
.\deployment\scripts\deploy.ps1 -Environment prod

# Rollback Production
.\deployment\scripts\rollback.ps1
PM2 Configuration
javascript
// ecosystem.config.js
module.exports = {
  apps: [{
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
  }]
};
🔒 Security
Security Architecture
Layer	Security Controls
Client Layer	HTTPS only, secure cookie storage, input sanitization
Web Server	TLS 1.3, HSTS, request filtering, WAF
API Layer	JWT authentication, RBAC, rate limiting, input validation
Database Layer	Row-Level Security, encryption at rest, audit triggers
External Services	OAuth2, API keys, IP whitelisting
Authentication Flow
User submits credentials to ARC Centralized Authentication Service

Auth service validates against Active Directory

JWT token is issued and stored in HTTP-only cookie

All subsequent requests include the token

Backend validates token with Auth Service

Important: The backend does NOT store passwords or perform authentication directly.

Role-Based Access Control (RBAC)
Role	Description	Access Level
Researcher	Submits IP disclosures	Create/View own disclosures
TTO Officer	Manages IP lifecycle	Full CRUD on all IP records
TTO Manager	Oversees TTO operations	Full access with approval authority
Legal Officer	Reviews contracts, compliance	View/Edit legal documents
Finance Officer	Tracks royalties, revenue	View financial data
Executive	Strategic oversight	Read-only dashboards and reports
Institute Manager	Manages institute IP	View institute IP
ICT	System administration	System maintenance
System Administrator	Full system administration	Full system access
📊 Monitoring
Monitoring Stack
Metrics Collection: Prometheus

Dashboards: Grafana

Logging: Winston with daily rotation

Alerting: AlertManager

APM: Custom metrics

Key Metrics
Metric	Source	Threshold
API Response Time	Node.js	>500ms → Warning
API Error Rate	Node.js	>5% → Critical
CPU Usage	Node.js/IIS	>80% → Warning
Memory Usage	Node.js/IIS	>85% → Critical
Database Connections	PostgreSQL	>80 → Warning
Database Query Time	PostgreSQL	>100ms → Warning
Active Sessions	Redis	>500 → Scale up
Disk Usage	Server	>85% → Warning
Authentication Failures	ARC Auth	>10/min → Alert
Logging Strategy
javascript
// Winston logging configuration
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
🔧 Troubleshooting
Common Issues
Port 3000 already in use:

bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux
lsof -i :3000
kill -9 <PID>
Database connection failed:

bash
# Windows
pg_isready
net start postgresql-x64-16

# Linux
sudo systemctl status postgresql
sudo systemctl start postgresql
Redis connection failed:

bash
# Windows
redis-cli ping

# Linux
redis-cli ping
sudo systemctl start redis-server
Node.js memory issues:

bash
# Increase memory limit
node --max-old-space-size=4096 dist/app.js

# With PM2
pm2 start dist/app.js --node-args="--max-old-space-size=4096"
Health Check
bash
# Backend health check
curl http://localhost:3000/health

# Database health check
npx prisma db execute --file scripts/health-check.sql

# Redis health check
redis-cli ping
🤝 Contributing
Getting Started
Fork the repository

Create a feature branch

Make your changes

Write tests

Submit a pull request

Code Review Checklist
□ Code follows style guidelines
□ Tests are passing
□ Documentation is updated
□ No security vulnerabilities
□ Performance is optimized
Please read CONTRIBUTING.md for full details on our code of conduct and the process for submitting pull requests.

📞 Contact
Primary Contacts
Role	Name	Email
Project Manager	Dr Keoagile William Modisakeng	modisakengkw@arc.agric.za
Lead Developer	Zibusiso Ncube	ncubez@arc.agric.za
TTO Representative	TTO Office	tto@arc.agric.za
ICT Manager	Matodzi Phaswana	phaswanam@arc.agric.za
Support
Email: ip-portal-support@arc.agric.za

Phone: +27 (0)12 427 9700

Address: 1134 Park Street, Hatfield, Pretoria

PO Box: PO Box 8783, Pretoria, 0001

📄 License
This project is proprietary software owned by the Agricultural Research Council (ARC). All rights reserved.

For Internal Use Only - Unauthorized distribution, modification, or use outside the ARC organization is strictly prohibited.

📝 Changelog
Version 1.0.0 (Expected: December 2026)
Initial Release

Features:

Invention Disclosure Management

IP Asset Management (Patents, PBR, Trademarks, Copyright)

Technology Evaluation (Technical, IP, Commercial)

Licensing Management

Royalty and Revenue Tracking

Commercialisation Monitoring

Document Management (SharePoint integration)

Executive and TTO Dashboards

Audit Trail and Compliance

Role-Based Access Control

Infrastructure:

Node.js + Express.js backend

Angular + Ionic frontend

PostgreSQL database

Redis caching

IIS web server

GitHub Actions CI/CD

Prometheus + Grafana monitoring

Integrations:

ARC Centralized Authentication Service

SharePoint Online/On-Prem

SMTP Email Notifications

🏆 Acknowledgments
Agricultural Research Council (ARC) for funding and support

Technology Transfer Office (TTO) for requirements definition

ICT Department for infrastructure support

Legal Services for compliance guidance

Finance Department for financial requirements

All ARC Researchers for their invaluable feedback

📊 Status Badges
https://github.com/agriculturalresearchcouncil/arc-ip-portal/actions/workflows/deploy.yml/badge.svg
https://img.shields.io/badge/license-ARC%2520Internal-blue.svg
https://img.shields.io/badge/node-v20-green.svg
https://img.shields.io/badge/postgresql-16-blue.svg
https://img.shields.io/badge/angular-17-red.svg
https://img.shields.io/badge/ionic-7-blue.svg
https://img.shields.io/badge/express-4.x-lightgrey.svg
https://img.shields.io/badge/prisma-5-blue.svg
https://img.shields.io/badge/redis-7-red.svg
https://img.shields.io/badge/IIS-10-blue.svg
https://img.shields.io/badge/CI%252FCD-GitHub%2520Actions-blue.svg

🚀 Quick Start
bash
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
ARC Intellectual Property Management Portal — Protecting and commercializing ARC innovations.

© Agricultural Research Council (ARC) - All Rights Reserved
