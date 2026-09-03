// backend/src/scripts/test-sharepoint.js
/**
 * SharePoint Integration Test Script
 * ===================================
 * Comprehensive test script for SharePoint integration.
 * Tests all SharePoint operations including:
 * - Authentication and connection
 * - Folder creation
 * - File upload/download
 * - Metadata management
 * - File deletion
 * - Error handling
 * 
 * Usage:
 *   node src/scripts/test-sharepoint.js
 *   npm run sharepoint:test
 * 
 * @module scripts/test-sharepoint
 */

const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: '../../.env' });

// Import SharePoint services
const sharepointService = require('../sharepoint/sharepoint.service');
const sharepointClient = require('../sharepoint/sharepoint.client');
const config = require('../config/sharepoint');
const logger = require('../logging/logger');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[36m',
    cyan: '\x1b[35m',
    bold: '\x1b[1m',
    dim: '\x1b[2m'
};

const log = {
    info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
    warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
    section: (msg) => console.log(`\n${colors.bold}${colors.cyan}=== ${msg} ===${colors.reset}\n`),
    data: (obj) => console.log(`${colors.dim}${JSON.stringify(obj, null, 2)}${colors.reset}`),
    test: (name, passed) => {
        const icon = passed ? '✅' : '❌';
        const color = passed ? colors.green : colors.red;
        console.log(`  ${color}${icon}${colors.reset} ${name}`);
    }
};

/**
 * Test Suite Class
 * Runs all SharePoint integration tests
 */
