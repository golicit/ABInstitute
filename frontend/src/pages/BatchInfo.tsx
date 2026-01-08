// Create a new file: src/pages/BatchInfo.tsx

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Calendar, Hash, Copy, Check, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/services/api';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

const BatchInfo = () => {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const [batchDetails, setBatchDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Get batch from auth user
  const studentBatch = (authUser as any)?.batch;

  useEffect(() => {
    if (studentBatch) {
      fetchBatchDetails();
    } else {
      setLoading(false);
    }
  }, [studentBatch]);

  const fetchBatchDetails = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/api/students/my-batch`);
      if (response.data) {
        setBatchDetails(response.data);
      }
    } catch (error) {
      console.error('Error fetching batch details:', error);
      toast.error('Failed to load batch details');
    } finally {
      setLoading(false);
    }
  };

  const copyBatchName = () => {
    if (studentBatch) {
      navigator.clipboard.writeText(studentBatch);
      setCopied(true);
      toast.success('Batch name copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Extract batch details from name
  const getBatchInfo = (batchName: string) => {
    if (!batchName) return { series: '', suffix: '', year: '' };

    // Example: ABINS20262001A
    const match = batchName.match(/ABINS(\d{4})(\d{4})([A-Z])/);
    if (match) {
      return {
        year: match[1],
        series: match[2],
        suffix: match[3],
      };
    }
    return { series: '', suffix: '', year: '' };
  };

  const batchInfo = getBatchInfo(studentBatch);

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto'></div>
          <p className='mt-4 text-white/70'>Loading batch information...</p>
        </div>
      </div>
    );
  }

  if (!studentBatch) {
    return (
      <div className='text-center py-12'>
        <Users className='h-16 w-16 text-muted-foreground mx-auto mb-4' />
        <h2 className='text-2xl font-bold text-white mb-2'>
          No Batch Assigned
        </h2>
        <p className='text-white/70 mb-6'>
          You haven't been assigned to a batch yet.
        </p>
        <Button onClick={() => navigate('/dashboard')}>
          Return to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className='space-y-8'>
      {/* Header */}
      <div>
        <h1 className='text-3xl font-bold text-white'>Batch Information</h1>
        <p className='text-white/70'>
          Details about your assigned learning batch
        </p>
      </div>

      {/* Main Batch Card */}
      <Card className='bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-500/20'>
        <CardHeader>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
            <div>
              <CardTitle className='text-white flex items-center gap-2'>
                <Users className='h-6 w-6' />
                Your Batch
              </CardTitle>
              <p className='text-white/70 text-sm mt-1'>
                Batch assignment is automatic based on registration order
              </p>
            </div>
            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={copyBatchName}
                className='border-white/30 text-white'
              >
                {copied ? (
                  <>
                    <Check className='h-4 w-4 mr-2' />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className='h-4 w-4 mr-2' />
                    Copy Name
                  </>
                )}
              </Button>
              <Button onClick={fetchBatchDetails} disabled={loading}>
                {loading ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className='space-y-6'>
            {/* Batch Name Display */}
            <div className='flex flex-col items-center justify-center p-6 bg-black/30 rounded-xl'>
              <div className='text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent'>
                {studentBatch}
              </div>
              <p className='text-white/70 mt-2'>Your unique batch identifier</p>
            </div>

            {/* Batch Details Grid */}
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
              <Card className='bg-white/5 border-white/10'>
                <CardContent className='p-4 flex flex-col items-center text-center'>
                  <Calendar className='h-8 w-8 text-blue-400 mb-2' />
                  <p className='text-sm text-white/70'>Year</p>
                  <p className='text-2xl font-bold text-white'>
                    {batchInfo.year}
                  </p>
                </CardContent>
              </Card>

              <Card className='bg-white/5 border-white/10'>
                <CardContent className='p-4 flex flex-col items-center text-center'>
                  <Hash className='h-8 w-8 text-purple-400 mb-2' />
                  <p className='text-sm text-white/70'>Series</p>
                  <p className='text-2xl font-bold text-white'>
                    {batchInfo.series}
                  </p>
                </CardContent>
              </Card>

              <Card className='bg-white/5 border-white/10'>
                <CardContent className='p-4 flex flex-col items-center text-center'>
                  <Users className='h-8 w-8 text-green-400 mb-2' />
                  <p className='text-sm text-white/70'>Suffix</p>
                  <p className='text-2xl font-bold text-white'>
                    {batchInfo.suffix}
                  </p>
                </CardContent>
              </Card>

              <Card className='bg-white/5 border-white/10'>
                <CardContent className='p-4 flex flex-col items-center text-center'>
                  <UserPlus className='h-8 w-8 text-yellow-400 mb-2' />
                  <p className='text-sm text-white/70'>Capacity</p>
                  <p className='text-2xl font-bold text-white'>
                    {batchDetails?.studentCount || 0}/25
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Capacity Progress Bar */}
            {batchDetails && (
              <div className='space-y-2'>
                <div className='flex justify-between text-sm'>
                  <span className='text-white/70'>Batch Capacity</span>
                  <span className='text-white'>
                    {batchDetails.studentCount || 0} / 25 students
                  </span>
                </div>
                <Progress
                  value={((batchDetails.studentCount || 0) / 25) * 100}
                  className='h-3'
                />
                <p className='text-xs text-white/60'>
                  {25 - (batchDetails.studentCount || 0)} seats remaining in
                  this batch
                </p>
              </div>
            )}

            {/* Batch System Explanation */}
            <Card className='bg-white/5 border-white/10'>
              <CardHeader>
                <CardTitle className='text-white text-lg'>
                  About Batch System
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-3'>
                <p className='text-white/80'>
                  The batch system automatically assigns students to learning
                  groups of maximum 25 students each.
                </p>
                <ul className='space-y-2 text-white/70 text-sm'>
                  <li className='flex items-start gap-2'>
                    <div className='h-2 w-2 bg-blue-400 rounded-full mt-1.5'></div>
                    <span>
                      Batches follow the format:{' '}
                      <code className='bg-white/10 px-2 py-1 rounded'>
                        ABINS20262001A
                      </code>
                    </span>
                  </li>
                  <li className='flex items-start gap-2'>
                    <div className='h-2 w-2 bg-blue-400 rounded-full mt-1.5'></div>
                    <span>
                      2026 = Year, 2001 = Series Number, A = Suffix (A-Z)
                    </span>
                  </li>
                  <li className='flex items-start gap-2'>
                    <div className='h-2 w-2 bg-blue-400 rounded-full mt-1.5'></div>
                    <span>
                      When a batch reaches 25 students, a new suffix is created
                      (A → B → C...)
                    </span>
                  </li>
                  <li className='flex items-start gap-2'>
                    <div className='h-2 w-2 bg-blue-400 rounded-full mt-1.5'></div>
                    <span>
                      After Z, the series number increments and suffix resets to
                      A
                    </span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className='flex flex-col sm:flex-row gap-4'>
        <Button
          variant='outline'
          className='flex-1 border-white/30 text-white'
          onClick={() => navigate('/dashboard')}
        >
          Back to Dashboard
        </Button>
        <Button
          className='flex-1 bg-gradient-to-r from-blue-600 to-purple-600'
          onClick={() => navigate('/dashboard/profile')}
        >
          View Profile
        </Button>
      </div>
    </div>
  );
};

export default BatchInfo;
