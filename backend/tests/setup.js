/**
 * Test Setup
 * ==========
 * Jest setup file that runs before all tests.
 * Configures test environment and global settings.
 * 
 * @module tests/setup
 */

const logger = require('../src/logging/logger');

/**
 * Suppress logging during tests to keep output clean.
 */
logger.level = 'error';

/**
 * Global test timeout (30 seconds).
 */
jest.setTimeout(30000);

/**
 * Global beforeAll hook.
 * Runs once before all test suites.
 */
beforeAll(async () => {
    console.log('Starting test suite...');
    console.log('Environment:', process.env.NODE_ENV || 'test');
});

/**
 * Global afterAll hook.
 * Runs once after all test suites.
 */
afterAll(async () => {
    console.log('Test suite completed.');
});

/**
 * Global beforeEach hook.
 * Runs before each test.
 */
beforeEach(() => {
    // Add any setup needed before each test
});

/**
 * Global afterEach hook.
 * Runs after each test.
 */
afterEach(() => {
    // Add any cleanup needed after each test
});

/**
 * Mock environment variables for testing.
 */
process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_NAME = 'arc_ip_portal_test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.ARC_AUTH_URL = 'http://localhost:3010';

/**
 * Global error handler for unhandled rejections.
 */
process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
});

/**
 * Global error handler for uncaught exceptions.
 */
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

module.exports = {
    // Export any test utilities
};