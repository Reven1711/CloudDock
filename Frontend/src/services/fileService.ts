import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export interface FileUploadData {
  file: File;
  orgId: string;
  userId: string;
  userName: string;
  userEmail: string;
  folder?: string;
}

export interface FileMetadata {
  fileId: string;
  fileName: string;
  originalName: string;
  size: number;
  mimeType: string;
  folder: string;
  uploadedBy: {
    userId: string;
    userName: string;
    userEmail: string;
  };
  uploadedAt: string;
  virusScanStatus: 'pending' | 'scanning' | 'clean' | 'infected' | 'error';
}

export interface StorageInfo {
  orgId: string;
  totalQuota: number;
  usedStorage: number;
  availableStorage: number;
  fileCount: number;
  usagePercentage: number;
  isPaidPlan: boolean;
  isQuotaExceeded: boolean;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  file: {
    fileId: string;
    fileName: string;
    originalName: string;
    size: number;
    mimeType: string;
    uploadedAt: string;
    virusScanStatus: string;
  };
  storageInfo: StorageInfo;
}

export interface BatchUploadResponse {
  success: boolean;
  message: string;
  statistics: {
    totalFiles: number;
    successful: number;
    failed: number;
    processingTime: string;
  };
  uploadedFiles: Array<{
    fileId: string;
    fileName: string;
    originalName: string;
    size: number;
    mimeType: string;
    virusScanStatus: string;
  }>;
  errors: Array<{
    fileName: string;
    error: string;
  }>;
  storageInfo: StorageInfo;
  workerPoolStats?: {
    totalWorkers: number;
    availableWorkers: number;
    busyWorkers: number;
    queuedTasks: number;
  };
}

export interface BatchUploadOptions {
  files: File[];
  orgId: string;
  userId: string;
  userName: string;
  userEmail: string;
  folder?: string;
  parallelism?: number;
  onProgress?: (progress: { uploaded: number; total: number }) => void;
}

/**
 * Upload a single file to S3
 */
export const uploadFile = async (data: FileUploadData): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', data.file);
  formData.append('orgId', data.orgId);
  formData.append('userId', data.userId);
  formData.append('userName', data.userName);
  formData.append('userEmail', data.userEmail);
  if (data.folder) {
    formData.append('folder', data.folder);
  }

  const response = await axios.post(`${API_BASE_URL}/files/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

/**
 * Upload multiple files in parallel using Worker Threads
 * This provides significant performance improvements for batch uploads
 */
export const uploadMultipleFiles = async (
  options: BatchUploadOptions
): Promise<BatchUploadResponse> => {
  const { files, orgId, userId, userName, userEmail, folder, parallelism } = options;

  const formData = new FormData();
  
  // Append all files
  files.forEach((file) => {
    formData.append('files', file);
  });
  
  // Append metadata
  formData.append('orgId', orgId);
  formData.append('userId', userId);
  formData.append('userName', userName);
  formData.append('userEmail', userEmail);
  if (folder) {
    formData.append('folder', folder);
  }
  if (parallelism) {
    formData.append('parallelism', parallelism.toString());
  }

  const endpoint = parallelism 
    ? `${API_BASE_URL}/files/upload/parallel` 
    : `${API_BASE_URL}/files/upload/batch`;

  const response = await axios.post(endpoint, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    // Extended timeout for batch uploads
    timeout: 300000, // 5 minutes
  });

  return response.data;
};

/**
 * Upload files with automatic batching for large sets
 * Automatically splits large file sets into optimal batches
 */
export const uploadFilesWithAutoBatching = async (
  options: BatchUploadOptions
): Promise<{
  success: boolean;
  totalFiles: number;
  totalSuccessful: number;
  totalFailed: number;
  batches: BatchUploadResponse[];
}> => {
  const { files } = options;
  const BATCH_SIZE = 20; // Process 20 files at a time
  
  const batches: BatchUploadResponse[] = [];
  let totalSuccessful = 0;
  let totalFailed = 0;

  // Split files into batches
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batchFiles = files.slice(i, i + BATCH_SIZE);
    
    console.log(`Uploading batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(files.length / BATCH_SIZE)}...`);
    
    try {
      const batchResult = await uploadMultipleFiles({
        ...options,
        files: batchFiles,
      });
      
      batches.push(batchResult);
      totalSuccessful += batchResult.statistics.successful;
      totalFailed += batchResult.statistics.failed;
      
      // Call progress callback if provided
      if (options.onProgress) {
        options.onProgress({
          uploaded: totalSuccessful,
          total: files.length,
        });
      }
    } catch (error) {
      console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, error);
      totalFailed += batchFiles.length;
    }
  }

  return {
    success: true,
    totalFiles: files.length,
    totalSuccessful,
    totalFailed,
    batches,
  };
};

/**
 * Get worker pool statistics
 */
export const getWorkerPoolStats = async () => {
  const response = await axios.get(`${API_BASE_URL}/files/worker-pool/stats`);
  return response.data;
};

/**
 * Create a folder
 */
export const createFolder = async (
  folderName: string,
  orgId: string,
  userId: string,
  userName: string,
  userEmail: string,
  parentFolder: string = '/'
) => {
  const response = await axios.post(`${API_BASE_URL}/files/folder`, {
    folderName,
    orgId,
    userId,
    userName,
    userEmail,
    parentFolder,
  });
  return response.data;
};

/**
 * Get organization files
 */
export const getOrganizationFiles = async (
  orgId: string,
  folder: string = '/',
  page: number = 1,
  limit: number = 50
): Promise<{ files: FileMetadata[]; pagination: any }> => {
  const response = await axios.get(`${API_BASE_URL}/files/org/${orgId}`, {
    params: { folder, page, limit },
  });

  return response.data;
};

/**
 * Get storage information for organization
 */
export const getStorageInfo = async (orgId: string): Promise<StorageInfo> => {
  const response = await axios.get(`${API_BASE_URL}/files/storage/${orgId}`);
  return response.data.storage;
};

/**
 * Get download URL for a file
 */
export const getFileDownloadUrl = async (
  fileId: string,
  orgId: string
): Promise<string> => {
  const response = await axios.get(`${API_BASE_URL}/files/${fileId}/download`, {
    params: { orgId },
  });

  return response.data.downloadUrl;
};

/**
 * Delete a file
 */
export const deleteFile = async (
  fileId: string,
  orgId: string,
  userId: string
): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/files/${fileId}`, {
    params: { orgId, userId },
  });
};

