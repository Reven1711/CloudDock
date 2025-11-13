import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { completePayment } from '@/services/billingService';
import { useToast } from '@/hooks/use-toast';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    
    console.log('🎉 Payment Success Page Loaded');
    console.log('📋 Session ID:', sessionId);
    
    if (sessionId) {
      handlePaymentCompletion(sessionId);
    } else {
      console.error('❌ No session ID in URL');
      toast({
        title: "Error",
        description: "Payment session not found. Redirecting...",
        variant: "destructive",
      });
      setTimeout(() => navigate('/admin/dashboard'), 2000);
    }
  }, [searchParams, navigate]);

  const handlePaymentCompletion = async (sessionId: string) => {
    try {
      console.log('💳 Completing payment...');
      const result = await completePayment(sessionId);
      
      if (result.success) {
        toast({
          title: "Payment Successful! 🎉",
          description: `${result.storageAdded} GB has been added to your storage quota.`,
        });
        
        console.log('✅ Payment completed successfully');
        console.log('📊 Storage added:', result.storageAdded, 'GB');
        console.log('📊 New quota:', result.newQuotaGB, 'GB');
        
        // Redirect to admin dashboard after 2 seconds
        setTimeout(() => {
          navigate('/admin/dashboard');
        }, 2000);
      }
    } catch (error: any) {
      console.error('❌ Payment completion error:', error);
      toast({
        title: "Payment Processing Error",
        description: error.response?.data?.error || "Could not complete payment. Please contact support.",
        variant: "destructive",
      });
      
      // Still redirect to dashboard after error
      setTimeout(() => navigate('/admin/dashboard'), 3000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 p-8 glass-card rounded-lg border-primary/20 max-w-md">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
        <h1 className="text-2xl font-bold">Processing Payment...</h1>
        <p className="text-muted-foreground">
          Please wait while we confirm your payment and update your storage quota.
        </p>
      </div>
    </div>
  );
};

export default PaymentSuccess;

