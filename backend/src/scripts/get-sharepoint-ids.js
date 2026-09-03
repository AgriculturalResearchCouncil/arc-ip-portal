// backend/src/scripts/get-sharepoint-ids.js
/**
 * SharePoint ID Retrieval Script
 * ==============================
 * This script retrieves SharePoint site and drive IDs for the DevOTT site.
 * 
 * Purpose:
 * - Get the SharePoint Site ID for the DevOTT site
 * - Get Drive IDs for all document libraries
 * - List available lists and libraries
 * - Generate .env configuration values
 * 
 * Usage:
 *   node src/scripts/get-sharepoint-ids.js
 * 
 * Prerequisites:
 *   npm install @azure/identity @microsoft/microsoft-graph-client dotenv
 * 
 * @module scripts/get-sharepoint-ids
 */

const { ClientSecretCredential } = require('@azure/identity');
const { Client } = require('@microsoft/microsoft-graph-client');
const { TokenCredentialAuthenticationProvider } = require('@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials');

// Load environment variables from root .env
require('dotenv').config({ path: '../../.env' });

// Configuration
const SITE_URL = process.env.SHAREPOINT_SITE_URL || 'https://arcagricza2.sharepoint.com/sites/DevOTT';
const SITE_PATH = 'arcagricza2.sharepoint.com:/sites/DevOTT';

/**
 * Colors for console output
 */
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[36m',
    cyan: '\x1b[35m',
    bold: '\x1b[1m'
};

const log = {
    info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
    warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
    section: (msg) => console.log(`\n${colors.bold}${colors.cyan}=== ${msg} ===${colors.reset}\n`),
    data: (obj) => console.log(JSON.stringify(obj, null, 2))
};

/**
 * Main function to retrieve SharePoint IDs
 */
