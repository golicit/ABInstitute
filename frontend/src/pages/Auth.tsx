import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { BookOpen } from 'lucide-react';

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

const Auth = () => {
  const navigate = useNavigate();
  const { user, signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  const [activeTab, setActiveTab] = useState('login');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [forgotEmail, setForgotEmail] = useState('');

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      const validated = loginSchema.parse(loginData);
      const { error } = await signIn(validated.email, validated.password);

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Login failed',
          description: error,
        });
        return;
      }

      toast({
        title: 'Login successful',
        description: 'Welcome back!',
      });

      navigate('/dashboard');
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((error) => {
          newErrors[error.path[0]] = error.message;
        });
        setErrors(newErrors);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      const validated = signupSchema.parse(signupData);
      const { error } = await signUp(
        validated.email,
        validated.password,
        validated.name
      );

      if (!error) {
        // Redirect to profile setup page
        navigate('/profile-setup', {
          state: {
            email: validated.email,
            name: validated.name,
          },
        });
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((error) => {
          newErrors[error.path[0]] = error.message;
        });
        setErrors(newErrors);
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
      await resetPassword(validated.email);
      setForgotEmail('');
      setActiveTab('login');
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((error) => {
          newErrors[error.path[0]] = error.message;
        });
        setErrors(newErrors);
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
      <div className='w-full max-w-md'>
        <div className='text-center mb-8'>
          <div className='flex items-center justify-center gap-2 mb-4'>
            <BookOpen className='h-10 w-10 text-primary' />
            <h1 className='text-3xl font-bold text-foreground'>AB Institute</h1>
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
                <TabsTrigger value='login'>Login</TabsTrigger>
                <TabsTrigger value='signup'>Sign Up</TabsTrigger>
                <TabsTrigger value='forgot'>Forgot</TabsTrigger>
              </TabsList>

              <TabsContent value='login'>
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

              <TabsContent value='signup'>
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

              <TabsContent value='forgot'>
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
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
