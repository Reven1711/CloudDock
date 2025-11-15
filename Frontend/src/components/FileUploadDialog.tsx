import { useState } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Loader2, Files } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { uploadFile, uploadMultipleFiles, formatFileSize } from '@/services/fileService';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface FileUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: () => void;
  currentFolder?: string;
}

interface FileUploadState {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export const FileUploadDialog = ({ isOpen, onClose, onUploadSuccess, currentFolder = '/' }: FileUploadDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [batchMode, setBatchMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadStats, setUploadStats] = useState<{ successful: number; failed: number; processingTime: string } | null>(null);
  const [fileStates, setFileStates] = useState<FileUploadState[]>([]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const fileList = Array.from(files);
    const validFiles: File[] = [];

    // Validate files
    for (const file of fileList) {
      if (file.size > 100 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 100 MB limit`,
          variant: "destructive",
        });
        continue;
      }
      validFiles.push(file);
    }

    const filesToSet = batchMode ? validFiles : validFiles.slice(0, 1);
    setSelectedFiles(filesToSet);
    setUploadStatus('idle');
    setUploadStats(null);
    
    // Initialize file states for batch mode
    if (batchMode && validFiles.length > 0) {
      setFileStates(filesToSet.map(file => ({
        file,
        progress: 0,
        status: 'pending'
      })));
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !user) return;

    setUploading(true);
    setUploadStatus('uploading');
    setUploadProgress(0);

    try {
      if (batchMode && selectedFiles.length > 1) {
        // Batch upload using worker threads with individual file progress
        console.log(`🚀 Starting batch upload of ${selectedFiles.length} files...`);
        
        // Initialize all files as uploading
        setFileStates(selectedFiles.map(file => ({
          file,
          progress: 0,
          status: 'uploading'
        })));
        
        // Simulate progress for each file (since we can't get real per-file progress from backend yet)
        const progressInterval = setInterval(() => {
          setFileStates(prev => prev.map(state => 
            state.status === 'uploading' && state.progress < 90
              ? { ...state, progress: state.progress + 10 }
              : state
          ));
        }, 300);
        
        const result = await uploadMultipleFiles({
          files: selectedFiles,
          orgId: user.tenantId,
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          folder: currentFolder,
        });

        clearInterval(progressInterval);
        
        // Update file states based on results
        setFileStates(prev => prev.map(state => {
          const uploadedFile = result.uploadedFiles.find(f => f.originalName === state.file.name);
          const errorFile = result.errors.find(e => e.fileName === state.file.name);
          
          if (uploadedFile) {
            return { ...state, progress: 100, status: 'success' };
          } else if (errorFile) {
            return { ...state, progress: 0, status: 'error', error: errorFile.error };
          }
          return state;
        }));

        setUploadProgress(100);
        setUploadStatus('success');
        setUploadStats({
          successful: result.statistics.successful,
          failed: result.statistics.failed,
          processingTime: result.statistics.processingTime,
        });

        toast({
          title: "Batch upload complete! 🎉",
          description: `Uploaded ${result.statistics.successful}/${result.statistics.totalFiles} files in ${result.statistics.processingTime}`,
        });

        if (result.errors.length > 0) {
          console.error('Upload errors:', result.errors);
        }
      } else {
        // Single file upload
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => Math.min(prev + 10, 90));
        }, 200);

        await uploadFile({
          file: selectedFiles[0],
          orgId: user.tenantId,
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          folder: currentFolder,
        });

        clearInterval(progressInterval);
        setUploadProgress(100);
        setUploadStatus('success');

        toast({
          title: "Upload successful!",
          description: `${selectedFiles[0].name} has been uploaded successfully.`,
        });
      }

      // Call success callback
      if (onUploadSuccess) {
        onUploadSuccess();
      }

      // Close dialog after a short delay
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error: any) {
      setUploadStatus('error');
      
      // Mark all files as error in batch mode
      if (batchMode && selectedFiles.length > 1) {
        setFileStates(prev => prev.map(state => ({
          ...state,
          status: 'error',
          error: 'Upload failed'
        })));
      }
      
      const errorMessage = error.response?.data?.error || error.message || 'Failed to upload files';
      
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFiles([]);
    setUploadProgress(0);
    setUploadStatus('idle');
    setUploadStats(null);
    setFileStates([]);
    onClose();
  };

  const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="glass-card border-primary/20 max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {batchMode ? <Files className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
            {batchMode ? 'Batch Upload (Worker Threads)' : 'Upload File'}
          </DialogTitle>
          <DialogDescription>
            {batchMode ? 'Upload multiple files in parallel using Worker Threads for optimal performance. Maximum 100 files, 100 MB each.' : 'Select a file to upload. Maximum size: 100 MB.'}
            {currentFolder === '/' ? (
              <span className="block mt-1">Uploading to: <strong>Root folder</strong></span>
            ) : (
              <span className="block mt-1">Uploading to: <strong>{currentFolder}</strong></span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Batch Mode Toggle */}
          <div className="flex items-center justify-between glass-card border-primary/20 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <Files className="w-4 h-4" />
              <Label htmlFor="batch-mode" className="cursor-pointer">
                Batch Upload (Parallel Processing)
              </Label>
            </div>
            <Switch
              id="batch-mode"
              checked={batchMode}
              onCheckedChange={(checked) => {
                setBatchMode(checked);
                setSelectedFiles([]);
              }}
              disabled={uploading}
            />
          </div>

          {/* File Selection */}
          {selectedFiles.length === 0 && (
            <div className="border-2 border-dashed border-primary/20 rounded-lg p-8 text-center hover:border-primary/40 transition-colors">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileSelect}
                disabled={uploading}
                multiple={batchMode}
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                {batchMode ? <Files className="w-12 h-12 text-primary/50" /> : <Upload className="w-12 h-12 text-primary/50" />}
                <p className="text-sm font-medium">
                  {batchMode ? 'Click to select multiple files' : 'Click to select a file'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {batchMode ? 'Maximum 100 files, 100 MB each' : 'Maximum size: 100 MB'}
                </p>
              </label>
            </div>
          )}

          {/* Selected Files List */}
          {selectedFiles.length > 0 && uploadStatus !== 'success' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{selectedFiles.length} file(s) selected</span>
                <span className="text-muted-foreground">Total: {formatFileSize(totalSize)}</span>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {batchMode && uploading && fileStates.length > 0 ? (
                  // Show individual progress for each file in batch mode
                  fileStates.map((fileState, index) => (
                    <div key={index} className="glass-card border-primary/20 p-3 rounded-lg">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="text-xl">
                              {fileState.status === 'success' ? '✅' : 
                               fileState.status === 'error' ? '❌' : 
                               fileState.status === 'uploading' ? '⏳' : '📄'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate text-sm">{fileState.file.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(fileState.file.size)}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-medium ml-2">
                            {fileState.status === 'success' ? 'Done' :
                             fileState.status === 'error' ? 'Failed' :
                             `${fileState.progress}%`}
                          </span>
                        </div>
                        {fileState.status === 'uploading' && (
                          <div className="w-full bg-primary/10 rounded-full h-1.5">
                            <div
                              className="bg-gradient-primary h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${fileState.progress}%` }}
                            />
                          </div>
                        )}
                        {fileState.status === 'error' && fileState.error && (
                          <p className="text-xs text-red-500">{fileState.error}</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  // Show regular file list when not uploading
                  selectedFiles.map((file, index) => (
                    <div key={index} className="glass-card border-primary/20 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="text-xl">📄</div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate text-sm">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>
                        {!uploading && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFile(index)}
                            className="ml-2 h-8 w-8"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Overall Upload Progress (for single file mode) */}
              {uploading && !batchMode && (
                <div className="mt-4 space-y-2 glass-card border-primary/20 p-4 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Uploading...</span>
                    <span className="font-medium">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-primary/10 rounded-full h-2">
                    <div
                      className="bg-gradient-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Error State */}
              {uploadStatus === 'error' && !batchMode && (
                <div className="mt-4 flex items-center gap-2 text-red-500 glass-card border-red-500/20 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Upload failed. Please try again.</span>
                </div>
              )}
            </div>
          )}

          {/* Success State */}
          {uploadStatus === 'success' && (
            <div className="glass-card border-green-500/20 bg-green-500/10 p-6 rounded-lg text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="font-medium text-green-500 text-lg">Upload Successful!</p>
              {uploadStats && (
                <div className="mt-3 space-y-1">
                  <p className="text-sm text-muted-foreground">
                    ✅ Successful: {uploadStats.successful} | ❌ Failed: {uploadStats.failed}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ⚡ Processing time: {uploadStats.processingTime}
                  </p>
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                {batchMode && uploadStats ? 
                  'All files have been uploaded successfully.' : 
                  'Your file has been uploaded successfully.'}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          {uploadStatus !== 'success' && (
            <>
              <Button variant="outline" onClick={handleClose} disabled={uploading}>
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={selectedFiles.length === 0 || uploading}
                className="bg-gradient-primary text-white"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {batchMode && selectedFiles.length > 1 ? 'Processing...' : 'Uploading...'}
                  </>
                ) : (
                  <>
                    {batchMode ? <Files className="w-4 h-4 mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                    Upload {selectedFiles.length > 0 && `(${selectedFiles.length})`}
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

