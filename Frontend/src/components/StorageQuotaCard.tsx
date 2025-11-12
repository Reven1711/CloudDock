import { useEffect, useState } from 'react';
import { HardDrive, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getStorageInfo, formatFileSize, StorageInfo } from '@/services/fileService';
import { Skeleton } from '@/components/ui/skeleton';

interface StorageQuotaCardProps {
  orgId: string;
  onStorageUpdate?: (storage: StorageInfo) => void;
}

export const StorageQuotaCard = ({ orgId, onStorageUpdate }: StorageQuotaCardProps) => {
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStorage = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getStorageInfo(orgId);
      setStorage(data);
      if (onStorageUpdate) {
        onStorageUpdate(data);
      }
    } catch (err: any) {
      console.error('Failed to fetch storage info:', err);
      setError(err.message || 'Failed to load storage information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orgId) {
      fetchStorage();
    }
  }, [orgId]);

  if (loading) {
    return (
      <Card className="glass-card border-primary/20">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !storage) {
    return (
      <Card className="glass-card border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Storage
          </CardTitle>
          <CardDescription>Failed to load storage information</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const usagePercentage = storage.usagePercentage;
  const isNearLimit = usagePercentage >= 80;
  const isAtLimit = storage.isQuotaExceeded;

  return (
    <Card className="glass-card border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="w-5 h-5" />
          Storage Usage
        </CardTitle>
        <CardDescription>
          {storage.isPaidPlan ? 'Paid Plan' : 'Free Plan - 1GB included'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Usage Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {formatFileSize(storage.usedStorage)} of {formatFileSize(storage.totalQuota)} used
            </span>
            <span className={`font-semibold ${
              isAtLimit ? 'text-red-500' : 
              isNearLimit ? 'text-yellow-500' : 
              'text-green-500'
            }`}>
              {usagePercentage.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-primary/10 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                isAtLimit ? 'bg-red-500' :
                isNearLimit ? 'bg-yellow-500' :
                'bg-gradient-primary'
              }`}
              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Storage Stats */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Files Stored</p>
            <p className="text-2xl font-bold">{storage.fileCount}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Available</p>
            <p className="text-2xl font-bold">
              {formatFileSize(storage.availableStorage)}
            </p>
          </div>
        </div>

        {/* Warning Messages */}
        {isAtLimit && (
          <div className="glass-card bg-red-500/10 border-red-500/20 p-3 rounded-lg">
            <p className="text-sm text-red-500 font-medium">
              ⚠️ Storage quota exceeded! 
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Please delete some files or upgrade to a paid plan.
            </p>
          </div>
        )}

        {isNearLimit && !isAtLimit && (
          <div className="glass-card bg-yellow-500/10 border-yellow-500/20 p-3 rounded-lg">
            <p className="text-sm text-yellow-600 font-medium">
              Storage limit approaching
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Consider upgrading to increase your storage capacity.
            </p>
          </div>
        )}

        {/* Upgrade CTA (if free plan) */}
        {!storage.isPaidPlan && usagePercentage > 50 && (
          <button
            className="w-full glass-card border-primary/20 hover:border-primary/40 p-3 rounded-lg transition-colors text-left"
            onClick={() => {
              // TODO: Implement upgrade flow
              console.log('Upgrade clicked');
            }}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium">Need more space?</p>
                <p className="text-xs text-muted-foreground">Upgrade to get additional storage</p>
              </div>
            </div>
          </button>
        )}
      </CardContent>
    </Card>
  );
};

