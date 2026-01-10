import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface CheckPaymentResponse {
  success: boolean;
  isPaid: boolean;
  message?: string;
}

interface CreateOrderResponse {
  success: boolean;
  orderId: string;
  amount: number;
  currency: string;
  key?: string;
  message?: string;
}

interface VerifyPaymentResponse {
  success: boolean;
  message?: string;
  paymentId?: string;
  isPaidUser?: boolean;
}

// Get API URL from environment or use default
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export default function Payment() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const razorpayLoaded = useRef(false);

  // Clear auth data and redirect to login
  const clearAuthAndRedirect = () => {
    console.log('Clearing auth data and redirecting to login...');
    localStorage.removeItem('token');
    localStorage.removeItem('is_paid');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_id');
    navigate('/auth');
  };

  // Load Razorpay script
  useEffect(() => {
    // First check localStorage immediately
    const isPaid = localStorage.getItem('is_paid') === 'true';
    if (isPaid) {
      navigate('/dashboard');
      return;
    }

    // Check if Razorpay is already loaded globally
    if (window.Razorpay) {
      razorpayLoaded.current = true;
      checkPaymentStatus();
      return;
    }

    if (razorpayLoaded.current) return;

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      console.log('Razorpay SDK loaded successfully');
      razorpayLoaded.current = true;
      checkPaymentStatus();
    };
    script.onerror = (error) => {
      console.error('Failed to load Razorpay SDK:', error);
      setError(
        'Failed to load payment SDK. Please refresh the page or check your internet connection.'
      );
      setLoading(false);
    };

    document.body.appendChild(script);

    return () => {
      // Cleanup only if we're the one who added it
      if (script.parentNode && !window.Razorpay) {
        document.body.removeChild(script);
      }
    };
  }, [navigate]);

  const checkPaymentStatus = async () => {
    console.log('Checking payment status...');
    console.log('API URL:', API_URL);

    try {
      const token = localStorage.getItem('token');
      console.log('Token from localStorage:', token ? 'Present' : 'MISSING');

      if (!token) {
        console.log('No token found, redirecting to auth');
        clearAuthAndRedirect();
        return;
      }

      // DEBUG: Log the token (first 20 chars)
      console.log('Token (first 20 chars):', token.substring(0, 20) + '...');

      const res = await axios.get<CheckPaymentResponse>(
        `${API_URL}/api/payment/status`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Debug': 'true',
          },
          timeout: 10000,
        }
      );

      console.log('Payment status response:', res.data);

      if (res.data.success && res.data.isPaid) {
        console.log('Payment already completed, redirecting to dashboard');
        localStorage.setItem('is_paid', 'true');
        navigate('/dashboard', { replace: true });
      } else {
        console.log('Payment not completed, showing payment page');
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Payment status check failed:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        statusText: err.response?.statusText,
      });

      // Handle 401 Unauthorized
      if (err.response?.status === 401) {
        console.error('Token is invalid or expired!');
        setError('Your session has expired. Please log in again.');

        // Clear invalid token and redirect after 2 seconds
        setTimeout(() => {
          clearAuthAndRedirect();
        }, 2000);
      }
      // Handle network errors
      else if (err.code === 'ERR_NETWORK') {
        setError(
          `Cannot connect to server at ${API_URL}. Please check if the server is running.`
        );
      }
      // Handle other errors
      else {
        setError(
          err.response?.data?.message ||
            'Unable to check payment status. Please try again.'
        );
      }

      setLoading(false);
    }
  };

  const startPayment = async () => {
    console.log('Starting payment process...');
    console.log('API URL:', API_URL);
    setProcessing(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        clearAuthAndRedirect();
        return;
      }

      // Create order
      console.log('Creating order...');
      const orderRes = await axios.post<CreateOrderResponse>(
        `${API_URL}/api/payment/create-order`,
        {}, // Empty body since amount is fixed
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      console.log('Order created:', orderRes.data);

      if (!orderRes.data.success) {
        throw new Error(orderRes.data.message || 'Failed to create order');
      }

      // Get Razorpay key from environment or response
      const razorpayKey =
        orderRes.data.key || import.meta.env.VITE_RAZORPAY_KEY_ID;

      if (!razorpayKey) {
        throw new Error(
          'Razorpay key not configured. Please check your environment variables.'
        );
      }

      if (!orderRes.data.orderId) {
        throw new Error('Order ID not received from server');
      }

      const options = {
        key: razorpayKey,
        amount: orderRes.data.amount,
        currency: orderRes.data.currency || 'INR',
        order_id: orderRes.data.orderId,
        name: 'AB Institute',
        description: 'Course Enrollment Fee',
        prefill: {
          name: localStorage.getItem('user_name') || '',
          email: localStorage.getItem('user_email') || '',
        },
        theme: {
          color: '#2563eb',
        },
        handler: async (response: any) => {
          console.log('Payment successful, verifying...', response);
          try {
            // Verify payment
            const verifyRes = await axios.post<VerifyPaymentResponse>(
              `${API_URL}/api/payment/verify`,
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                timeout: 15000,
              }
            );

            console.log('Verification response:', verifyRes.data);

            if (verifyRes.data.success) {
              // Update localStorage
              localStorage.setItem('is_paid', 'true');

              // Show success message briefly before redirect
              setError(null);
              setTimeout(() => {
                window.location.href = '/dashboard';
              }, 1000);
            } else {
              throw new Error(verifyRes.data.message || 'Verification failed');
            }
          } catch (verifyErr: any) {
            console.error('Verification error:', verifyErr);
            setError(
              verifyErr.response?.data?.message ||
                'Payment verification failed. Please contact support with payment ID: ' +
                  response.razorpay_payment_id
            );
            setProcessing(false);
          }
        },
        modal: {
          ondismiss: () => {
            console.log('Payment modal dismissed by user');
            setProcessing(false);
          },
        },
      };

      console.log('Opening Razorpay modal...');
      const razorpay = new window.Razorpay(options);

      razorpay.on('payment.failed', function (response: any) {
        console.error('Payment failed:', response.error);
        setError(
          `Payment failed: ${
            response.error.description || 'Unknown error'
          }. Please try again.`
        );
        setProcessing(false);
      });

      razorpay.open();
    } catch (err: any) {
      console.error('Payment initialization error:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        url: `${API_URL}/api/payment/create-order`,
      });

      if (err.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
        setTimeout(() => clearAuthAndRedirect(), 2000);
      } else if (err.response?.status === 500) {
        setError(
          'Server error. Please check if your backend is properly configured with Razorpay keys.'
        );
      } else if (err.code === 'ERR_NETWORK') {
        setError(
          `Cannot connect to server at ${API_URL}. Please check your internet connection.`
        );
      } else if (err.code === 'ECONNABORTED') {
        setError(
          'Request timeout. The server might be busy. Please try again.'
        );
      } else {
        setError(
          err.response?.data?.message ||
            err.message ||
            'Payment failed. Please try again.'
        );
      }

      setProcessing(false);
    }
  };

  // Add a timeout to prevent infinite loading
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.log('Loading timeout reached, showing payment page');
        setLoading(false);
        setError(
          "Loading took too long. Please refresh the page if payment page doesn't appear."
        );
      }
    }, 10000);

    return () => clearTimeout(timeoutId);
  }, [loading]);

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <Loader2 className='h-8 w-8 animate-spin mx-auto mb-4' />
          <p className='text-muted-foreground'>Loading payment...</p>
          <p className='text-xs text-muted-foreground mt-2'>
            If this takes too long, please refresh the page
          </p>
          <div className='mt-4 text-xs text-muted-foreground'>
            <p>API Endpoint: {API_URL}</p>
            <p>
              Token: {localStorage.getItem('token') ? 'Present' : 'Missing'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4'>
      <Card className='w-full max-w-md border-border/50 shadow-lg'>
        <CardHeader className='text-center'>
          <div className='flex justify-center mb-4'>
            <CheckCircle className='h-16 w-16 text-primary' />
          </div>
          <CardTitle className='text-2xl'>Complete Your Enrollment</CardTitle>
          <CardDescription>
            One-time payment to access all courses and features
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          {error && (
            <div className='bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-md text-sm flex items-start gap-2'>
              <AlertCircle className='h-5 w-5 mt-0.5 flex-shrink-0' />
              <div className='flex-1'>
                <p className='font-medium mb-1'>Payment Error</p>
                <p>{error}</p>
                <div className='mt-2 space-y-1'>
                  <p className='text-xs text-muted-foreground'>
                    Server: {API_URL}
                  </p>
                  <Button
                    variant='link'
                    className='p-0 h-auto text-destructive'
                    onClick={() => setError(null)}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className='space-y-4'>
            <div className='flex justify-between items-center p-4 bg-muted/50 rounded-lg'>
              <span className='font-medium'>Course Access Fee</span>
              <span className='text-2xl font-bold'>₹1499</span>
            </div>

            <ul className='space-y-2 text-sm text-muted-foreground'>
              <li className='flex items-center gap-2'>
                <CheckCircle className='h-4 w-4 text-green-500' />
                Access to all courses
              </li>
              <li className='flex items-center gap-2'>
                <CheckCircle className='h-4 w-4 text-green-500' />
                Certificate of completion
              </li>
              <li className='flex items-center gap-2'>
                <CheckCircle className='h-4 w-4 text-green-500' />
                Lifetime access
              </li>
              <li className='flex items-center gap-2'>
                <CheckCircle className='h-4 w-4 text-green-500' />
                24/7 Support
              </li>
            </ul>
          </div>

          <Button
            onClick={startPayment}
            className='w-full'
            size='lg'
            disabled={processing}
          >
            {processing ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Processing...
              </>
            ) : (
              'Pay Now & Continue'
            )}
          </Button>

          <div className='text-xs text-center text-muted-foreground space-y-1'>
            <p>Secure payment powered by Razorpay.</p>
            <p>You'll be redirected to a secure payment page.</p>
            <Button
              variant='link'
              className='p-0 h-auto text-xs text-muted-foreground'
              onClick={() => {
                localStorage.clear();
                navigate('/auth');
              }}
            >
              Clear Data & Login Again
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
