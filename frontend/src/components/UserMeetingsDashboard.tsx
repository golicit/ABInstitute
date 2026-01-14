// components/UserMeetingsDashboard.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  Video,
  Users,
  User,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { webinarAPI, Webinar } from '@/services/api'; // Import Webinar type
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

// Use the existing Webinar interface from api.ts
// No need to redefine, just use Webinar type

export function UserMeetingsDashboard() {
  const [meetings, setMeetings] = useState<Webinar[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    fetchUserMeetings();
  }, [activeTab]); // Add activeTab to dependencies

  const fetchUserMeetings = async () => {
    try {
      setLoading(true);
      // Use the existing endpoint for user's sessions
      const response = await webinarAPI.getWebinars();

      if (response.success && response.data) {
        const now = new Date();

        // Handle different response structures
        let meetingsData: Webinar[] = [];

        if (Array.isArray(response.data)) {
          // If data is already an array
          meetingsData = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          // If data is nested in a data property
          meetingsData = response.data.data;
        }

        // Filter based on active tab
        const filteredMeetings = meetingsData.filter((meeting) => {
          const meetingTime = new Date(meeting.scheduledTime);
          if (activeTab === 'upcoming') {
            return meetingTime >= now && meeting.status !== 'cancelled';
          } else {
            return meetingTime < now || meeting.status === 'cancelled';
          }
        });

        setMeetings(filteredMeetings);
      }
    } catch (error) {
      console.error('Error fetching meetings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load meetings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Meeting link copied to clipboard',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'live':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return {
        date: format(date, 'PPP'),
        time: format(date, 'hh:mm a'),
        full: format(date, 'PPP hh:mm a'),
      };
    } catch (error) {
      return {
        date: 'Invalid Date',
        time: '',
        full: 'Invalid Date',
      };
    }
  };

  const canJoinMeeting = (meeting: Webinar) => {
    const now = new Date();
    const meetingTime = new Date(meeting.scheduledTime);
    const fifteenMinutesBefore = new Date(meetingTime.getTime() - 15 * 60000);
    const meetingEnd = new Date(
      meetingTime.getTime() + meeting.duration * 60000
    );

    return (
      now >= fifteenMinutesBefore &&
      now <= meetingEnd &&
      meeting.status !== 'cancelled'
    );
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto'></div>
          <p className='mt-2 text-sm text-muted-foreground'>
            Loading your meetings...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-6 p-4 md:p-6'>
      <div className='flex justify-between items-center'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>My Meetings</h1>
          <p className='text-muted-foreground'>
            View and join all your scheduled webinars and 1:1 sessions
          </p>
        </div>
      </div>

      <div className='flex space-x-2 border-b'>
        <Button
          variant={activeTab === 'upcoming' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('upcoming')}
          className='rounded-none border-b-2 border-transparent data-[state=active]:border-primary'
        >
          Upcoming
        </Button>
        <Button
          variant={activeTab === 'past' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('past')}
          className='rounded-none border-b-2 border-transparent data-[state=active]:border-primary'
        >
          Past Meetings
        </Button>
      </div>

      {meetings.length === 0 ? (
        <Card>
          <CardContent className='pt-6'>
            <div className='text-center py-12'>
              <Video className='h-12 w-12 mx-auto text-muted-foreground mb-4' />
              <h3 className='text-lg font-semibold mb-2'>
                No {activeTab === 'upcoming' ? 'upcoming' : 'past'} meetings
              </h3>
              <p className='text-sm text-muted-foreground'>
                {activeTab === 'upcoming'
                  ? 'You have no scheduled meetings. Check back later!'
                  : 'You have no past meetings yet.'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-4'>
          {meetings.map((meeting) => {
            const dateInfo = formatDateTime(meeting.scheduledTime);
            const canJoin = canJoinMeeting(meeting);

            return (
              <Card
                key={meeting._id}
                className='overflow-hidden hover:shadow-md transition-shadow'
              >
                <CardHeader className='pb-3'>
                  <div className='flex justify-between items-start'>
                    <div>
                      <CardTitle className='text-xl flex items-center gap-2'>
                        {meeting.type === 'webinar' ? (
                          <Users className='h-5 w-5 text-blue-500' />
                        ) : (
                          <User className='h-5 w-5 text-green-500' />
                        )}
                        {meeting.title}
                      </CardTitle>
                      <p className='text-sm text-muted-foreground mt-1 line-clamp-2'>
                        {meeting.description || 'No description provided'}
                      </p>
                    </div>
                    <Badge className={getStatusColor(meeting.status)}>
                      {meeting.status.charAt(0).toUpperCase() +
                        meeting.status.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className='space-y-4'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div className='space-y-3'>
                      <div className='flex items-center gap-2 text-sm'>
                        <Calendar className='h-4 w-4 flex-shrink-0' />
                        <span className='font-medium min-w-[100px]'>
                          Date & Time:
                        </span>
                        <span className='text-foreground'>{dateInfo.full}</span>
                      </div>
                      <div className='flex items-center gap-2 text-sm'>
                        <Clock className='h-4 w-4 flex-shrink-0' />
                        <span className='font-medium min-w-[100px]'>
                          Duration:
                        </span>
                        <span className='text-foreground'>
                          {meeting.duration} minutes
                        </span>
                      </div>
                      <div className='flex items-center gap-2 text-sm'>
                        {meeting.type === 'webinar' ? (
                          <>
                            <Users className='h-4 w-4 flex-shrink-0' />
                            <span className='font-medium min-w-[100px]'>
                              Batch:
                            </span>
                            <span className='text-foreground'>
                              {meeting.batch?.batchName || 'N/A'}
                            </span>
                          </>
                        ) : (
                          <>
                            <User className='h-4 w-4 flex-shrink-0' />
                            <span className='font-medium min-w-[100px]'>
                              Session Type:
                            </span>
                            <span className='text-foreground'>
                              1:1 Private Session
                            </span>
                          </>
                        )}
                      </div>
                      <div className='flex items-center gap-2 text-sm'>
                        <User className='h-4 w-4 flex-shrink-0' />
                        <span className='font-medium min-w-[100px]'>Host:</span>
                        <span className='text-foreground'>
                          {meeting.teacherId?.name || 'N/A'}
                        </span>
                      </div>
                    </div>

                    <div className='space-y-3'>
                      {meeting.meetingLink ? (
                        <>
                          <div>
                            <p className='text-sm font-medium mb-2'>
                              Meeting Link
                            </p>
                            <div className='flex items-center gap-2'>
                              <input
                                type='text'
                                value={meeting.meetingLink}
                                readOnly
                                className='flex-1 px-3 py-2 text-sm border rounded-md bg-muted truncate'
                              />
                              <Button
                                size='sm'
                                variant='outline'
                                onClick={() =>
                                  copyToClipboard(meeting.meetingLink!)
                                }
                                title='Copy link'
                              >
                                <Copy className='h-4 w-4' />
                              </Button>
                            </div>
                          </div>

                          {canJoin && meeting.status === 'scheduled' && (
                            <Button
                              className='w-full'
                              onClick={() =>
                                window.open(meeting.meetingLink, '_blank')
                              }
                            >
                              <Video className='mr-2 h-4 w-4' />
                              Join Meeting
                              <ExternalLink className='ml-2 h-3 w-3' />
                            </Button>
                          )}

                          {meeting.status === 'live' && (
                            <Button
                              className='w-full bg-green-600 hover:bg-green-700'
                              onClick={() =>
                                window.open(meeting.meetingLink, '_blank')
                              }
                            >
                              <Video className='mr-2 h-4 w-4' />
                              Join Live Meeting
                              <ExternalLink className='ml-2 h-3 w-3' />
                            </Button>
                          )}

                          {!canJoin && meeting.status === 'scheduled' && (
                            <div className='text-sm text-muted-foreground italic p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded'>
                              Join link will be active 15 minutes before the
                              meeting
                            </div>
                          )}

                          {meeting.status === 'completed' && (
                            <div className='text-sm text-center p-2 bg-gray-50 dark:bg-gray-800 rounded'>
                              This meeting has ended
                            </div>
                          )}
                        </>
                      ) : (
                        <div className='text-sm text-muted-foreground p-4 border border-dashed rounded-lg text-center'>
                          <Video className='h-8 w-8 mx-auto mb-2' />
                          <p>Meeting link not available</p>
                          <p className='text-xs mt-1'>
                            Contact your administrator
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className='flex justify-center mt-6'>
        <Button
          variant='outline'
          onClick={fetchUserMeetings}
          disabled={loading}
        >
          Refresh Meetings
        </Button>
      </div>
    </div>
  );
}
