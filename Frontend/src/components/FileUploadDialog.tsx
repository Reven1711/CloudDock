import { useState } from 'react';
import { Upload, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
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
import { uploadFile, formatFileSize } from '@/services/fileService';
import { useToast } from '@/hooks/use-toast';

interface FileUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: () => void;
  currentFolder?: string;
}

export const FileUploadDialog = ({ isOpen, onClose, onUploadSuccess, currentFolder = '/' }: FileUploadDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 100MB)
      if (file.size > 100 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Maximum file size is 100 MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      setUploadStatus('idle');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !user) return;

    setUploading(true);
    setUploadStatus('uploading');
    setUploadProgress(0);

    // Simulate progress (since axios doesn't provide real progress for multipart)
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const response = await uploadFile({
        file: selectedFile,
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
        description: `${selectedFile.name} has been uploaded successfully.`,
      });

      // Call success callback
      if (onUploadSuccess) {
        onUploadSuccess();
      }

      // Close dialog after a short delay
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (error: any) {
      clearInterval(progressInterval);
      setUploadStatus('error');
      
      const errorMessage = error.response?.data?.error || error.message || 'Failed to upload file';
      
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
    setSelectedFile(null);
    setUploadProgress(0);
    setUploadStatus('idle');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="glass-card border-primary/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload File
          </DialogTitle>
          <DialogDescription>
            Select a file to upload to your organization's storage. Maximum size: 100 MB.
            {currentFolder === '/' ? (
              <span className="block mt-1">Uploading to: <strong>Root folder</strong></span>
            ) : (
              <span className="block mt-1">Uploading to: <strong>{currentFolder}</strong></span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Selection */}
          {!selectedFile && (
            <div className="border-2 border-dashed border-primary/20 rounded-lg p-8 text-center hover:border-primary/40 transition-colors">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileSelect}
                disabled={uploading}
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="w-12 h-12 text-primary/50" />
                <p className="text-sm font-medium">Click to select a file</p>
                <p className="text-xs text-muted-foreground">Maximum size: 100 MB</p>
              </label>
            </div>
          )}

          {/* Selected File */}
          {selectedFile && uploadStatus !== 'success' && (
            <div className="glass-card border-primary/20 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="text-2xl">📄</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                </div>
                {!uploading && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedFile(null)}
                    className="ml-2"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Upload Progress */}
              {uploading && (
                <div className="mt-4 space-y-2">
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
              {uploadStatus === 'error' && (
                <div className="mt-4 flex items-center gap-2 text-red-500">
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
              <p className="font-medium text-green-500">Upload Successful!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your file has been uploaded and is being scanned for viruses.
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
                disabled={!selectedFile || uploading}
                className="bg-gradient-primary text-white"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
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

