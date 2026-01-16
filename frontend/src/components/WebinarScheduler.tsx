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
import { format, addMinutes, isToday, startOfDay } from 'date-fns';
import {
  CalendarIcon,
  CheckCircle,
  AlertCircle,
  Mail,
  Loader2,
  Users,
  User,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { webinarAPI, Batch, TutoringStudent } from '@/services/api';
import { toast } from '@/hooks/use-toast';
import { adminTutoringAPI } from '@/services/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

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

  // Time selection state
  const [tempTime, setTempTime] = useState<string>('');
  const [tempDate, setTempDate] = useState<Date | undefined>(new Date());
  const [showTimeConfirmDialog, setShowTimeConfirmDialog] = useState(false);
  const [selectedHours, setSelectedHours] = useState('12');
  const [selectedMinutes, setSelectedMinutes] = useState('00');
  const [selectedAmPm, setSelectedAmPm] = useState<'AM' | 'PM'>('PM');

  // Fetch batches and students based on type
  useEffect(() => {
    if (type === 'webinar') {
      fetchBatches();
    } else if (type === 'one_on_one') {
      fetchStudents();
    }

    // Set initial time to current time + 15 minutes
    const now = new Date();
    const initialTime = addMinutes(now, 15);
    setScheduledTime(initialTime);
    setTempDate(initialTime);

    // Format initial time for display
    const hours = initialTime.getHours();
    const minutes = initialTime.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const formattedHours = displayHours.toString().padStart(2, '0');
    const formattedMinutes = minutes.toString().padStart(2, '0');

    setSelectedHours(formattedHours);
    setSelectedMinutes(formattedMinutes);
    setSelectedAmPm(ampm);
    setTempTime(`${formattedHours}:${formattedMinutes} ${ampm}`);
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

  // In the useEffect, replace the empty fetchStudents function:
  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      // Use the webinarAPI.getStudentsWithTutoring() function
      const response = await webinarAPI.getStudentsWithTutoring();

      if (response.success && response.data) {
        setStudents(response.data);

        // Log for debugging
        console.log(`Loaded ${response.data.length} students with tutoring`);

        // If studentId was passed as prop, pre-select it
        if (studentId && !selectedStudentId && response.data.length > 0) {
          const preSelected = response.data.find((s) => s._id === studentId);
          if (preSelected) {
            setSelectedStudentId(preSelected._id);
            setSelectedStudentName(preSelected.name);
          }
        }
      } else {
        console.error('Failed to load tutoring students:', response.message);
        toast({
          title: 'Error',
          description:
            response.message || 'Failed to load students with tutoring',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching students with tutoring:', error);
      toast({
        title: 'Error',
        description: 'Failed to load students with tutoring',
        variant: 'destructive',
      });
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setTempDate(date);
  };

  const handleTimeChange = () => {
    if (!tempDate) {
      toast({
        title: 'Error',
        description: 'Please select a date first',
        variant: 'destructive',
      });
      return;
    }

    // Convert 12-hour time to 24-hour
    let hours = parseInt(selectedHours);
    const minutes = parseInt(selectedMinutes);

    if (selectedAmPm === 'PM' && hours < 12) {
      hours += 12;
    } else if (selectedAmPm === 'AM' && hours === 12) {
      hours = 0;
    }

    // Create new date with selected time
    const newDateTime = new Date(tempDate);
    newDateTime.setHours(hours, minutes, 0, 0);

    // Check if time is in the past
    const now = new Date();
    if (newDateTime < now) {
      toast({
        title: 'Invalid Time',
        description: 'Please select a future time',
        variant: 'destructive',
      });
      return;
    }

    setScheduledTime(newDateTime);
    setShowTimeConfirmDialog(true);
  };

  const confirmDateTime = () => {
    if (scheduledTime) {
      setShowTimeConfirmDialog(false);
      toast({
        title: 'Time Set',
        description: `Meeting scheduled for ${format(scheduledTime, 'PPP p')}`,
      });
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

  // Generate time options
  const hours = Array.from({ length: 12 }, (_, i) => {
    const hour = i + 1;
    return hour.toString().padStart(2, '0');
  });

  const minutes = ['00', '15', '30', '45'];

  return (
    <>
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
                <span className='text-sm'>
                  Loading students with tutoring...
                </span>
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
                1:1 session will be scheduled with this student who has
                purchased tutoring.
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
          {/* Date Selection */}
          <div className='space-y-2'>
            <Label>Select Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant='outline'
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !tempDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className='mr-2 h-4 w-4' />
                  {tempDate ? (
                    format(tempDate, 'PPP')
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className='w-auto p-0'>
                <Calendar
                  mode='single'
                  selected={tempDate}
                  onSelect={handleDateSelect}
                  disabled={(date) => {
                    // Allow today and future dates
                    const today = startOfDay(new Date());
                    return date < today;
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Selection */}
          <div className='space-y-2'>
            <Label>Select Time *</Label>
            <div className='flex gap-2'>
              {/* Hours */}
              <Select value={selectedHours} onValueChange={setSelectedHours}>
                <SelectTrigger className='flex-1'>
                  <SelectValue placeholder='Hour'>
                    <div className='flex items-center gap-2'>
                      <Clock className='h-4 w-4' />
                      <span>{selectedHours}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {hours.map((hour) => (
                    <SelectItem key={hour} value={hour}>
                      {hour}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Minutes */}
              <Select
                value={selectedMinutes}
                onValueChange={setSelectedMinutes}
              >
                <SelectTrigger className='flex-1'>
                  <SelectValue placeholder='Min'>
                    <span>{selectedMinutes}</span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {minutes.map((minute) => (
                    <SelectItem key={minute} value={minute}>
                      {minute}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* AM/PM */}
              <Select
                value={selectedAmPm}
                onValueChange={(value: 'AM' | 'PM') => setSelectedAmPm(value)}
              >
                <SelectTrigger className='flex-1'>
                  <SelectValue placeholder='AM/PM'>
                    <span>{selectedAmPm}</span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='AM'>AM</SelectItem>
                  <SelectItem value='PM'>PM</SelectItem>
                </SelectContent>
              </Select>

              {/* Set Time Button */}
              <Button
                type='button'
                onClick={handleTimeChange}
                variant='default'
                className='min-w-[80px]'
              >
                Set Time
              </Button>
            </div>
          </div>
        </div>

        {/* Selected Time Display */}
        {scheduledTime && (
          <div className='p-3 border border-blue-200 dark:border-blue-800 rounded-md'>
            <div className='flex items-center gap-2'>
              <CalendarIcon className='h-4 w-4 text-blue-500' />
              <span className='font-medium text-blue-700 dark:text-blue-300'>
                Scheduled Time:
              </span>
              <span className='ml-2 font-semibold'>
                {format(scheduledTime, 'PPPP p')}
              </span>
            </div>
          </div>
        )}

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

        {/* Email Status Indicator */}
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
                  batches.find((b) => b._id === selectedBatchId)
                    ?.studentCount || 0
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

      {/* Time Confirmation Dialog */}
      <Dialog
        open={showTimeConfirmDialog}
        onOpenChange={setShowTimeConfirmDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Meeting Time</DialogTitle>
          </DialogHeader>
          <div className='py-4'>
            {scheduledTime && (
              <div className='text-center'>
                <div className='inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 mb-4'>
                  <CalendarIcon className='h-8 w-8 text-blue-600 dark:text-blue-400' />
                </div>
                <p className='text-lg font-semibold mb-2'>
                  {format(scheduledTime, 'PPPP')}
                </p>
                <p className='text-2xl font-bold text-blue-600 dark:text-blue-400'>
                  {format(scheduledTime, 'h:mm a')}
                </p>
                <p className='text-sm text-muted-foreground mt-2'>
                  Duration: {duration} minutes
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setShowTimeConfirmDialog(false)}
            >
              Change Time
            </Button>
            <Button onClick={confirmDateTime}>Confirm Time</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