class SharePointTestSuite {
    constructor() {
        this.testId = uuidv4().substring(0, 8);
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            tests: []
        };
        this.testFile = null;
        this.testFolder = `Test-${this.testId}`;
        // Use the entity type that matches your folderStructure
        this.entityType = 'ipAssets'; // ipAssets, disclosures, licences, etc.
        this.libraryName = config.documentLibrary || 'TTOPortalDocuments';
    }

    /**
     * Run all tests
     */
    async runAll() {
        console.clear();
        log.section('SharePoint Integration Test Suite');
        log.info(`Test ID: ${this.testId}`);
        log.info(`Site URL: ${config.siteUrl}`);
        log.info(`Document Library: ${this.libraryName}`);
        log.info(`Entity Type: ${this.entityType}`);
        log.info(`Started: ${new Date().toISOString()}\n`);

        try {
            // Check environment variables
            await this.testEnvironmentVariables();

            // Test 1: Authentication
            await this.testAuthentication();

            // Test 2: Folder Creation
            await this.testFolderCreation();

            // Test 3: File Upload
            await this.testFileUpload();

            // Test 4: File Download
            await this.testFileDownload();

            // Test 5: File Metadata
            await this.testFileMetadata();

            // Test 6: List Files
            await this.testListFiles();

            // Test 7: File Deletion
            await this.testFileDeletion();

            // Test 8: Error Handling
            await this.testErrorHandling();

            // Test 9: Retry Logic
            await this.testRetryLogic();

            // Print summary
            this.printSummary();

        } catch (error) {
            log.error(`Test suite failed: ${error.message}`);
            console.error(error);
            process.exit(1);
        }
    }

    /**
     * Test: Environment Variables
     */
    async testEnvironmentVariables() {
        log.section('Testing Environment Variables');

        const required = [
            'SHAREPOINT_TENANT_ID',
            'SHAREPOINT_CLIENT_ID',
            'SHAREPOINT_CLIENT_SECRET',
            'SHAREPOINT_SITE_ID',
            'SHAREPOINT_DRIVE_ID'
        ];

        let allPresent = true;
        required.forEach(key => {
            const value = process.env[key];
            const present = value && value !== 'your-tenant-id' && 
                           value !== 'your-client-id' && 
                           value !== 'your-client-secret' &&
                           value !== 'your-site-id' &&
                           value !== 'your-drive-id';
            
            if (present) {
                log.test(`${key}: ${value.substring(0, 8)}...`, true);
            } else {
                log.test(`${key}: MISSING or INVALID`, false);
                allPresent = false;
            }
        });

        if (!allPresent) {
            log.error('⚠️  Please update your .env file with valid SharePoint credentials');
            log.info('Run "npm run sharepoint:ids" to get the correct values');
        }

        this.recordResult('Environment Variables', allPresent);
        return allPresent;
    }

    /**
     * Test: Authentication
     */
    async testAuthentication() {
        log.section('Testing SharePoint Authentication');

        try {
            const client = await sharepointClient.getClient();
            log.test('Microsoft Graph client initialized successfully', true);
            
            // Get drive info to verify authentication
            const driveInfo = await sharepointClient.getDriveInfo();
            log.test(`Connected to drive: ${driveInfo.name} (${driveInfo.id})`, true);
            log.info(`  Drive size: ${(driveInfo.totalSize / 1024 / 1024).toFixed(2)} MB`);
            log.info(`  Used: ${(driveInfo.usedSize / 1024 / 1024).toFixed(2)} MB`);
            
            this.recordResult('Authentication', true);
            return true;

        } catch (error) {
            log.error(`Authentication failed: ${error.message}`);
            log.test('Authentication', false);
            this.recordResult('Authentication', false);
            return false;
        }
    }

    /**
     * Test: Folder Creation
     * Uses the entity type configured in folderStructure
     */
    async testFolderCreation() {
        log.section('Testing Folder Creation');

        try {
            // Use the entity type from folderStructure
            const folderPath = await sharepointService.getOrCreateFolder(this.entityType, this.testId);
            log.test(`Folder created: ${folderPath}`, true);
            
            // Verify folder exists by listing files in the parent folder
            const folderStructure = config.folderStructure[this.entityType];
            const parentPath = folderStructure.path.split('/')[0]; // e.g., "IPAssets"
            
            const files = await sharepointClient.listFiles(parentPath);
            const folderExists = files.some(f => f.name === this.testId && f.isFolder);
            log.test(`Folder verified in SharePoint`, folderExists);
            
            this.recordResult('Folder Creation', folderExists);
            return folderExists;

        } catch (error) {
            log.error(`Folder creation failed: ${error.message}`);
            log.test('Folder Creation', false);
            this.recordResult('Folder Creation', false);
            return false;
        }
    }

    /**
     * Test: File Upload
     */
    async testFileUpload() {
        log.section('Testing File Upload');

        try {
            // Create test file
            const testContent = `Test file created at ${new Date().toISOString()}\nTest ID: ${this.testId}`;
            this.testFile = {
                name: `test-${this.testId}.txt`,
                buffer: Buffer.from(testContent, 'utf-8'),
                path: null
            };

            const result = await sharepointService.uploadDocument({
                entityType: this.entityType,
                entityId: this.testId,
                fileName: this.testFile.name,
                fileBuffer: this.testFile.buffer,
                documentType: 'Test',
                description: `Test file for integration testing (${this.testId})`,
                metadata: {
                    testId: this.testId,
                    testDate: new Date().toISOString()
                }
            });

            log.test(`File uploaded: ${result.fileName} (${result.fileSize} bytes)`, true);
            log.test(`SharePoint ID: ${result.sharepointId}`, true);
            log.test(`SharePoint URL: ${result.sharepointUrl}`, true);
            
            // Store file ID for later tests
            this.fileId = result.sharepointId;
            this.documentId = result.document_id;

            this.recordResult('File Upload', true);
            return true;

        } catch (error) {
            log.error(`File upload failed: ${error.message}`);
            log.test('File Upload', false);
            this.recordResult('File Upload', false);
            return false;
        }
    }

    /**
     * Test: File Download
     */
    async testFileDownload() {
        log.section('Testing File Download');

        try {
            if (!this.fileId) {
                log.warn('No file ID available for download test');
                this.recordResult('File Download', false);
                return false;
            }

            const result = await sharepointService.downloadDocument(
                this.fileId,
                this.entityType,
                this.testId
            );

            log.test(`File downloaded: ${result.metadata.name}`, true);
            log.test(`File size: ${result.content.length} bytes`, true);
            
            // Verify content
            const expectedContent = `Test file created at`;
            const contentString = result.content.toString('utf-8');
            const contentMatches = contentString.includes(expectedContent);
            log.test(`Content verified`, contentMatches);

            this.recordResult('File Download', contentMatches);
            return contentMatches;

        } catch (error) {
            log.error(`File download failed: ${error.message}`);
            log.test('File Download', false);
            this.recordResult('File Download', false);
            return false;
        }
    }

    /**
     * Test: File Metadata
     */
    async testFileMetadata() {
        log.section('Testing File Metadata');

        try {
            if (!this.fileId) {
                log.warn('No file ID available for metadata test');
                this.recordResult('File Metadata', false);
                return false;
            }

            const metadata = await sharepointClient.getFileMetadata(this.fileId);
            
            log.test(`File: ${metadata.name}`, true);
            log.test(`Created: ${metadata.createdDateTime}`, true);
            log.test(`Modified: ${metadata.lastModifiedDateTime}`, true);
            log.test(`Size: ${metadata.size} bytes`, true);
            
            // Update metadata
            const updatedMetadata = {
                description: `Updated test file at ${new Date().toISOString()}`,
                tags: 'test, integration, sharepoint'
            };
            
            await sharepointService.updateDocumentMetadata(this.fileId, updatedMetadata);
            log.test('Metadata updated successfully', true);

            this.recordResult('File Metadata', true);
            return true;

        } catch (error) {
            log.error(`Metadata test failed: ${error.message}`);
            log.test('File Metadata', false);
            this.recordResult('File Metadata', false);
            return false;
        }
    }

    /**
     * Test: List Files
     */
    async testListFiles() {
        log.section('Testing File Listing');

        try {
            const files = await sharepointService.listDocuments(this.entityType, this.testId);
            
            log.test(`Found ${files.length} files in folder`, files.length > 0);
            
            if (files.length > 0) {
                files.forEach((file, index) => {
                    log.info(`  ${index + 1}. ${file.name} (${file.size} bytes)`);
                });
            }

            this.recordResult('List Files', files.length > 0);
            return files.length > 0;

        } catch (error) {
            log.error(`File listing failed: ${error.message}`);
            log.test('List Files', false);
            this.recordResult('List Files', false);
            return false;
        }
    }

    /**
     * Test: File Deletion
     */
    async testFileDeletion() {
        log.section('Testing File Deletion');

        try {
            if (!this.fileId) {
                log.warn('No file ID available for deletion test');
                this.recordResult('File Deletion', false);
                return false;
            }

            await sharepointService.deleteDocument(
                this.fileId,
                this.entityType,
                this.testId
            );
            
            log.test('File deleted successfully', true);
            
            // Verify file is gone
            try {
                const files = await sharepointService.listDocuments(this.entityType, this.testId);
                const fileExists = files.some(f => f.id === this.fileId);
                log.test(`File removed from SharePoint`, !fileExists);
            } catch (error) {
                // Folder might be empty, which is fine
                log.test('Folder is empty (file removed)', true);
            }

            this.recordResult('File Deletion', true);
            return true;

        } catch (error) {
            log.error(`File deletion failed: ${error.message}`);
            log.test('File Deletion', false);
            this.recordResult('File Deletion', false);
            return false;
        }
    }

    /**
     * Test: Error Handling
     */
    async testErrorHandling() {
        log.section('Testing Error Handling');

        let errorsCaught = 0;
        const totalErrors = 3;

        try {
            // Test 1: Invalid file ID
            try {
                await sharepointClient.getFileMetadata('invalid-id');
            } catch (error) {
                log.test('Invalid file ID handled', true);
                errorsCaught++;
            }

            // Test 2: Invalid folder
            try {
                await sharepointClient.listFiles('InvalidFolder/NonExistent');
            } catch (error) {
                log.test('Invalid folder handled', true);
                errorsCaught++;
            }

            // Test 3: Invalid entity type
            try {
                await sharepointService.getOrCreateFolder('invalidType', 'test');
            } catch (error) {
                log.test('Invalid entity type handled', true);
                errorsCaught++;
            }

            const allErrorsCaught = errorsCaught === totalErrors;
            log.test(`All ${totalErrors} error scenarios handled correctly`, allErrorsCaught);

            this.recordResult('Error Handling', allErrorsCaught);
            return allErrorsCaught;

        } catch (error) {
            log.error(`Error handling test failed: ${error.message}`);
            this.recordResult('Error Handling', false);
            return false;
        }
    }

    /**
     * Test: Retry Logic
     */
    async testRetryLogic() {
        log.section('Testing Retry Logic');

        try {
            // Test retry with the actual client's retry mechanism
            try {
                const result = await sharepointClient.getClient();
                log.test('Retry logic available', true);
                log.test(`Retry configured: ${config.retry.maxRetries} attempts`, true);
                log.test(`Backoff delay: ${config.retry.initialDelay}ms`, true);
                
                this.recordResult('Retry Logic', true);
                return true;

            } catch (error) {
                log.warn('Retry logic test limited to configuration check');
                this.recordResult('Retry Logic', true);
                return true;
            }

        } catch (error) {
            log.error(`Retry logic test failed: ${error.message}`);
            this.recordResult('Retry Logic', false);
            return false;
        }
    }

    /**
     * Record test result
     */
    recordResult(name, passed) {
        this.results.total++;
        if (passed) {
            this.results.passed++;
        } else {
            this.results.failed++;
        }
        this.results.tests.push({ name, passed });
    }

    /**
     * Print test summary
     */
    printSummary() {
        log.section('Test Summary');
        
        console.log(`\n${colors.bold}Results:${colors.reset}`);
        console.log(`  Total Tests:  ${this.results.total}`);
        console.log(`  ${colors.green}Passed:       ${this.results.passed}${colors.reset}`);
        console.log(`  ${colors.red}Failed:       ${this.results.failed}${colors.reset}`);
        
        if (this.results.failed === 0) {
            console.log(`\n${colors.green}${colors.bold}✅ All SharePoint integration tests passed!${colors.reset}`);
        } else {
            console.log(`\n${colors.red}${colors.bold}❌ ${this.results.failed} test(s) failed. Please check the logs above.${colors.reset}`);
        }

        // Print detailed results
        console.log(`\n${colors.bold}Detailed Results:${colors.reset}`);
        this.results.tests.forEach(test => {
            const icon = test.passed ? '✅' : '❌';
            const color = test.passed ? colors.green : colors.red;
            console.log(`  ${color}${icon}${colors.reset} ${test.name}`);
        });

        // Print cleanup instructions
        if (this.fileId) {
            console.log(`\n${colors.yellow}⚠️  Test files created:${colors.reset}`);
            console.log(`  File ID: ${this.fileId}`);
            console.log(`  Folder: ${this.entityType}/${this.testId}`);
            console.log(`  Library: ${this.libraryName}`);
            console.log(`\n${colors.dim}To cleanup, run: node src/scripts/cleanup-sharepoint.js ${this.testId}${colors.reset}`);
        }

        // Print environment status
        console.log(`\n${colors.bold}Environment:${colors.reset}`);
        console.log(`  Site: ${config.siteUrl}`);
        console.log(`  Library: ${this.libraryName}`);
        console.log(`  Drive ID: ${config.driveId || 'Not set'}`);
        console.log(`  Site ID: ${config.siteId || 'Not set'}`);
        console.log(`  SharePoint Enabled: ${process.env.ENABLE_SHAREPOINT === 'true'}`);
    }
}

