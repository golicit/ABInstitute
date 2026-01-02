import { ReactNode, useEffect, useState } from 'react'; // ADD useState
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface PaymentGuardProps {
  children: ReactNode;
}

export default function PaymentGuard({ children }: PaymentGuardProps) {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [checkingPayment, setCheckingPayment] = useState(true);

  useEffect(() => {
    const checkPaymentRequirement = async () => {
      if (!user) {
        navigate('/auth');
        return;
      }

      try {
        const token = localStorage.getItem('token');
        const isPaid = localStorage.getItem('is_paid') === 'true';

        if (isPaid) {
          setCheckingPayment(false);
          return;
        }

        // Check with backend
        const response = await fetch('/api/payment/status', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (data.isPaid) {
          localStorage.setItem('is_paid', 'true');
          setCheckingPayment(false);
        } else {
          navigate('/payment');
        }
      } catch (error) {
        console.error('Payment check failed:', error);
        navigate('/payment');
      } finally {
        setCheckingPayment(false);
      }
    };

    if (!loading && user) {
      checkPaymentRequirement();
    }
  }, [user, loading, navigate]);

  if (loading || checkingPayment) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin' />
      </div>
    );
  }

  return <>{children}</>;
}
