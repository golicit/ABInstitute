// components/PrivateTutoringCard.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Video,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { apiClient } from '@/services/api';
import { useNavigate } from 'react-router-dom';
import {
  ApiResponse,
  TutoringStatus,
  PaymentOrderResponse,
  PaymentVerificationResponse,
} from '@/services/api';

// Declare Razorpay type
declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function PrivateTutoringCard() {
  const { user: authUser } = useAuth();
  const { user: appUser, courses } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [tutoringStatus, setTutoringStatus] = useState<TutoringStatus>({
    tutoringStatus: 'none',
    tutoringPurchasedAt: null,
    mentorAvailabilityNotified: false,
  });
  const [showNotification, setShowNotification] = useState(false);
  const [hasPurchasedMainCourse, setHasPurchasedMainCourse] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Check if user has purchased main course
  useEffect(() => {
    const checkCoursePurchase = () => {
      // Multiple methods to check purchase status
      const isPaidLocal = localStorage.getItem('is_paid') === 'true';
      const isPaidAuth = authUser?.isPaidUser === true;
      const hasEnrolledCourses = courses.some(
        (course) => course.isEnrolled === true
      );

      // Check user data in localStorage
      let isPaidFromUserData = false;
      const userData = localStorage.getItem('user_data');
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData);
          isPaidFromUserData =
            parsedUser.isPaidUser === true ||
            parsedUser.paymentStatus === 'paid';
        } catch (e) {
          console.error('Error parsing user data:', e);
        }
      }

      // User has purchased if ANY of these conditions are true
      const hasPurchased =
        isPaidLocal || isPaidAuth || hasEnrolledCourses || isPaidFromUserData;

      setHasPurchasedMainCourse(hasPurchased);

      // Debug log
      console.log('Course purchase status:', {
        isPaidLocal,
        isPaidAuth,
        hasEnrolledCourses,
        isPaidFromUserData,
        finalStatus: hasPurchased,
      });
    };

    if (authUser) {
      checkCoursePurchase();
    }
  }, [authUser, courses]);

  // Fetch tutoring status
  const fetchTutoringStatus = async () => {
    try {
      const response = await apiClient.get<ApiResponse<TutoringStatus>>(
        '/api/payment/tutoring-status'
      );
      if (response.data.success && response.data.data) {
        setTutoringStatus(response.data.data);

        // Show notification if mentor is available
        if (
          response.data.data.tutoringStatus === 'active' &&
          !response.data.data.mentorAvailabilityNotified
        ) {
          setShowNotification(true);
          localStorage.setItem('tutoring_notified', 'true');
        }
      } else if (response.data.success) {
        // Handle case where data is at root level
        const data = response.data as unknown as TutoringStatus;
        if (data.tutoringStatus) {
          setTutoringStatus(data);

          if (
            data.tutoringStatus === 'active' &&
            !data.mentorAvailabilityNotified
          ) {
            setShowNotification(true);
            localStorage.setItem('tutoring_notified', 'true');
          }
        }
      }
    } catch (error) {
      console.error('Error fetching tutoring status:', error);
    }
  };

  useEffect(() => {
    if (authUser && hasPurchasedMainCourse) {
      fetchTutoringStatus();

      const notified = localStorage.getItem('tutoring_notified');
      if (tutoringStatus.tutoringStatus === 'active' && notified !== 'true') {
        setShowNotification(true);
      }
    }
  }, [authUser, hasPurchasedMainCourse]);

  // Load Razorpay script
  useEffect(() => {
    if (window.Razorpay) return;

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      console.log('✅ Razorpay script loaded successfully');
    };
    script.onerror = () => {
      console.error('❌ Failed to load Razorpay script');
      toast({
        title: 'Payment Error',
        description: 'Failed to load payment gateway. Please refresh the page.',
        variant: 'destructive',
      });
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePurchase = async () => {
    if (!authUser) {
      toast({
        title: 'Authentication Required',
        description: 'Please login to purchase tutoring',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    if (!hasPurchasedMainCourse) {
      toast({
        title: 'Course Required',
        description: 'Please purchase the main course first',
        variant: 'destructive',
      });
      navigate('/dashboard/explore');
      return;
    }

    if (!window.Razorpay) {
      toast({
        title: 'Payment Error',
        description:
          'Payment gateway is loading. Please wait a moment and try again.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setCheckoutLoading(true);

    try {
      // Step 1: Create order
      const response = await apiClient.post<ApiResponse<PaymentOrderResponse>>(
        '/api/payment/create-tutoring-order'
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to create order');
      }

      const orderData = response.data.data || response.data;
      const {
        orderId,
        amount,
        currency,
        key,
        name = 'Private Mentorship',
        description = '1-on-1 Tutoring Session',
        prefill,
        theme,
        notes,
        callback_url,
        cancel_url,
      } = orderData as PaymentOrderResponse;

      // Step 2: Initialize Razorpay
      const options = {
        key: key || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: amount,
        currency: currency,
        name: name,
        description: description,
        order_id: orderId,
        handler: async (paymentResponse: any) => {
          console.log('Payment successful:', paymentResponse);

          try {
            // Step 3: Verify payment
            const verifyResponse = await apiClient.post<
              ApiResponse<PaymentVerificationResponse>
            >('/api/payment/verify-tutoring', {
              razorpay_order_id: paymentResponse.razorpay_order_id,
              razorpay_payment_id: paymentResponse.razorpay_payment_id,
              razorpay_signature: paymentResponse.razorpay_signature,
            });

            if (verifyResponse.data.success) {
              toast({
                title: 'Success! 🎉',
                description: 'Private tutoring purchased successfully!',
              });

              // Update local state
              setTutoringStatus({
                ...tutoringStatus,
                tutoringStatus: 'pending',
                tutoringPurchasedAt: new Date().toISOString(),
              });

              // Refresh status
              await fetchTutoringStatus();

              // Redirect if needed
              if (verifyResponse.data.redirectUrl) {
                setTimeout(() => {
                  navigate(verifyResponse.data.redirectUrl!);
                }, 1500);
              }
            } else {
              throw new Error(
                verifyResponse.data.message || 'Payment verification failed'
              );
            }
          } catch (verifyError: any) {
            console.error('Payment verification error:', verifyError);

            toast({
              title: 'Verification Failed',
              description:
                verifyError.message ||
                'Payment verification failed. Please contact support.',
              variant: 'destructive',
            });

            // Refresh status to check actual state
            await fetchTutoringStatus();
          } finally {
            setCheckoutLoading(false);
          }
        },
        prefill: prefill || {
          name: appUser?.name || authUser?.name || '',
          email: authUser?.email || '',
          contact: '',
        },
        theme: theme || {
          color: '#14b8a6',
        },
        modal: {
          ondismiss: () => {
            console.log('Payment modal dismissed');
            toast({
              title: 'Payment Cancelled',
              description: 'Payment was cancelled',
              variant: 'default',
            });
            setCheckoutLoading(false);
          },
          escape: true,
          animation: true,
        },
        notes: notes || {
          userId: authUser._id,
          purpose: 'private_tutoring',
        },
        callback_url: callback_url,
        cancel_url: cancel_url,
        retry: {
          enabled: true,
          max_count: 4,
        },
        reminder: {
          enabled: true,
        },
        timeout: 300, // 5 minutes
        readonly: {
          contact: false,
          email: false,
          name: false,
        },
      };

      console.log('Opening Razorpay checkout with options:', {
        orderId,
        amount,
        currency,
        key: options.key ? 'Present' : 'Missing',
      });

      // Step 4: Open checkout
      const razorpay = new window.Razorpay(options);
      razorpay.open();

      // Handle errors
      razorpay.on('payment.failed', (response: any) => {
        console.error('Payment failed:', response.error);

        let errorMessage = 'Payment failed. Please try again.';

        if (response.error.code === 'BAD_REQUEST_ERROR') {
          errorMessage = 'Invalid payment details. Please check and try again.';
        } else if (response.error.code === 'NETWORK_ERROR') {
          errorMessage =
            'Network error. Please check your internet connection.';
        } else if (response.error.code === 'SERVER_ERROR') {
          errorMessage = 'Payment gateway error. Please try again later.';
        }

        toast({
          title: 'Payment Failed',
          description: errorMessage,
          variant: 'destructive',
        });

        setCheckoutLoading(false);
      });
    } catch (error: any) {
      console.error('Purchase error:', error);

      let errorMessage = 'Failed to initiate payment.';
      let errorTitle = 'Purchase Failed';

      if (error.response?.data?.errorCode === 'COURSE_NOT_PURCHASED') {
        errorTitle = 'Course Required';
        errorMessage = 'Please purchase the main course first.';
        navigate('/dashboard/explore');
      } else if (
        error.response?.data?.errorCode === 'TUTORING_ALREADY_PURCHASED'
      ) {
        errorTitle = 'Already Purchased';
        errorMessage = 'You have already purchased tutoring.';
        await fetchTutoringStatus();
      } else if (
        error.response?.data?.errorCode === 'RAZORPAY_NOT_CONFIGURED'
      ) {
        errorTitle = 'Payment Unavailable';
        errorMessage =
          'Payment gateway is not configured. Please contact support.';
      } else if (error.message?.includes('Network Error')) {
        errorTitle = 'Network Error';
        errorMessage = 'Please check your internet connection and try again.';
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setCheckoutLoading(false);
    }
  };

  const handleNotificationClose = () => {
    setShowNotification(false);
    localStorage.setItem('tutoring_notified', 'true');

    // Mark as read on server
    apiClient.post('/api/payment/mark-notification-read').catch(console.error);
  };

  const getStatusBadge = () => {
    switch (tutoringStatus.tutoringStatus) {
      case 'pending':
        return (
          <Badge
            variant='outline'
            className='bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
          >
            <Clock className='w-3 h-3 mr-1' />
            Pending Mentor Availability
          </Badge>
        );
      case 'active':
        return (
          <Badge
            variant='outline'
            className='bg-green-500/10 text-green-500 border-green-500/30'
          >
            <CheckCircle className='w-3 h-3 mr-1' />
            Active - Mentor Available
          </Badge>
        );
      case 'completed':
        return (
          <Badge
            variant='outline'
            className='bg-blue-500/10 text-blue-500 border-blue-500/30'
          >
            <CheckCircle className='w-3 h-3 mr-1' />
            Completed
          </Badge>
        );
      default:
        return null;
    }
  };

  const getActionButton = () => {
    if (!hasPurchasedMainCourse) {
      return (
        <div className='space-y-2'>
          <Button
            onClick={() => navigate('/dashboard/explore')}
            className='w-full bg-[#14b8a6] hover:bg-[#0d9488]'
          >
            <ExternalLink className='w-4 h-4 mr-2' />
            Purchase Main Course First
          </Button>
          <p className='text-xs text-gray-400 text-center'>
            You need to purchase the main course to unlock private tutoring
          </p>
        </div>
      );
    }

    switch (tutoringStatus.tutoringStatus) {
      case 'none':
        return (
          <div className='space-y-2'>
            <Button
              onClick={handlePurchase}
              disabled={loading || checkoutLoading}
              className='w-full bg-[#14b8a6] hover:bg-[#0d9488] disabled:opacity-50'
            >
              {loading || checkoutLoading ? (
                <>
                  <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                  {checkoutLoading ? 'Opening Payment...' : 'Processing...'}
                </>
              ) : (
                'Purchase Private Mentorship - ₹1'
              )}
            </Button>
            <p className='text-xs text-gray-400 text-center'>
              Click to start 1-on-1 mentorship with Akash
            </p>
          </div>
        );
      case 'pending':
        return (
          <div className='space-y-2'>
            <Button
              disabled
              className='w-full bg-yellow-500 hover:bg-yellow-600'
            >
              <Clock className='w-4 h-4 mr-2' />
              Waiting for Mentor Availability
            </Button>
            <p className='text-xs text-yellow-400 text-center'>
              Your purchase is confirmed! Mentor will contact you soon.
            </p>
          </div>
        );
      case 'active':
        return (
          <Button
            onClick={() => navigate('/dashboard/tutoring-sessions')}
            className='w-full bg-green-600 hover:bg-green-700'
          >
            <Video className='w-4 h-4 mr-2' />
            Schedule Tutoring Session
          </Button>
        );
      case 'completed':
        return (
          <div className='space-y-2'>
            <Button variant='outline' className='w-full'>
              View Session History
            </Button>
            <p className='text-xs text-gray-400 text-center'>
              Your tutoring package has been completed
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* Notification Modal */}
      {showNotification && (
        <div className='fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4'>
          <div className='bg-[#111827] border border-green-500/30 rounded-xl max-w-md w-full shadow-2xl'>
            <div className='p-6'>
              <div className='flex items-center gap-3 mb-4'>
                <div className='w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center'>
                  <Video className='w-6 h-6 text-green-500' />
                </div>
                <div>
                  <h3 className='text-xl font-bold text-white'>
                    Mentor Available! 🎉
                  </h3>
                  <p className='text-sm text-gray-400'>
                    Your private tutoring mentor is now available
                  </p>
                </div>
              </div>
              <p className='text-gray-300 mb-6'>
                Your private tutoring mentor is now available to schedule
                sessions. You can now start your 1-on-1 mentorship journey.
              </p>
              <div className='flex gap-3'>
                <Button
                  onClick={() => {
                    handleNotificationClose();
                    navigate('/dashboard/tutoring-sessions');
                  }}
                  className='flex-1 bg-green-600 hover:bg-green-700'
                >
                  Schedule Session
                </Button>
                <Button
                  onClick={handleNotificationClose}
                  variant='outline'
                  className='border-gray-600 text-gray-300'
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Card className='bg-[#111827] border-border/40 hover:border-[#14b8a6]/30 transition-all'>
        <CardContent className='p-6'>
          <div className='flex items-start justify-between mb-4'>
            <div className='flex items-center gap-4'>
              <div className='w-12 h-12 rounded-xl bg-[#14b8a6]/10 flex items-center justify-center'>
                <Video className='w-6 h-6 text-[#14b8a6]' />
              </div>
              <div>
                <div className='flex items-center gap-2'>
                  <h3 className='text-xl font-bold text-white'>
                    Private Mentorship
                  </h3>
                  {getStatusBadge()}
                </div>
                <p className='text-sm text-gray-400'>
                  1-on-1 Tutoring Sessions with Akash
                </p>
              </div>
            </div>
            <div className='text-right'>
              <div className='text-2xl font-bold text-white'>₹299</div>
              <div className='text-xs text-gray-400 line-through'>₹499</div>
            </div>
          </div>

          <div className='space-y-3 mb-6'>
            <div className='flex items-center gap-2 text-sm text-gray-300'>
              <CheckCircle className='w-4 h-4 text-green-500' />
              Personalized 1-on-1 sessions
            </div>
            <div className='flex items-center gap-2 text-sm text-gray-300'>
              <CheckCircle className='w-4 h-4 text-green-500' />
              Direct mentorship from Akash
            </div>
            <div className='flex items-center gap-2 text-sm text-gray-300'>
              <CheckCircle className='w-4 h-4 text-green-500' />
              Flexible scheduling based on availability
            </div>
            <div className='flex items-center gap-2 text-sm text-gray-300'>
              <CheckCircle className='w-4 h-4 text-green-500' />
              Priority support and guidance
            </div>
          </div>

          {/* Debug info (development only) */}
          {/* {process.env.NODE_ENV === 'development' && (
            <div className='mb-4 p-2 bg-gray-800/50 rounded text-xs'>
              <p className='text-gray-400'>Debug Info:</p>
              <p className='text-gray-400'>
                Main Course Purchased: {hasPurchasedMainCourse ? 'Yes' : 'No'}
              </p>
              <p className='text-gray-400'>
                Tutoring Status: {tutoringStatus.tutoringStatus}
              </p>
              <p className='text-gray-400'>
                Razorpay Loaded: {window.Razorpay ? 'Yes' : 'No'}
              </p>
            </div>
          )} */}

          {tutoringStatus.tutoringStatus === 'pending' && (
            <div className='mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg'>
              <p className='text-sm text-yellow-500'>
                <Clock className='w-4 h-4 inline mr-1' />
                Your purchase is confirmed! Mentor availability notification
                coming soon.
              </p>
            </div>
          )}

          {getActionButton()}

          {tutoringStatus.tutoringPurchasedAt && (
            <div className='mt-4 pt-4 border-t border-gray-700/50'>
              <p className='text-xs text-gray-400'>
                Purchased on:{' '}
                {new Date(
                  tutoringStatus.tutoringPurchasedAt
                ).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
