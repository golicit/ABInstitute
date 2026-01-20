import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { z } from 'zod';
import Lottie from 'lottie-react';
import loadingAnimation from '@/assets/loading.json';
import { apiClient } from '@/services/api';

const loginSchema = z.object({
  email: z.string().trim().email({ message: 'Invalid email address' }),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters' }),
});

const signupSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, { message: 'Name must be at least 2 characters' })
      .max(100, { message: 'Name too long' }),
    email: z.string().trim().email({ message: 'Invalid email address' }),
    password: z
      .string()
      .min(6, { message: 'Password must be at least 6 characters' }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

const forgotPasswordSchema = z.object({
  email: z.string().trim().email({ message: 'Invalid email address' }),
});

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, { message: 'Password must be at least 8 characters' })
      .regex(/[A-Z]/, { message: 'Must contain at least one uppercase letter' })
      .regex(/[a-z]/, { message: 'Must contain at least one lowercase letter' })
      .regex(/[0-9]/, { message: 'Must contain at least one number' })
      .regex(/[^A-Za-z0-9]/, {
        message: 'Must contain at least one special character',
      }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signIn, signUp, signInWithGoogle, resetPassword, signOut } =
    useAuth();
  const [activeTab, setActiveTab] = useState('login');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [resetEmail, setResetEmail] = useState<string>('');

  // Form states
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetData, setResetData] = useState({
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    // Check for reset token in URL
    const tabParam = searchParams.get('tab');
    const tokenParam = searchParams.get('token');

    if (tabParam === 'reset' && tokenParam) {
      // If user is logged in, log them out first for security
      if (user) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('is_paid');
      }

      setResetToken(tokenParam);
      setActiveTab('reset');
      verifyResetToken(tokenParam);
    } else if (user) {
      // Only redirect to dashboard if not trying to reset password
      navigate('/dashboard');
    }
  }, [user, navigate, searchParams]);

  const verifyResetToken = async (token: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.get<{
        success: boolean;
        message?: string;
        data?: { email: string };
      }>(`/api/auth/reset-password/${token}`);

      if (response.data.success && response.data.data) {
        setResetEmail(response.data.data.email);
        toast({
          title: 'Valid Reset Link',
          description: 'Enter your new password below.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Invalid Token',
          description:
            response.data.message ||
            'The reset link is invalid or has expired.',
        });
        setActiveTab('login');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to verify reset link. Please request a new one.',
      });
      setActiveTab('forgot');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('🔍 Login form submitted', loginData);

    setErrors({});
    setIsLoading(true);

    try {
      const validated = loginSchema.parse(loginData);
      console.log('✅ Form validated, calling signIn...');

      const { error, user } = await signIn(validated.email, validated.password);

      console.log('📝 signIn response:', { error, user });

      if (error) {
        console.error('❌ Login error:', error);
        toast({
          variant: 'destructive',
          title: 'Login failed',
          description: error,
        });
        setIsLoading(false);
        return;
      }

      // If we have a user (login was successful)
      if (user) {
        console.log('✅ Login successful, navigating to dashboard');
        toast({
          title: 'Login successful',
          description: 'Welcome back!',
        });
        navigate('/dashboard');
      } else {
        console.error('⚠️ No user returned but no error either');
        toast({
          variant: 'destructive',
          title: 'Login failed',
          description: 'No user data returned. Please try again.',
        });
      }
    } catch (err) {
      console.error('💥 Login catch block error:', err);
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((error) => {
          newErrors[error.path[0]] = error.message;
        });
        setErrors(newErrors);
        console.log('📋 Validation errors:', newErrors);
      } else {
        console.error('❌ Unexpected error:', err);
        toast({
          variant: 'destructive',
          title: 'Login failed',
          description: 'An unexpected error occurred. Please try again.',
        });
      }
    } finally {
      setIsLoading(false);
      console.log('🏁 Login process finished');
    }
  };

  // Payment status check function
  const checkPaymentStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return { isPaid: false };

      const res = await fetch('/api/payment/status', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return await res.json();
    } catch (error) {
      return { isPaid: false };
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      const validated = signupSchema.parse(signupData);
      console.log('Signup attempt with:', {
        email: validated.email,
        name: validated.name,
      });

      const { error, user } = await signUp(
        validated.email,
        validated.password,
        validated.name
      );

      console.log('Signup response:', { error, user });

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Signup failed',
          description: error,
        });
        setIsLoading(false);
        return;
      }

      // If we have a user (signup was successful)
      if (user) {
        toast({
          title: 'Signup successful!',
          description: 'Account created successfully',
        });

        // Check if payment is required
        const paymentCheck = await checkPaymentStatus();

        if (paymentCheck.isPaid) {
          navigate('/dashboard');
        } else {
          navigate('/payment');
        }
      } else {
        // Edge case: no error but also no user
        toast({
          variant: 'destructive',
          title: 'Signup failed',
          description: 'No user data returned. Please try again.',
        });
      }
    } catch (err) {
      console.error('Signup error:', err);

      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((error) => {
          newErrors[error.path[0]] = error.message;
        });
        setErrors(newErrors);
      } else {
        toast({
          variant: 'destructive',
          title: 'Signup error',
          description: 'An unexpected error occurred. Please try again.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      const validated = forgotPasswordSchema.parse({ email: forgotEmail });
      const { error } = await resetPassword(validated.email);

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error,
        });
      } else {
        toast({
          title: 'Email Sent',
          description: 'Check your email for password reset instructions.',
        });
        setForgotEmail('');
        setActiveTab('login');
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((error) => {
          newErrors[error.path[0]] = error.message;
        });
        setErrors(newErrors);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to send reset email. Please try again.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!resetToken) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          'Reset token is missing. Please request a new password reset.',
      });
      setActiveTab('forgot');
      return;
    }

    setIsLoading(true);

    try {
      const validated = resetPasswordSchema.parse(resetData);

      const response = await apiClient.post<{
        success: boolean;
        message?: string;
        data?: any;
      }>(`/api/auth/reset-password/${resetToken}`, {
        password: validated.password,
      });

      if (response.data.success) {
        toast({
          title: 'Password Reset Successful',
          description:
            response.data.message ||
            'Your password has been reset successfully. You can now login with your new password.',
        });
        setResetData({ password: '', confirmPassword: '' });
        setActiveTab('login');
      } else {
        toast({
          variant: 'destructive',
          title: 'Reset Failed',
          description: response.data.message || 'Failed to reset password.',
        });
      }
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((error) => {
          newErrors[error.path[0]] = error.message;
        });
        setErrors(newErrors);
      } else {
        const errorMessage =
          err.response?.data?.message ||
          'Failed to reset password. Please try again.';
        toast({
          variant: 'destructive',
          title: 'Reset Failed',
          description: errorMessage,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);

    const result = await signInWithGoogle();

    setIsLoading(false);

    if (!result.error) {
      navigate('/dashboard');
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4'>
      {isLoading && (
        <div className='fixed inset-0 z-[1] flex items-center justify-center bg-black/40 backdrop-blur-sm'>
          <div className='bg-white rounded-2xl shadow-xl px-10 py-8 flex flex-col items-center gap-4'>
            <Lottie
              animationData={loadingAnimation}
              loop
              className='w-28 h-28'
            />
            <p className='text-sm font-medium text-foreground'>
              Please wait, processing...
            </p>
          </div>
        </div>
      )}

      <div className='w-full max-w-md'>
        <div className='text-center mb-6'>
          <div className='flex items-center justify-center gap-1 mb-0 P-0'>
            <img
              src='/nav_logo.jpeg'
              alt='AB Institute Logo'
              className='h-30 w-40 object-cover mb-2'
            />{' '}
          </div>
          <p className='text-muted-foreground'>
            Welcome to your learning portal
          </p>
        </div>

        <Card className='border-border/50 shadow-lg'>
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
            <CardDescription>
              Sign in or create an account to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className='grid w-full grid-cols-3'>
                <TabsTrigger
                  value='login'
                  className={resetToken ? 'hidden' : ''}
                >
                  Login
                </TabsTrigger>
                <TabsTrigger
                  value='signup'
                  className={resetToken ? 'hidden' : ''}
                >
                  Sign Up
                </TabsTrigger>
                <TabsTrigger
                  value='forgot'
                  className={resetToken ? 'hidden' : ''}
                >
                  Forgot
                </TabsTrigger>
                <TabsTrigger
                  value='reset'
                  className={resetToken ? '' : 'hidden'}
                >
                  Reset
                </TabsTrigger>
              </TabsList>

              <TabsContent value='login' className='mt-4'>
                <form onSubmit={handleLogin} className='space-y-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='login-email'>Email</Label>
                    <Input
                      id='login-email'
                      type='email'
                      placeholder='you@example.com'
                      value={loginData.email}
                      onChange={(e) =>
                        setLoginData({ ...loginData, email: e.target.value })
                      }
                      disabled={isLoading}
                    />
                    {errors.email && (
                      <p className='text-sm text-destructive'>{errors.email}</p>
                    )}
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='login-password'>Password</Label>
                    <Input
                      id='login-password'
                      type='password'
                      placeholder='••••••••'
                      value={loginData.password}
                      onChange={(e) =>
                        setLoginData({ ...loginData, password: e.target.value })
                      }
                      disabled={isLoading}
                    />
                    {errors.password && (
                      <p className='text-sm text-destructive'>
                        {errors.password}
                      </p>
                    )}
                  </div>

                  <Button type='submit' className='w-full' disabled={isLoading}>
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>

                  <div className='relative my-4'>
                    <div className='absolute inset-0 flex items-center'>
                      <span className='w-full border-t border-border' />
                    </div>
                    <div className='relative flex justify-center text-xs uppercase'>
                      <span className='bg-card px-2 text-muted-foreground'>
                        Or continue with
                      </span>
                    </div>
                  </div>

                  <Button
                    type='button'
                    variant='outline'
                    className='w-full'
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                  >
                    <svg className='mr-2 h-4 w-4' viewBox='0 0 24 24'>
                      <path
                        d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
                        fill='#4285F4'
                      />
                      <path
                        d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
                        fill='#34A853'
                      />
                      <path
                        d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
                        fill='#FBBC05'
                      />
                      <path
                        d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
                        fill='#EA4335'
                      />
                    </svg>
                    Sign in with Google
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value='signup' className='mt-4'>
                <form onSubmit={handleSignup} className='space-y-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='signup-name'>Full Name</Label>
                    <Input
                      id='signup-name'
                      type='text'
                      placeholder='John Doe'
                      value={signupData.name}
                      onChange={(e) =>
                        setSignupData({ ...signupData, name: e.target.value })
                      }
                      disabled={isLoading}
                    />
                    {errors.name && (
                      <p className='text-sm text-destructive'>{errors.name}</p>
                    )}
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='signup-email'>Email</Label>
                    <Input
                      id='signup-email'
                      type='email'
                      placeholder='you@example.com'
                      value={signupData.email}
                      onChange={(e) =>
                        setSignupData({ ...signupData, email: e.target.value })
                      }
                      disabled={isLoading}
                    />
                    {errors.email && (
                      <p className='text-sm text-destructive'>{errors.email}</p>
                    )}
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='signup-password'>Password</Label>
                    <Input
                      id='signup-password'
                      type='password'
                      placeholder='••••••••'
                      value={signupData.password}
                      onChange={(e) =>
                        setSignupData({
                          ...signupData,
                          password: e.target.value,
                        })
                      }
                      disabled={isLoading}
                    />
                    {errors.password && (
                      <p className='text-sm text-destructive'>
                        {errors.password}
                      </p>
                    )}
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='signup-confirm'>Confirm Password</Label>
                    <Input
                      id='signup-confirm'
                      type='password'
                      placeholder='••••••••'
                      value={signupData.confirmPassword}
                      onChange={(e) =>
                        setSignupData({
                          ...signupData,
                          confirmPassword: e.target.value,
                        })
                      }
                      disabled={isLoading}
                    />
                    {errors.confirmPassword && (
                      <p className='text-sm text-destructive'>
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>

                  <Button type='submit' className='w-full' disabled={isLoading}>
                    {isLoading ? 'Creating account...' : 'Create Account'}
                  </Button>

                  <div className='relative my-4'>
                    <div className='absolute inset-0 flex items-center'>
                      <span className='w-full border-t border-border' />
                    </div>
                    <div className='relative flex justify-center text-xs uppercase'>
                      <span className='bg-card px-2 text-muted-foreground'>
                        Or continue with
                      </span>
                    </div>
                  </div>

                  <Button
                    type='button'
                    variant='outline'
                    className='w-full'
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                  >
                    <svg className='mr-2 h-4 w-4' viewBox='0 0 24 24'>
                      <path
                        d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
                        fill='#4285F4'
                      />
                      <path
                        d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
                        fill='#34A853'
                      />
                      <path
                        d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
                        fill='#FBBC05'
                      />
                      <path
                        d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
                        fill='#EA4335'
                      />
                    </svg>
                    Sign up with Google
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value='forgot' className='mt-4'>
                <form onSubmit={handleForgotPassword} className='space-y-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='forgot-email'>Email</Label>
                    <Input
                      id='forgot-email'
                      type='email'
                      placeholder='you@example.com'
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      disabled={isLoading}
                    />
                    {errors.email && (
                      <p className='text-sm text-destructive'>{errors.email}</p>
                    )}
                    <p className='text-sm text-muted-foreground'>
                      Enter your email and we'll send you a password reset link.
                    </p>
                  </div>

                  <Button type='submit' className='w-full' disabled={isLoading}>
                    {isLoading ? 'Sending...' : 'Send Reset Link'}
                  </Button>
                </form>
              </TabsContent>

              {/* Add Reset Password Tab */}
              <TabsContent value='reset' className='mt-4'>
                {resetEmail ? (
                  <>
                    <div className='mb-4 p-3 bg-green-50 border border-green-200 rounded-md'>
                      <p className='text-sm text-green-800'>
                        Reset password for: <strong>{resetEmail}</strong>
                      </p>
                      <p className='text-xs text-green-600 mt-1'>
                        You are logged out for security. Please create a new
                        password.
                      </p>
                    </div>
                    <form onSubmit={handleResetPassword} className='space-y-4'>
                      <div className='space-y-2'>
                        <Label htmlFor='reset-password'>New Password</Label>
                        <Input
                          id='reset-password'
                          type='password'
                          placeholder='••••••••'
                          value={resetData.password}
                          onChange={(e) =>
                            setResetData({
                              ...resetData,
                              password: e.target.value,
                            })
                          }
                          disabled={isLoading}
                        />
                        {errors.password && (
                          <p className='text-sm text-destructive'>
                            {errors.password}
                          </p>
                        )}
                        <p className='text-xs text-muted-foreground'>
                          Password must be at least 8 characters with uppercase,
                          lowercase, number, and special character.
                        </p>
                      </div>

                      <div className='space-y-2'>
                        <Label htmlFor='reset-confirm'>
                          Confirm New Password
                        </Label>
                        <Input
                          id='reset-confirm'
                          type='password'
                          placeholder='••••••••'
                          value={resetData.confirmPassword}
                          onChange={(e) =>
                            setResetData({
                              ...resetData,
                              confirmPassword: e.target.value,
                            })
                          }
                          disabled={isLoading}
                        />
                        {errors.confirmPassword && (
                          <p className='text-sm text-destructive'>
                            {errors.confirmPassword}
                          </p>
                        )}
                      </div>

                      <Button
                        type='submit'
                        className='w-full'
                        disabled={isLoading}
                      >
                        {isLoading ? 'Resetting...' : 'Reset Password'}
                      </Button>

                      <Button
                        type='button'
                        variant='outline'
                        className='w-full'
                        onClick={() => {
                          setActiveTab('login');
                          setResetData({ password: '', confirmPassword: '' });
                        }}
                        disabled={isLoading}
                      >
                        Back to Login
                      </Button>
                    </form>
                  </>
                ) : (
                  <div className='text-center py-8'>
                    <p className='text-muted-foreground mb-4'>
                      Verifying reset link...
                    </p>
                    <Button
                      type='button'
                      variant='outline'
                      className='w-full'
                      onClick={() => setActiveTab('login')}
                    >
                      Go to Login
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
