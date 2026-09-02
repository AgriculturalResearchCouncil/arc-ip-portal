// test-complete-api.js
/**
 * Complete API Test Script
 * Tests all major endpoints to verify backend functionality.
 * 
 * Usage:
 *   node test-complete-api.js
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Configuration
const BASE_URL = 'http://localhost:3000/api/v1';
const HEALTH_URL = 'http://localhost:3000';
const USERNAME = 'NcubeZ';
const PASSWORD = 'Zlbusis015!';

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[36m',
    cyan: '\x1b[35m',
    bright: '\x1b[1m'
};

let TOKEN = null;
let TEST_DATA = {};

const log = {
    info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
    warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
    section: (msg) => console.log(`\n${colors.bright}${colors.cyan}=== ${msg} ===${colors.reset}\n`),
    data: (obj) => console.log(JSON.stringify(obj, null, 2))
};

/**
 * Makes an API request
 */
async function apiRequest(method, endpoint, data = null, token = null) {
    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json'
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    try {
        const response = await axios({
            method,
            url,
            data,
            headers,
            timeout: 10000
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
 * Main test runner
 */
async function runTests() {
    console.clear();
    log.section('ARC IP Portal - Complete API Test Suite');
    log.info(`Base URL: ${BASE_URL}`);
    log.info(`Started: ${new Date().toISOString()}\n`);

    try {
        // ============================================================
        // 1. HEALTH CHECKS
        // ============================================================
        log.section('1. Health Checks');

        // 1.1 Server Health
        log.info('Checking server health...');
        const health = await apiRequest('GET', `${HEALTH_URL}/health`);
        if (health.success) {
            log.success(`Server health: ${health.data.status}`);
        } else {
            log.error(`Health check failed: ${health.data}`);
            return;
        }

        // 1.2 Database Health
        log.info('Checking database health...');
        const dbHealth = await apiRequest('GET', `${HEALTH_URL}/health/db`);
        if (dbHealth.success) {
            log.success(`Database health: ${dbHealth.data.database}`);
        } else {
            log.warn(`Database health check failed: ${dbHealth.data}`);
        }

        // 1.3 API Info
        log.info('Getting API info...');
        const apiInfo = await apiRequest('GET', '/');
        if (apiInfo.success) {
            log.success(`API: ${apiInfo.data.name} v${apiInfo.data.version}`);
            log.info(`Endpoints: ${Object.keys(apiInfo.data.endpoints).length}`);
        } else {
            log.error(`API info failed: ${apiInfo.data}`);
        }

        // ============================================================
        // 2. AUTHENTICATION
        // ============================================================
        log.section('2. Authentication');

        // 2.1 Login
        log.info('Logging in...');
        const login = await apiRequest('POST', '/auth/login', {
            username: USERNAME,
            password: PASSWORD
        });

        if (login.success && login.data.data?.token) {
            TOKEN = login.data.data.token;
            TEST_DATA.user = login.data.data.user;
            log.success(`Login successful! Welcome ${TEST_DATA.user?.firstName} ${TEST_DATA.user?.lastName}`);
            log.info(`User ID: ${TEST_DATA.user?.id || TEST_DATA.user?.person_id}`);
            log.info(`Roles: ${JSON.stringify(TEST_DATA.user?.roles || [])}`);
        } else {
            log.error(`Login failed: ${login.data}`);
            return;
        }

        // 2.2 Get Current User
        log.info('Getting current user...');
        const me = await apiRequest('GET', '/auth/me', null, TOKEN);
        if (me.success) {
            log.success('User info retrieved');
            log.data(me.data.data);
        } else {
            log.error(`Get user failed: ${me.data}`);
        }

        // 2.3 Auth Status
        log.info('Checking auth status...');
        const status = await apiRequest('GET', '/auth/status', null, TOKEN);
        if (status.success) {
            log.success('Auth status: Authenticated');
        } else {
            log.error(`Auth status failed: ${status.data}`);
        }

        // ============================================================
        // 3. USERS
        // ============================================================
        log.section('3. Users');

        // 3.1 Get All Users
        log.info('Getting all users...');
        const users = await apiRequest('GET', '/users', null, TOKEN);
        if (users.success) {
            log.success(`Found ${users.data.data?.length || 0} users`);
        } else {
            log.error(`Get users failed: ${users.data}`);
        }

        // 3.2 User Statistics
        log.info('Getting user statistics...');
        const userStats = await apiRequest('GET', '/users/statistics', null, TOKEN);
        if (userStats.success) {
            log.success('User statistics retrieved');
            log.data(userStats.data.data);
        } else {
            log.error(`User statistics failed: ${userStats.data}`);
        }

        // 3.3 Search Users
        log.info('Searching users...');
        const search = await apiRequest('GET', '/users/search?q=Ncube', null, TOKEN);
        if (search.success) {
            log.success(`Found ${search.data.data?.length || 0} search results`);
        } else {
            log.warn(`Search failed: ${search.data}`);
        }

        // ============================================================
        // 4. DISCLOSURES
        // ============================================================
        log.section('4. Disclosures');

        // 4.1 Get My Disclosures
        log.info('Getting my disclosures...');
        const myDisclosures = await apiRequest('GET', '/disclosures/my', null, TOKEN);
        if (myDisclosures.success) {
            log.success(`Found ${myDisclosures.data.data?.length || 0} of my disclosures`);
        } else {
            log.error(`Get my disclosures failed: ${myDisclosures.data}`);
        }

        // 4.2 Get All Disclosures
        log.info('Getting all disclosures...');
        const disclosures = await apiRequest('GET', '/disclosures', null, TOKEN);
        if (disclosures.success) {
            log.success(`Found ${disclosures.data.data?.length || 0} total disclosures`);
        } else {
            log.error(`Get disclosures failed: ${disclosures.data}`);
        }

        // 4.3 Create Disclosure
        log.info('Creating a disclosure...');
        const createDisc = await apiRequest('POST', '/disclosures', {
            title: `Test Disclosure ${new Date().toISOString()}`,
            disclosureCategory: 'Innovation',
            noveltyDescription: 'Test disclosure created by automated test script',
            commercialisationPotential: 'High potential',
            confidentialityLevel: 'Confidential',
            inventors: [
                {
                    firstName: 'Test',
                    lastName: 'Inventor',
                    email: `test.inventor.${Date.now()}@arc.agric.za`
                }
            ]
        }, TOKEN);

        if (createDisc.success) {
            TEST_DATA.disclosureId = createDisc.data.data?.disclosure_id;
            log.success(`Disclosure created: ${TEST_DATA.disclosureId}`);
        } else {
            log.warn(`Create disclosure failed: ${createDisc.data}`);
        }

        // 4.4 Disclosure Statistics
        log.info('Getting disclosure statistics...');
        const discStats = await apiRequest('GET', '/disclosures/statistics', null, TOKEN);
        if (discStats.success) {
            log.success('Disclosure statistics retrieved');
        } else {
            log.error(`Disclosure statistics failed: ${discStats.data}`);
        }

        // ============================================================
        // 5. IP ASSETS
        // ============================================================
        log.section('5. IP Assets');

        // 5.1 Get My IP Assets
        log.info('Getting my IP assets...');
        const myAssets = await apiRequest('GET', '/ip-assets/my', null, TOKEN);
        if (myAssets.success) {
            log.success(`Found ${myAssets.data.data?.length || 0} of my IP assets`);
        } else {
            log.error(`Get my IP assets failed: ${myAssets.data}`);
        }

        // 5.2 Get All IP Assets
        log.info('Getting all IP assets...');
        const assets = await apiRequest('GET', '/ip-assets', null, TOKEN);
        if (assets.success) {
            log.success(`Found ${assets.data.data?.length || 0} total IP assets`);
        } else {
            log.error(`Get IP assets failed: ${assets.data}`);
        }

        // 5.3 IP Asset Statistics
        log.info('Getting IP asset statistics...');
        const assetStats = await apiRequest('GET', '/ip-assets/statistics', null, TOKEN);
        if (assetStats.success) {
            log.success('IP asset statistics retrieved');
        } else {
            log.error(`IP asset statistics failed: ${assetStats.data}`);
        }

        // ============================================================
        // 6. PATENTS
        // ============================================================
        log.section('6. Patents');

        // 6.1 Get Patents
        log.info('Getting patents...');
        const patents = await apiRequest('GET', '/patents', null, TOKEN);
        if (patents.success) {
            log.success(`Found ${patents.data.data?.length || 0} patents`);
        } else {
            log.error(`Get patents failed: ${patents.data}`);
        }

        // 6.2 Patent Statistics
        log.info('Getting patent statistics...');
        const patentStats = await apiRequest('GET', '/patents/statistics', null, TOKEN);
        if (patentStats.success) {
            log.success('Patent statistics retrieved');
        } else {
            log.error(`Patent statistics failed: ${patentStats.data}`);
        }

        // ============================================================
        // 7. LICENCES
        // ============================================================
        log.section('7. Licences');

        // 7.1 Get Licences
        log.info('Getting licences...');
        const licences = await apiRequest('GET', '/licences', null, TOKEN);
        if (licences.success) {
            log.success(`Found ${licences.data.data?.length || 0} licences`);
        } else {
            log.error(`Get licences failed: ${licences.data}`);
        }

        // 7.2 Licence Statistics
        log.info('Getting licence statistics...');
        const licenceStats = await apiRequest('GET', '/licences/statistics', null, TOKEN);
        if (licenceStats.success) {
            log.success('Licence statistics retrieved');
        } else {
            log.error(`Licence statistics failed: ${licenceStats.data}`);
        }

        // ============================================================
        // 8. COMMERCIALISATION
        // ============================================================
        log.section('8. Commercialisation');

        // 8.1 Get Commercialisations
        log.info('Getting commercialisation projects...');
        const comms = await apiRequest('GET', '/commercialisations', null, TOKEN);
        if (comms.success) {
            log.success(`Found ${comms.data.data?.length || 0} commercialisation projects`);
        } else {
            log.error(`Get commercialisations failed: ${comms.data}`);
        }

        // 8.2 Commercialisation Statistics
        log.info('Getting commercialisation statistics...');
        const commStats = await apiRequest('GET', '/commercialisations/statistics', null, TOKEN);
        if (commStats.success) {
            log.success('Commercialisation statistics retrieved');
        } else {
            log.error(`Commercialisation statistics failed: ${commStats.data}`);
        }

        // ============================================================
        // 9. REPORTS
        // ============================================================
        log.section('9. Reports');

        // 9.1 Dashboard
        log.info('Getting dashboard...');
        const dashboard = await apiRequest('GET', '/reports/dashboard', null, TOKEN);
        if (dashboard.success) {
            log.success('Dashboard retrieved');
        } else {
            log.error(`Dashboard failed: ${dashboard.data}`);
        }

        // 9.2 Executive Dashboard
        log.info('Getting executive dashboard...');
        const execDash = await apiRequest('GET', '/reports/dashboard/executive', null, TOKEN);
        if (execDash.success) {
            log.success('Executive dashboard retrieved');
        } else {
            log.error(`Executive dashboard failed: ${execDash.data}`);
        }

        // 9.3 TTO Dashboard
        log.info('Getting TTO dashboard...');
        const ttoDash = await apiRequest('GET', '/reports/dashboard/tto', null, TOKEN);
        if (ttoDash.success) {
            log.success('TTO dashboard retrieved');
        } else {
            log.error(`TTO dashboard failed: ${ttoDash.data}`);
        }

        // 9.4 IP Portfolio
        log.info('Getting IP portfolio...');
        const portfolio = await apiRequest('GET', '/reports/ip-portfolio', null, TOKEN);
        if (portfolio.success) {
            log.success(`IP portfolio: ${portfolio.data.data?.length || 0} items`);
        } else {
            log.error(`IP portfolio failed: ${portfolio.data}`);
        }

        // 9.5 IP Type Breakdown
        log.info('Getting IP type breakdown...');
        const breakdown = await apiRequest('GET', '/reports/ip-breakdown', null, TOKEN);
        if (breakdown.success) {
            log.success('IP type breakdown retrieved');
        } else {
            log.error(`IP type breakdown failed: ${breakdown.data}`);
        }

        // 9.6 Monthly Trends
        log.info('Getting monthly trends...');
        const trends = await apiRequest('GET', '/reports/trends?months=12&type=disclosure', null, TOKEN);
        if (trends.success) {
            log.success('Monthly trends retrieved');
        } else {
            log.error(`Monthly trends failed: ${trends.data}`);
        }

        // ============================================================
        // 10. NOTIFICATIONS
        // ============================================================
        log.section('10. Notifications');

        // 10.1 Get Notifications
        log.info('Getting notifications...');
        const notifications = await apiRequest('GET', '/notifications', null, TOKEN);
        if (notifications.success) {
            log.success(`Found ${notifications.data.data?.length || 0} notifications`);
        } else {
            log.error(`Get notifications failed: ${notifications.data}`);
        }

        // 10.2 Unread Count
        log.info('Getting unread count...');
        const unread = await apiRequest('GET', '/notifications/unread-count', null, TOKEN);
        if (unread.success) {
            log.success(`Unread notifications: ${unread.data.data?.count || 0}`);
        } else {
            log.error(`Unread count failed: ${unread.data}`);
        }

        // ============================================================
        // 11. WORKFLOWS
        // ============================================================
        log.section('11. Workflows');

        // 11.1 Workflow Statistics
        log.info('Getting workflow statistics...');
        const workflowStats = await apiRequest('GET', '/workflows/statistics', null, TOKEN);
        if (workflowStats.success) {
            log.success('Workflow statistics retrieved');
            log.data(workflowStats.data.data);
        } else {
            log.error(`Workflow statistics failed: ${workflowStats.data}`);
        }

        // 11.2 Get Workflow Template
        log.info('Getting workflow template...');
        const template = await apiRequest('GET', '/workflows/template/disclosure', null, TOKEN);
        if (template.success) {
            log.success(`Workflow template: ${template.data.data?.length || 0} steps`);
        } else {
            log.error(`Workflow template failed: ${template.data}`);
        }

        // ============================================================
        // 12. AUDIT (Admin)
        // ============================================================
        log.section('12. Audit');

        // 12.1 Audit Statistics
        log.info('Getting audit statistics...');
        const auditStats = await apiRequest('GET', '/audit/statistics', null, TOKEN);
        if (auditStats.success) {
            log.success('Audit statistics retrieved');
        } else {
            log.warn(`Audit statistics: ${auditStats.data?.message || 'Access denied'}`);
        }

        // 12.2 Security Events
        log.info('Getting security events...');
        const secEvents = await apiRequest('GET', '/audit/security/events', null, TOKEN);
        if (secEvents.success) {
            log.success(`Security events: ${secEvents.data.data?.length || 0}`);
        } else {
            log.warn(`Security events: ${secEvents.data?.message || 'Access denied'}`);
        }

        // 12.3 Failed Logins
        log.info('Getting failed logins...');
        const failedLogins = await apiRequest('GET', '/audit/security/failed-logins', null, TOKEN);
        if (failedLogins.success) {
            log.success(`Failed logins: ${failedLogins.data.data?.length || 0}`);
        } else {
            log.warn(`Failed logins: ${failedLogins.data?.message || 'Access denied'}`);
        }

        // 12.4 Compliance Report
        log.info('Getting compliance report...');
        const compliance = await apiRequest(
            'GET',
            '/audit/compliance/report?periodStart=2024-01-01&periodEnd=2024-12-31',
            null,
            TOKEN
        );
        if (compliance.success) {
            log.success('Compliance report retrieved');
        } else {
            log.warn(`Compliance report: ${compliance.data?.message || 'Access denied'}`);
        }

        // ============================================================
        // 13. EXPORT
        // ============================================================
        log.section('13. Export');

        // 13.1 Export IP Portfolio
        log.info('Exporting IP portfolio (CSV)...');
        const exportData = await apiRequest(
            'GET',
            '/reports/export?type=ip_portfolio&format=csv',
            null,
            TOKEN
        );
        if (exportData.success) {
            log.success('Export data retrieved');
            log.info(`Data size: ${typeof exportData.data === 'string' ? exportData.data.length : JSON.stringify(exportData.data).length} characters`);
        } else {
            log.error(`Export failed: ${exportData.data}`);
        }

        // ============================================================
        // 14. SEARCH
        // ============================================================
        log.section('14. Search');

        // 14.1 Search Disclosures
        log.info('Searching disclosures...');
        const searchDisc = await apiRequest('GET', '/disclosures/search?q=test', null, TOKEN);
        if (searchDisc.success) {
            log.success(`Found ${searchDisc.data.data?.length || 0} disclosure search results`);
        } else {
            log.error(`Search failed: ${searchDisc.data}`);
        }

        // ============================================================
        // TEST SUMMARY
        // ============================================================
        log.section('✅ Test Summary');
        log.success('All API tests completed!');
        log.info(`\nTest Data Created:`);
        log.data(TEST_DATA);

        log.info('\n📊 Summary:');
        log.info(`  - User: ${TEST_DATA.user?.firstName} ${TEST_DATA.user?.lastName}`);
        log.info(`  - Roles: ${JSON.stringify(TEST_DATA.user?.roles || [])}`);
        log.info(`  - Disclosures: ${myDisclosures.success ? myDisclosures.data.data?.length || 0 : 'N/A'}`);
        log.info(`  - IP Assets: ${myAssets.success ? myAssets.data.data?.length || 0 : 'N/A'}`);
        log.info(`  - Notifications: ${notifications.success ? notifications.data.data?.length || 0 : 'N/A'}`);

    } catch (error) {
        log.error(`Test suite failed: ${error.message}`);
        console.error(error);
    }
}

// Run the tests
runTests();

// Export for use in other tests
module.exports = { runTests };