// pages/admin/TutoringDashboard.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Users,
  Clock,
  CheckCircle,
  UserCheck,
  Send,
  Search,
  Mail,
  Video,
  UserPlus,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { apiClient } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { adminTutoringAPI } from '@/services/api';

interface Student {
  _id: string;
  name: string;
  email: string;
  tutoringStatus: 'none' | 'pending' | 'active' | 'completed';
  tutoringPurchasedAt: string;
  mentorAvailabilityNotified: boolean;
  createdAt: string;
  tutoring?: {
    status: string;
    purchasedAt: string;
    activatedAt?: string;
  };
}

interface DashboardResponse {
  success: boolean;
  pendingUsers: Student[];
  activeUsers: Student[];
  completedUsers: Student[];
  stats: {
    total: number;
    pending: number;
    active: number;
    completed: number;
  };
}

interface ActivateResponse {
  success: boolean;
  message: string;
  user: {
    id: string;
    name: string;
    email: string;
    tutoringStatus: string;
  };
}

interface BulkActivateResponse {
  success: boolean;
  message: string;
  results: Array<{
    userId: string;
    name: string;
    email: string;
    status: string;
  }>;
  errors: Array<{
    userId: string;
    error: string;
  }>;
}

interface NotificationResponse {
  success: boolean;
  message: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  notification: {
    type: string;
    message: string;
    sentAt: string;
  };
}

