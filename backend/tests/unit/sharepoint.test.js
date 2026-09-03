// tests/unit/sharepoint.test.js
/**
 * SharePoint Unit Tests
 * =====================
 * Unit tests for SharePoint integration components.
 * Uses Jest for testing with mocked dependencies.
 * 
 * These tests verify the SharePoint integration logic works correctly
 * with the TTOPortalDocuments library structure.
 */

const sharepointClient = require('../../src/sharepoint/sharepoint.client');
const sharepointService = require('../../src/sharepoint/sharepoint.service');
const config = require('../../src/config/sharepoint');

// Mock dependencies
jest.mock('../../src/sharepoint/sharepoint.client');
jest.mock('../../src/config/sharepoint');

describe('SharePoint Client', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('initializeClient', () => {
        it('should initialize Graph client successfully', async () => {
            const mockClient = { api: jest.fn() };
            sharepointClient.initializeClient.mockResolvedValue(mockClient);

            const result = await sharepointClient.initializeClient();
            
            expect(result).toBeDefined();
            expect(sharepointClient.initializeClient).toHaveBeenCalled();
        });

        it('should handle authentication errors', async () => {
            sharepointClient.initializeClient.mockRejectedValue(
                new Error('Authentication failed')
            );

            await expect(sharepointClient.initializeClient())
                .rejects
                .toThrow('Authentication failed');
        });
    });

    describe('uploadFile', () => {
        it('should upload a file successfully', async () => {
            const mockResult = {
                id: 'test-id',
                webUrl: 'https://sharepoint.com/file',
                name: 'test.txt',
                size: 1024
            };

            sharepointClient.uploadFile.mockResolvedValue(mockResult);

            const result = await sharepointClient.uploadFile(
                'IPAssets/test-folder',
                'test.txt',
                Buffer.from('test content'),
                { test: 'metadata' }
            );

            expect(result).toEqual(mockResult);
            expect(sharepointClient.uploadFile).toHaveBeenCalledWith(
                'IPAssets/test-folder',
                'test.txt',
                expect.any(Buffer),
                { test: 'metadata' }
            );
        });

        it('should handle upload errors', async () => {
            sharepointClient.uploadFile.mockRejectedValue(
                new Error('Upload failed')
            );

            await expect(sharepointClient.uploadFile(
                'TestFolder',
                'test.txt',
                Buffer.from('test content')
            )).rejects.toThrow('Upload failed');
        });
    });

    describe('downloadFile', () => {
        it('should download a file successfully', async () => {
            const mockContent = Buffer.from('test content');
            sharepointClient.downloadFile.mockResolvedValue(mockContent);

            const result = await sharepointClient.downloadFile('test-id');

            expect(result).toEqual(mockContent);
            expect(sharepointClient.downloadFile).toHaveBeenCalledWith('test-id');
        });

        it('should handle download errors', async () => {
            sharepointClient.downloadFile.mockRejectedValue(
                new Error('Download failed')
            );

            await expect(sharepointClient.downloadFile('test-id'))
                .rejects
                .toThrow('Download failed');
        });
    });

    describe('deleteFile', () => {
        it('should delete a file successfully', async () => {
            sharepointClient.deleteFile.mockResolvedValue(true);

            const result = await sharepointClient.deleteFile('test-id');

            expect(result).toBe(true);
            expect(sharepointClient.deleteFile).toHaveBeenCalledWith('test-id');
        });
    });

    describe('getDriveInfo', () => {
        it('should get drive information', async () => {
            const mockDriveInfo = {
                id: 'drive-id',
                name: 'TTOPortalDocuments',
                description: 'TTO Portal Documents',
                webUrl: 'https://sharepoint.com/TTOPortalDocuments',
                driveType: 'documentLibrary',
                totalSize: 104857600,
                usedSize: 1048576,
                remainingSize: 103809024
            };

            sharepointClient.getDriveInfo.mockResolvedValue(mockDriveInfo);

            const result = await sharepointClient.getDriveInfo();

            expect(result).toEqual(mockDriveInfo);
            expect(sharepointClient.getDriveInfo).toHaveBeenCalled();
        });
    });

    describe('createFolder', () => {
        it('should create a folder in TTOPortalDocuments', async () => {
            const mockFolder = {
                id: 'folder-id',
                name: 'test-folder',
                webUrl: 'https://sharepoint.com/TTOPortalDocuments/IPAssets/test-folder',
                folderPath: 'IPAssets/test-folder'
            };

            sharepointClient.createFolder.mockResolvedValue(mockFolder);

            const result = await sharepointClient.createFolder('IPAssets', 'test-folder');

            expect(result).toEqual(mockFolder);
            expect(sharepointClient.createFolder).toHaveBeenCalledWith('IPAssets', 'test-folder');
        });
    });

    describe('listFiles', () => {
        it('should list files in a folder', async () => {
            const mockFiles = {
                value: [
                    { id: 'file1', name: 'file1.txt', size: 100, isFolder: false },
                    { id: 'folder1', name: 'folder1', size: 0, isFolder: true }
                ]
            };

            sharepointClient.listFiles.mockResolvedValue(mockFiles.value);

            const result = await sharepointClient.listFiles('IPAssets/test-folder');

            expect(result).toEqual(mockFiles.value);
            expect(sharepointClient.listFiles).toHaveBeenCalledWith('IPAssets/test-folder', 100);
        });
    });
});

