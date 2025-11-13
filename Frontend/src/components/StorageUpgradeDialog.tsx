import { useState } from 'react';
import { CreditCard, Package, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { createStorageCheckoutSession, calculateStoragePrice } from '@/services/billingService';

interface StorageUpgradeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  currentQuota: number;
}

const STORAGE_OPTIONS = [
  { value: 10, label: '10 GB' },
  { value: 25, label: '25 GB' },
  { value: 50, label: '50 GB' },
  { value: 100, label: '100 GB' },
  { value: 250, label: '250 GB' },
  { value: 500, label: '500 GB' },
];

export const StorageUpgradeDialog = ({
  isOpen,
  onClose,
  orgId,
  currentQuota,
}: StorageUpgradeDialogProps) => {
  const { toast } = useToast();
  const [selectedStorage, setSelectedStorage] = useState<number>(50);
  const [customStorage, setCustomStorage] = useState<string>('');
  const [useCustom, setUseCustom] = useState(false);
  const [processing, setProcessing] = useState(false);

  const storageAmount = useCustom ? parseInt(customStorage) || 0 : selectedStorage;
  const price = calculateStoragePrice(storageAmount);
  const newQuota = currentQuota + storageAmount;

  const handleClose = () => {
    setSelectedStorage(50);
    setCustomStorage('');
    setUseCustom(false);
    setProcessing(false);
    onClose();
  };

  const handleCheckout = async () => {
    const MINIMUM_STORAGE_GB = 3;
    
    if (storageAmount <= 0) {
      toast({
        title: 'Invalid storage amount',
        description: 'Please select or enter a valid storage amount',
        variant: 'destructive',
      });
      return;
    }

    if (storageAmount < MINIMUM_STORAGE_GB) {
      toast({
        title: 'Storage amount too small',
        description: `Minimum storage purchase is ${MINIMUM_STORAGE_GB} GB`,
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);

    try {
      const response = await createStorageCheckoutSession(orgId, storageAmount);

      if (response.success && response.sessionUrl) {
        // Redirect to Stripe Checkout
        window.location.href = response.sessionUrl;
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast({
        title: 'Checkout failed',
        description: error.response?.data?.error || error.message || 'An error occurred',
        variant: 'destructive',
      });
      setProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] glass-card border-primary/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Upgrade Storage
          </DialogTitle>
          <DialogDescription>
            Add more storage to your organization. Storage is billed monthly at $0.20 per GB.
            <br />
            <span className="text-xs text-muted-foreground">Minimum purchase: 3 GB ($0.60)</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Storage Info */}
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-sm text-muted-foreground">Current Storage Quota</p>
            <p className="text-2xl font-bold">{currentQuota} GB</p>
          </div>

          {/* Storage Selection */}
          <div className="space-y-3">
            <Label>Select Storage Amount</Label>
            <div className="grid grid-cols-3 gap-2">
              {STORAGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setSelectedStorage(option.value);
                    setUseCustom(false);
                  }}
                  disabled={processing}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    !useCustom && selectedStorage === option.value
                      ? 'border-primary bg-primary/20 font-bold'
                      : 'border-primary/20 hover:border-primary/40'
                  } ${processing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="text-lg font-semibold">{option.label}</div>
                  <div className="text-xs text-muted-foreground">
                    ${calculateStoragePrice(option.value).toFixed(2)}/mo
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          <div className="space-y-2">
            <Label htmlFor="custom-storage">Or Enter Custom Amount (GB)</Label>
            <input
              id="custom-storage"
              type="number"
              min="1"
              max="10000"
              value={customStorage}
              onChange={(e) => {
                setCustomStorage(e.target.value);
                setUseCustom(!!e.target.value);
              }}
              placeholder="Enter GB amount"
              disabled={processing}
              className="w-full px-3 py-2 rounded-lg border border-primary/20 bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
          </div>

          {/* Summary */}
          {storageAmount > 0 && (
            <div className="p-4 rounded-lg border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-secondary/10">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Storage to add:</span>
                  <span className="font-semibold">{storageAmount} GB</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Monthly cost:</span>
                  <span className="font-semibold">${price.toFixed(2)}</span>
                </div>
                <div className="border-t border-primary/20 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="font-semibold">New Total Quota:</span>
                    <span className="text-xl font-bold text-primary">{newQuota} GB</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={processing}>
            Cancel
          </Button>
          <Button
            onClick={handleCheckout}
            disabled={processing || storageAmount <= 0}
            className="gap-2"
          >
            {processing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                Proceed to Checkout
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

