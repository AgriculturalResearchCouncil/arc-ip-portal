const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const session = require('express-session');

const config = require('./config');
const logger = require('./logging/logger');
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');
const { authenticate } = require('./middleware/auth.middleware');
const routes = require('./routes');

const app = express();

// ============================================
// Security Middleware
// ============================================

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", config.auth.baseUrl],
        },
    },
}));

app.use(cors({
    origin: [
        'http://localhost:4200',
        'http://localhost:8100',
        'https://dev.ip-portal.arc.agric.za',
        'https://staging.ip-portal.arc.agric.za',
        'https://ip.arc.agric.za',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ============================================
// Standard Middleware
// ============================================

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Session configuration
app.use(session({
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: config.session.secure,
        httpOnly: config.session.httpOnly,
        sameSite: config.session.sameSite,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
}));

// ============================================
// Request Logging
// ============================================

app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.logRequest(req, res, duration);
    });
    next();
});

// ============================================
// Rate Limiting
// ============================================

const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api', limiter);

// ============================================
// Health Check
// ============================================

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: config.env,
        version: '1.0.0',
    });
});

app.get('/health/db', async (req, res) => {
    try {
        const { getConnectionPool } = require('./database');
        await getConnectionPool();
        res.json({
            status: 'healthy',
            database: 'connected',
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            database: 'disconnected',
            error: error.message,
            timestamp: new Date().toISOString(),
        });
    }
});

// ============================================
// API Routes
// ============================================

app.use(`/api/${config.apiVersion}`, routes);

// ============================================
// Error Handling
// ============================================

app.use(notFoundHandler);
app.use(errorHandler);

// ============================================
// Start Server
// ============================================

const PORT = config.port;

app.listen(PORT, () => {
    logger.info(` ${config.appName} Server running on port ${PORT}`);
    logger.info(` Environment: ${config.env}`);
    logger.info(` API Documentation: http://localhost:${PORT}/api-docs`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, closing server...');
    const { closeConnection } = require('./database');
    await closeConnection();
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT received, closing server...');
    const { closeConnection } = require('./database');
    await closeConnection();
    process.exit(0);
});

module.exports = app;