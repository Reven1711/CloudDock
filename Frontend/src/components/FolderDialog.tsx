import { useState } from 'react';
import { FolderPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { createFolder } from '@/services/fileService';

interface FolderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSuccess?: (folderName: string) => void;
  currentFolder?: string;
}

export const FolderDialog = ({ isOpen, onClose, onCreateSuccess, currentFolder = '/' }: FolderDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [folderName, setFolderName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!folderName.trim()) {
      toast({
        title: "Folder name required",
        description: "Please enter a name for the folder",
        variant: "destructive",
      });
      return;
    }

    // Validate folder name
    const invalidChars = /[<>:"/\\|?*]/g;
    if (invalidChars.test(folderName)) {
      toast({
        title: "Invalid folder name",
        description: "Folder name cannot contain: < > : \" / \\ | ? *",
        variant: "destructive",
      });
      return;
    }

    if (!user?.tenantId || !user?.id || !user?.name || !user?.email) {
      toast({
        title: "Authentication error",
        description: "Please log in to create folders",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);

    try {
      const response = await createFolder(
        folderName,
        user.tenantId,
        user.id,
        user.name,
        user.email,
        currentFolder
      );

      toast({
        title: "Folder created!",
        description: `"${folderName}" has been created successfully.`,
      });

      if (onCreateSuccess) {
        onCreateSuccess(folderName);
      }

      handleClose();
    } catch (error: any) {
      console.error('Folder creation error:', error);
      toast({
        title: "Failed to create folder",
        description: error.response?.data?.error || error.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setFolderName('');
    setCreating(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="glass-card border-primary/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5" />
            Create New Folder
          </DialogTitle>
          <DialogDescription>
            Enter a name for your new folder. You can upload files into this folder later.
            {currentFolder === '/' ? (
              <span className="block mt-1">Creating in: <strong>Root folder</strong></span>
            ) : (
              <span className="block mt-1">Creating in: <strong>{currentFolder}</strong></span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder Name</Label>
            <Input
              id="folder-name"
              placeholder="e.g., Documents, Projects, Images"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !creating) {
                  handleCreate();
                }
              }}
              disabled={creating}
              className="glass-card border-primary/20"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Avoid using special characters: {'< > : " / \\ | ? *'}
            </p>
          </div>

          {/* Folder Preview */}
          {folderName && (
            <div className="glass-card border-primary/20 p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="text-4xl">📁</div>
                <div>
                  <p className="font-medium">{folderName}</p>
                  <p className="text-xs text-muted-foreground">New folder</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={creating}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!folderName.trim() || creating}
            className="bg-gradient-primary text-white"
          >
            {creating ? (
              <>
                <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Creating...
              </>
            ) : (
              <>
                <FolderPlus className="w-4 h-4 mr-2" />
                Create Folder
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

