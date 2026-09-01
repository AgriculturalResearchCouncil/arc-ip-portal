/**
 * Jest Configuration
 * ==================
 * Configuration file for Jest testing framework.
 * 
 * @module jest.config
 */

module.exports = {
    // Test environment
    testEnvironment: 'node',
    
    // Test file patterns
    testMatch: [
        '**/tests/**/*.test.js',
        '**/tests/**/*.spec.js'
    ],
    
    // Ignore these paths
    testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/'
    ],
    
    // Collect coverage from these files
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/server.js',
        '!src/config/**',
        '!src/**/index.js',
        '!**/node_modules/**'
    ],
    
    // Coverage thresholds
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70
        }
    },
    
    // Coverage report formats
    coverageReporters: [
        'text',
        'lcov',
        'html',
        'json'
    ],
    
    // Setup files
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    
    // Test timeout
    testTimeout: 30000,
    
    // Verbose output
    verbose: true,
    
    // Clear mocks between tests
    clearMocks: true,
    
    // Module path mapping
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@tests/(.*)$': '<rootDir>/tests/$1'
    },
    
    // Transform files
    transform: {
        '^.+\\.js$': 'babel-jest'
    },
    
    // Watch plugins
    watchPlugins: [
        'jest-watch-typeahead/filename',
        'jest-watch-typeahead/testname'
    ]
};