/**
 * Bulk delete multiple files
 */
export interface BulkDeleteResponse {
  success: boolean;
  message: string;
  statistics: {
    totalRequested: number;
    successful: number;
    failed: number;
    totalSizeFreed: number;
  };
  deletedFiles: Array<{
    fileId: string;
    fileName: string;
    size: number;
  }>;
  errors: Array<{
    fileId: string;
    error: string;
  }>;
  storageInfo: StorageInfo;
}

export const bulkDeleteFiles = async (
  fileIds: string[],
  orgId: string,
  userId: string
): Promise<BulkDeleteResponse> => {
  const response = await axios.post<BulkDeleteResponse>(
    `${API_BASE_URL}/files/delete/bulk`,
    {
      fileIds,
      orgId,
      userId,
    }
  );
  return response.data;
};

/**
 * Delete a folder and optionally its contents
 */
export interface DeleteFolderResponse {
  success: boolean;
  message: string;
  deletedFolder: {
    fileId: string;
    folderName: string;
    path: string;
  };
  statistics: {
    totalItemsDeleted: number;
    filesDeleted: number;
    foldersDeleted: number;
    totalSizeFreed: number;
  };
  deletedItems: Array<{
    fileId: string;
    fileName: string;
    mimeType: string;
    size: number;
  }>;
  storageInfo: StorageInfo;
}

export const deleteFolder = async (
  folderId: string,
  orgId: string,
  userId: string,
  recursive: boolean = true
): Promise<DeleteFolderResponse> => {
  const response = await axios.delete<DeleteFolderResponse>(
    `${API_BASE_URL}/files/folder/${folderId}`,
    {
      params: { orgId, userId, recursive: recursive.toString() },
    }
  );
  return response.data;
};

/**
 * Format bytes to human readable size
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Get file type icon
 */
export const getFileIcon = (mimeType: string): string => {
  if (mimeType === 'application/vnd.clouddock.folder') return '📁';
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎥';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType.includes('pdf')) return '📄';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽️';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return '📦';
  return '📄';
};

/**
 * Format date to relative time
 */
export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  
  return date.toLocaleDateString();
};

