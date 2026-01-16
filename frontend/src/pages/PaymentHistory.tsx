import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CreditCard, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { apiClient } from '@/services/api'; // Import the axios instance from your api.ts

// Define the payment interface based on the backend response
interface Payment {
  id: string;
  _id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  type: 'course' | 'tutoring';
  createdAt: string;
  date: string;
  paidAt?: string;
  gateway: string;
  tutoringType?: string;
  courseName: string;
  paymentId?: string;
}

// Define the API response structure - IMPORTANT: matches backend response
interface ApiResponse {
  success: boolean;
  payments?: Payment[]; // Backend returns "payments" not "data"
  message?: string;
  error?: string;
}

const PaymentHistory = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPaymentHistory();
  }, []);

  const fetchPaymentHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching payment history from API...');

      // Use the apiClient from your api.ts
      const response = await apiClient.get<ApiResponse>('/api/payment/history');

      console.log('Full API Response:', response.data);

      if (response.data.success) {
        // IMPORTANT: Backend returns "payments" array, not "data"
        if (response.data.payments && Array.isArray(response.data.payments)) {
          console.log(`Found ${response.data.payments.length} payments`);
          setPayments(response.data.payments);

          if (response.data.payments.length === 0) {
            setError('No payment history found');
          }
        } else {
          console.log('No payments array in response');
          setPayments([]);
          setError('No payment history available');
        }
      } else {
        setError(response.data.message || 'Failed to fetch payment history');
      }
    } catch (err: any) {
      console.error('Error fetching payment history:', err);

      // Detailed error logging
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        config: err.config?.url,
      });

      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
      } else if (err.response?.status === 404) {
        setError('Payment history endpoint not found. Please contact support.');
      } else if (err.code === 'ECONNABORTED') {
        setError('Request timeout. Please try again.');
      } else if (!err.response) {
        setError('Network error. Please check your connection.');
      } else {
        setError(
          err.response?.data?.message || 'Failed to load payment history'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className='h-4 w-4' />;
      case 'failed':
        return <XCircle className='h-4 w-4' />;
      case 'pending':
        return <Clock className='h-4 w-4' />;
      default:
        return null;
    }
  };

  const getStatusVariant = (
    status: string
  ): 'default' | 'destructive' | 'secondary' | 'outline' => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'pending':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case 'completed':
        return 'paid';
      case 'failed':
        return 'failed';
      case 'pending':
        return 'pending';
      default:
        return status.toLowerCase();
    }
  };

  const formatAmount = (amount: number) => {
    // Amount is in paise (Razorpay default), convert to rupees
    const amountInRupees = amount / 100;
    return '₹' + amountInRupees.toFixed(2);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const getPaymentDescription = (payment: Payment) => {
    if (payment.courseName) return payment.courseName;
    if (payment.type === 'tutoring') {
      return payment.tutoringType === 'private_mentorship'
        ? 'Private Mentorship'
        : 'Tutoring Session';
    }
    return 'Course Enrollment';
  };

  const totalPaid = payments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);

  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <Loader2 className='h-8 w-8 animate-spin mx-auto mb-4' />
          <p className='text-muted-foreground'>Loading payment history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-3xl font-bold'>Payment History</h1>
        <p className='text-muted-foreground'>View all your transactions</p>
      </div>

      {error && (
        <div
          className='p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg'
          role='alert'
        >
          <div className='flex items-center'>
            <XCircle className='h-5 w-5 mr-2' />
            {error}
          </div>
          <Button
            onClick={fetchPaymentHistory}
            variant='outline'
            size='sm'
            className='mt-2'
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Summary Cards */}
      <div className='grid gap-6 md:grid-cols-3'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between pb-2'>
            <CardTitle className='text-sm font-medium'>Total Spent</CardTitle>
            <CreditCard className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{formatAmount(totalPaid)}</div>
            <p className='text-xs text-muted-foreground'>
              {payments.filter((p) => p.status === 'completed').length}{' '}
              successful payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between pb-2'>
            <CardTitle className='text-sm font-medium'>
              Courses Purchased
            </CardTitle>
            <CheckCircle className='h-4 w-4 text-green-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {
                payments.filter(
                  (p) => p.status === 'completed' && p.type === 'course'
                ).length
              }
            </div>
            <p className='text-xs text-muted-foreground'>Course enrollments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between pb-2'>
            <CardTitle className='text-sm font-medium'>
              Tutoring Sessions
            </CardTitle>
            <Clock className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {payments.filter((p) => p.type === 'tutoring').length}
            </div>
            <p className='text-xs text-muted-foreground'>Tutoring purchases</p>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='rounded-md border'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className='text-center text-muted-foreground'
                    >
                      No payment history available
                    </TableCell>
                  </TableRow>
                ) : (
                  payments
                    .sort(
                      (a, b) =>
                        new Date(b.date || b.createdAt).getTime() -
                        new Date(a.date || a.createdAt).getTime()
                    )
                    .map((payment) => (
                      <TableRow key={payment.id || payment._id}>
                        <TableCell className='font-medium'>
                          {getPaymentDescription(payment)}
                        </TableCell>
                        <TableCell>
                          {formatDate(payment.date || payment.createdAt)}
                        </TableCell>
                        <TableCell className='font-semibold'>
                          {formatAmount(payment.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={getStatusVariant(payment.status)}
                            className='flex w-fit items-center gap-1'
                          >
                            {getStatusIcon(payment.status)}
                            <span className='capitalize'>
                              {formatStatus(payment.status)}
                            </span>
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentHistory;