export default function TutoringDashboard() {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [activating, setActivating] = useState<string | null>(null);
  const [bulkActivating, setBulkActivating] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    active: 0,
    completed: 0,
  });

  // Check if user is admin
  useEffect(() => {
    if (!authUser || !['admin', 'owner'].includes(authUser.role)) {
      toast({
        title: 'Access Denied',
        description: 'Admin access required',
        variant: 'destructive',
      });
      navigate('/dashboard');
    }
  }, [authUser, navigate]);

  // Fetch students
  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await adminTutoringAPI.getTutoringDashboard();

      if (response.success) {
        // Combine all users
        const allUsers = [
          ...(response.pendingUsers || []),
          ...(response.activeUsers || []),
          ...(response.completedUsers || []),
        ];

        // Map the data to match our Student interface
        const mappedStudents = allUsers.map((user) => ({
          _id: user._id,
          name: user.name,
          email: user.email,
          tutoringStatus:
            (user.tutoring?.status as 'pending' | 'active' | 'completed') ||
            'pending',
          tutoringPurchasedAt:
            user.tutoring?.purchasedAt || new Date().toISOString(),
          mentorAvailabilityNotified: false,
          createdAt: user.createdAt || new Date().toISOString(),
          tutoring: user.tutoring,
        }));

        setStudents(mappedStudents);
        setFilteredStudents(mappedStudents);
        setStats(
          response.stats || {
            total: mappedStudents.length,
            pending: response.pendingUsers?.length || 0,
            active: response.activeUsers?.length || 0,
            completed: response.completedUsers?.length || 0,
          }
        );
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to load students',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      toast({
        title: 'Error',
        description: 'Failed to load students',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authUser?.role === 'admin' || authUser?.role === 'owner') {
      fetchStudents();

      // Refresh data every 30 seconds
      const interval = setInterval(() => {
        fetchStudents();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [authUser]);

  // Filter students
  useEffect(() => {
    let filtered = students;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (student) =>
          student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(
        (student) => student.tutoringStatus === selectedStatus
      );
    }

    setFilteredStudents(filtered);
  }, [searchTerm, selectedStatus, students]);

  // Activate single student
  const activateStudent = async (userId: string) => {
    setActivating(userId);
    try {
      const response = await adminTutoringAPI.activateTutoring(userId);

      if (response.success) {
        toast({
          title: 'Success!',
          description: `Tutoring activated for ${
            response.user?.name || 'student'
          }`,
        });

        // Update local state
        setStudents(
          students.map((student) =>
            student._id === userId
              ? {
                  ...student,
                  tutoringStatus: 'active',
                  mentorAvailabilityNotified: false,
                  tutoring: {
                    ...student.tutoring,
                    status: 'active',
                    activatedAt: new Date().toISOString(),
                  },
                }
              : student
          )
        );

        // Update stats
        setStats((prev) => ({
          ...prev,
          pending: prev.pending - 1,
          active: prev.active + 1,
        }));
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to activate tutoring',
        variant: 'destructive',
      });
    } finally {
      setActivating(null);
    }
  };

  // Bulk activate students
  const bulkActivateStudents = async () => {
    if (selectedStudents.length === 0) {
      toast({
        title: 'No students selected',
        description: 'Please select at least one student',
        variant: 'destructive',
      });
      return;
    }

    setBulkActivating(true);
    try {
      const response = await adminTutoringAPI.bulkActivateTutoring(
        selectedStudents
      );

      if (response.success) {
        const activatedCount =
          response.results?.filter((r) => r.status === 'activated').length || 0;

        toast({
          title: 'Success!',
          description: `Activated ${activatedCount} students`,
        });

        // Update local state
        setStudents(
          students.map((student) =>
            selectedStudents.includes(student._id)
              ? {
                  ...student,
                  tutoringStatus: 'active',
                  mentorAvailabilityNotified: false,
                  tutoring: {
                    ...student.tutoring,
                    status: 'active',
                    activatedAt: new Date().toISOString(),
                  },
                }
              : student
          )
        );

        // Update stats
        const pendingCount = selectedStudents.filter((id) => {
          const student = students.find((s) => s._id === id);
          return student?.tutoringStatus === 'pending';
        }).length;

        setStats((prev) => ({
          ...prev,
          pending: prev.pending - pendingCount,
          active: prev.active + pendingCount,
        }));

        // Clear selection
        setSelectedStudents([]);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to activate students',
        variant: 'destructive',
      });
    } finally {
      setBulkActivating(false);
    }
  };

  // Send notification to student
  const sendNotification = async (studentId: string) => {
    try {
      const student = students.find((s) => s._id === studentId);
      if (!student) return;

      const response = await adminTutoringAPI.sendNotification({
        userId: studentId,
        type: 'mentor_available',
        message: 'Your mentor is now available for tutoring sessions!',
      });

      if (response.success) {
        toast({
          title: 'Notification Sent',
          description: `Notification sent to ${student.name}`,
        });

        // Update notification flag
        setStudents(
          students.map((s) =>
            s._id === studentId ? { ...s, mentorAvailabilityNotified: true } : s
          )
        );
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send notification',
        variant: 'destructive',
      });
    }
  };

  // Toggle student selection
  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  // Select all visible
  const selectAllVisible = () => {
    const visibleIds = filteredStudents.map((student) => student._id);
    if (selectedStudents.length === visibleIds.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(visibleIds);
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4'></div>
          <p className='text-gray-400'>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen p-6 bg-background'>
      <div className='max-w-7xl mx-auto'>
        {/* Header */}
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-white mb-2'>
            Tutoring Management Dashboard
          </h1>
          <p className='text-gray-400'>
            Manage student tutoring status and notifications
          </p>
        </div>

        {/* Stats Cards */}
        <div className='grid grid-cols-1 md:grid-cols-4 gap-6 mb-8'>
          <Card className='bg-[#111827] border-border/40'>
            <CardContent className='p-6'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm text-gray-400'>Total Students</p>
                  <p className='text-2xl font-bold text-white'>{stats.total}</p>
                </div>
                <Users className='w-8 h-8 text-blue-500' />
              </div>
            </CardContent>
          </Card>

          <Card className='bg-[#111827] border-border/40'>
            <CardContent className='p-6'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm text-gray-400'>Pending Activation</p>
                  <p className='text-2xl font-bold text-yellow-500'>
                    {stats.pending}
                  </p>
                </div>
                <Clock className='w-8 h-8 text-yellow-500' />
              </div>
            </CardContent>
          </Card>

          <Card className='bg-[#111827] border-border/40'>
            <CardContent className='p-6'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm text-gray-400'>Active Sessions</p>
                  <p className='text-2xl font-bold text-green-500'>
                    {stats.active}
                  </p>
                </div>
                <Video className='w-8 h-8 text-green-500' />
              </div>
            </CardContent>
          </Card>

          <Card className='bg-[#111827] border-border/40'>
            <CardContent className='p-6'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm text-gray-400'>Completed</p>
                  <p className='text-2xl font-bold text-blue-500'>
                    {stats.completed}
                  </p>
                </div>
                <CheckCircle className='w-8 h-8 text-blue-500' />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className='mb-6 p-4 bg-[#111827] rounded-lg border border-border/40'>
          <div className='flex flex-col md:flex-row gap-4 items-center justify-between'>
            <div className='flex flex-col md:flex-row gap-4 w-full md:w-auto'>
              <div className='relative flex-1 md:w-64'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
                <Input
                  placeholder='Search students...'
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className='pl-10 bg-gray-900 border-gray-700'
                />
              </div>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className='px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white'
              >
                <option value='all'>All Status</option>
                <option value='pending'>Pending</option>
                <option value='active'>Active</option>
                <option value='completed'>Completed</option>
              </select>
            </div>

            <div className='flex gap-3'>
              {selectedStudents.length > 0 && (
                <Button
                  onClick={bulkActivateStudents}
                  disabled={bulkActivating}
                  className='bg-green-600 hover:bg-green-700'
                >
                  {bulkActivating ? (
                    <>
                      <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
                      Activating...
                    </>
                  ) : (
                    <>
                      <UserCheck className='w-4 h-4 mr-2' />
                      Activate Selected ({selectedStudents.length})
                    </>
                  )}
                </Button>
              )}

              <Button
                onClick={fetchStudents}
                variant='outline'
                className='border-gray-600'
              >
                <Search className='w-4 h-4 mr-2' />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Students Table */}
        <Card className='bg-[#111827] border-border/40'>
          <CardContent className='p-0'>
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead>
                  <tr className='border-b border-gray-700/50'>
                    <th className='text-left p-4'>
                      <input
                        type='checkbox'
                        checked={
                          filteredStudents.length > 0 &&
                          selectedStudents.length === filteredStudents.length
                        }
                        onChange={selectAllVisible}
                        className='rounded border-gray-600'
                      />
                    </th>
                    <th className='text-left p-4 text-gray-400 font-medium'>
                      Student
                    </th>
                    <th className='text-left p-4 text-gray-400 font-medium'>
                      Status
                    </th>
                    <th className='text-left p-4 text-gray-400 font-medium'>
                      Purchased On
                    </th>
                    <th className='text-left p-4 text-gray-400 font-medium'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className='p-8 text-center text-gray-400'>
                        <Users className='w-12 h-12 mx-auto mb-4 text-gray-600' />
                        <p>No students found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => (
                      <tr
                        key={student._id}
                        className='border-b border-gray-700/30 hover:bg-gray-800/30'
                      >
                        <td className='p-4'>
                          <input
                            type='checkbox'
                            checked={selectedStudents.includes(student._id)}
                            onChange={() => toggleStudentSelection(student._id)}
                            className='rounded border-gray-600'
                          />
                        </td>
                        <td className='p-4'>
                          <div>
                            <p className='font-medium text-white'>
                              {student.name}
                            </p>
                            <p className='text-sm text-gray-400'>
                              {student.email}
                            </p>
                          </div>
                        </td>
                        <td className='p-4'>
                          <Badge
                            className={
                              student.tutoringStatus === 'pending'
                                ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
                                : student.tutoringStatus === 'active'
                                ? 'bg-green-500/10 text-green-500 border-green-500/30'
                                : 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                            }
                          >
                            {student.tutoringStatus === 'pending' && (
                              <Clock className='w-3 h-3 mr-1' />
                            )}
                            {student.tutoringStatus === 'active' && (
                              <CheckCircle className='w-3 h-3 mr-1' />
                            )}
                            {student.tutoringStatus.charAt(0).toUpperCase() +
                              student.tutoringStatus.slice(1)}
                          </Badge>
                        </td>
                        <td className='p-4 text-gray-300'>
                          {new Date(
                            student.tutoringPurchasedAt
                          ).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className='p-4'>
                          <div className='flex gap-2'>
                            {student.tutoringStatus === 'pending' && (
                              <Button
                                size='sm'
                                onClick={() => activateStudent(student._id)}
                                disabled={activating === student._id}
                                className='bg-green-600 hover:bg-green-700'
                              >
                                {activating === student._id ? (
                                  <>
                                    <div className='animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1'></div>
                                    Activating...
                                  </>
                                ) : (
                                  <>
                                    <UserPlus className='w-3 h-3 mr-1' />
                                    Activate
                                  </>
                                )}
                              </Button>
                            )}

                            {student.tutoringStatus === 'active' &&
                              !student.mentorAvailabilityNotified && (
                                <Button
                                  size='sm'
                                  onClick={() => sendNotification(student._id)}
                                  className='bg-blue-600 hover:bg-blue-700'
                                >
                                  <Send className='w-3 h-3 mr-1' />
                                  Notify
                                </Button>
                              )}

                            <Button
                              size='sm'
                              variant='outline'
                              onClick={() =>
                                window.open(`mailto:${student.email}`, '_blank')
                              }
                              className='border-gray-600'
                            >
                              <Mail className='w-3 h-3 mr-1' />
                              Email
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className='mt-6 bg-[#111827] border-border/40'>
          <CardContent className='p-6'>
            <h3 className='text-lg font-bold text-white mb-4'>
              How to Use This Dashboard
            </h3>
            <div className='space-y-3 text-gray-300'>
              <p>
                1. <strong>Pending Students</strong> have purchased tutoring but
                mentor is not available yet
              </p>
              <p>
                2. Click <strong>Activate</strong> to make yourself available
                for a student
              </p>
              <p>
                3. Once activated, click <strong>Notify</strong> to send
                notification to student
              </p>
              <p>
                4. Students will see a popup notification and can schedule
                sessions
              </p>
              <p>
                5. Use <strong>Bulk Activate</strong> for multiple students at
                once
              </p>
              <p>6. Data refreshes automatically every 30 seconds</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
