import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { apiClient } from '@/services/api';

export default function ChangePassword() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    oldPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setMessage(null);
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const validateForm = () => {
    if (
      !formData.oldPassword ||
      !formData.newPassword ||
      !formData.confirmPassword
    ) {
      setMessage({
        type: 'error',
        text: 'All fields are required',
      });
      return false;
    }

    if (formData.newPassword.length < 8) {
      setMessage({
        type: 'error',
        text: 'New password must be at least 8 characters long',
      });
      return false;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setMessage({
        type: 'error',
        text: 'New passwords do not match',
      });
      return false;
    }

    if (formData.oldPassword === formData.newPassword) {
      setMessage({
        type: 'error',
        text: 'New password must be different from current password',
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      console.log('=== CHANGE PASSWORD SUBMIT ===');
      console.log('Base URL:', import.meta.env.VITE_API_BASE_URL);
      console.log('Endpoint: /api/auth/change-password');
      console.log(
        'Full URL will be:',
        import.meta.env.VITE_API_BASE_URL + '/api/auth/change-password'
      );
      console.log(
        'Auth token:',
        localStorage.getItem('token') ? 'Present' : 'Missing'
      );

      const response = await apiClient.post<any>('/api/auth/change-password', {
        oldPassword: formData.oldPassword,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword,
      });

      console.log('Response:', response);
      if ((response.data as any)?.success) {
        setMessage({
          type: 'success',
          text: 'Password changed successfully! Redirecting to dashboard...',
        });
        setFormData({
          oldPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        // If backend responds but not success
        setMessage({
          type: 'error',
          text:
            (response.data as any)?.message ||
            'Failed to change password. Please try again.',
        });
      }
    } catch (error: any) {
      // Log error for debugging
      console.error('=== CHANGE PASSWORD ERROR ===');
      console.error('Full error:', error);
      console.error('Status:', error.response?.status);
      console.error('Status text:', error.response?.statusText);
      console.error('Data:', error.response?.data);
      console.error('Message:', error.message);

      let errorMessage = 'Failed to change password. Please try again.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      setMessage({
        type: 'error',
        text: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4'>
      <div className='max-w-md mx-auto'>
        <Card className='shadow-lg'>
          <CardHeader className='space-y-1'>
            <CardTitle className='text-2xl'>Change Password</CardTitle>
            <CardDescription>
              Update your account password securely
            </CardDescription>
          </CardHeader>
          <CardContent>
            {message && (
              <Alert
                className={`mb-6 ${
                  message.type === 'success'
                    ? 'border-green-200 bg-green-50'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle className='h-4 w-4 text-green-600' />
                ) : (
                  <AlertCircle className='h-4 w-4 text-red-600' />
                )}
                <AlertDescription
                  className={
                    message.type === 'success'
                      ? 'text-green-700'
                      : 'text-red-700'
                  }
                >
                  {message.text}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className='space-y-4'>
              {/* Current Password */}
              <div className='space-y-2'>
                <label htmlFor='oldPassword' className='text-sm font-medium'>
                  Current Password
                </label>
                <div className='relative'>
                  <Input
                    id='oldPassword'
                    name='oldPassword'
                    type={showPasswords.oldPassword ? 'text' : 'password'}
                    value={formData.oldPassword}
                    onChange={handleInputChange}
                    placeholder='Enter your current password'
                    disabled={loading}
                    className='pr-10'
                  />
                  <button
                    type='button'
                    onClick={() => togglePasswordVisibility('oldPassword')}
                    className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700'
                    tabIndex={-1}
                  >
                    {showPasswords.oldPassword ? (
                      <EyeOff className='h-4 w-4' />
                    ) : (
                      <Eye className='h-4 w-4' />
                    )}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className='space-y-2'>
                <label htmlFor='newPassword' className='text-sm font-medium'>
                  New Password
                </label>
                <div className='relative'>
                  <Input
                    id='newPassword'
                    name='newPassword'
                    type={showPasswords.newPassword ? 'text' : 'password'}
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    placeholder='Enter new password (min. 8 characters)'
                    disabled={loading}
                    className='pr-10'
                  />
                  <button
                    type='button'
                    onClick={() => togglePasswordVisibility('newPassword')}
                    className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700'
                    tabIndex={-1}
                  >
                    {showPasswords.newPassword ? (
                      <EyeOff className='h-4 w-4' />
                    ) : (
                      <Eye className='h-4 w-4' />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className='space-y-2'>
                <label
                  htmlFor='confirmPassword'
                  className='text-sm font-medium'
                >
                  Confirm New Password
                </label>
                <div className='relative'>
                  <Input
                    id='confirmPassword'
                    name='confirmPassword'
                    type={showPasswords.confirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder='Confirm your new password'
                    disabled={loading}
                    className='pr-10'
                  />
                  <button
                    type='button'
                    onClick={() => togglePasswordVisibility('confirmPassword')}
                    className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700'
                    tabIndex={-1}
                  >
                    {showPasswords.confirmPassword ? (
                      <EyeOff className='h-4 w-4' />
                    ) : (
                      <Eye className='h-4 w-4' />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type='submit'
                className='w-full bg-blue-600 hover:bg-blue-700'
                disabled={loading}
              >
                {loading ? 'Changing Password...' : 'Change Password'}
              </Button>

              {/* Back Button */}
              <Button
                type='button'
                variant='outline'
                className='w-full'
                onClick={() => navigate('/dashboard')}
                disabled={loading}
              >
                Back to Dashboard
              </Button>
            </form>

            {/* Security Tips */}
            <div className='mt-6 p-4 bg-blue-50 rounded-lg'>
              <h4 className='text-sm font-semibold text-blue-900 mb-2'>
                Password Tips:
              </h4>
              <ul className='text-xs text-blue-800 space-y-1'>
                <li>• Use at least 8 characters</li>
                <li>• Mix uppercase, lowercase, and numbers</li>
                <li>• Include special characters (!@#$%)</li>
                <li>• Avoid using personal information</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
