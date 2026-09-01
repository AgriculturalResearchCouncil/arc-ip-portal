const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
  // Server
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  appName: process.env.APP_NAME || 'ARC IP Portal',
  apiVersion: process.env.API_VERSION || 'v1',

  // Database
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 1433,
    database: process.env.DB_NAME || 'arc_ip_portal_staging',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
      enableArithAbort: true,
      rowCollectionOnRequestCompletion: false,
    },
    pool: {
      max: parseInt(process.env.DB_POOL_MAX, 10) || 10,
      min: parseInt(process.env.DB_POOL_MIN, 10) || 0,
      idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE, 10) || 30000,
    },
    connectionTimeout: 30000,
    requestTimeout: 30000,
  },

  // Authentication
  auth: {
    baseUrl: process.env.ARC_AUTH_URL || 'http://155.240.161.22:3010',
    timeout: parseInt(process.env.ARC_AUTH_TIMEOUT, 10) || 10000,
    clientId: process.env.ARC_AUTH_CLIENT_ID,
    clientSecret: process.env.ARC_AUTH_CLIENT_SECRET,
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
  },

  // SharePoint
  sharepoint: {
    clientId: process.env.SHAREPOINT_CLIENT_ID,
    clientSecret: process.env.SHAREPOINT_CLIENT_SECRET,
    tenantId: process.env.SHAREPOINT_TENANT_ID,
    siteId: process.env.SHAREPOINT_SITE_ID,
    driveId: process.env.SHAREPOINT_DRIVE_ID,
    baseUrl: process.env.SHAREPOINT_BASE_URL || 'https://graph.microsoft.com/v1.0',
    libraryName: process.env.SHAREPOINT_LIBRARY_NAME || 'IPDocuments',
  },

  // Email
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || 'ARC IP Portal <ip-portal@arc.agric.za>',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW, 10) * 60 * 1000 || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || 'logs',
    maxFiles: parseInt(process.env.LOG_MAX_FILES, 10) || 30,
  },

  // Session
  session: {
    secret: process.env.SESSION_SECRET,
    secure: process.env.COOKIE_SECURE === 'true',
    httpOnly: process.env.COOKIE_HTTP_ONLY === 'true',
    sameSite: process.env.COOKIE_SAME_SITE || 'lax',
  },

  // File Upload
  upload: {
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE, 10) || 10485760,
    allowedTypes: (process.env.UPLOAD_ALLOWED_TYPES || 'pdf,doc,docx,xls,xlsx,jpg,jpeg,png,txt').split(','),
  },

  // Features
  features: {
    sharepoint: process.env.ENABLE_SHAREPOINT === 'true',
    email: process.env.ENABLE_EMAIL === 'true',
    audit: process.env.ENABLE_AUDIT === 'true',
  },
};

module.exports = config;