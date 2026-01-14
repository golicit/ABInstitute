import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Video,
  Users,
  User,
  Calendar,
  Clock,
  Plus,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { WebinarScheduler } from '@/components/WebinarScheduler';
import { webinarAPI, Webinar } from '@/services/api';

export default function WebinarDashboard() {
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScheduler, setShowScheduler] = useState(false);
  const [schedulerType, setSchedulerType] = useState<'webinar' | 'one_on_one'>(
    'webinar'
  );
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('upcoming');

  useEffect(() => {
    fetchWebinars();
  }, [activeTab]);

  const fetchWebinars = async () => {
    try {
      setLoading(true);
      let status: string | undefined;

      if (activeTab === 'upcoming') {
        status = 'scheduled';
      } else if (activeTab === 'live') {
        status = 'live';
      } else if (activeTab === 'completed') {
        status = 'completed';
      }

      const response = await webinarAPI.getWebinars({
        status,
        type:
          activeTab === 'all'
            ? undefined
            : activeTab === 'one_on_one'
            ? 'one_on_one'
            : 'webinar',
      });

      if (response.success) {
        let webinarsArray: Webinar[] = [];

        if (response.data) {
          if (typeof response.data === 'object' && 'data' in response.data) {
            const nestedData = (response.data as any).data;
            webinarsArray = Array.isArray(nestedData) ? nestedData : [];
          } else if (Array.isArray(response.data)) {
            webinarsArray = response.data;
          }
        }

        setWebinars(webinarsArray);
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to load webinars',
          variant: 'destructive',
        });
        setWebinars([]);
      }
    } catch (error) {
      console.error('Error fetching webinars:', error);
      toast({
        title: 'Error',
        description: 'Failed to load webinars',
        variant: 'destructive',
      });
      setWebinars([]);
    } finally {
      setLoading(false);
    }
  };

  const startSession = async (webinarId: string) => {
    try {
      const response = await webinarAPI.getWebinarById(webinarId);

      if (response.success && response.data) {
        const webinar = response.data;

        if (webinar.meetingLink) {
          window.open(webinar.meetingLink, '_blank', 'noopener,noreferrer');
          toast({
            title: 'Success',
            description: 'Joining session...',
          });
          fetchWebinars();
        } else {
          toast({
            title: 'Error',
            description: 'Meeting link not available',
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to load webinar details',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error starting session:', error);
      toast({
        title: 'Error',
        description: 'Failed to start session',
        variant: 'destructive',
      });
    }
  };

  const cancelSession = async (webinarId: string) => {
    if (!confirm('Are you sure you want to cancel this session?')) return;

    try {
      const response = await webinarAPI.cancelWebinar(webinarId);

      if (response.success) {
        toast({
          title: 'Success',
          description: 'Session cancelled successfully',
        });
        fetchWebinars();
      }
    } catch (error: any) {
      console.error('Error cancelling session:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel session',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':
        return 'bg-green-500 hover:bg-green-600';
      case 'scheduled':
        return 'bg-blue-500 hover:bg-blue-600';
      case 'completed':
        return 'bg-gray-500 hover:bg-gray-600';
      case 'cancelled':
        return 'bg-red-500 hover:bg-red-600';
      default:
        return 'bg-gray-500';
    }
  };

  const openScheduler = (
    type: 'webinar' | 'one_on_one',
    student?: any,
    batch?: any
  ) => {
    setSchedulerType(type);
    setSelectedStudent(student);
    setSelectedBatch(batch);
    setShowScheduler(true);
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
      </div>
    );
  }

  // Filter webinars for display
  const filteredWebinars = webinars.filter((webinar) => {
    if (activeTab === 'upcoming') return webinar.status === 'scheduled';
    if (activeTab === 'live') return webinar.status === 'live';
    if (activeTab === 'completed') return webinar.status === 'completed';
    return true; // 'all' tab
  });

  return (
    <div className='space-y-4 md:space-y-6 p-3 md:p-0'>
      {/* Header Section */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
        <div>
          <h1 className='text-2xl sm:text-3xl font-bold text-white'>
            Webinar & Sessions
          </h1>
          <p className='text-sm sm:text-base text-muted-foreground mt-1'>
            Manage webinars and 1:1 tutoring sessions
          </p>
        </div>

        <div className='flex flex-col sm:flex-row gap-2 w-full sm:w-auto'>
          <Button
            onClick={() => openScheduler('webinar')}
            className='w-full sm:w-auto justify-center'
            size='sm'
          >
            <Video className='mr-2 h-4 w-4' />
            <span className='hidden xs:inline'>Schedule Webinar</span>
            <span className='xs:hidden'>Webinar</span>
          </Button>
          <Button
            variant='outline'
            onClick={() => openScheduler('one_on_one')}
            className='w-full sm:w-auto justify-center'
            size='sm'
          >
            <User className='mr-2 h-4 w-4' />
            <span className='hidden xs:inline'>Schedule 1:1</span>
            <span className='xs:hidden'>1:1</span>
          </Button>
        </div>
      </div>

      {/* Stats Section */}
      <div className='grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3'>
        <Card className='shadow-sm'>
          <CardContent className='pt-4 pb-3 px-3 sm:px-4 sm:pt-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-xs sm:text-sm text-muted-foreground'>
                  Total Sessions
                </p>
                <h3 className='text-xl sm:text-2xl font-bold'>
                  {webinars.length}
                </h3>
              </div>
              <Calendar className='h-6 w-6 sm:h-8 sm:w-8 text-primary' />
            </div>
          </CardContent>
        </Card>

        <Card className='shadow-sm'>
          <CardContent className='pt-4 pb-3 px-3 sm:px-4 sm:pt-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-xs sm:text-sm text-muted-foreground'>
                  Upcoming
                </p>
                <h3 className='text-xl sm:text-2xl font-bold'>
                  {webinars.filter((w) => w.status === 'scheduled').length}
                </h3>
              </div>
              <Clock className='h-6 w-6 sm:h-8 sm:w-8 text-blue-500' />
            </div>
          </CardContent>
        </Card>

        <Card className='shadow-sm'>
          <CardContent className='pt-4 pb-3 px-3 sm:px-4 sm:pt-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-xs sm:text-sm text-muted-foreground'>
                  Live Now
                </p>
                <h3 className='text-xl sm:text-2xl font-bold'>
                  {webinars.filter((w) => w.status === 'live').length}
                </h3>
              </div>
              <Video className='h-6 w-6 sm:h-8 sm:w-8 text-green-500' />
            </div>
          </CardContent>
        </Card>

        <Card className='shadow-sm col-span-2 sm:col-span-1 md:col-span-1'>
          <CardContent className='pt-4 pb-3 px-3 sm:px-4 sm:pt-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-xs sm:text-sm text-muted-foreground'>
                  Completed
                </p>
                <h3 className='text-xl sm:text-2xl font-bold'>
                  {webinars.filter((w) => w.status === 'completed').length}
                </h3>
              </div>
              <Users className='h-6 w-6 sm:h-8 sm:w-8 text-gray-500' />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Section */}
      <div className='bg-background rounded-lg'>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className='overflow-x-auto pb-1'>
            <TabsList className='w-full min-w-max sm:w-auto inline-flex h-10'>
              <TabsTrigger
                value='upcoming'
                className='flex-1 sm:flex-none text-xs sm:text-sm px-3 sm:px-4'
              >
                Upcoming
              </TabsTrigger>
              <TabsTrigger
                value='live'
                className='flex-1 sm:flex-none text-xs sm:text-sm px-3 sm:px-4'
              >
                Live
              </TabsTrigger>
              <TabsTrigger
                value='completed'
                className='flex-1 sm:flex-none text-xs sm:text-sm px-3 sm:px-4'
              >
                Completed
              </TabsTrigger>
              <TabsTrigger
                value='all'
                className='flex-1 sm:flex-none text-xs sm:text-sm px-3 sm:px-4'
              >
                All
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={activeTab} className='mt-4 space-y-4'>
            {filteredWebinars.length === 0 ? (
              <Card className='shadow-sm'>
                <CardContent className='pt-6'>
                  <div className='text-center py-6 sm:py-8'>
                    <Video className='h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-3 sm:mb-4' />
                    <h3 className='text-base sm:text-lg font-medium'>
                      No sessions found
                    </h3>
                    <p className='text-sm sm:text-base text-muted-foreground mt-1'>
                      {activeTab === 'upcoming'
                        ? "You don't have any upcoming sessions"
                        : `No ${activeTab} sessions found`}
                    </p>
                    <Button
                      className='mt-3 sm:mt-4 w-full sm:w-auto'
                      onClick={() => openScheduler('webinar')}
                      size='sm'
                    >
                      <Plus className='mr-2 h-4 w-4' />
                      Schedule First Session
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4'>
                {filteredWebinars.map((webinar) => (
                  <Card
                    key={webinar._id}
                    className='shadow-sm hover:shadow-md transition-shadow'
                  >
                    <CardHeader className='pb-3 px-4 sm:px-6'>
                      <div className='flex flex-col sm:flex-row sm:items-start justify-between gap-3'>
                        <div className='space-y-2'>
                          <CardTitle className='flex items-center gap-2 text-base sm:text-lg'>
                            {webinar.type === 'webinar' ? (
                              <Users className='h-4 w-4 sm:h-5 sm:w-5 text-blue-500' />
                            ) : (
                              <User className='h-4 w-4 sm:h-5 sm:w-5 text-green-500' />
                            )}
                            <span className='truncate'>{webinar.title}</span>
                          </CardTitle>
                          <div className='flex flex-wrap items-center gap-1 sm:gap-2'>
                            <Badge
                              className={`${getStatusColor(
                                webinar.status
                              )} text-xs px-2 py-0`}
                            >
                              {webinar.status}
                            </Badge>
                            <Badge
                              variant='outline'
                              className='text-xs px-2 py-0'
                            >
                              {webinar.type === 'webinar' ? 'Webinar' : '1:1'}
                            </Badge>
                            {webinar.batch && (
                              <Badge
                                variant='secondary'
                                className='text-xs px-2 py-0'
                              >
                                {webinar.batch.batchName}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className='flex gap-2 self-end sm:self-auto'>
                          {webinar.status === 'scheduled' && (
                            <Button
                              size='sm'
                              onClick={() => startSession(webinar._id)}
                              className='text-xs h-8 px-3'
                            >
                              Start
                            </Button>
                          )}
                          {webinar.status === 'live' && (
                            <Button
                              size='sm'
                              onClick={() =>
                                window.open(webinar.meetingLink, '_blank')
                              }
                              className='text-xs h-8 px-3'
                            >
                              Join
                              <ExternalLink className='ml-1 h-3 w-3 sm:h-4 sm:w-4' />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className='pt-0 px-4 sm:px-6'>
                      <div className='space-y-2 sm:space-y-3'>
                        <div className='flex items-center gap-2 text-xs sm:text-sm'>
                          <Calendar className='h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0' />
                          <span>
                            {format(new Date(webinar.scheduledTime), 'PPp')}
                          </span>
                        </div>
                        <div className='flex items-center gap-2 text-xs sm:text-sm'>
                          <Clock className='h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0' />
                          <span>{webinar.duration} minutes</span>
                        </div>
                        {webinar.type === 'one_on_one' && webinar.studentId && (
                          <div className='text-xs sm:text-sm'>
                            <span className='font-medium'>Student:</span>{' '}
                            <span className='truncate'>
                              {webinar.studentId.name}
                            </span>
                          </div>
                        )}
                        <div className='text-xs sm:text-sm'>
                          <span className='font-medium'>Participants:</span>{' '}
                          <span>
                            {webinar.participants?.length || 0} invited •{' '}
                            {webinar.participants?.filter((p) => p.joined)
                              .length || 0}{' '}
                            joined
                          </span>
                        </div>
                      </div>

                      <div className='flex flex-wrap gap-2 mt-4'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => {
                            navigator.clipboard.writeText(webinar.meetingLink);
                            toast({
                              title: 'Copied!',
                              description: 'Meeting link copied to clipboard',
                            });
                          }}
                          className='flex-1 sm:flex-none text-xs h-8'
                        >
                          Copy Link
                        </Button>
                        {webinar.status === 'scheduled' && (
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => cancelSession(webinar._id)}
                            className='flex-1 sm:flex-none text-xs h-8'
                          >
                            <Trash2 className='h-3 w-3 sm:h-4 sm:w-4' />
                            <span className='ml-1'>Cancel</span>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Scheduler Modal - Responsive */}
      {showScheduler && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center p-3 sm:p-4 z-50'>
          <div className='bg-background rounded-lg p-4 sm:p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl'>
            <div className='flex items-center justify-between mb-4'>
              <h2 className='text-xl sm:text-2xl font-bold'>
                Schedule{' '}
                {schedulerType === 'webinar' ? 'Webinar' : '1:1 Session'}
              </h2>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => setShowScheduler(false)}
                className='h-8 w-8 p-0'
              >
                ✕
              </Button>
            </div>

            <WebinarScheduler
              type={schedulerType}
              studentId={selectedStudent?._id}
              studentName={selectedStudent?.name}
              batchId={selectedBatch?._id}
              batchName={selectedBatch?.batchName}
              onSuccess={() => {
                setShowScheduler(false);
                fetchWebinars();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
