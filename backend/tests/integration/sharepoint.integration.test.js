// backend/tests/integration/sharepoint.integration.test.js
/**
 * SharePoint Integration Tests
 * =============================
 * End-to-end integration tests for SharePoint.
 * Requires a live SharePoint connection.
 * 
 * These tests verify the complete SharePoint integration flow:
 * - Authentication
 * - Folder creation
 * - File upload/download
 * - File listing
 * - File deletion
 * - Cleanup
 * 
 * Run with: npm test -- --testPathPattern=sharepoint.integration
 */

const sharepointService = require('../../src/sharepoint/sharepoint.service');
const sharepointClient = require('../../src/sharepoint/sharepoint.client');
const config = require('../../src/config/sharepoint');
const { v4: uuidv4 } = require('uuid');

// Skip integration tests if SharePoint is not enabled or configured
const shouldRun = process.env.ENABLE_SHAREPOINT === 'true' && 
                  process.env.SHAREPOINT_CLIENT_ID !== 'your-client-id' &&
                  process.env.SHAREPOINT_TENANT_ID !== 'your-tenant-id' &&
                  process.env.SHAREPOINT_DRIVE_ID !== 'your-drive-id';

console.log(`\n📋 SharePoint Integration Tests Configuration:
  Enabled: ${process.env.ENABLE_SHAREPOINT === 'true'}
  Client ID: ${process.env.SHAREPOINT_CLIENT_ID ? '✅ Set' : '❌ Not Set'}
  Tenant ID: ${process.env.SHAREPOINT_TENANT_ID ? '✅ Set' : '❌ Not Set'}
  Drive ID: ${process.env.SHAREPOINT_DRIVE_ID ? '✅ Set' : '❌ Not Set'}
  Running: ${shouldRun ? '✅ Yes' : '❌ No (skipping)'}\n`);

describe('SharePoint Integration Tests', () => {
    let testId;
    let uploadedFileId;

    beforeAll(async () => {
        if (!shouldRun) {
            console.log('⚠️  Skipping SharePoint integration tests - not configured');
            console.log('   To run these tests, set ENABLE_SHAREPOINT=true and configure all credentials in .env');
            return;
        }
        testId = uuidv4().substring(0, 8);
        console.log(`📁 Test ID: ${testId}`);
        console.log(`📚 Library: ${config.documentLibrary || 'TTOPortalDocuments'}`);
    });

    describe('Authentication', () => {
        it('should authenticate with SharePoint', async () => {
            if (!shouldRun) return;
            
            const client = await sharepointClient.getClient();
            expect(client).toBeDefined();
            
            const driveInfo = await sharepointClient.getDriveInfo();
            expect(driveInfo).toBeDefined();
            expect(driveInfo.id).toBeDefined();
            console.log(`✅ Connected to drive: ${driveInfo.name} (${driveInfo.id})`);
        });
    });

    describe('Folder Operations', () => {
        it('should create a test folder', async () => {
            if (!shouldRun) return;
            
            const folderPath = await sharepointService.getOrCreateFolder('ipAssets', testId);
            expect(folderPath).toContain(testId);
            console.log(`✅ Folder created: ${folderPath}`);
        });

        it('should list files in folder', async () => {
            if (!shouldRun) return;
            
            const files = await sharepointService.listDocuments('ipAssets', testId);
            expect(Array.isArray(files)).toBe(true);
            console.log(`✅ Folder listing: ${files.length} items found`);
        });
    });

    describe('File Operations', () => {
        const testContent = Buffer.from(`Integration test content ${Date.now()}`, 'utf-8');

        it('should upload a file', async () => {
            if (!shouldRun) return;
            
            const result = await sharepointService.uploadDocument({
                entityType: 'ipAssets',
                entityId: testId,
                fileName: `test-${testId}.txt`,
                fileBuffer: testContent,
                documentType: 'Test',
                description: 'Integration test file'
            });

            expect(result).toBeDefined();
            expect(result.sharepointId).toBeDefined();
            uploadedFileId = result.sharepointId;
            console.log(`✅ File uploaded: ${result.fileName} (${result.fileSize} bytes)`);
        });

        it('should download the uploaded file', async () => {
            if (!shouldRun || !uploadedFileId) {
                console.log('⚠️  Skipping download test - no file uploaded');
                return;
            }
            
            const result = await sharepointService.downloadDocument(
                uploadedFileId,
                'ipAssets',
                testId
            );

            expect(result).toBeDefined();
            expect(result.content).toBeDefined();
            expect(result.content.toString('utf-8')).toContain('Integration test');
            console.log(`✅ File downloaded: ${result.metadata.name} (${result.content.length} bytes)`);
        });

        it('should get file metadata', async () => {
            if (!shouldRun || !uploadedFileId) {
                console.log('⚠️  Skipping metadata test - no file uploaded');
                return;
            }
            
            const metadata = await sharepointClient.getFileMetadata(uploadedFileId);
            
            expect(metadata).toBeDefined();
            expect(metadata.id).toBe(uploadedFileId);
            expect(metadata.name).toContain('test-');
            console.log(`✅ File metadata retrieved: ${metadata.name}`);
        });

        it('should list files and find uploaded file', async () => {
            if (!shouldRun || !uploadedFileId) {
                console.log('⚠️  Skipping list test - no file uploaded');
                return;
            }
            
            const files = await sharepointService.listDocuments('ipAssets', testId);
            const found = files.some(f => f.id === uploadedFileId);
            expect(found).toBe(true);
            console.log(`✅ File found in folder listing: ${found}`);
        });

        it('should delete the uploaded file', async () => {
            if (!shouldRun || !uploadedFileId) {
                console.log('⚠️  Skipping deletion test - no file uploaded');
                return;
            }
            
            await sharepointService.deleteDocument(
                uploadedFileId,
                'ipAssets',
                testId
            );
            
            // Verify file is deleted
            const files = await sharepointService.listDocuments('ipAssets', testId);
            const found = files.some(f => f.id === uploadedFileId);
            expect(found).toBe(false);
            console.log('✅ File deleted successfully');
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid file ID gracefully', async () => {
            if (!shouldRun) return;
            
            await expect(sharepointClient.getFileMetadata('invalid-id'))
                .rejects
                .toThrow();
            console.log('✅ Invalid file ID handled gracefully');
        });

        it('should handle invalid folder path gracefully', async () => {
            if (!shouldRun) return;
            
            await expect(sharepointClient.listFiles('InvalidFolder/NonExistent'))
                .rejects
                .toThrow();
            console.log('✅ Invalid folder path handled gracefully');
        });

        it('should handle invalid entity type gracefully', async () => {
            if (!shouldRun) return;
            
            await expect(sharepointService.getOrCreateFolder('invalidType', 'test'))
                .rejects
                .toThrow('Unknown entity type');
            console.log('✅ Invalid entity type handled gracefully');
        });
    });

    afterAll(async () => {
        if (!shouldRun) return;
        
        // Cleanup test folder
        console.log(`\n🧹 Cleaning up test data...`);
        try {
            const files = await sharepointService.listDocuments('ipAssets', testId);
            if (files.length > 0) {
                console.log(`   Found ${files.length} files to delete`);
                for (const file of files) {
                    await sharepointService.deleteDocument(file.id, 'ipAssets', testId);
                    console.log(`   ✅ Deleted: ${file.name}`);
                }
            } else {
                console.log('   No files found to clean up');
            }
            console.log(`✅ Cleanup complete for test ID: ${testId}`);
        } catch (error) {
            console.warn('⚠️  Cleanup warning:', error.message);
            console.log('   You may need to manually delete files in the test folder.');
        }
    });
});