import { useState, useEffect } from 'react';
import axios from 'axios';
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
import {
  CreditCard,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
} from 'lucide-react';

interface Payment {
  id: string;
  courseName: string;
  date: Date;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'paid';
  paidAt?: Date;
  createdAt: Date;
}

interface ApiResponse {
  success: boolean;
  payments: Payment[];
  message?: string;
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
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to view payment history');
        setLoading(false);
        return;
      }

      const res = await axios.get<ApiResponse>(
        'http://127.0.0.1:3000/api/payment/history',
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data.success) {
        setPayments(res.data.payments);
      } else {
        setError(res.data.message || 'Failed to fetch payment history');
      }
    } catch (err: any) {
      console.error('Error fetching payment history:', err);
      setError(err.response?.data?.message || 'Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'paid':
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
      case 'paid':
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
      case 'paid':
        return 'paid';
      case 'failed':
        return 'failed';
      case 'pending':
        return 'pending';
      default:
        return status;
    }
  };

  const totalPaid = payments
    .filter((p) => p.status === 'completed' || p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const formatAmount = (amount: number) => {
    // Convert from paise to rupees
    return '₹' + (amount / 100).toFixed(2);
  };

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

  if (error) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <XCircle className='h-12 w-12 text-destructive mx-auto mb-4' />
          <h3 className='text-lg font-semibold mb-2'>
            Error Loading Payment History
          </h3>
          <p className='text-muted-foreground mb-4'>{error}</p>
          <Button onClick={fetchPaymentHistory} variant='outline'>
            <Loader2 className='mr-2 h-4 w-4' />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-3xl font-bold'>Payment History</h1>
        <p className='text-muted-foreground'>
          View all your transactions and download invoices
        </p>
      </div>

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
              {
                payments.filter(
                  (p) => p.status === 'completed' || p.status === 'paid'
                ).length
              }{' '}
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
                  (p) => p.status === 'completed' || p.status === 'paid'
                ).length
              }
            </div>
            <p className='text-xs text-muted-foreground'>Active enrollments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between pb-2'>
            <CardTitle className='text-sm font-medium'>
              Pending Payments
            </CardTitle>
            <Clock className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {payments.filter((p) => p.status === 'pending').length}
            </div>
            <p className='text-xs text-muted-foreground'>
              Awaiting confirmation
            </p>
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
                  <TableHead className='text-right'>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className='text-center text-muted-foreground'
                    >
                      No payment history available
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className='font-medium'>
                        {payment.courseName || 'Course Enrollment'}
                      </TableCell>
                      <TableCell>
                        {new Date(
                          payment.paidAt || payment.createdAt
                        ).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
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
                      <TableCell className='text-right'>
                        {(payment.status === 'completed' ||
                          payment.status === 'paid') && (
                          <Button variant='ghost' size='sm'>
                            <Download className='mr-2 h-4 w-4' />
                            Invoice
                          </Button>
                        )}
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
