# ARC Intellectual Property Management Portal

[![CI/CD](https://github.com/agriculturalresearchcouncil/arc-ip-portal/actions/workflows/deploy.yml/badge.svg)](https://github.com/agriculturalresearchcouncil/arc-ip-portal/actions/workflows/deploy.yml)
[![License](https://img.shields.io/badge/license-ARC%20Internal-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-v20-green.svg)](https://nodejs.org/)
[![SQL%20Server](https://img.shields.io/badge/sql%20server-2022-blue.svg)](https://www.microsoft.com/sql-server)
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
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Backend File Guide](#backend-file-guide)
- [SharePoint Integration Guide](#sharepoint-integration-guide)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Backend Setup](#backend-setup)
- [Frontend Setup](#frontend-setup)
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
- [Quick Start](#quick-start)
- [Maintainers](#maintainers)

---

## Overview

The ARC Intellectual Property Management Portal (IPM) is a secure, enterprise-grade digital platform designed to support the complete innovation and intellectual property lifecycle within the Agricultural Research Council (ARC).

The system supports the full lifecycle from invention disclosure and technology evaluation through intellectual property protection, licensing, commercialisation, revenue generation, royalty management, and compliance reporting.

**Key Capabilities:**

- Invention Disclosures
- Technology Evaluations
- Intellectual Property Assets
- Licensing Agreements
- Commercialisation Projects
- Royalty and Revenue Tracking
- Compliance and Governance Reporting
- SharePoint Document Management
- Executive and Operational Dashboards

**User Roles:**

- Researchers
- Technology Transfer Office (TTO)
- Legal Services
- Finance
- Executive Management
- Institute Managers
- ICT Administrators
- System Administrators

Authentication is integrated with the ARC Centralized Authentication Service and Active Directory to support Single Sign-On (SSO).

---

## Solution Summary

| Component | Technology |
|-----------|------------|
| Frontend | Angular 17 + Ionic 7 |
| Backend | Node.js 20 + Express.js |
| ORM | Prisma 5 |
| Database | Microsoft SQL Server 2022 |
| Cache | Redis 7 |
| Authentication | ARC Centralized Authentication Service |
| CI/CD | GitHub Actions |
| Hosting | IIS 10 |
| Monitoring | Prometheus + Grafana |
| Logging | Winston |
| Document Management | SharePoint (Microsoft Graph API) |
| Email Notifications | SMTP |

---

## Solution Architecture

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
    │ SQL Server 2022  │   │     Redis 7      │
     │ IP Data + Audit  │   │ Cache + Sessions │
     └────────┬─────────┘   └──────────────────┘
              │
              ▼
     ┌──────────────────────────────────────────────┐
     │         SharePoint Document Library          │
     │  - IPDocuments (Main storage)                │
     │  - Disclosures / Licences / Patents          │
     │  - PBR / Trademarks / Commercialisation      │
     └──────────────────────────────────────────────┘

     External Services:
     ARC Centralized Authentication │ SMTP │ Monitoring
```

### Architecture Layers

1. **Frontend Layer** — Angular and Ionic user experience
2. **Application Layer** — Node.js and Express.js APIs, workflows, business rules
3. **Infrastructure and Data Layer** — IIS, SQL Server, Redis, SharePoint, monitoring

---

## Key Features

### Invention Disclosure Management
- Submit and manage invention disclosures
- Track disclosure status and workflow
- Attach supporting documents
- Assign inventors and contributors

### Intellectual Property Asset Management
- Patents, Plant Breeders' Rights (PBR), Trademarks
- Copyright, Designs, Trade Secrets
- Protection and renewal tracking
- Status monitoring and jurisdiction management

### Technology Evaluation
- Technical, IP, and Commercial assessment scoring
- Multi-dimensional technology evaluation
- Recommendation and outcome tracking

### Licensing Management
- Create and manage licensing agreements
- Track licensees, contacts, and territories
- Monitor obligations and milestones

### Royalty and Revenue Management
- Track royalty payments and schedules
- Monitor overdue payments
- Revenue reporting and analytics

### Commercialisation Monitoring
- Track commercialisation projects
- Manage partners and market readiness
- Monitor revenue and milestones

### Document Management with SharePoint
- SharePoint integration via Microsoft Graph API
- Document upload, download, and version control
- Metadata management and search
- Confidential document access control
- Local storage fallback

### Reporting and Dashboards
- Executive Dashboard
- TTO Operational Dashboard
- Researcher Dashboard
- IP Portfolio, Revenue, and Compliance Reports

### Security and Compliance
- Active Directory integration
- Role-Based Access Control (RBAC)
- Complete audit trails
- POPIA and IPR Act compliance

---

# SharePoint Integration Guide

## Architecture: Portal as Coordinator

```text
┌─────────────────────────────────────────────────────┐
│                 ARC IP Portal Backend               │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │              Document Service               │    │
│  │  • Orchestrates document operations         │    │
│  │  • Manages metadata in database             │    │
│  │  • Coordinates SharePoint interactions      │    │
│  └──────────────────┬──────────────────────────┘    │
│                     │                               │
│  ┌──────────────────▼──────────────────────────┐    │
│  │             SharePoint Service              │    │
│  │  • Authenticates via Microsoft Graph API    │    │
│  │  • Uploads and downloads files              │    │
│  │  • Creates folders and metadata             │    │
│  │  • Handles retry and error logic            │    │
│  └──────────────────┬──────────────────────────┘    │
└─────────────────────┼───────────────────────────────┘
                      │
                      │ Microsoft Graph API
                      │ (OAuth2 Client Credentials)
                      ▼
┌─────────────────────────────────────────────────────┐
│          SharePoint Online (DevOTT Site)           │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │         TTOPortalDocuments Library          │    │
│  │                                             │    │
│  │  IPAssets/{ipRecordId}/                     │    │
│  │  Disclosures/{disclosureId}/                │    │
│  │  Licences/{licenceId}/                      │    │
│  │  Patents/{patentId}/                        │    │
│  │  PBR/{pbrId}/                               │    │
│  │  Trademarks/{trademarkId}/                  │    │
│  │  Commercialisation/{commercialisationId}/   │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

---

## SharePoint Configuration

### SharePoint Site

- **Site URL:** `https://arcagricza2.sharepoint.com/sites/DevOTT`
- **Site Type:** Development OTT Site
- **Document Library:** `TTOPortalDocuments`
- **Storage Strategy:** Dedicated library for ARC TTO Portal documents

### Why Use a Dedicated Library?

The `DevOTT` SharePoint site is shared by multiple applications. Creating and using a dedicated document library (`TTOPortalDocuments`) provides:

- Logical separation of TTO Portal documents
- Prevention of naming conflicts with other applications
- Easier administration and permission management
- Cleaner backup and migration processes
- Improved governance and auditability

---

## SharePoint Library Structure

The portal stores documents inside a single SharePoint document library:

```text
TTOPortalDocuments/
│
├── IPAssets/
├── Disclosures/
├── Licences/
├── Patents/
├── PBR/
├── Trademarks/
└── Commercialisation/
```

### Folder Purposes

| Folder | Purpose |
|----------|----------|
| IPAssets | IP asset documents |
| Disclosures | Innovation disclosure submissions |
| Licences | Licensing agreements and related documents |
| Patents | Patent documentation |
| PBR | Plant Breeders' Rights documentation |
| Trademarks | Trademark registrations and related assets |
| Commercialisation | Commercialisation and technology transfer documents |

---

## SharePoint Integration Files

| File | Purpose |
|--------|----------|
| `src/config/sharepoint.js` | SharePoint configuration |
| `src/sharepoint/sharepoint.client.js` | Microsoft Graph API client |
| `src/sharepoint/sharepoint.service.js` | SharePoint orchestration and file operations |
| `src/services/document.service.js` | Document business logic |
| `src/database/repositories/document.repository.js` | Document database operations |
| `src/scripts/get-sharepoint-ids.js` | Retrieves SharePoint site and library IDs |
| `src/scripts/test-sharepoint.js` | Tests SharePoint connectivity |
| `src/scripts/cleanup-sharepoint.js` | Removes test data from SharePoint |

---

## Retrieving SharePoint IDs

Run the following script from the backend root directory:

```bash
npm run sharepoint:ids
```

Or directly:

```bash
node src/scripts/get-sharepoint-ids.js
```

This script retrieves:

- SharePoint Site ID
- Document Library (Drive) ID
- Site Metadata

---

## Required Document Library

Create the following document library in SharePoint:

```text
TTOPortalDocuments
```

> The application automatically creates and manages folders within the library as required.

---

## Azure AD App Registration

### 1. Register an Application

Create a new App Registration in Azure Active Directory.

### 2. Configure Microsoft Graph Permissions

Add the following **Application Permissions**:

| Permission | Type | Purpose |
|------------|------|----------|
| `Sites.ReadWrite.All` | Application | Read and manage SharePoint site content |
| `Files.ReadWrite.All` | Application | Read and manage files within SharePoint libraries |

### 3. Grant Admin Consent

A Microsoft 365 tenant administrator must grant consent for the permissions above.

### 4. Create Client Secret

Generate and securely store a client secret for backend authentication.

---

## Environment Configuration

Add the following values to:

```text
backend/.env
```

```env
# Azure AD Application Registration
SHAREPOINT_TENANT_ID=your-tenant-id
SHAREPOINT_CLIENT_ID=your-client-id
SHAREPOINT_CLIENT_SECRET=your-client-secret

# SharePoint Site Information
SHAREPOINT_SITE_URL=https://arcagricza2.sharepoint.com/sites/DevOTT
SHAREPOINT_SITE_ID=arcagricza2.sharepoint.com,4a041426-ffcf-4385-babe-3c0f2a31f458,65b8738e-52e0-47c7-9f0f-20001e833446
SHAREPOINT_DRIVE_ID=cec53d30-0f9f-4d5e-9cba-5ada6ad234c8

# Microsoft Graph Configuration
SHAREPOINT_BASE_URL=https://graph.microsoft.com/v1.0

# TTO Portal Library
SHAREPOINT_LIBRARY_NAME=TTOPortalDocuments

# Feature Flag
ENABLE_SHAREPOINT=true
```

---

## Testing the Integration

### Retrieve Site and Drive IDs

```bash
npm run sharepoint:ids
```

### Execute Connectivity Tests

```bash
npm run sharepoint:test
```

### Run Unit Tests

```bash
npm test -- --testPathPattern=sharepoint.test
```

### Run Integration Tests

```bash
npm test -- --testPathPattern=sharepoint.integration
```

### Clean Up Test Data

```bash
node src/scripts/cleanup-sharepoint.js <test-id>
```

---

## SharePoint Troubleshooting

| Symptom | Likely Cause | Resolution |
|----------|-------------|------------|
| Authentication failed | Invalid tenant ID, client ID, or secret | Verify `.env` values and ensure client secret is active |
| Site not found | Incorrect SharePoint URL or Site ID | Verify the DevOTT URL and rerun `npm run sharepoint:ids` |
| Library not found | `TTOPortalDocuments` does not exist | Create the document library in SharePoint |
| Permission denied | Required permissions not consented | Grant Microsoft Graph application permissions and admin consent |
| Upload failed | File exceeds configured limits | Verify file size and MIME type restrictions |
| Empty drives response | Graph permissions not configured correctly | Ensure `Sites.ReadWrite.All` is granted and consented |

---

## Recommended SharePoint Folder Naming Convention

The portal should create folders using entity identifiers to ensure uniqueness:

```text
TTOPortalDocuments/
│
├── IPAssets/{ipRecordId}/
├── Disclosures/{disclosureId}/
├── Licences/{licenceId}/
├── Patents/{patentId}/
├── PBR/{pbrId}/
├── Trademarks/{trademarkId}/
└── Commercialisation/{commercialisationId}/
```

Example:

```text
TTOPortalDocuments/
└── Patents/
    └── 84/
        ├── PatentApplication.pdf
        ├── PriorArtReview.docx
        └── AttorneyCorrespondence.pdf
```

---

## Implementation Summary

The ARC IP Portal uses a **Portal as Coordinator** architecture in which:

1. The **Document Service** manages business rules and document metadata.
2. The **SharePoint Service** handles all SharePoint communication.
3. Documents are stored in the dedicated **TTOPortalDocuments** SharePoint library.
4. Microsoft Graph API is used with **OAuth2 Client Credentials Flow**.
5. Metadata remains within the ARC IP Portal database while document binaries are stored in SharePoint.

This design provides a scalable, secure, and maintainable document management solution while leveraging the existing SharePoint infrastructure at:

`https://arcagricza2.sharepoint.com/sites/DevOTT`

---

## Technology Stack

### Backend Technology

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20 LTS | Runtime environment |
| Express.js | 4.x | Web framework |
| Prisma | 5+ | ORM |
| SQL Server | 2022+ | Database |
| Redis | 7+ | Cache and session store |
| Winston | 3+ | Logging |
| Jest | Latest | Testing |
| JWT | Latest | API authorization |
| Microsoft Graph API | v1.0 | SharePoint integration |
| Azure Identity | 4.x | OAuth2 authentication |

### Frontend Technology

| Technology | Version | Purpose |
|------------|---------|---------|
| Angular | 17+ | Web framework |
| Ionic | 7+ | UI and mobile framework |
| NgRx | Latest | State management |
| RxJS | Latest | Reactive programming |
| Capacitor | Latest | Native mobile applications |
| Chart.js | Latest | Charts and analytics |

### Infrastructure Technology

| Technology | Version | Purpose |
|------------|---------|---------|
| IIS | 10+ | Web server and hosting |
| GitHub Actions | - | CI/CD |
| Prometheus | Latest | Metrics collection |
| Grafana | Latest | Monitoring dashboards |
| AlertManager | Latest | Alerting |
| SharePoint | Online | Document management |
| SMTP | ARC Infrastructure | Email notifications |

---

## Project Structure

```text
arc-ip-portal/
│
├── backend/
│   ├── src/
│   │   ├── auth/
│   │   ├── config/
│   │   │   ├── index.js
│   │   │   ├── database.js
│   │   │   ├── auth.js
│   │   │   └── sharepoint.js          # SharePoint configuration
│   │   ├── controllers/
│   │   │   ├── disclosure.controller.js
│   │   │   ├── ip-asset.controller.js
│   │   │   ├── document.controller.js
│   │   │   └── user.controller.js
│   │   ├── database/
│   │   │   └── repositories/
│   │   │       ├── base.repository.js
│   │   │       ├── document.repository.js
│   │   │       ├── disclosure.repository.js
│   │   │       └── ip-record.repository.js
│   │   ├── dto/
│   │   ├── errors/
│   │   ├── logging/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   │   ├── index.js
│   │   │   ├── auth.routes.js
│   │   │   ├── disclosure.routes.js
│   │   │   ├── ip-asset.routes.js
│   │   │   ├── document.routes.js
│   │   │   └── user.routes.js
│   │   ├── scripts/
│   │   │   ├── get-sharepoint-ids.js
│   │   │   └── test-sharepoint.js
│   │   ├── services/
│   │   │   ├── disclosure.service.js
│   │   │   ├── ip-asset.service.js
│   │   │   ├── document.service.js
│   │   │   └── user.service.js
│   │   ├── sharepoint/
│   │   │   ├── sharepoint.client.js
│   │   │   └── sharepoint.service.js
│   │   ├── utils/
│   │   ├── validators/
│   │   ├── workflows/
│   │   └── app.js
│   │
│   ├── prisma/
│   ├── uploads/
│   ├── logs/
│   ├── tests/
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

---

## Backend File Guide

This section maps the main backend files to their responsibilities. The implementation is organized around routes, controllers, services, repositories, and integrations.

### Core Infrastructure

| File or area | Responsibility |
|--------------|----------------|
| `src/server.js` | Creates and starts the Express server |
| `src/config/` | Loads application, database, authentication, and SharePoint configuration |
| `src/database/` | Database access and repository coordination |
| `src/middleware/validation.middleware.js` | Validates request bodies, query parameters, and route parameters |
| `src/middleware/security.middleware.js` | Configures security headers, CORS, content type checks, and request limits |
| `src/middleware/rate-limit.middleware.js` | Applies endpoint-specific rate limits |
| `src/logging/logger.js` | Centralizes application logging |
| `src/errors/app-error.js` | Provides application-level error types |

### Service Layer

| Service | Responsibility |
|---------|----------------|
| `disclosure.service.js` | Creates, submits, reviews, searches, and reports on invention disclosures |
| `ip-asset.service.js` | Manages IP assets, status transitions, lifecycle events, and portfolio queries |
| `document.service.js` | Handles document upload, access control, metadata, versioning, and archiving |
| `evaluation.service.js` | Manages technical, IP, and commercial technology evaluations |
| `licence.service.js` | Manages licences, obligations, milestones, and royalty terms |
| `commercialisation.service.js` | Tracks partners, market readiness, milestones, and commercialisation progress |
| `workflow.service.js` | Coordinates workflow actions and state transitions |
| `report.service.js` | Produces portfolio, revenue, compliance, and operational reports |
| `audit.service.js` | Records auditable system and lifecycle events |

### Controllers and Routes

Controllers translate HTTP requests into service calls. Route modules define the public API and apply authentication, authorization, validation, and upload middleware.

| Area | Controller | Route |
|------|------------|-------|
| Authentication | `auth` | `auth.routes.js` |
| Users and roles | `user.controller.js` | `user.routes.js` |
| Disclosures | `disclosure.controller.js` | `disclosure.routes.js` |
| IP assets | `ip-asset.controller.js` | `ip-asset.routes.js` |
| Documents | `document.controller.js` | `document.routes.js` |
| Evaluations | `evaluation.controller.js` | `evaluation.routes.js` |
| Licences | `licence.controller.js` | `licence.routes.js` |
| Commercialisation | `commercialisation.controller.js` | `commercialisation.routes.js` |
| Reports and audit | `report.controller.js`, `audit.controller.js` | Corresponding route modules |

### SharePoint Integration

| File | Responsibility |
|------|----------------|
| `src/config/sharepoint.js` | SharePoint libraries, folder mappings, file limits, and retry settings |
| `src/sharepoint/sharepoint.client.js` | Microsoft Graph authentication, file operations, and retry handling |
| `src/sharepoint/sharepoint.service.js` | Entity folders and document orchestration |
| `src/scripts/get-sharepoint-ids.js` | Retrieves the SharePoint site and document-library IDs |
| `src/scripts/test-sharepoint.js` | Verifies SharePoint connectivity and file operations |

### Testing and Support Files

| Area | Responsibility |
|------|----------------|
| `backend/tests/` | Unit, integration, and API tests |
| `backend/src/validators/` | Domain-specific request validation schemas |
| `backend/src/dto/` | Data-transfer objects for API boundaries |
| `backend/src/workflows/` | Workflow definitions and transition rules |
| `backend/src/utils/` | Shared constants and helper functions |

### Role-Based Access Summary

| Role | Typical access |
|------|----------------|
| Researcher | Create and view own disclosures and related documents |
| TTO Officer | Review disclosures and manage IP lifecycle records |
| Legal Officer | Review IP, contracts, and compliance information |
| Finance Officer | Manage royalty and revenue information |
| Executive | View dashboards, statistics, and reports |
| Institute Manager | View IP belonging to the assigned institute |
| ICT / Administrator | Support and administer the platform according to assigned privileges |

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 20 LTS or higher | Backend runtime |
| SQL Server | 2022 or higher | Database |
| Redis | 7 or higher | Cache and session store |
| Git | Latest | Version control |
| Angular CLI | 17+ | Frontend development |
| Ionic CLI | 7+ | Frontend and mobile development |

### Recommended Tools

| Tool | Purpose |
|------|---------|
| VS Code | Recommended development environment |
| Postman | API testing |
| pgAdmin | Database administration |
| Redis Insight | Redis administration |
| Azure Portal | SharePoint/Azure AD configuration |

### Windows Server Requirements

| Component | Specification |
|-----------|---------------|
| Operating System | Windows Server 2022 |
| IIS | 10+ with ARR module where required |
| Memory | 16 GB minimum |
| CPU | 4 cores minimum |
| Storage | 100 GB minimum |

---

## Installation

### Clone the Repository

```bash
git clone https://github.com/agriculturalresearchcouncil/arc-ip-portal.git
cd arc-ip-portal
```

---

## Environment Variables

### Backend Environment Variables

Create `backend/.env`:

```env
# Server Configuration
NODE_ENV=development
PORT=3000
API_VERSION=v1
APP_NAME=ARC IP Portal

# Database Configuration
DB_HOST=localhost
DB_PORT=1433
DB_NAME=arc_ip_portal_staging
DB_ENCRYPT=false
DB_TRUST_CERT=true
DB_POOL_MAX=10
DB_POOL_MIN=0
DB_POOL_IDLE=30000
DB_CONNECTION_TIMEOUT=30000
DB_REQUEST_TIMEOUT=30000
DB_USER=sa
DB_PASSWORD=your-password

# ARC Centralized Authentication Service
ARC_AUTH_URL=http://155.240.161.22:3010
ARC_AUTH_TIMEOUT=10000
ARC_AUTH_CLIENT_ID=arc-ip-portal
ARC_AUTH_CLIENT_SECRET=your-client-secret

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=8h
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=7d

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# SharePoint Integration - DevOTT Site
SHAREPOINT_TENANT_ID=your-tenant-id
SHAREPOINT_CLIENT_ID=your-client-id
SHAREPOINT_CLIENT_SECRET=your-client-secret
SHAREPOINT_SITE_ID=your-site-id
SHAREPOINT_DRIVE_ID=your-drive-id
SHAREPOINT_SITE_URL=https://arcagricza2.sharepoint.com/sites/DevOTT
SHAREPOINT_BASE_URL=https://graph.microsoft.com/v1.0
SHAREPOINT_LIBRARY_NAME=IPDocuments

# Email Configuration
SMTP_HOST=smtp.arc.agric.za
SMTP_PORT=587
SMTP_USER=notification@arc.agric.za
SMTP_PASS=your-smtp-password
SMTP_FROM=ARC IP Portal <ip-portal@arc.agric.za>

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=info
LOG_DIR=logs
LOG_MAX_FILES=30

# Session Configuration
SESSION_SECRET=your-session-secret
COOKIE_SECURE=false
COOKIE_HTTP_ONLY=true
COOKIE_SAME_SITE=lax

# File Upload
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=pdf,doc,docx,xls,xlsx,jpg,jpeg,png,txt

# Feature Flags
ENABLE_SHAREPOINT=true
ENABLE_EMAIL=true
ENABLE_AUDIT=true
```

### Frontend Environment Variables

Create `frontend/.env`:

```env
API_URL="http://localhost:3000/api"
ARC_AUTH_URL="http://155.240.161.22:3010"
APP_NAME="ARC IP Portal"
APP_VERSION="1.0.0"
```

> **Security:** Never commit production secrets, passwords, JWT keys, SMTP credentials, or SharePoint client secrets to Git.

---

## Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Update .env with database and service configuration

# Get SharePoint site and drive IDs
npm run sharepoint:ids

# Run database migrations
npx prisma migrate dev --name init

# Generate Prisma Client
npx prisma generate

# Seed database (optional)
npx prisma db seed

# Start development server
npm run dev
```

The backend API will be available at: `http://localhost:3000`

---

## Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Start development server
ionic serve
```

The frontend will be available at: `http://localhost:4200`

---

## API Documentation

### Authentication Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/auth/login` | Login with ARC authentication | Public |
| POST | `/api/auth/logout` | Logout and clear session | Authenticated |
| POST | `/api/auth/refresh` | Refresh JWT token | Authenticated |
| GET | `/api/auth/me` | Get current user information | Authenticated |

### Core Endpoints

#### Disclosure Management

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/disclosures` | List disclosures | Researcher, TTO, Admin |
| POST | `/api/disclosures` | Create disclosure | Researcher, TTO, Admin |
| GET | `/api/disclosures/{id}` | Get disclosure | Researcher (own), TTO, Admin |
| PUT | `/api/disclosures/{id}` | Update disclosure | Researcher (own), TTO, Admin |
| POST | `/api/disclosures/{id}/submit` | Submit disclosure | Researcher (own) |
| POST | `/api/disclosures/{id}/review` | Review disclosure | TTO, Admin |

#### Intellectual Property Assets

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/ip-assets` | List IP assets | TTO, Legal, Admin |
| POST | `/api/ip-assets` | Create IP asset | TTO, Admin |
| GET | `/api/ip-assets/{id}` | Get IP asset | TTO, Legal, Admin |
| PUT | `/api/ip-assets/{id}` | Update IP asset | TTO, Admin |

#### Documents (with SharePoint Integration)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/documents/upload/{ipRecordId}` | Upload document to SharePoint | Researcher, TTO, Admin |
| GET | `/api/documents/{id}` | Get document with download URL | All authenticated |
| GET | `/api/documents/{id}/download` | Download document file | All authenticated |
| GET | `/api/documents/ip-record/{ipRecordId}` | Get IP record documents | All authenticated |
| DELETE | `/api/documents/{id}` | Delete/archive document | Owner, TTO, Admin |
| PATCH | `/api/documents/{id}/metadata` | Update document metadata | Owner, TTO, Admin |
| POST | `/api/documents/{id}/version` | Create new document version | Researcher, TTO, Admin |
| GET | `/api/documents/{id}/versions` | Get version history | All authenticated |

### Full API Documentation

When the backend is running, Swagger documentation is available at:

```text
http://localhost:3000/api/docs
```

---

## Development Workflow

### Branch Strategy

| Branch | Purpose | Protection |
|--------|---------|------------|
| `main` | Production-ready code | 2 approvals required |
| `develop` | Integration branch | 1 approval required |
| `feature/*` | Individual features | - |
| `bugfix/*` | Bug fixes | - |
| `release/*` | Release preparation | - |
| `hotfix/*` | Emergency production fixes | 2 approvals required |

### Workflow Commands

```bash
# Start a new feature
git checkout develop
git pull origin develop
git checkout -b feature/disclosure-module

# Commit and push changes
git add .
git commit -m "feat: Add disclosure management module"
git push -u origin feature/disclosure-module

# Create a Pull Request
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

# Create a hotfix
git checkout main
git checkout -b hotfix/urgent-fix
git add .
git commit -m "fix: Urgent production fix"
git push -u origin hotfix/urgent-fix
```

### Commit Convention

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

**Commit Types:**
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

## Testing

### Backend Tests

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

### Frontend Tests

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

### Test Coverage Requirements

| Category | Minimum Coverage |
|----------|------------------|
| Statements | 80% |
| Branches | 75% |
| Functions | 80% |
| Lines | 80% |

---

## Deployment

### CI/CD Pipeline

| Environment | URL | Trigger | Approval |
|-------------|-----|---------|----------|
| Development | `https://dev.ip-portal.arc.agric.za` | Push to `develop` | Auto-deploy |
| Staging | `https://staging.ip-portal.arc.agric.za` | Deployment workflow | 1 approval |
| Production | `https://ip.arc.agric.za` | Push/merge to `main` | 2 approvals |

### Pipeline Stages

1. **Build and Test**
   - Install dependencies
   - Run unit tests
   - Build frontend and backend
   - Upload build artifacts

2. **Deploy to Development** (auto)
   - Deploy to development server
   - Run database migrations
   - Perform health checks

3. **Deploy to Staging** (manual approval)
   - Deploy to staging server
   - Run database migrations
   - Perform health checks

4. **Deploy to Production** (manual approval)
   - Back up the database
   - Deploy to production servers
   - Run database migrations
   - Perform health checks
   - Create a GitHub Release

### Manual Deployment

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

### PM2 Configuration

```javascript
// ecosystem.config.js
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

## Security

### Security Architecture

| Layer | Security Controls |
|-------|-------------------|
| Client Layer | HTTPS, secure cookie storage, input sanitization |
| Web Server | TLS, HSTS, request filtering, WAF |
| API Layer | JWT authorization, RBAC, rate limiting, input validation |
| Database Layer | Row-Level Security, encryption at rest, audit controls |
| External Services | OAuth2, service credentials, API keys, IP controls |

### Authentication Flow

1. User initiates authentication through ARC Centralized Authentication Service
2. Authentication service validates credentials against Active Directory
3. Authenticated session or token is issued
4. Subsequent requests include authentication credentials
5. Backend validates authentication and authorization

> **Important:** The IP Portal backend does **not** store passwords and does **not** authenticate users directly against Active Directory.

### Role-Based Access Control (RBAC)

| Role | Description | Access Level |
|------|-------------|--------------|
| Researcher | Submits IP disclosures | Create and view own disclosures |
| TTO Officer | Manages IP lifecycle | Full CRUD on IP records |
| TTO Manager | Oversees TTO operations | Full access with approval authority |
| Legal Officer | Reviews contracts and compliance | Legal and compliance access |
| Finance Officer | Tracks royalties and revenue | Financial data access |
| Executive | Strategic oversight | Read-only dashboards and reports |
| Institute Manager | Manages institute IP | View institute IP |
| ICT | System support | System maintenance |
| System Administrator | Full system administration | Full system access |

---

## Monitoring

### Monitoring Stack

- **Metrics Collection:** Prometheus
- **Dashboards:** Grafana
- **Logging:** Winston with rotation
- **Alerting:** AlertManager
- **Application Metrics:** Custom application and infrastructure metrics

### Key Metrics

| Metric | Source | Threshold |
|--------|--------|-----------|
| API Response Time | Node.js | >500ms → Warning |
| API Error Rate | Node.js | >5% → Critical |
| CPU Usage | Node.js / IIS | >80% → Warning |
| Memory Usage | Node.js / IIS | >85% → Critical |
| Database Connections | SQL Server | >80 → Warning |
| Database Query Time | SQL Server | >100ms → Warning |
| Active Sessions | Redis | >500 → Scale review |
| Disk Usage | Server | >85% → Warning |
| Authentication Failures | ARC Authentication | >10/min → Alert |
| SharePoint API Calls | Microsoft Graph | >1000/min → Scale review |
| SharePoint Upload Time | Node.js | >10s → Warning |

### Logging Strategy

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

## Troubleshooting

### Common Issues

**Port 3000 Already in Use:**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux
lsof -i :3000
kill -9 <PID>
```

**Database Connection Failed:**
```bash
# Windows
sqlcmd -S localhost -Q "SELECT 1"
net start MSSQLSERVER

# Linux
sudo systemctl status mssql-server
sudo systemctl start mssql-server
```

**Redis Connection Failed:**
```bash
# Windows
redis-cli ping

# Linux
redis-cli ping
sudo systemctl start redis-server
```

**Node.js Memory Issues:**
```bash
node --max-old-space-size=4096 dist/app.js

# With PM2
pm2 start dist/app.js --node-args="--max-old-space-size=4096"
```

**SharePoint Integration Issues:**

| Issue | Cause | Solution |
|-------|-------|----------|
| Authentication failed | Invalid credentials | Check tenant ID, client ID, client secret |
| Site not found | Wrong site URL | Verify `SHAREPOINT_SITE_URL` |
| Document library not found | Library doesn't exist | Create libraries using PnP PowerShell |
| Permission denied | App lacks permissions | Grant admin consent in Azure AD |
| File upload failed | File too large | Check file size limits (50MB default) |

### Health Check

```bash
# Backend health check
curl http://localhost:3000/health

# Database health check
npx prisma db execute --file scripts/health-check.sql

# Redis health check
redis-cli ping

# SharePoint health check
node src/scripts/test-sharepoint.js
```

---

## Contributing

### Getting Started

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write and run tests
5. Update documentation
6. Submit a Pull Request

### Code Review Checklist

- [ ] Code follows project style guidelines
- [ ] Tests are passing
- [ ] Documentation is updated
- [ ] Security considerations reviewed
- [ ] Performance impact considered

---

## Contact

### Primary Contacts

| Role | Name | Email |
|------|------|-------|
| Project Manager | Dr Keoagile William Modisakeng | modisakengkw@arc.agric.za |
| Lead Developer | Zibusiso Ncube | ncubez@arc.agric.za |
| ICT Manager | Matodzi Phaswana | phaswanam@arc.agric.za |

### Support

- **Email:** enquiry@arc.agric.za
- **Phone:** +27 (0)12 427 9700
- **Address:** 1134 Park Street, Hatfield, Pretoria
- **PO Box:** PO Box 8783, Pretoria, 0001

---

## License

**ARC Internal Proprietary Software**

This project is proprietary software owned by the Agricultural Research Council (ARC).

All rights reserved.

For internal ARC use only. Unauthorized distribution, modification, or use outside the ARC organization is strictly prohibited.

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/agriculturalresearchcouncil/arc-ip-portal.git
cd arc-ip-portal

# Setup backend
cd backend
npm install
cp .env.example .env

# Edit .env with your database credentials and SharePoint settings

# Get SharePoint IDs
npm run sharepoint:ids

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev

# Setup frontend (in a new terminal)
cd frontend
npm install
cp .env.example .env
ionic serve
```

Open `http://localhost:4200`

---

## Maintainers

| Role | Name |
|------|------|
| Project Owner | Dr Keoagile William Modisakeng |
| Solution Architect & Lead Developer | Zibusiso Ncube |
| Technology Transfer Office | ARC TTO |
| ICT Support | ARC ICT Division |

---

**ARC Intellectual Property Management Portal**

*Protecting, managing, commercialising, and preserving ARC innovations through a secure enterprise platform.*

© Agricultural Research Council (ARC). All Rights Reserved.