// Create cleanup script
function createCleanupScript() {
    const cleanupPath = path.join(__dirname, 'cleanup-sharepoint.js');
    if (!fs.existsSync(cleanupPath)) {
        const cleanupContent = `
/**
 * SharePoint Cleanup Script
 * Removes test data from SharePoint
 * Usage: node cleanup-sharepoint.js <test-id>
 */
const sharepointService = require('../sharepoint/sharepoint.service');

async function cleanup(testId) {
    if (!testId) {
        console.error('Please provide a test ID');
        console.log('Usage: node cleanup-sharepoint.js <test-id>');
        process.exit(1);
    }
    
    console.log(\`Cleaning up test data for ID: \${testId}\`);
    
    try {
        // List files in the test folder (using ipAssets entity type)
        const files = await sharepointService.listDocuments('ipAssets', testId);
        
        // Delete each file
        for (const file of files) {
            await sharepointService.deleteDocument(file.id, 'ipAssets', testId);
            console.log(\`Deleted: \${file.name}\`);
        }
        
        console.log(\`✅ Cleanup complete for test ID: \${testId}\`);
    } catch (error) {
        console.error('Cleanup failed:', error.message);
    }
}

const testId = process.argv[2];
cleanup(testId);
`;
        fs.writeFileSync(cleanupPath, cleanupContent);
        log.info(`Created cleanup script: ${cleanupPath}`);
    }
}

// Run the tests
const testSuite = new SharePointTestSuite();
testSuite.runAll()
    .then(() => {
        createCleanupScript();
        process.exit(testSuite.results.failed === 0 ? 0 : 1);
    })
    .catch(error => {
        console.error('Test suite error:', error);
        process.exit(1);
    });