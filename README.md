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
- [Complete Backend File Documentation](#complete-backend-file-documentation)
  - [Priority 1: Core Infrastructure Files](#priority-1-core-infrastructure-files)
  - [Priority 2: Service Layer Files](#priority-2-service-layer-files)
  - [Priority 3: Controller Layer Files](#priority-3-controller-layer-files)
  - [Priority 4: Route Layer Files](#priority-4-route-layer-files)
  - [Priority 5: Utility Files](#priority-5-utility-files)
  - [Priority 6: Testing Files](#priority-6-testing-files)
  - [Route Summary Table](#route-summary-table)
  - [Role-Based Access Summary](#role-based-access-summary)
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

## Complete Backend File Documentation

### Priority 1: Core Infrastructure Files

| File | Description | Methods |
|------|-------------|---------|
| **src/database/index.js** | Database connection management with connection pooling, query execution, transaction handling, and stored procedure support for SQL Server. Uses Windows Authentication by default. | • `getConnectionPool()` - Creates or returns the singleton connection pool<br>• `executeQuery(query, params)` - Executes SQL queries with parameterized inputs for security<br>• `executeProcedure(procedureName, params)` - Executes stored procedures with typed parameters<br>• `executeTransaction(callback)` - Runs operations within a transaction, auto-commits or rolls back<br>• `getTransaction()` - Returns a manual transaction object for fine-grained control<br>• `closeConnection()` - Gracefully closes the connection pool on shutdown |
| **src/database/repositories/ip-record.repository.js** | Manages IP record data access including full record retrieval, owner queries, type-based filtering, statistics, search, and status updates. Extends BaseRepository. | • `findFullRecord(id)` - Gets complete IP record with owner details, persons, documents, and lifecycle events<br>• `findByOwner(personId)` - Gets all IP records owned by a specific person<br>• `findByType(recordType, filters)` - Filters IP records by type (Patent, Trademark, etc.) with pagination<br>• `getStatistics()` - Returns comprehensive IP statistics including counts by type and status<br>• `search(searchQuery, limit)` - Searches by reference number, title, or owner name<br>• `updateStatus(ipRecordId, status, updatedBy)` - Updates IP record status and logs the change<br>• `findByInstitute(instituteId)` - Gets IP records belonging to a specific institute<br>• `getPendingRecords(recordType)` - Gets records in Submitted or Under Review status |
| **src/database/repositories/disclosure.repository.js** | Handles disclosure-specific database operations including full disclosure retrieval, researcher queries, TTO filtering, status management, and statistics. Extends BaseRepository. | • `findFullDisclosure(id)` - Gets complete disclosure with IP record, researcher, persons, documents, and lifecycle events<br>• `findByResearcher(personId)` - Gets all disclosures for a specific researcher<br>• `findWithFilters(filters)` - Advanced filtering for TTO with status, category, date, and pagination<br>• `updateStatus(disclosureId, status, reviewerId, recommendation)` - Updates review status and records reviewer<br>• `getStatistics()` - Returns disclosure statistics including counts by status and average review days<br>• `getPendingReviews()` - Gets disclosures in Submitted or Under Review status sorted by oldest first<br>• `getCategoryBreakdown()` - Returns disclosure counts grouped by category<br>• `getMonthlyTrends(months)` - Returns monthly submission and approval trends for the specified months |
| **src/middleware/validation.middleware.js** | Request validation using Joi schemas for body, query, and params with detailed error formatting and input sanitization. | • `validate(schema, source)` - Creates validation middleware for the specified request source<br>• `validatePagination()` - Middleware that validates page, limit, sortBy, and sortOrder parameters<br>• `validateId(paramName)` - Middleware that validates a UUID parameter format<br>• `sanitizeInput(data)` - Recursively sanitizes data to prevent XSS attacks<br>• `schemas.user` - User validation schemas (create, update)<br>• `schemas.disclosure` - Disclosure validation schemas (create, update, review, filter)<br>• `schemas.auth` - Authentication validation schemas (login, refresh, validate)<br>• `schemas.document` - Document validation schemas (upload, update)<br>• `schemas.ipAsset` - IP Asset validation schemas (create) |
| **src/middleware/rate-limit.middleware.js** | Implements rate limiting for API endpoints with different limits for authentication, uploads, and general API requests using express-rate-limit. | • `defaultLimiter` - Default rate limiter applied to all API routes<br>• `authLimiter` - Strict limiter for authentication endpoints (10 requests per 15 minutes)<br>• `uploadLimiter` - Strict limiter for upload endpoints (20 uploads per hour)<br>• `apiLimiter` - General API limiter (60 requests per minute) |
| **src/middleware/security.middleware.js** | Security headers, CORS configuration, content type validation, request size limiting, and CSRF protection for API endpoints. | • `corsConfig` - CORS configuration with allowed origins and credentials support<br>• `helmetConfig` - Helmet security headers with CSP, HSTS, and XSS protection<br>• `validateContentType()` - Ensures request Content-Type is application/json<br>• `limitRequestSize()` - Rejects requests larger than 10MB<br>• `staticSecurityHeaders()` - Adds cache control and security headers for static files<br>• `csrfProtection()` - Validates CSRF tokens for state-changing requests |

---

### Priority 2: Service Layer Files

| File | Description | Methods |
|------|-------------|---------|
| **src/services/disclosure.service.js** | Complete disclosure business logic including creation, submission, review workflow, statistics, and search functionality. Coordinates multiple repositories. | • `createDisclosure(researcherId, data)` - Creates a new disclosure with IP record, generates reference number, adds inventors<br>• `submitDisclosure(disclosureId, researcherId)` - Submits a disclosure for TTO review, validates ownership and status<br>• `reviewDisclosure(disclosureId, reviewerId, data)` - Reviews a disclosure, updates status, logs lifecycle event<br>• `getAllDisclosures(filters, userId, userRole)` - Gets disclosures with role-based filtering<br>• `getDisclosureById(id)` - Gets full disclosure with all related data<br>• `getStatistics()` - Returns comprehensive disclosure statistics<br>• `getPendingReviews()` - Gets disclosures awaiting TTO review<br>• `getCategoryBreakdown()` - Returns disclosures grouped by category<br>• `getMonthlyTrends(months)` - Returns monthly disclosure trends<br>• `searchDisclosures(searchQuery)` - Searches disclosures by keyword<br>• `generateReferenceNumber()` - Generates ARC-IP-YYYY-XXXX reference numbers<br>• `addInventors(ipRecordId, inventors)` - Adds inventor persons to an IP record |
| **src/services/ip-asset.service.js** | IP asset management business logic including creation, status transitions, lifecycle events, and asset queries. Handles all IP types. | • `createIpAsset(ownerId, data)` - Creates a new IP asset with generated reference number<br>• `updateStatus(ipRecordId, status, updatedBy, comment)` - Updates asset status with validation of valid transitions<br>• `getIpAssetById(id)` - Gets full asset details with all related data<br>• `getResearcherAssets(personId)` - Gets all assets owned by a researcher<br>• `getIpAssets(filters)` - Gets assets with type, status, and pagination filters<br>• `getStatistics()` - Returns IP asset statistics by type and status<br>• `getPendingAssets(recordType)` - Gets assets pending review<br>• `search(searchQuery)` - Searches assets by reference, title, or owner<br>• `addRelatedPersons(ipRecordId, persons)` - Adds related persons (inventors, agents) to an IP record<br>• `logLifecycleEvent(ipRecordId, newStatus, performedBy, comment)` - Logs IP lifecycle events<br>• `getValidStatusTransitions(recordType)` - Returns valid status transitions for a record type<br>• `generateReferenceNumber(recordType)` - Generates type-specific reference numbers (PAT, TM, COP, PBR, TS) |
| **src/services/document.service.js** | Document management business logic including upload, versioning, access control, SharePoint integration, and metadata management. | • `uploadDocument(file, ipRecordId, uploadedBy, metadata)` - Uploads a document, assigns version number, creates record<br>• `getDocument(documentId, userId)` - Gets document with download URL and checks access permissions<br>• `deleteDocument(documentId, userId)` - Soft deletes document and removes file from storage<br>• `getDocumentsByIpRecord(ipRecordId, userId)` - Gets all documents for an IP record with confidentiality filtering<br>• `updateDocumentMetadata(documentId, data, userId)` - Updates document type, confidentiality, or description<br>• `createNewVersion(documentId, file, userId, versionComment)` - Creates a new version with incremented version number<br>• `getVersionHistory(documentId, userId)` - Gets all versions of a document<br>• `checkDocumentAccess(document, userId)` - Checks if user can access a confidential document<br>• `getDownloadUrl(document)` - Generates download URL for local or SharePoint documents |

---

### Priority 3: Controller Layer Files

| File | Description | Methods |
|------|-------------|---------|
| **src/controllers/disclosure.controller.js** | HTTP handlers for disclosure endpoints including create, read, submit, review, statistics, and search. Uses catchAsync for error handling. | • `create()` - POST /api/v1/disclosures - Creates a new disclosure<br>• `findAll()` - GET /api/v1/disclosures - Gets all disclosures with pagination and filters<br>• `findMyDisclosures()` - GET /api/v1/disclosures/my - Gets researcher's own disclosures<br>• `findById()` - GET /api/v1/disclosures/:id - Gets disclosure by ID with full details<br>• `submit()` - POST /api/v1/disclosures/:id/submit - Submits disclosure for review<br>• `review()` - POST /api/v1/disclosures/:id/review - Reviews disclosure (TTO only)<br>• `getStatistics()` - GET /api/v1/disclosures/statistics - Gets comprehensive statistics<br>• `getPendingReviews()` - GET /api/v1/disclosures/pending - Gets pending TTO reviews<br>• `getCategoryBreakdown()` - GET /api/v1/disclosures/categories - Gets category breakdown<br>• `getTrends()` - GET /api/v1/disclosures/trends - Gets monthly trends<br>• `search()` - GET /api/v1/disclosures/search - Searches disclosures |
| **src/controllers/ip-asset.controller.js** | HTTP handlers for IP asset endpoints including create, read, update, statistics, and search. | • `create()` - POST /api/v1/ip-assets - Creates a new IP asset<br>• `findAll()` - GET /api/v1/ip-assets - Gets all assets with filtering<br>• `findMyAssets()` - GET /api/v1/ip-assets/my - Gets researcher's own assets<br>• `findById()` - GET /api/v1/ip-assets/:id - Gets asset by ID with full details<br>• `updateStatus()` - PATCH /api/v1/ip-assets/:id/status - Updates asset status<br>• `getStatistics()` - GET /api/v1/ip-assets/statistics - Gets IP statistics<br>• `getPending()` - GET /api/v1/ip-assets/pending - Gets pending assets<br>• `search()` - GET /api/v1/ip-assets/search - Searches assets |
| **src/controllers/user.controller.js** | HTTP handlers for user management endpoints including list, search, role management, and activation. | • `findAll()` - GET /api/v1/users - Gets all users with roles<br>• `findById()` - GET /api/v1/users/:id - Gets user by ID with roles<br>• `search()` - GET /api/v1/users/search - Searches users by name/email<br>• `findByInstitute()` - GET /api/v1/users/institute/:id - Gets users by institute<br>• `assignRole()` - POST /api/v1/users/:id/roles - Assigns role to user (Admin only)<br>• `removeRole()` - DELETE /api/v1/users/:id/roles/:name - Removes role (Admin only)<br>• `deactivate()` - POST /api/v1/users/:id/deactivate - Deactivates user (Admin only)<br>• `reactivate()` - POST /api/v1/users/:id/reactivate - Reactivates user (Admin only)<br>• `getStatistics()` - GET /api/v1/users/statistics - Gets user statistics<br>• `getActive()` - GET /api/v1/users/active - Gets recently active users |
| **src/controllers/document.controller.js** | HTTP handlers for document endpoints including upload, download, versioning, and metadata updates. | • `upload()` - POST /api/v1/documents/upload/:ipRecordId - Uploads a document<br>• `findById()` - GET /api/v1/documents/:id - Gets document by ID<br>• `download()` - GET /api/v1/documents/:id/download - Downloads document file<br>• `findByIpRecord()` - GET /api/v1/documents/ip-record/:id - Gets documents for IP record<br>• `delete()` - DELETE /api/v1/documents/:id - Deletes document<br>• `updateMetadata()` - PATCH /api/v1/documents/:id/metadata - Updates document metadata<br>• `createVersion()` - POST /api/v1/documents/:id/version - Creates new document version<br>• `getVersionHistory()` - GET /api/v1/documents/:id/versions - Gets version history |

---

### Priority 4: Route Layer Files

| File | Description | Methods/Endpoints |
|------|-------------|-------------------|
| **src/routes/auth.routes.js** | Authentication route definitions for login, logout, token refresh, validation, and user status. Integrates with ARC Centralized Authentication Service. | • `POST /login` - User login with ARC Auth, sets JWT cookie<br>• `POST /logout` - User logout, clears cookies<br>• `GET /me` - Get current authenticated user<br>• `POST /refresh` - Refresh JWT token using refresh token<br>• `POST /validate` - Validate a JWT token<br>• `GET /status` - Check authentication status |
| **src/routes/disclosure.routes.js** | Disclosure route definitions with role-based access control for researchers, TTO, and admin. All routes require authentication. | • `POST /` - Create disclosure (Researcher, TTO, Admin)<br>• `GET /my` - Researcher's disclosures (Researcher only)<br>• `GET /` - All disclosures with filters (TTO, Admin, Executive, Legal)<br>• `GET /statistics` - Statistics (TTO, Admin, Executive)<br>• `GET /pending` - Pending reviews (TTO, Admin)<br>• `GET /categories` - Category breakdown (TTO, Admin)<br>• `GET /trends` - Monthly trends (TTO, Admin, Executive)<br>• `GET /search` - Search disclosures (TTO, Admin)<br>• `GET /:id` - Get by ID (TTO, Admin, Executive)<br>• `POST /:id/submit` - Submit disclosure (Researcher only)<br>• `POST /:id/review` - Review disclosure (TTO, Admin) |
| **src/routes/ip-asset.routes.js** | IP asset route definitions with role-based access control. All routes require authentication. | • `POST /` - Create IP asset (Researcher, TTO, Admin)<br>• `GET /my` - User's assets (Researcher only)<br>• `GET /` - All assets with filters (TTO, Admin, Executive, Legal)<br>• `GET /statistics` - Statistics (TTO, Admin, Executive)<br>• `GET /pending` - Pending assets (TTO, Admin)<br>• `GET /search` - Search assets (TTO, Admin)<br>• `GET /:id` - Get by ID (TTO, Admin, Executive, Legal)<br>• `PATCH /:id/status` - Update status (TTO, Admin) |
| **src/routes/user.routes.js** | User management route definitions with admin-only role management. All routes require authentication. | • `GET /` - All users (Admin, TTO)<br>• `GET /:id` - User by ID (Admin, TTO)<br>• `GET /search` - Search users (Admin, TTO)<br>• `GET /institute/:id` - Users by institute (Admin, TTO)<br>• `GET /statistics` - User statistics (Admin, TTO)<br>• `GET /active` - Active users (Admin, TTO)<br>• `POST /:id/roles` - Assign role (Admin only)<br>• `DELETE /:id/roles/:name` - Remove role (Admin only)<br>• `POST /:id/deactivate` - Deactivate user (Admin only)<br>• `POST /:id/reactivate` - Reactivate user (Admin only) |
| **src/routes/document.routes.js** | Document route definitions with multer file upload configuration. All routes require authentication. | • `POST /upload/:ipRecordId` - Upload document (Researcher, TTO, Admin)<br>• `GET /:id` - Get document (All authenticated)<br>• `GET /:id/download` - Download document (All authenticated)<br>• `GET /ip-record/:ipRecordId` - Get IP record documents (All authenticated)<br>• `DELETE /:id` - Delete document (Owner, TTO, Admin)<br>• `PATCH /:id/metadata` - Update metadata (Owner, TTO, Admin)<br>• `POST /:id/version` - Create new version (Researcher, TTO, Admin)<br>• `GET /:id/versions` - Version history (All authenticated) |
| **src/routes/index.js** | Main route aggregator that mounts all route modules and provides API information. | • `GET /` - API information with version and endpoints<br>• `GET /health` - Health check with status and uptime<br>• Mounts: auth, users, disclosures, ip-assets, documents routes |

---

### Priority 5: Utility Files

| File | Description | Methods |
|------|-------------|---------|
| **src/utils/constants.js** | Centralized application constants including roles, statuses, audit events, error codes, and configuration values. Single source of truth for all application constants. | • `ROLES` - User role definitions (Researcher, TTO Officer, Legal Officer, Finance Officer, Executive, Admin, ICT)<br>• `DISCLOSURE_STATUS` - Disclosure states (Draft, Submitted, Under Review, Reviewed, Recommended, Rejected, Approved, Archived)<br>• `IP_RECORD_TYPES` - IP type definitions (Disclosure, Patent, PBR, Trademark, Copyright, TradeSecret)<br>• `IP_STATUS` - IP status values (Draft, Submitted, Under Review, Filed, Granted, Rejected, Abandoned, Expired)<br>• `AUDIT_EVENTS` - Audit event types for logging (USER_LOGIN, DISCLOSURE_CREATED, ROLE_ASSIGNED, etc.)<br>• `DOCUMENT_TYPES` - Document type definitions (Disclosure Form, Patent Application, etc.)<br>• `ERROR_CODES` - Standardized error codes (UNAUTHORIZED, VALIDATION_ERROR, NOT_FOUND, etc.)<br>• `HTTP_STATUS` - HTTP status codes with descriptions<br>• `CONFIG` - Application configuration (MAX_FILE_SIZE, ALLOWED_FILE_EXTENSIONS, PAGINATION, etc.)<br>• `TABLES` - Database table name constants<br>• `CACHE_KEYS` - Redis cache key patterns<br>• `DEFAULTS` - Default values for various entities |
| **src/utils/helpers.js** | Common utility functions for date formatting, string manipulation, validation, and object operations. Reusable helpers across the application. | • `formatDate(date, format)` - Formats dates to standard strings<br>• `truncate(str, maxLength, suffix)` - Truncates strings to specified length<br>• `sanitizeString(str)` - Sanitizes strings to prevent XSS attacks<br>• `generateRandomString(length, charset)` - Generates random strings with specified character set<br>• `isValidUuid(value)` - Validates UUID format using regex<br>• `isValidEmail(email)` - Validates email format<br>• `isValidUrl(url)` - Validates URL format<br>• `getFileExtension(filename)` - Extracts file extension from filename<br>• `slugify(str)` - Creates URL-friendly slugs from strings<br>• `deepClone(obj)` - Deep clones objects including nested structures<br>• `pick(obj, keys)` - Selects specific properties from an object<br>• `omit(obj, keys)` - Omits specific properties from an object<br>• `toCamelCase(str)` - Converts strings to camelCase<br>• `toSnakeCase(str)` - Converts strings to snake_case |

---

### Priority 6: Testing Files

| File | Description | Methods/Configuration |
|------|-------------|----------------------|
| **jest.config.js** | Jest test configuration including test environment, coverage thresholds, and module mapping. | • Test environment: Node<br>• Test file patterns: **/tests/**/*.test.js<br>• Coverage thresholds: 70% for branches, functions, lines, statements<br>• Coverage reporters: text, lcov, html, json<br>• Module name mapping: '@/' to 'src/', '@tests/' to 'tests/'<br>• Transform: babel-jest for .js files<br>• Watch plugins: jest-watch-typeahead |
| **tests/setup.js** | Jest setup file that configures test environment, logging, and global hooks. Runs before all tests. | • Suppresses logging during tests<br>• Sets global test timeout to 30 seconds<br>• `beforeAll()` - Runs once before all tests<br>• `afterAll()` - Runs once after all tests<br>• `beforeEach()` - Runs before each test<br>• `afterEach()` - Runs after each test<br>• Configures test environment variables<br>• Sets up error handlers for unhandled rejections and exceptions |
| **tests/helpers/test-helpers.js** | Test utilities for creating and cleaning up test data including users, IP records, and disclosures. Reusable across test suites. | • `createTestUser(data)` - Creates a test user with optional role assignment<br>• `deleteTestUser(personId)` - Deletes a test user and their role assignments<br>• `createTestIpRecord(data)` - Creates a test IP record with optional owner<br>• `createTestDisclosure(data)` - Creates a test disclosure linked to an IP record<br>• `cleanupTestData(records)` - Bulk cleanup of test data by type (person, ip_record, disclosure)<br>• `generateMockToken(user)` - Generates a mock JWT token for testing authenticated endpoints |

---

## Route Summary Table

| Route Group | Base Path | Description | Primary Access |
|-------------|-----------|-------------|----------------|
| Authentication | `/api/v1/auth` | Login, logout, token refresh, user validation | Public / Authenticated |
| Users | `/api/v1/users` | User management, role assignment, activation | Admin / TTO Officer |
| Disclosures | `/api/v1/disclosures` | Invention disclosure full lifecycle management | All authenticated |
| IP Assets | `/api/v1/ip-assets` | Intellectual property asset management | TTO / Admin / Executive |
| Documents | `/api/v1/documents` | Document upload, download, version management | All authenticated |

---

## Role-Based Access Summary

| Role | Disclosures | IP Assets | Documents | Users |
|------|-------------|-----------|-----------|-------|
| **Researcher** | Create, view own, submit | View own, create | Upload, view own, delete own | View own |
| **TTO Officer** | Create, view all, review | Create, view all, update status | Upload, view all, delete all | View all |
| **Admin** | Full access (all operations) | Full access (all operations) | Full access (all operations) | Full access including role management |
| **Executive** | View all, statistics | View all, statistics | View all | View all |
| **Legal Officer** | View all | View all, update status | View all | View all |
| **ICT** | View all | View all | View all | View all |

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
