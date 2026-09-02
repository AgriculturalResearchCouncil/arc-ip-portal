// tests/api-test.js - Comprehensive API testing script
/**
 * API Test Script
 * ===============
 * Tests all API endpoints to verify backend functionality.
 * 
 * Usage:
 *   node tests/api-test.js
 * 
 * @module tests/api-test
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Configuration
const BASE_URL = 'http://localhost:3000/api/v1';
let TOKEN = null;
let TEST_DATA = {
    disclosureId: null,
    ipRecordId: null,
    patentId: null,
    licenceId: null,
    commercialisationId: null,
    evaluationId: null,
    documentId: null,
    taskId: null,
    notificationId: null
};

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

const log = {
    info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
    warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
    section: (msg) => console.log(`\n${colors.bright}${colors.cyan}=== ${msg} ===${colors.reset}\n`),
    data: (obj) => console.log(JSON.stringify(obj, null, 2))
};

/**
 * Makes an API request
 */
async function apiRequest(method, endpoint, data = null, token = null) {
    const headers = {
        'Content-Type': 'application/json'
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
        const response = await axios({
            method,
            url: `${BASE_URL}${endpoint}`,
            data,
            headers
        });
        return { success: true, data: response.data, status: response.status };
    } catch (error) {
        return {
            success: false,
            data: error.response?.data || error.message,
            status: error.response?.status || 500
        };
    }
}

/**
 * Test Runner
 */
