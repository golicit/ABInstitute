// pages/TutoringSessions.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/services/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Video,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  Loader2,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { TutoringStatus } from '@/services/api';

export default function TutoringSessions() {
  const { user } = useAuth();
  const [tutoringStatus, setTutoringStatus] = useState<TutoringStatus | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [scheduling, setScheduling] = useState(false);

  useEffect(() => {
    fetchTutoringStatus();
  }, []);

  const fetchTutoringStatus = async () => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data?: TutoringStatus;
      }>('/api/payment/tutoring-status');
      if (response.data.success && response.data.data) {
        setTutoringStatus(response.data.data);
      } else if (response.data.success && !response.data.data) {
        // Handle case where data is at root level
        const data = response.data as unknown as TutoringStatus;
        if (data.tutoringStatus) {
          setTutoringStatus(data);
        }
      }
    } catch (error) {
      console.error('Error fetching tutoring status:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tutoring status',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleSession = async () => {
    if (!tutoringStatus || tutoringStatus.tutoringStatus !== 'active') {
      toast({
        title: 'Cannot Schedule',
        description: 'Tutoring is not active yet',
        variant: 'destructive',
      });
      return;
    }

    setScheduling(true);
    try {
      // Here you would implement scheduling logic
      // For now, just show a success message
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: 'Session Requested',
        description:
          'Your Mentorship session request has been sent to the mentor.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to schedule session',
        variant: 'destructive',
      });
    } finally {
      setScheduling(false);
    }
  };

  const getStatusCard = () => {
    if (!tutoringStatus) return null;

    switch (tutoringStatus.tutoringStatus) {
      case 'none':
        return (
          <Card className='bg-yellow-900/20 border-yellow-700/50'>
            <CardContent className='p-6'>
              <div className='flex items-center gap-3 mb-4'>
                <AlertCircle className='w-6 h-6 text-yellow-500' />
                <h3 className='text-lg font-bold text-white'>
                  No Mentorship Package
                </h3>
              </div>
              <p className='text-gray-300 mb-4'>
                You haven't purchased the private Mentorship package yet.
              </p>
              <Button
                onClick={() => (window.location.href = '/dashboard/explore')}
                className='bg-[#14b8a6] hover:bg-[#0d9488]'
              >
                Purchase Mentorship
              </Button>
            </CardContent>
          </Card>
        );

      case 'pending':
        return (
          <Card className='bg-blue-900/20 border-blue-700/50'>
            <CardContent className='p-6'>
              <div className='flex items-center gap-3 mb-4'>
                <Clock className='w-6 h-6 text-blue-500' />
                <h3 className='text-lg font-bold text-white'>
                  Awaiting Mentor Availability
                </h3>
              </div>
              <p className='text-gray-300 mb-2'>
                Your Mentorship purchase is confirmed! We're coordinating with
                the mentor for availability.
              </p>
              <p className='text-sm text-gray-400'>
                You'll receive a notification when the mentor is available.
              </p>
              {tutoringStatus.tutoringPurchasedAt && (
                <div className='mt-4 pt-4 border-t border-blue-700/30'>
                  <p className='text-sm text-gray-400'>
                    Purchased on:{' '}
                    {new Date(
                      tutoringStatus.tutoringPurchasedAt
                    ).toLocaleDateString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 'active':
        return (
          <Card className='bg-green-900/20 border-green-700/50'>
            <CardContent className='p-6'>
              <div className='flex items-center gap-3 mb-4'>
                <CheckCircle className='w-6 h-6 text-green-500' />
                <h3 className='text-lg font-bold text-white'>
                  Mentorship Active
                </h3>
                <Badge className='bg-green-600'>Mentor Available</Badge>
              </div>
              <p className='text-gray-300 mb-4'>
                Your mentor is available for 1-on-1 sessions! You can now
                schedule your Mentorship sessions.
              </p>
              <Button
                onClick={handleScheduleSession}
                disabled={scheduling}
                className='bg-green-600 hover:bg-green-700 w-full'
              >
                {scheduling ? (
                  <>
                    <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <Calendar className='w-4 h-4 mr-2' />
                    Schedule Session
                  </>
                )}
              </Button>
              {tutoringStatus.tutoringPurchasedAt && (
                <div className='mt-4 pt-4 border-t border-green-700/30'>
                  <p className='text-sm text-gray-400'>
                    Activated on: {new Date().toLocaleDateString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 'completed':
        return (
          <Card className='bg-gray-800/20 border-gray-700/50'>
            <CardContent className='p-6'>
              <div className='flex items-center gap-3 mb-4'>
                <CheckCircle className='w-6 h-6 text-gray-500' />
                <h3 className='text-lg font-bold text-white'>
                  Mentorship Completed
                </h3>
              </div>
              <p className='text-gray-300 mb-4'>
                Your Mentorship package has been completed. Thank you for your
                participation!
              </p>
              <Button variant='outline' className='w-full border-gray-600'>
                View Session History
              </Button>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <Loader2 className='w-8 h-8 animate-spin mx-auto mb-4 text-[#14b8a6]' />
          <p className='text-gray-400'>Loading Mentorship status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen p-6'>
      <div className='max-w-4xl mx-auto'>
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-white mb-2'>
            Private Mentorship
          </h1>
          <p className='text-gray-400'>
            1-on-1 sessions with Akash Bhattacharjee
          </p>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          {/* Status Card */}
          <div className='lg:col-span-2'>{getStatusCard()}</div>

          {/* Info Card */}
          <Card className='bg-[#111827] border-border/40'>
            <CardContent className='p-6'>
              <h3 className='text-lg font-bold text-white mb-4'>
                Mentorship Details
              </h3>
              <div className='space-y-4'>
                <div className='flex items-start gap-3'>
                  <Video className='w-5 h-5 text-[#14b8a6] mt-0.5' />
                  <div>
                    <h4 className='font-medium text-white'>1-on-1 Sessions</h4>
                    <p className='text-sm text-gray-400'>
                      Personalized attention from the mentor
                    </p>
                  </div>
                </div>
                <div className='flex items-start gap-3'>
                  <Calendar className='w-5 h-5 text-[#14b8a6] mt-0.5' />
                  <div>
                    <h4 className='font-medium text-white'>
                      Flexible Scheduling
                    </h4>
                    <p className='text-sm text-gray-400'>
                      Based on mutual availability
                    </p>
                  </div>
                </div>
                {/* <div className='flex items-start gap-3'>
                  <Clock className='w-5 h-5 text-[#14b8a6] mt-0.5' />
                  <div>
                    <h4 className='font-medium text-white'>Session Duration</h4>
                    <p className='text-sm text-gray-400'>
                      Typically 60-90 minutes per session
                    </p>
                  </div>
                </div> */}
              </div>

              <div className='mt-6 pt-6 border-t border-gray-700/50'>
                <h4 className='font-medium text-white mb-3'>Need Help?</h4>
                <Button variant='outline' className='w-full border-gray-600'>
                  Contact Support
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Sessions (placeholder) */}
        {(tutoringStatus?.tutoringStatus === 'active' ||
          tutoringStatus?.tutoringStatus === 'completed') && (
          <Card className='mt-6 bg-[#111827] border-border/40'>
            <CardContent className='p-6'>
              <h3 className='text-lg font-bold text-white mb-4'>
                Your Sessions
              </h3>
              <div className='text-center py-8'>
                <Calendar className='w-12 h-12 text-gray-600 mx-auto mb-4' />
                <p className='text-gray-400'>No scheduled sessions yet</p>
                {tutoringStatus.tutoringStatus === 'active' && (
                  <Button
                    onClick={handleScheduleSession}
                    className='mt-4 bg-[#14b8a6] hover:bg-[#0d9488]'
                  >
                    Schedule Your First Session
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
