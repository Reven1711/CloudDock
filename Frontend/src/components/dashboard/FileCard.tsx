import { FileText, Download, Share2, Trash2, Star, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface FileCardProps {
  name: string;
  size: string;
  date: string;
  type: 'document' | 'image' | 'video' | 'folder';
  starred?: boolean;
}

const getFileIcon = (type: string) => {
  switch (type) {
    case 'document':
      return <FileText className="w-8 h-8 text-blue-500" />;
    case 'image':
      return <div className="w-full h-24 bg-gradient-secondary rounded-lg"></div>;
    case 'video':
      return <div className="w-full h-24 bg-gradient-primary rounded-lg"></div>;
    case 'folder':
      return <div className="w-full h-24 bg-muted rounded-lg"></div>;
    default:
      return <FileText className="w-8 h-8" />;
  }
};

export const FileCard = ({ name, size, date, type, starred = false }: FileCardProps) => {
  return (
    <div className="glass-card rounded-2xl p-4 hover-lift group cursor-pointer animate-scale-in">
      {/* File Preview */}
      <div className="mb-3 flex items-center justify-center">
        {getFileIcon(type)}
      </div>

      {/* File Info */}
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-sm truncate flex-1">{name}</h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-card">
              <DropdownMenuItem>
                <Download className="w-4 h-4 mr-2" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Star className={cn('w-4 h-4 mr-2', starred && 'fill-yellow-400 text-yellow-400')} />
                {starred ? 'Unstar' : 'Star'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{size}</span>
          <span>{date}</span>
        </div>
      </div>
    </div>
  );
};