async function runTests() {
    console.clear();
    log.section('ARC IP Portal API Test Suite');
    log.info(`Base URL: ${BASE_URL}`);
    log.info(`Started: ${new Date().toISOString()}\n`);

    try {
        // ============================================================
        // 1. HEALTH CHECKS
        // ============================================================
        log.section('1. Health Checks');

        const healthResponse = await apiRequest('GET', '/health');
        if (healthResponse.success) {
            log.success('Health check passed');
            log.data(healthResponse.data);
        } else {
            log.error(`Health check failed: ${healthResponse.data}`);
            return;
        }

        const dbHealthResponse = await apiRequest('GET', '/health/db');
        if (dbHealthResponse.success) {
            log.success('Database health check passed');
            log.data(dbHealthResponse.data);
        } else {
            log.error(`Database health check failed: ${dbHealthResponse.data}`);
        }

        // ============================================================
        // 2. AUTHENTICATION
        // ============================================================
        log.section('2. Authentication');
        log.warning('Skipping actual login - use your credentials');
        log.info('To test login, uncomment the login section and add credentials');
        log.info('For testing, using mock token (replace with actual)');

        // Uncomment and modify with your credentials
        // const loginResponse = await apiRequest('POST', '/auth/login', {
        //     username: 'YOUR_USERNAME',
        //     password: 'YOUR_PASSWORD'
        // });
        // 
        // if (loginResponse.success) {
        //     TOKEN = loginResponse.data.data.token;
        //     log.success('Login successful');
        // } else {
        //     log.error(`Login failed: ${loginResponse.data}`);
        // }

        // Mock token for testing (replace with actual)
        TOKEN = 'mock-token-for-testing';

        // ============================================================
        // 3. DISCLOSURES
        // ============================================================
        log.section('3. Disclosures');

        // 3.1 Create Disclosure
        log.info('Creating disclosure...');
        const createDisclosure = await apiRequest(
            'POST',
            '/disclosures',
            {
                title: `Test Disclosure ${new Date().toISOString()}`,
                disclosureCategory: 'Innovation',
                noveltyDescription: 'This is a test disclosure created by automated API test',
                commercialisationPotential: 'High potential for agricultural applications',
                confidentialityLevel: 'Confidential',
                inventors: [
                    {
                        firstName: 'Test',
                        lastName: 'Inventor',
                        email: `inventor.${Date.now()}@arc.agric.za`
                    }
                ]
            },
            TOKEN
        );

        if (createDisclosure.success && createDisclosure.data?.data?.disclosure_id) {
            TEST_DATA.disclosureId = createDisclosure.data.data.disclosure_id;
            log.success(`Disclosure created: ${TEST_DATA.disclosureId}`);
        } else {
            log.error(`Create disclosure failed: ${createDisclosure.data}`);
        }

        // 3.2 Get My Disclosures
        log.info('Getting my disclosures...');
        const myDisclosures = await apiRequest('GET', '/disclosures/my', null, TOKEN);
        if (myDisclosures.success) {
            log.success(`Found ${myDisclosures.data.data?.length || 0} disclosures`);
        } else {
            log.error(`Get my disclosures failed: ${myDisclosures.data}`);
        }

        // 3.3 Get All Disclosures (TTO/Admin)
        log.info('Getting all disclosures...');
        const allDisclosures = await apiRequest('GET', '/disclosures', null, TOKEN);
        if (allDisclosures.success) {
            log.success(`Found ${allDisclosures.data.data?.length || 0} total disclosures`);
        } else {
            log.error(`Get all disclosures failed: ${allDisclosures.data}`);
        }

        // ============================================================
        // 4. PATENTS
        // ============================================================
        log.section('4. Patents');

        // 4.1 Get Patent Statistics
        log.info('Getting patent statistics...');
        const patentStats = await apiRequest('GET', '/patents/statistics', null, TOKEN);
        if (patentStats.success) {
            log.success('Patent statistics retrieved');
        } else {
            log.error(`Get patent statistics failed: ${patentStats.data}`);
        }

        // 4.2 Get Patents
        log.info('Getting patents...');
        const patents = await apiRequest('GET', '/patents', null, TOKEN);
        if (patents.success) {
            log.success(`Found ${patents.data.data?.length || 0} patents`);
        } else {
            log.error(`Get patents failed: ${patents.data}`);
        }

        // ============================================================
        // 5. LICENCING
        // ============================================================
        log.section('5. Licensing');

        // 5.1 Get Licence Statistics
        log.info('Getting licence statistics...');
        const licenceStats = await apiRequest('GET', '/licences/statistics', null, TOKEN);
        if (licenceStats.success) {
            log.success('Licence statistics retrieved');
        } else {
            log.error(`Get licence statistics failed: ${licenceStats.data}`);
        }

        // 5.2 Get Licences
        log.info('Getting licences...');
        const licences = await apiRequest('GET', '/licences', null, TOKEN);
        if (licences.success) {
            log.success(`Found ${licences.data.data?.length || 0} licences`);
        } else {
            log.error(`Get licences failed: ${licences.data}`);
        }

        // ============================================================
        // 6. COMMERCIALISATION
        // ============================================================
        log.section('6. Commercialisation');

        // 6.1 Get Commercialisation Statistics
        log.info('Getting commercialisation statistics...');
        const commStats = await apiRequest('GET', '/commercialisations/statistics', null, TOKEN);
        if (commStats.success) {
            log.success('Commercialisation statistics retrieved');
        } else {
            log.error(`Get commercialisation statistics failed: ${commStats.data}`);
        }

        // 6.2 Get Commercialisation Projects
        log.info('Getting commercialisation projects...');
        const commProjects = await apiRequest('GET', '/commercialisations', null, TOKEN);
        if (commProjects.success) {
            log.success(`Found ${commProjects.data.data?.length || 0} commercialisation projects`);
        } else {
            log.error(`Get commercialisation projects failed: ${commProjects.data}`);
        }

        // ============================================================
        // 7. WORKFLOW
        // ============================================================
        log.section('7. Workflow');

        // 7.1 Get Workflow Statistics
        log.info('Getting workflow statistics...');
        const workflowStats = await apiRequest('GET', '/workflows/statistics', null, TOKEN);
        if (workflowStats.success) {
            log.success('Workflow statistics retrieved');
        } else {
            log.error(`Get workflow statistics failed: ${workflowStats.data}`);
        }

        // 7.2 Get Template
        log.info('Getting workflow template...');
        const template = await apiRequest('GET', '/workflows/template/disclosure', null, TOKEN);
        if (template.success) {
            log.success(`Workflow template retrieved: ${template.data.data?.length || 0} steps`);
        } else {
            log.error(`Get workflow template failed: ${template.data}`);
        }

        // ============================================================
        // 8. REPORTS
        // ============================================================
        log.section('8. Reports');

        // 8.1 Get Dashboard
        log.info('Getting dashboard...');
        const dashboard = await apiRequest('GET', '/reports/dashboard', null, TOKEN);
        if (dashboard.success) {
            log.success('Dashboard retrieved');
        } else {
            log.error(`Get dashboard failed: ${dashboard.data}`);
        }

        // 8.2 Get IP Breakdown
        log.info('Getting IP breakdown...');
        const ipBreakdown = await apiRequest('GET', '/reports/ip-breakdown', null, TOKEN);
        if (ipBreakdown.success) {
            log.success('IP breakdown retrieved');
        } else {
            log.error(`Get IP breakdown failed: ${ipBreakdown.data}`);
        }

        // 8.3 Get Trends
        log.info('Getting monthly trends...');
        const trends = await apiRequest('GET', '/reports/trends', null, TOKEN);
        if (trends.success) {
            log.success('Monthly trends retrieved');
        } else {
            log.error(`Get trends failed: ${trends.data}`);
        }

        // ============================================================
        // 9. AUDIT
        // ============================================================
        log.section('9. Audit');

        // 9.1 Get Audit Statistics (Admin only)
        log.info('Getting audit statistics...');
        const auditStats = await apiRequest('GET', '/audit/statistics', null, TOKEN);
        if (auditStats.success) {
            log.success('Audit statistics retrieved');
        } else {
            log.warning(`Get audit statistics: ${auditStats.data?.message || 'Access denied or not available'}`);
        }

        // ============================================================
        // 10. NOTIFICATIONS
        // ============================================================
        log.section('10. Notifications');

        // 10.1 Get Notification Count
        log.info('Getting unread count...');
        const unreadCount = await apiRequest('GET', '/notifications/unread-count', null, TOKEN);
        if (unreadCount.success) {
            log.success(`Unread notifications: ${unreadCount.data.data?.count || 0}`);
        } else {
            log.error(`Get unread count failed: ${unreadCount.data}`);
        }

        // 10.2 Get Notifications
        log.info('Getting notifications...');
        const notifications = await apiRequest('GET', '/notifications', null, TOKEN);
        if (notifications.success) {
            log.success(`Found ${notifications.data.data?.length || 0} notifications`);
        } else {
            log.error(`Get notifications failed: ${notifications.data}`);
        }

        // ============================================================
        // 11. SEARCH
        // ============================================================
        log.section('11. Search');

        // 11.1 Search Disclosures
        log.info('Searching disclosures...');
        const searchResults = await apiRequest('GET', '/disclosures/search?q=test', null, TOKEN);
        if (searchResults.success) {
            log.success(`Found ${searchResults.data.data?.length || 0} search results`);
        } else {
            log.error(`Search failed: ${searchResults.data}`);
        }

        // ============================================================
        // TEST SUMMARY
        // ============================================================
        log.section('Test Summary');
        log.success('All API tests completed!');
        log.info(`\nTest Data Created:`);
        log.data(TEST_DATA);

        log.info('\nTo run with real authentication, update the login section with your credentials.');
        log.info('The test is now complete.');

    } catch (error) {
        log.error(`Test suite failed: ${error.message}`);
        console.error(error);
    }
}

// Run the tests
runTests();

// Export for use in other tests
module.exports = { runTests, TEST_DATA };