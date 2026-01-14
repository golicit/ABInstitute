// components/WebinarScheduler.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import {
  CalendarIcon,
  CheckCircle,
  AlertCircle,
  Mail,
  Loader2,
  Users,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { webinarAPI, Batch, TutoringStudent } from '@/services/api';
import { toast } from '@/hooks/use-toast';
import { adminTutoringAPI } from '@/services/api';

interface WebinarSchedulerProps {
  type: 'webinar' | 'one_on_one';
  studentId?: string;
  studentName?: string;
  batchId?: string;
  batchName?: string;
  onSuccess?: () => void;
}

export function WebinarScheduler({
  type,
  studentId,
  studentName,
  batchId,
  batchName,
  onSuccess,
}: WebinarSchedulerProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledTime, setScheduledTime] = useState<Date>();
  const [duration, setDuration] = useState(60);
  const [loading, setLoading] = useState(false);
  const [emailStatus, setEmailStatus] = useState<
    'idle' | 'sending' | 'sent' | 'failed'
  >('idle');

  // For batch/student selection
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<TutoringStudent[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>(batchId || '');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    studentId || ''
  );
  const [selectedStudentName, setSelectedStudentName] = useState<string>(
    studentName || ''
  );
  const [selectedBatchName, setSelectedBatchName] = useState<string>(
    batchName || ''
  );
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Fetch batches and students based on type
  useEffect(() => {
    if (type === 'webinar') {
      fetchBatches();
    } else if (type === 'one_on_one') {
      fetchStudents();
    }
  }, [type]);

  const fetchBatches = async () => {
    setLoadingBatches(true);
    try {
      const response = await webinarAPI.getBatches();
      if (response.success && response.data) {
        setBatches(response.data);

        // If batchId was passed as prop, pre-select it
        if (batchId && !selectedBatchId) {
          const preSelected = response.data.find((b) => b._id === batchId);
          if (preSelected) {
            setSelectedBatchId(preSelected._id);
            setSelectedBatchName(preSelected.batchName);
          }
        }
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to load batches',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching batches:', error);
      toast({
        title: 'Error',
        description: 'Failed to load batches',
        variant: 'destructive',
      });
    } finally {
      setLoadingBatches(false);
    }
  };

  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      console.log('Fetching students for 1:1 sessions...');

      // Use the SAME API as the dashboard
      const response = await adminTutoringAPI.getTutoringDashboard();

      console.log('Dashboard API response:', response);

      if (response.success) {
        // Combine all users from ALL categories
        const allUsers = [
          ...(response.pendingUsers || []),
          ...(response.activeUsers || []),
          ...(response.completedUsers || []),
        ];

        console.log(`Total users with tutoring: ${allUsers.length}`);

        // Transform to the format needed for dropdown
        const tutoringStudents = allUsers.map((user) => ({
          _id: user._id || user.id,
          name: user.name,
          email: user.email,
          batch: user.batch || '',
          tutoringStatus: user.tutoringStatus || 'none',
          tutoring: {
            status: user.tutoringStatus || 'none',
            purchasedAt:
              user.tutoringPurchasedAt || user.tutoring?.purchasedAt || null,
          },
        }));

        console.log('Transformed students:', tutoringStudents);

        setStudents(tutoringStudents);

        // If studentId was passed as prop, pre-select it
        if (studentId && !selectedStudentId && tutoringStudents.length > 0) {
          const preSelected = tutoringStudents.find((s) => s._id === studentId);
          if (preSelected) {
            setSelectedStudentId(preSelected._id);
            setSelectedStudentName(preSelected.name);
            console.log('Pre-selected student:', preSelected.name);
          }
        }

        if (tutoringStudents.length === 0) {
          console.warn('No students found in dashboard response');
          toast({
            title: 'No Students Found',
            description: 'No students with tutoring purchases were found.',
            variant: 'destructive',
          });
        }
      } else {
        console.error('Dashboard API error:', response.message);
        toast({
          title: 'Error',
          description: response.message || 'Failed to load students',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error fetching students:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast({
        title: 'Error',
        description: 'Failed to load students from server',
        variant: 'destructive',
      });
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !scheduledTime) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (type === 'webinar' && !selectedBatchId) {
      toast({
        title: 'Error',
        description: 'Please select a batch for the webinar',
        variant: 'destructive',
      });
      return;
    }

    if (type === 'one_on_one' && !selectedStudentId) {
      toast({
        title: 'Error',
        description: 'Please select a student for the 1:1 session',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setEmailStatus('sending');

    try {
      const data = {
        title,
        description,
        type,
        scheduledTime: scheduledTime.toISOString(),
        duration,
        ...(type === 'webinar' && { batchId: selectedBatchId }),
        ...(type === 'one_on_one' && { studentId: selectedStudentId }),
      };

      const response = await webinarAPI.scheduleWebinar(data);

      if (response.success) {
        setEmailStatus('sent');
        toast({
          title: 'Success',
          description: `${
            type === 'webinar' ? 'Webinar' : '1:1 Session'
          } scheduled successfully! Invitations have been sent.`,
        });

        // Show email sent confirmation
        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 2000);
      } else {
        setEmailStatus('failed');
        toast({
          title: 'Error',
          description: response.message || 'Failed to schedule session',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      setEmailStatus('failed');
      toast({
        title: 'Error',
        description: error.message || 'Failed to schedule session',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getEmailStatusIcon = () => {
    switch (emailStatus) {
      case 'sending':
        return <Loader2 className='h-4 w-4 animate-spin' />;
      case 'sent':
        return <CheckCircle className='h-4 w-4 text-green-500' />;
      case 'failed':
        return <AlertCircle className='h-4 w-4 text-red-500' />;
      default:
        return <Mail className='h-4 w-4' />;
    }
  };

  const getEmailStatusText = () => {
    switch (emailStatus) {
      case 'sending':
        return 'Sending invitations...';
      case 'sent':
        return 'Invitations sent successfully!';
      case 'failed':
        return 'Failed to send invitations';
      default:
        return 'Invitations will be sent after scheduling';
    }
  };

  const formatTutoringStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      active: 'Active',
      pending: 'Pending',
      completed: 'Completed',
      none: 'None',
    };
    return statusMap[status] || status;
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-6'>
      <div className='flex items-center gap-3 mb-2'>
        {type === 'webinar' ? (
          <>
            <Users className='h-6 w-6 text-blue-500' />
            <div>
              <h3 className='font-semibold'>Schedule Webinar</h3>
              <p className='text-sm text-muted-foreground'>
                Schedule a webinar for an entire batch
              </p>
            </div>
          </>
        ) : (
          <>
            <User className='h-6 w-6 text-green-500' />
            <div>
              <h3 className='font-semibold'>Schedule 1:1 Session</h3>
              <p className='text-sm text-muted-foreground'>
                Schedule a private session with a student
              </p>
            </div>
          </>
        )}
      </div>

      <div className='space-y-2'>
        <Label htmlFor='title'>Session Title *</Label>
        <Input
          id='title'
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={`Enter ${
            type === 'webinar' ? 'webinar' : '1:1 session'
          } title`}
          required
        />
      </div>

      <div className='space-y-2'>
        <Label htmlFor='description'>Description</Label>
        <Textarea
          id='description'
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={`Enter ${
            type === 'webinar' ? 'webinar' : 'session'
          } description`}
          rows={3}
        />
      </div>

      {type === 'webinar' && (
        <div className='space-y-2'>
          <Label htmlFor='batch'>Select Batch *</Label>
          {loadingBatches ? (
            <div className='flex items-center gap-2 p-3 border rounded-md'>
              <Loader2 className='h-4 w-4 animate-spin' />
              <span className='text-sm'>Loading batches...</span>
            </div>
          ) : (
            <Select
              value={selectedBatchId}
              onValueChange={(value) => {
                const batch = batches.find((b) => b._id === value);
                setSelectedBatchId(value);
                setSelectedBatchName(batch?.batchName || '');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder='Select a batch'>
                  {selectedBatchName ? (
                    <div className='flex items-center gap-2'>
                      <Users className='h-4 w-4' />
                      <span>{selectedBatchName}</span>
                    </div>
                  ) : (
                    'Select a batch'
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {batches.length === 0 ? (
                  <SelectItem value='no-batches' disabled>
                    No batches found
                  </SelectItem>
                ) : (
                  batches.map((batch) => (
                    <SelectItem key={batch._id} value={batch._id}>
                      <div className='flex flex-col'>
                        <span className='font-medium'>{batch.batchName}</span>
                        <span className='text-xs text-muted-foreground'>
                          {batch.studentCount} students • Created{' '}
                          {new Date(batch.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
          {selectedBatchId && (
            <p className='text-sm text-muted-foreground mt-1'>
              This webinar will be sent to all{' '}
              {batches.find((b) => b._id === selectedBatchId)?.studentCount ||
                0}{' '}
              students in the selected batch.
            </p>
          )}
        </div>
      )}

      {type === 'one_on_one' && (
        <div className='space-y-2'>
          <Label htmlFor='student'>Select Student (with Tutoring) *</Label>
          {loadingStudents ? (
            <div className='flex items-center gap-2 p-3 border rounded-md'>
              <Loader2 className='h-4 w-4 animate-spin' />
              <span className='text-sm'>Loading students with tutoring...</span>
            </div>
          ) : (
            <Select
              value={selectedStudentId}
              onValueChange={(value) => {
                const student = students.find((s) => s._id === value);
                setSelectedStudentId(value);
                setSelectedStudentName(student?.name || '');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder='Select a student with tutoring'>
                  {selectedStudentName ? (
                    <div className='flex items-center gap-2'>
                      <User className='h-4 w-4' />
                      <span>{selectedStudentName}</span>
                    </div>
                  ) : (
                    'Select a student'
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {students.length === 0 ? (
                  <SelectItem value='no-students' disabled>
                    No students with tutoring found
                  </SelectItem>
                ) : (
                  students.map((student) => (
                    <SelectItem key={student._id} value={student._id}>
                      <div className='flex flex-col'>
                        <span className='font-medium'>{student.name}</span>
                        <span className='text-xs text-muted-foreground'>
                          {student.email} • Tutoring:{' '}
                          {formatTutoringStatus(student.tutoringStatus)}
                          {student.tutoring?.purchasedAt &&
                            ` • Purchased: ${new Date(
                              student.tutoring.purchasedAt
                            ).toLocaleDateString()}`}
                          {student.batch && ` • Batch: ${student.batch}`}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
          {selectedStudentId && (
            <p className='text-sm text-muted-foreground mt-1'>
              1:1 session will be scheduled with this student who has purchased
              tutoring.
            </p>
          )}
          {students.length === 0 && !loadingStudents && (
            <div className='p-3 bg-yellow-50 border border-yellow-200 rounded-md mt-2'>
              <p className='text-sm text-yellow-800 font-medium'>
                No students with tutoring found
              </p>
              <p className='text-xs text-yellow-700 mt-1'>
                Students must purchase tutoring to be available for 1:1
                sessions.
              </p>
            </div>
          )}
        </div>
      )}

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <div className='space-y-2'>
          <Label>Date & Time *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant='outline'
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !scheduledTime && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className='mr-2 h-4 w-4' />
                {scheduledTime ? (
                  format(scheduledTime, 'PPP HH:mm')
                ) : (
                  <span>Pick a date and time</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className='w-auto p-0'>
              <Calendar
                mode='single'
                selected={scheduledTime}
                onSelect={setScheduledTime}
                disabled={(date) => date < new Date()}
                initialFocus
              />
              <div className='p-3 border-t'>
                <Input
                  type='time'
                  value={scheduledTime ? format(scheduledTime, 'HH:mm') : ''}
                  onChange={(e) => {
                    if (scheduledTime && e.target.value) {
                      const [hours, minutes] = e.target.value.split(':');
                      const newDate = new Date(scheduledTime);
                      newDate.setHours(parseInt(hours), parseInt(minutes));
                      setScheduledTime(newDate);
                    } else if (!scheduledTime && e.target.value) {
                      // If no date selected yet, use today
                      const today = new Date();
                      const [hours, minutes] = e.target.value.split(':');
                      today.setHours(parseInt(hours), parseInt(minutes));
                      setScheduledTime(today);
                    }
                  }}
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className='space-y-2'>
          <Label htmlFor='duration'>Duration *</Label>
          <Select
            value={duration.toString()}
            onValueChange={(value) => setDuration(parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder='Select duration' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='30'>30 minutes</SelectItem>
              <SelectItem value='45'>45 minutes</SelectItem>
              <SelectItem value='60'>60 minutes</SelectItem>
              <SelectItem value='90'>90 minutes</SelectItem>
              <SelectItem value='120'>120 minutes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Email Status Indicator - Using theme variables */}
      <div className='p-4 rounded-lg bg-card border border-border'>
        <div className='flex items-center gap-3 mb-2'>
          <div
            className={cn(
              emailStatus === 'sent'
                ? 'text-green-500'
                : emailStatus === 'failed'
                ? 'text-red-500'
                : emailStatus === 'sending'
                ? 'text-blue-500'
                : 'text-muted-foreground'
            )}
          >
            {getEmailStatusIcon()}
          </div>
          <div>
            <p className='font-medium text-foreground'>Email Invitations</p>
            <p
              className={cn(
                'text-sm',
                emailStatus === 'sent'
                  ? 'text-green-600 dark:text-green-400'
                  : emailStatus === 'failed'
                  ? 'text-red-600 dark:text-red-400'
                  : emailStatus === 'sending'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-muted-foreground'
              )}
            >
              {getEmailStatusText()}
            </p>
          </div>
        </div>
        <p className='text-sm text-muted-foreground'>
          {type === 'webinar'
            ? `All ${
                batches.find((b) => b._id === selectedBatchId)?.studentCount ||
                0
              } students in the selected batch will receive email invitations with the Google Meet link.`
            : 'The selected student will receive an email invitation with the Google Meet link.'}
        </p>
      </div>

      <div className='flex justify-end gap-3 pt-4 border-t'>
        <Button
          type='button'
          variant='outline'
          onClick={() => onSuccess?.()}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type='submit'
          disabled={
            loading ||
            !title ||
            !scheduledTime ||
            (type === 'webinar' && !selectedBatchId) ||
            (type === 'one_on_one' && !selectedStudentId)
          }
          className='min-w-[140px]'
        >
          {loading ? (
            <>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              Scheduling...
            </>
          ) : (
            `Schedule ${type === 'webinar' ? 'Webinar' : '1:1 Session'}`
          )}
        </Button>
      </div>
    </form>
  );
}
