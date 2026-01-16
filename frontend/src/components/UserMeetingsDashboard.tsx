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
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { webinarAPI, Webinar, ApiResponse } from '@/services/api';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export function UserMeetingsDashboard() {
  const [meetings, setMeetings] = useState<Webinar[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [refreshing, setRefreshing] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    fetchUserMeetings();
  }, [activeTab]);

  const fetchUserMeetings = async () => {
    try {
      setLoading(true);
      const response: ApiResponse<Webinar[]> =
        await webinarAPI.getUserWebinars();

      console.log('🎯 User meetings API response:', response);

      setDebugInfo({
        success: response.success,
        message: response.message,
        count: response.data?.length || 0,
        rawData: response.data,
      });

      if (response.success && response.data) {
        const now = new Date();

        let meetingsData: Webinar[] = [];

        if (response.data && Array.isArray(response.data)) {
          meetingsData = response.data;
        } else if (
          response.data &&
          typeof response.data === 'object' &&
          'data' in response.data
        ) {
          const nestedData = (response.data as any).data;
          if (Array.isArray(nestedData)) {
            meetingsData = nestedData;
          }
        }

        console.log(`📥 Raw meetings data received:`, meetingsData);
        console.log(`📊 Total meetings found: ${meetingsData.length}`);

        meetingsData.forEach((meeting, index) => {
          console.log(`\n📋 Meeting ${index + 1}:`);
          console.log(`   Title: ${meeting.title}`);
          console.log(`   Type: ${meeting.type}`);
          console.log(`   Status: ${meeting.status}`);
          console.log(`   Batch: ${meeting.batch || 'N/A'}`);
          console.log(`   Student ID: ${meeting.studentId || 'N/A'}`);
          console.log(`   Meeting Link: ${meeting.meetingLink || 'NO LINK'}`);
          console.log(`   Scheduled: ${meeting.scheduledTime}`);
        });

        const filteredMeetings = meetingsData.filter((meeting) => {
          try {
            const meetingTime = new Date(meeting.scheduledTime);
            const isCancelled = meeting.status === 'cancelled';
            const isCompleted = meeting.status === 'completed';
            const isUpcoming =
              meetingTime >= now && !isCancelled && !isCompleted;
            const isPast = meetingTime < now || isCancelled || isCompleted;

            return activeTab === 'upcoming' ? isUpcoming : isPast;
          } catch (error) {
            console.error('Error parsing meeting time:', error);
            return false;
          }
        });

        filteredMeetings.sort((a, b) => {
          const timeA = new Date(a.scheduledTime).getTime();
          const timeB = new Date(b.scheduledTime).getTime();
          return activeTab === 'upcoming' ? timeA - timeB : timeB - timeA;
        });

        console.log(
          `✅ Filtered ${filteredMeetings.length} meetings for ${activeTab} tab`
        );

        const batchMeetings = filteredMeetings.filter(
          (m) => m.type === 'webinar'
        );
        const oneOnOneMeetings = filteredMeetings.filter(
          (m) => m.type === 'one_on_one'
        );
        console.log(`   Batch webinars: ${batchMeetings.length}`);
        console.log(`   1:1 sessions: ${oneOnOneMeetings.length}`);

        setMeetings(filteredMeetings);
      } else {
        console.error('❌ Failed to fetch meetings:', response.message);
        toast({
          title: 'Error',
          description: response.message || 'Failed to load meetings',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('❌ Error fetching meetings:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast({
        title: 'Connection Error',
        description: 'Failed to load meetings from server',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUserMeetings();
  };

  const copyToClipboard = (text: string) => {
    if (!text) {
      toast({
        title: 'No link available',
        description: 'This meeting does not have a link',
        variant: 'destructive',
      });
      return;
    }

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
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
      }
      return {
        date: format(date, 'PPP'),
        time: format(date, 'hh:mm a'),
        full: format(date, 'PPP hh:mm a'),
      };
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return {
        date: 'Date not set',
        time: '',
        full: 'Date not set',
      };
    }
  };

  const canJoinMeeting = (meeting: Webinar) => {
    if (
      !meeting.meetingLink ||
      meeting.status === 'cancelled' ||
      meeting.status === 'completed'
    ) {
      return false;
    }

    try {
      const now = new Date();
      const meetingTime = new Date(meeting.scheduledTime);

      if (isNaN(meetingTime.getTime())) {
        return false;
      }

      const fifteenMinutesBefore = new Date(meetingTime.getTime() - 15 * 60000);
      const meetingEnd = new Date(
        meetingTime.getTime() + (meeting.duration || 60) * 60000
      );

      return now >= fifteenMinutesBefore && now <= meetingEnd;
    } catch (error) {
      console.error('Error checking if can join meeting:', error);
      return false;
    }
  };

  const joinMeeting = (meeting: Webinar) => {
    if (!meeting.meetingLink) {
      toast({
        title: 'No meeting link',
        description: 'This meeting does not have a link available',
        variant: 'destructive',
      });
      return;
    }

    window.open(meeting.meetingLink, '_blank', 'noopener,noreferrer');
    console.log(`✅ Joined meeting: ${meeting.title}`);
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
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={handleRefresh}
            disabled={refreshing}
            className='flex items-center gap-2'
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
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
        <Card className='bg-card'>
          <CardContent className='pt-6'>
            <div className='text-center py-12'>
              <Video className='h-12 w-12 mx-auto text-muted-foreground mb-4' />
              <h3 className='text-lg font-semibold mb-2'>
                No {activeTab === 'upcoming' ? 'upcoming' : 'past'} meetings
              </h3>
              <p className='text-sm text-muted-foreground mb-4'>
                {activeTab === 'upcoming'
                  ? 'You have no scheduled meetings. Check back later!'
                  : 'You have no past meetings yet.'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div>
          {/* Meeting type summary */}
          <div className='mb-4 flex gap-3'>
            <div className='flex items-center gap-2 px-3 py-1 bg-background rounded-full border'>
              <Users className='h-4 w-4 text-blue-500' />
              <span className='text-sm font-medium'>
                Batch Webinars:{' '}
                {meetings.filter((m) => m.type === 'webinar').length}
              </span>
            </div>
            <div className='flex items-center gap-2 px-3 py-1 bg-background rounded-full border'>
              <User className='h-4 w-4 text-green-500' />
              <span className='text-sm font-medium'>
                1:1 Sessions:{' '}
                {meetings.filter((m) => m.type === 'one_on_one').length}
              </span>
            </div>
          </div>

          {/* Meetings list */}
          <div className='grid gap-4'>
            {meetings.map((meeting) => {
              const dateInfo = formatDateTime(meeting.scheduledTime);
              const canJoin = canJoinMeeting(meeting);
              const isLive = meeting.status === 'live';
              const isScheduled = meeting.status === 'scheduled';
              const isCompleted = meeting.status === 'completed';
              const isCancelled = meeting.status === 'cancelled';

              return (
                <Card
                  key={meeting._id}
                  className='overflow-hidden hover:shadow-md transition-shadow bg-card border'
                >
                  <CardHeader className='pb-3'>
                    <div className='flex justify-between items-start'>
                      <div className='flex-1'>
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
                      <Badge
                        className={`ml-2 ${getStatusColor(meeting.status)}`}
                        variant='outline'
                      >
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
                          <span className='text-foreground'>
                            {dateInfo.full}
                          </span>
                        </div>
                        <div className='flex items-center gap-2 text-sm'>
                          <Clock className='h-4 w-4 flex-shrink-0' />
                          <span className='font-medium min-w-[100px]'>
                            Duration:
                          </span>
                          <span className='text-foreground'>
                            {meeting.duration || 60} minutes
                          </span>
                        </div>
                        <div className='flex items-center gap-2 text-sm'>
                          {meeting.type === 'webinar' ? (
                            <>
                              <Users className='h-4 w-4 flex-shrink-0' />
                              <span className='font-medium min-w-[100px]'>
                                Type:
                              </span>
                              <span className='text-foreground'>
                                Batch Webinar
                                {meeting.batch && ` (${meeting.batch})`}
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
                          <span className='font-medium min-w-[100px]'>
                            Host:
                          </span>
                          <span className='text-foreground'>
                            {meeting.teacherId &&
                            typeof meeting.teacherId === 'object' &&
                            'name' in meeting.teacherId
                              ? (meeting.teacherId as any).name
                              : 'N/A'}
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
                                    copyToClipboard(meeting.meetingLink)
                                  }
                                  title='Copy link'
                                >
                                  <Copy className='h-4 w-4' />
                                </Button>
                              </div>
                            </div>

                            {isLive && (
                              <Button
                                className='w-full bg-green-600 hover:bg-green-700 text-white'
                                onClick={() => joinMeeting(meeting)}
                              >
                                <Video className='mr-2 h-4 w-4' />
                                Join Live Meeting
                                <ExternalLink className='ml-2 h-3 w-3' />
                              </Button>
                            )}

                            {isScheduled && canJoin && (
                              <Button
                                className='w-full'
                                onClick={() => joinMeeting(meeting)}
                              >
                                <Video className='mr-2 h-4 w-4' />
                                Join Meeting
                                <ExternalLink className='ml-2 h-3 w-3' />
                              </Button>
                            )}

                            {isScheduled && !canJoin && (
                              <div className='text-sm text-muted-foreground italic p-2 bg-secondary/50 rounded'>
                                Join link will be active 15 minutes before the
                                meeting
                              </div>
                            )}

                            {isCompleted && (
                              <div className='text-sm text-center p-2 bg-secondary rounded'>
                                This meeting has ended
                              </div>
                            )}

                            {isCancelled && (
                              <div className='text-sm text-center p-2 bg-destructive/15 rounded text-destructive-foreground'>
                                This meeting has been cancelled
                              </div>
                            )}
                          </>
                        ) : (
                          <div className='text-sm text-muted-foreground p-4 border border-dashed rounded-lg text-center bg-secondary/30'>
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
        </div>
      )}
    </div>
  );
}
