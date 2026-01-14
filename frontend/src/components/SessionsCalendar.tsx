import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  Users,
  User,
  Video,
  ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { webinarAPI } from '../services/api';

interface Session {
  _id: string;
  title: string;
  type: 'webinar' | 'one_on_one';
  scheduledTime: string;
  duration: number;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  meetingLink: string;
  teacherId: {
    name: string;
    email: string;
  };
  studentId?: {
    name: string;
    email: string;
  };
  batch?: {
    batchName: string;
  };
}

export function SessionsCalendar() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'live'>('upcoming');

  useEffect(() => {
    fetchSessions();
  }, [filter]);

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/webinars/my-sessions', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        // Filter based on selection
        const now = new Date();
        let filtered = data.data;

        if (filter === 'upcoming') {
          filtered = filtered.filter(
            (s: Session) =>
              new Date(s.scheduledTime) > now && s.status === 'scheduled'
          );
        } else if (filter === 'live') {
          filtered = filtered.filter((s: Session) => s.status === 'live');
        }

        setSessions(filtered);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load sessions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const joinSession = (session: Session) => {
    if (
      session.status === 'live' ||
      new Date(session.scheduledTime) <= new Date()
    ) {
      window.open(session.meetingLink, '_blank', 'noopener,noreferrer');
    } else {
      toast({
        title: 'Session not started',
        description: 'This session has not started yet',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':
        return 'bg-green-500';
      case 'scheduled':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-gray-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <CardTitle className='flex items-center gap-2'>
            <Calendar className='h-5 w-5' />
            My Sessions
          </CardTitle>
          <div className='flex gap-2'>
            {['upcoming', 'live', 'all'].map((f) => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'outline'}
                size='sm'
                onClick={() => setFilter(f as any)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <div className='text-center py-8'>
            <Video className='h-12 w-12 mx-auto text-muted-foreground mb-4' />
            <h3 className='text-lg font-medium'>No sessions found</h3>
            <p className='text-muted-foreground'>
              {filter === 'upcoming'
                ? "You don't have any upcoming sessions"
                : 'No sessions match your filter'}
            </p>
          </div>
        ) : (
          <div className='space-y-4'>
            {sessions.map((session) => (
              <div
                key={session._id}
                className='border rounded-lg p-4 hover:bg-accent/50 transition-colors'
              >
                <div className='flex items-start justify-between'>
                  <div className='space-y-2'>
                    <div className='flex items-center gap-2'>
                      <h3 className='font-semibold'>{session.title}</h3>
                      <Badge className={getStatusColor(session.status)}>
                        {session.status}
                      </Badge>
                      <Badge variant='outline'>
                        {session.type === 'webinar' ? 'Webinar' : '1:1'}
                      </Badge>
                    </div>

                    <div className='flex items-center gap-4 text-sm text-muted-foreground'>
                      <div className='flex items-center gap-1'>
                        <Clock className='h-4 w-4' />
                        {format(new Date(session.scheduledTime), 'PPp')}
                      </div>
                      <div className='flex items-center gap-1'>
                        {session.type === 'webinar' ? (
                          <>
                            <Users className='h-4 w-4' />
                            {session.batch?.batchName || 'Batch'}
                          </>
                        ) : (
                          <>
                            <User className='h-4 w-4' />
                            {session.studentId?.name || 'Student'}
                          </>
                        )}
                      </div>
                      <div>Duration: {session.duration} min</div>
                    </div>

                    <p className='text-sm'>Host: {session.teacherId.name}</p>
                  </div>

                  <Button
                    onClick={() => joinSession(session)}
                    disabled={session.status === 'cancelled'}
                  >
                    {session.status === 'live' ? 'Join Live' : 'Join'}
                    <ExternalLink className='ml-2 h-4 w-4' />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