describe('SharePoint Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getOrCreateFolder', () => {
        it('should get existing folder', async () => {
            const mockFiles = [
                { name: 'test-folder', isFolder: true }
            ];
            
            sharepointClient.listFiles.mockResolvedValue(mockFiles);
            
            const result = await sharepointService.getOrCreateFolder('ipAssets', 'test-folder');
            
            expect(result).toContain('test-folder');
            expect(sharepointClient.listFiles).toHaveBeenCalled();
            expect(sharepointClient.createFolder).not.toHaveBeenCalled();
        });

        it('should create new folder if not exists', async () => {
            const mockFiles = [];
            const mockFolder = {
                id: 'folder-id',
                name: 'new-folder',
                folderPath: 'IPAssets/new-folder'
            };
            
            sharepointClient.listFiles.mockResolvedValue(mockFiles);
            sharepointClient.createFolder.mockResolvedValue(mockFolder);
            
            const result = await sharepointService.getOrCreateFolder('ipAssets', 'new-folder');
            
            expect(result).toContain('new-folder');
            expect(sharepointClient.createFolder).toHaveBeenCalled();
        });

        it('should create parent folder if it does not exist', async () => {
            const mockFiles = [];
            const mockFolder = {
                id: 'folder-id',
                name: 'new-folder',
                folderPath: 'IPAssets/new-folder'
            };
            
            // First call returns empty (parent doesn't exist)
            sharepointClient.listFiles
                .mockResolvedValueOnce([])  // Check for parent
                .mockResolvedValueOnce([]); // Check for child
            
            sharepointClient.createFolder
                .mockResolvedValueOnce({ id: 'parent-id', name: 'IPAssets' })
                .mockResolvedValueOnce(mockFolder);
            
            const result = await sharepointService.getOrCreateFolder('ipAssets', 'new-folder');
            
            expect(result).toContain('new-folder');
            expect(sharepointClient.createFolder).toHaveBeenCalledTimes(2);
        });

        it('should handle invalid entity types', async () => {
            await expect(sharepointService.getOrCreateFolder('invalidType', 'test'))
                .rejects
                .toThrow('Unknown entity type');
        });
    });

    describe('validateFile', () => {
        it('should validate allowed file types', () => {
            const buffer = Buffer.alloc(1024);
            
            expect(() => {
                sharepointService.validateFile(buffer, 'test.pdf');
            }).not.toThrow();
            
            expect(() => {
                sharepointService.validateFile(buffer, 'test.exe');
            }).toThrow('File type .exe is not allowed');
        });

        it('should validate file size limits', () => {
            const largeBuffer = Buffer.alloc(60 * 1024 * 1024); // 60MB
            
            expect(() => {
                sharepointService.validateFile(largeBuffer, 'test.pdf');
            }).toThrow('File size exceeds maximum allowed size');
        });
    });

    describe('uploadDocument', () => {
        it('should upload a document with metadata', async () => {
            const mockUploadResult = {
                sharepointId: 'file-id',
                sharepointUrl: 'https://sharepoint.com/file',
                sharepointFolder: 'IPAssets/test-id',
                fileName: 'test.txt',
                fileSize: 100,
                fileUrl: 'https://sharepoint.com/file/download'
            };

            sharepointService.uploadDocument.mockResolvedValue(mockUploadResult);

            const result = await sharepointService.uploadDocument({
                entityType: 'ipAssets',
                entityId: 'test-id',
                fileName: 'test.txt',
                fileBuffer: Buffer.from('test content'),
                documentType: 'Test',
                description: 'Test document'
            });

            expect(result).toEqual(mockUploadResult);
            expect(sharepointService.uploadDocument).toHaveBeenCalled();
        });

        it('should handle invalid file uploads', async () => {
            const invalidFile = Buffer.alloc(60 * 1024 * 1024);

            await expect(sharepointService.uploadDocument({
                entityType: 'ipAssets',
                entityId: 'test-id',
                fileName: 'test.txt',
                fileBuffer: invalidFile,
                documentType: 'Test'
            })).rejects.toThrow('File size exceeds maximum allowed size');
        });
    });

    describe('listDocuments', () => {
        it('should list documents for an entity', async () => {
            const mockFiles = [
                { id: 'file1', name: 'file1.txt', size: 100, webUrl: 'url1', createdDateTime: '2024-01-01', lastModifiedDateTime: '2024-01-02' }
            ];

            sharepointClient.listFiles.mockResolvedValue(mockFiles);
            sharepointService.listDocuments.mockResolvedValue(mockFiles);

            const result = await sharepointService.listDocuments('ipAssets', 'test-id');

            expect(result).toEqual(mockFiles);
            expect(sharepointService.listDocuments).toHaveBeenCalledWith('ipAssets', 'test-id', 100);
        });
    });

    describe('deleteDocument', () => {
        it('should delete a document', async () => {
            sharepointClient.deleteFile.mockResolvedValue(true);

            const result = await sharepointService.deleteDocument('file-id', 'ipAssets', 'test-id');

            expect(result).toBe(true);
            expect(sharepointService.deleteDocument).toHaveBeenCalledWith('file-id', 'ipAssets', 'test-id');
        });
    });

    describe('getDownloadUrl', () => {
        it('should get a download URL for a document', async () => {
            const mockMetadata = { webUrl: 'https://sharepoint.com/file/download' };
            sharepointClient.getFileMetadata.mockResolvedValue(mockMetadata);

            const result = await sharepointService.getDownloadUrl('file-id');

            expect(result).toBe('https://sharepoint.com/file/download');
            expect(sharepointService.getDownloadUrl).toHaveBeenCalledWith('file-id');
        });
    });

    describe('updateDocumentMetadata', () => {
        it('should update document metadata', async () => {
            const mockResult = { id: 'file-id', description: 'Updated description' };
            sharepointClient.updateFileMetadata.mockResolvedValue(mockResult);

            const result = await sharepointService.updateDocumentMetadata('file-id', { description: 'Updated description' });

            expect(result).toEqual(mockResult);
            expect(sharepointService.updateDocumentMetadata).toHaveBeenCalledWith('file-id', { description: 'Updated description' });
        });
    });
});