import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

interface PresignedUploadRequest {
  fileName: string;
  fileSize: number;
  mimeType: string;
  orgId: string;
  userId: string;
  userName: string;
  userEmail: string;
  folder?: string;
}

interface PresignedUploadResponse {
  success: boolean;
  fileId: string;
  presignedUrl: string;
  s3Key: string;
  expiresIn: number;
  message: string;
}

interface ConfirmUploadResponse {
  success: boolean;
  message: string;
  file: {
    fileId: string;
    fileName: string;
    originalName: string;
    size: number;
    mimeType: string;
    uploadedAt: string;
  };
}

/**
 * Upload large file directly to S3 (bypasses Cloud Run 32MB limit)
 * Uses presigned URLs for secure direct browser-to-S3 uploads
 * 
 * @param file - The file to upload
 * @param metadata - Upload metadata (user info, folder, etc)
 * @param onProgress - Optional callback for upload progress (0-100)
 * @returns Promise with success status and fileId
 */
export const uploadLargeFile = async (
  file: File,
  metadata: Omit<PresignedUploadRequest, 'fileName' | 'fileSize' | 'mimeType'>,
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; fileId: string }> => {
  try {
    console.log(`🚀 Starting direct S3 upload for ${file.name} (${formatBytes(file.size)})`);

    // Step 1: Get presigned URL from backend
    console.log('📝 Step 1/3: Requesting presigned URL...');
    const presignedResponse = await axios.post<PresignedUploadResponse>(
      `${API_BASE_URL}/files/upload/presigned`,
      {
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        ...metadata,
      }
    );

    const { fileId, presignedUrl } = presignedResponse.data;
    console.log(`✅ Got presigned URL (fileId: ${fileId})`);

    // Step 2: Upload directly to S3 using presigned URL
    console.log('📤 Step 2/3: Uploading to S3...');
    await axios.put(presignedUrl, file, {
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
      // Don't send auth headers to S3
      transformRequest: [(data) => data],
    });

    console.log('✅ Upload to S3 complete');

    // Step 3: Confirm upload with backend
    console.log('✔️ Step 3/3: Confirming upload...');
    const confirmResponse = await axios.post<ConfirmUploadResponse>(
      `${API_BASE_URL}/files/upload/confirm`,
      {
        fileId,
        orgId: metadata.orgId,
      }
    );

    console.log('✅ Upload confirmed:', confirmResponse.data.message);

    return { success: true, fileId };
  } catch (error) {
    console.error('❌ Direct upload failed:', error);
    
    // If we got a fileId, try to cancel the upload
    if (error && typeof error === 'object' && 'fileId' in error) {
      try {
        await axios.post(`${API_BASE_URL}/files/upload/cancel`, {
          fileId: (error as any).fileId,
          orgId: metadata.orgId,
        });
        console.log('🗑️ Cancelled incomplete upload');
      } catch (cancelError) {
        console.error('Failed to cancel upload:', cancelError);
      }
    }
    
    throw error;
  }
};

/**
 * Determine if file should use direct S3 upload
 * Use direct upload for files > 30MB to avoid Cloud Run 32MB limit
 * 
 * @param fileSize - Size of the file in bytes
 * @returns true if file should use direct S3 upload
 */
export const shouldUseDirectUpload = (fileSize: number): boolean => {
  const DIRECT_UPLOAD_THRESHOLD = 30 * 1024 * 1024; // 30 MB
  return fileSize > DIRECT_UPLOAD_THRESHOLD;
};

/**
 * Format bytes to human-readable string
 */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Get upload method description for user feedback
 */
export const getUploadMethodDescription = (fileSize: number): string => {
  if (shouldUseDirectUpload(fileSize)) {
    return 'Direct upload (large file)';
  }
  return 'Standard upload';
};

