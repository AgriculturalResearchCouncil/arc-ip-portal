// backend/src/scripts/cleanup-sharepoint.js
/**
 * SharePoint Cleanup Script
 * Removes test data from SharePoint
 * Usage: node cleanup-sharepoint.js <test-id>
 * 
 * @module scripts/cleanup-sharepoint
 */

const sharepointService = require('../sharepoint/sharepoint.service');
const config = require('../config/sharepoint');
require('dotenv').config({ path: '../../.env' });

async function cleanup(testId) {
    if (!testId) {
        console.error('❌ Please provide a test ID');
        console.log('Usage: node cleanup-sharepoint.js <test-id>');
        console.log('Example: node cleanup-sharepoint.js abc12345');
        process.exit(1);
    }
    
    console.log(`🧹 Cleaning up test data for ID: ${testId}`);
    console.log(`📁 Library: ${config.documentLibrary || 'TTOPortalDocuments'}`);
    console.log(`📂 Entity Type: ipAssets\n`);

    try {
        // List files in the test folder using the ipAssets entity type
        const files = await sharepointService.listDocuments('ipAssets', testId);
        
        if (files.length === 0) {
            console.log('ℹ️  No files found to clean up.');
            return;
        }

        console.log(`📄 Found ${files.length} file(s) to delete:\n`);
        
        // Delete each file
        for (const file of files) {
            try {
                await sharepointService.deleteDocument(file.id, 'ipAssets', testId);
                console.log(`   ✅ Deleted: ${file.name}`);
            } catch (err) {
                console.log(`   ❌ Failed to delete: ${file.name} - ${err.message}`);
            }
        }
        
        console.log(`\n✅ Cleanup complete for test ID: ${testId}`);
        
        // Also try to delete the folder if empty
        try {
            // Note: SharePoint doesn't support folder deletion via the same API easily,
            // so we just note that the folder may still exist
            console.log(`ℹ️  Folder (ipAssets/${testId}) may still exist - you can delete it manually if needed.`);
        } catch (err) {
            // Ignore folder deletion errors
        }

    } catch (error) {
        console.error('❌ Cleanup failed:', error.message);
        console.log('\n💡 Tip: If the test ID doesn\'t exist, this is normal behavior.');
    }
}

// Run the cleanup
const testId = process.argv[2];
cleanup(testId);