const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const config = require('../config');
const path = require('path');

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
        if (Object.keys(meta).length > 0) {
            log += ` ${JSON.stringify(meta)}`;
        }
        if (stack) {
            log += `\n${stack}`;
        }
        return log;
    })
);

// Create logger instance
const logger = winston.createLogger({
    level: config.logging.level || 'info',
    format: logFormat,
    transports: [
        // Console transport for development
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            ),
        }),
    ],
});

// Add file transports in production
if (config.env === 'production') {
    const logDir = path.join(process.cwd(), config.logging.dir || 'logs');
    
    // Error log rotation
    logger.add(new DailyRotateFile({
        filename: path.join(logDir, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxFiles: config.logging.maxFiles || 30,
        level: 'error',
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
        ),
    }));

    // Combined log rotation
    logger.add(new DailyRotateFile({
        filename: path.join(logDir, 'combined-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxFiles: config.logging.maxFiles || 30,
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
        ),
    }));
}

/**
 * Log audit trail
 */
logger.logAudit = (action, userId, metadata = {}) => {
    logger.info('AUDIT', {
        action,
        userId,
        metadata,
        timestamp: new Date().toISOString(),
    });
};

/**
 * Log API request
 */
logger.logRequest = (req, res, duration) => {
    logger.info('API Request', {
        method: req.method,
        path: req.path,
        query: req.query,
        statusCode: res.statusCode,
        duration,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        userId: req.user?.person_id,
    });
};

module.exports = logger;