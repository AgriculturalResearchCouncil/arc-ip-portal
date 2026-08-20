# ARC Intellectual Property Management Portal

[![CI/CD](https://github.com/agriculturalresearchcouncil/arc-ip-portal/actions/workflows/deploy.yml/badge.svg)](https://github.com/agriculturalresearchcouncil/arc-ip-portal/actions/workflows/deploy.yml)

A secure, enterprise-grade digital platform for managing the complete intellectual property lifecycle within the Agricultural Research Council (ARC).

---

## Overview

The ARC IP Portal provides a centralized, secure, and standardized digital platform to support the management of intellectual property across all ARC institutes. The system supports the full IP lifecycle from disclosure and evaluation through protection, licensing, commercialization, revenue generation, and compliance reporting.

### Key Features

- **Invention Disclosure Management** - Submit, track, and manage invention disclosures
- **IP Asset Management** - Register and track patents, trademarks, designs, copyrights, and plant breeders rights
- **Technology Evaluation** - Score and evaluate technologies for protection decisions
- **Licensing Management** - Create and manage licence agreements with obligation tracking
- **Royalty & Revenue Tracking** - Record and track royalty payments and revenue
- **Commercialisation Monitoring** - Track commercialisation progress and revenue
- **Document Management** - Store and manage IP-related documents with version control
- **Reporting & Dashboards** - Comprehensive reports for all stakeholders
- **Audit Trail** - Complete audit logging for compliance with IPR Act and POPIA
- **Integration** - Seamless integration with ARC Centralized Authentication Service

---

## Tech Stack

| Layer | Technology | Version |
| :--- | :--- | :--- |
| **Frontend** | Angular + Ionic | 17+ / 7+ |
| **Backend** | Node.js + Express.js | 20 LTS / 4.x |
| **ORM** | Prisma | 5+ |
| **Database** | PostgreSQL | 16+ |
| **Web Server** | IIS | 10+ |
| **Authentication** | ARC Centralized Auth Service | v1.0 |
| **Cache** | Redis | 7+ |
| **Logging** | Winston | 3+ |
| **Monitoring** | Prometheus + Grafana | - |
| **CI/CD** | GitHub Actions | - |

---

## Project Structure
