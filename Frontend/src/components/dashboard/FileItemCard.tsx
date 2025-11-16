import { Download, Trash2, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FileMetadata, formatFileSize, getFileIcon, formatRelativeTime } from '@/services/fileService';

interface FileItemCardProps {
  file: FileMetadata;
  viewMode: 'large-icons' | 'list' | 'details' | 'tiles';
  isSelectionMode: boolean;
  isSelected: boolean;
  onSelect: (fileId: string) => void;
  onFolderClick: (file: FileMetadata) => void;
  onDownload: (fileId: string, fileName: string) => void;
  onDelete: (fileId: string, fileName: string) => void;
  onFolderDelete: (fileId: string, folderName: string) => void;
  animationDelay: number;
}

export const FileItemCard = ({
  file,
  viewMode,
  isSelectionMode,
  isSelected,
  onSelect,
  onFolderClick,
  onDownload,
  onDelete,
  onFolderDelete,
  animationDelay,
}: FileItemCardProps) => {
  const isFolder = file.mimeType === 'application/vnd.clouddock.folder';

  const handleClick = (e: React.MouseEvent) => {
    if (isSelectionMode) {
      e.stopPropagation();
      onSelect(file.fileId);
    } else if (isFolder) {
      onFolderClick(file);
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(file.fileId);
  };

  // Large Icons View
  if (viewMode === 'large-icons') {
    return (
      <div
        className={`glass-card border-primary/20 p-6 rounded-lg hover:scale-105 transition-transform animate-scale-in group relative ${
          isFolder && !isSelectionMode ? 'cursor-pointer' : ''
        } ${isSelected ? 'ring-2 ring-primary' : ''}`}
        style={{ animationDelay: `${animationDelay}ms` }}
        onClick={handleClick}
      >
        {/* Checkbox for selection mode */}
        {isSelectionMode && (
          <div
            className="absolute top-3 left-3 z-10 cursor-pointer"
            onClick={handleCheckboxClick}
          >
            {isSelected ? (
              <CheckSquare className="w-5 h-5 text-primary" />
            ) : (
              <Square className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        )}

        <div className="flex flex-col items-center text-center space-y-3">
          <div className="text-6xl">{getFileIcon(file.mimeType)}</div>
          <div className="w-full">
            <h4 className="font-semibold truncate">{file.originalName}</h4>
            <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
            <p className="text-xs text-muted-foreground">{formatRelativeTime(file.uploadedAt)}</p>
          </div>

          {/* Action Buttons */}
          {!isSelectionMode && (
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {!isFolder ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownload(file.fileId, file.originalName);
                    }}
                  >
                    <Download className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(file.fileId, file.originalName);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFolderDelete(file.fileId, file.originalName);
                  }}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete Folder
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // List View
  if (viewMode === 'list') {
    return (
      <div
        className={`glass-card border-primary/20 p-3 rounded-lg flex items-center gap-4 hover:bg-primary/5 transition-colors animate-scale-in group ${
          isFolder && !isSelectionMode ? 'cursor-pointer' : ''
        } ${isSelected ? 'ring-2 ring-primary' : ''}`}
        style={{ animationDelay: `${animationDelay}ms` }}
        onClick={handleClick}
      >
        {/* Checkbox */}
        {isSelectionMode && (
          <div className="cursor-pointer" onClick={handleCheckboxClick}>
            {isSelected ? (
              <CheckSquare className="w-5 h-5 text-primary" />
            ) : (
              <Square className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        )}

        <div className="text-2xl">{getFileIcon(file.mimeType)}</div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium truncate">{file.originalName}</h4>
        </div>
        <div className="text-sm text-muted-foreground">{formatFileSize(file.size)}</div>
        <div className="text-sm text-muted-foreground w-24">{formatRelativeTime(file.uploadedAt)}</div>

        {!isSelectionMode && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!isFolder ? (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(file.fileId, file.originalName);
                  }}
                >
                  <Download className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(file.fileId, file.originalName);
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onFolderDelete(file.fileId, file.originalName);
                }}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Details View (Table Row)
  if (viewMode === 'details') {
    return (
      <tr
        className={`border-b border-primary/10 hover:bg-primary/5 transition-colors animate-scale-in ${
          isFolder && !isSelectionMode ? 'cursor-pointer' : ''
        } ${isSelected ? 'bg-primary/10' : ''}`}
        style={{ animationDelay: `${animationDelay}ms` }}
        onClick={handleClick}
      >
        {/* Checkbox Column */}
        {isSelectionMode && (
          <td className="p-3" onClick={handleCheckboxClick}>
            {isSelected ? (
              <CheckSquare className="w-5 h-5 text-primary cursor-pointer" />
            ) : (
              <Square className="w-5 h-5 text-muted-foreground cursor-pointer" />
            )}
          </td>
        )}

        <td className="p-3 flex items-center gap-3">
          <span className="text-xl">{getFileIcon(file.mimeType)}</span>
          <span className="font-medium">{file.originalName}</span>
        </td>
        <td className="p-3 text-sm text-muted-foreground">{formatFileSize(file.size)}</td>
        <td className="p-3 text-sm text-muted-foreground">{formatRelativeTime(file.uploadedAt)}</td>
        {!isSelectionMode && (
          <td className="p-3">
            {!isFolder ? (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(file.fileId, file.originalName);
                  }}
                >
                  <Download className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(file.fileId, file.originalName);
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onFolderDelete(file.fileId, file.originalName);
                }}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Delete
              </Button>
            )}
          </td>
        )}
      </tr>
    );
  }

  // Tiles View
  return (
    <div
      className={`glass-card border-primary/20 p-4 rounded-lg hover:shadow-lg transition-shadow animate-scale-in group relative ${
        isFolder && !isSelectionMode ? 'cursor-pointer' : ''
      } ${isSelected ? 'ring-2 ring-primary' : ''}`}
      style={{ animationDelay: `${animationDelay}ms` }}
      onClick={handleClick}
    >
      {/* Checkbox */}
      {isSelectionMode && (
        <div
          className="absolute top-2 left-2 z-10 cursor-pointer"
          onClick={handleCheckboxClick}
        >
          {isSelected ? (
            <CheckSquare className="w-5 h-5 text-primary" />
          ) : (
            <Square className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      )}

      <div className="text-4xl mb-3">{getFileIcon(file.mimeType)}</div>
      <h4 className="font-semibold text-sm truncate mb-1">{file.originalName}</h4>
      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
      <p className="text-xs text-muted-foreground">{formatRelativeTime(file.uploadedAt)}</p>

      {!isSelectionMode && (
        <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isFolder ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload(file.fileId, file.originalName);
                }}
              >
                <Download className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(file.fileId, file.originalName);
                }}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onFolderDelete(file.fileId, file.originalName);
              }}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