async function getSharePointIds() {
    console.clear();
    log.section('ARC IP Portal - SharePoint ID Retrieval');
    log.info(`Site URL: ${SITE_URL}`);
    log.info(`Started: ${new Date().toISOString()}\n`);

    try {
        // Check if required environment variables are set
        const requiredVars = ['SHAREPOINT_TENANT_ID', 'SHAREPOINT_CLIENT_ID', 'SHAREPOINT_CLIENT_SECRET'];
        const missingVars = requiredVars.filter(varName => !process.env[varName]);
        
        if (missingVars.length > 0) {
            log.error(`Missing environment variables: ${missingVars.join(', ')}`);
            log.info('Please add these to your .env file and try again.');
            return;
        }

        log.info('Authenticating with Microsoft Graph API...');

        // Create credential
        const credential = new ClientSecretCredential(
            process.env.SHAREPOINT_TENANT_ID,
            process.env.SHAREPOINT_CLIENT_ID,
            process.env.SHAREPOINT_CLIENT_SECRET
        );

        // Create auth provider
        const authProvider = new TokenCredentialAuthenticationProvider(credential, {
            scopes: ['https://graph.microsoft.com/.default']
        });

        // Initialize Graph client
        const client = Client.initWithMiddleware({
            authProvider: authProvider,
            fetchOptions: {
                timeout: 30000
            }
        });

        // 1. Get Site ID
        log.section('1. Getting Site Information');
        log.info(`Fetching site: ${SITE_PATH}...`);

        const site = await client.api(`/sites/${SITE_PATH}`)
            .select('id,name,webUrl,displayName,description,createdDateTime')
            .get();

        log.success(`Site found: ${site.displayName || site.name}`);
        log.info(`Site ID: ${colors.bold}${site.id}${colors.reset}`);
        log.info(`Web URL: ${site.webUrl}`);
        log.info(`Created: ${site.createdDateTime}`);

        const siteId = site.id;

        // 2. Get Drives (Document Libraries)
        log.section('2. Getting Document Libraries');
        log.info('Fetching all drives (document libraries)...');

        const drives = await client.api(`/sites/${siteId}/drives`)
            .select('id,name,webUrl,driveType,description,createdDateTime')
            .get();

        log.success(`Found ${drives.value.length} document libraries`);

        // Display all drives
        const driveMap = {};
        drives.value.forEach(drive => {
            driveMap[drive.name] = drive;
            log.info(`   📁 ${drive.name}: ${drive.id}`);
            if (drive.description) {
                log.info(`      ${drive.description}`);
            }
        });

        // 3. Get Lists
        log.section('3. Getting Site Lists');
        log.info('Fetching all lists...');

        const lists = await client.api(`/sites/${siteId}/lists`)
            .select('id,name,displayName,description,createdDateTime')
            .get();

        log.success(`Found ${lists.value.length} lists`);

        const listMap = {};
        lists.value.forEach(list => {
            listMap[list.name] = list;
            log.info(`   📋 ${list.displayName || list.name}: ${list.id}`);
        });

        // 4. Check for required libraries
        log.section('4. Checking Required Libraries');

        const requiredLibraries = [
            'IPDocuments',
            'Disclosures', 
            'Licences',
            'Patents',
            'PBR',
            'Trademarks',
            'Commercialisation'
        ];

        const missingLibraries = [];
        requiredLibraries.forEach(libName => {
            if (driveMap[libName]) {
                log.success(`✅ ${libName}: ${driveMap[libName].id}`);
            } else {
                log.warn(`❌ ${libName}: NOT FOUND - Please create this library`);
                missingLibraries.push(libName);
            }
        });

        // 5. Generate .env configuration
        log.section('5. Generated .env Configuration');

        console.log(`
${colors.bold}Copy these values to your .env file:${colors.reset}

# SharePoint Configuration
SHAREPOINT_TENANT_ID=${process.env.SHAREPOINT_TENANT_ID}
SHAREPOINT_CLIENT_ID=${process.env.SHAREPOINT_CLIENT_ID}
SHAREPOINT_CLIENT_SECRET=${process.env.SHAREPOINT_CLIENT_SECRET}
SHAREPOINT_SITE_ID=${siteId}
SHAREPOINT_DRIVE_ID=${driveMap['IPDocuments']?.id || driveMap['Documents']?.id || 'your-drive-id'}
SHAREPOINT_SITE_URL=${SITE_URL}
SHAREPOINT_BASE_URL=https://graph.microsoft.com/v1.0

# Document Library IDs (optional - for specific libraries)
SHAREPOINT_IPDOCS_LIBRARY=${driveMap['IPDocuments']?.id || 'not-found'}
SHAREPOINT_DISCLOSURES_LIBRARY=${driveMap['Disclosures']?.id || 'not-found'}
SHAREPOINT_LICENCES_LIBRARY=${driveMap['Licences']?.id || 'not-found'}
SHAREPOINT_PATENTS_LIBRARY=${driveMap['Patents']?.id || 'not-found'}
SHAREPOINT_PBR_LIBRARY=${driveMap['PBR']?.id || 'not-found'}
SHAREPOINT_TRADEMARKS_LIBRARY=${driveMap['Trademarks']?.id || 'not-found'}

# Feature Flags
ENABLE_SHAREPOINT=true
        `);

        // 6. Summary
        log.section('6. Summary');

        console.log(`
${colors.bold}Site Information:${colors.reset}
  Site Name: ${site.displayName || site.name}
  Site ID: ${siteId}
  Site URL: ${site.webUrl}

${colors.bold}Document Libraries Found:${colors.reset}
  ${Object.keys(driveMap).join('\n  ')}

${colors.bold}Lists Found:${colors.reset}
  ${Object.keys(listMap).join('\n  ')}

${colors.bold}Missing Libraries:${colors.reset}
  ${missingLibraries.length > 0 ? missingLibraries.join('\n  ') : 'All required libraries exist! ✅'}
        `);

        if (missingLibraries.length > 0) {
            log.warn('⚠️  Please create the missing libraries in your SharePoint site.');
            log.info('You can create them using PnP PowerShell:');
            console.log(`
Connect-PnPOnline -Url "${SITE_URL}"
${missingLibraries.map(lib => `New-PnPList -Title "${lib}" -Template DocumentLibrary`).join('\n')}
            `);
        }

        log.success('\n✅ SharePoint ID retrieval completed successfully!');

    } catch (error) {
        log.error(`Failed to retrieve SharePoint IDs: ${error.message}`);
        
        if (error.statusCode === 401 || error.statusCode === 403) {
            log.error('Authentication failed. Please check:');
            log.info('1. SHAREPOINT_TENANT_ID is correct');
            log.info('2. SHAREPOINT_CLIENT_ID is correct');
            log.info('3. SHAREPOINT_CLIENT_SECRET is correct');
            log.info('4. The app has the required permissions (Sites.Read.All, Files.Read.All)');
        } else if (error.statusCode === 404) {
            log.error('Site not found. Please check:');
            log.info(`1. Site URL is correct: ${SITE_URL}`);
            log.info('2. The site exists and you have access to it');
        } else if (error.code === 'ECONNREFUSED') {
            log.error('Connection failed. Please check:');
            log.info('1. Your network connection');
            log.info('2. Proxy settings if applicable');
            log.info('3. Firewall settings');
        }

        console.error('\nFull error:', error);
    }
}

// Run the script
getSharePointIds();

// Export for use in other scripts
module.exports = { getSharePointIds };