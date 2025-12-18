import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/services/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const Profile = () => {
  const { user, updateUser, refreshUserAvatar } = useApp();
  const { user: authUser } = useAuth(); // Get auth user for user ID
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const navigate = useNavigate();

  // Get user ID from authUser
  const getUserId = () => {
    if (!authUser) return 'guest';
    const userId = (authUser as any)._id || (authUser as any).id;
    return userId ? userId.toString() : 'unknown';
  };

  // Load saved picture from localStorage using the correct key
  useEffect(() => {
    const userId = getUserId();
    const customAvatarKey = `custom_avatar_${userId}`;
    const savedPic = localStorage.getItem(customAvatarKey);

    if (savedPic) {
      setPreviewImage(savedPic);
      updateUser({ avatar: savedPic });
    } else {
      // Fallback to the old key for backward compatibility
      const oldSavedPic = localStorage.getItem('user_profile_pic');
      if (oldSavedPic) {
        setPreviewImage(oldSavedPic);
        updateUser({ avatar: oldSavedPic });
        // Migrate to new key
        localStorage.setItem(customAvatarKey, oldSavedPic);
        localStorage.removeItem('user_profile_pic');
      }
    }
  }, [authUser]); // Add authUser as dependency

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;

      // Update preview
      setPreviewImage(base64);

      // Save to localStorage with correct key
      const userId = getUserId();
      const customAvatarKey = `custom_avatar_${userId}`;
      localStorage.setItem(customAvatarKey, base64);

      // Update user in context
      updateUser({ avatar: base64 });

      toast.success('Profile picture updated successfully!');

      // Optional backend upload
      uploadToBackend(file);
    };

    reader.readAsDataURL(file);
  };

  // Optional backend upload
  const uploadToBackend = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      // Backend dev will update this endpoint
      await apiClient.post('/user/upload-avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // After successful upload, refresh the avatar to get the latest
      refreshUserAvatar();
    } catch (error) {
      console.warn(
        'Backend avatar upload failed (safe to ignore for now)',
        error
      );
    }
  };

  // Handle reset to default avatar
  const handleResetAvatar = () => {
    const userId = getUserId();
    const customAvatarKey = `custom_avatar_${userId}`;

    // Remove custom avatar from localStorage
    localStorage.removeItem(customAvatarKey);
    localStorage.removeItem('user_profile_pic'); // Clean old key too

    // Clear preview
    setPreviewImage(null);

    // Refresh avatar to get default
    refreshUserAvatar();

    toast.success('Profile picture reset to default');
  };

  // Handle change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);

    try {
      if (!oldPassword || !newPassword || !confirmPassword) {
        toast.error('All fields are required');
        setPasswordLoading(false);
        return;
      }

      if (newPassword !== confirmPassword) {
        toast.error('New passwords do not match');
        setPasswordLoading(false);
        return;
      }

      if (newPassword.length < 8) {
        toast.error('Password must be at least 8 characters long');
        setPasswordLoading(false);
        return;
      }

      // Add proper type for the response
      const response = await apiClient.post<{
        success: boolean;
        message: string;
        data?: any;
      }>('/api/auth/change-password', {
        oldPassword,
        newPassword,
        confirmPassword,
      });

      if (response.data.success) {
        toast.success(response.data.message);
        setChangePasswordOpen(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || 'Failed to change password';
      toast.error(errorMessage);
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-3xl font-bold'>Profile Settings</h1>
        <p className='text-muted-foreground'>Manage your account information</p>
      </div>

      <div className='grid gap-6 lg:grid-cols-3'>
        {/* Profile Card */}
        <Card className='lg:col-span-1'>
          <CardHeader>
            <CardTitle>Profile Picture</CardTitle>
          </CardHeader>
          <CardContent className='flex flex-col items-center space-y-4'>
            <Avatar className='h-32 w-32'>
              <AvatarImage
                src={previewImage || user.avatar}
                alt={user.name}
                className='object-cover'
              />
              <AvatarFallback className='text-2xl'>
                {user.name.charAt(0)}
              </AvatarFallback>
            </Avatar>

            {/* Hidden File Input */}
            <input
              type='file'
              id='profilePicUpload'
              accept='image/*'
              className='hidden'
              onChange={handleImageUpload}
            />

            <div className='flex flex-col sm:flex-row gap-2 w-full'>
              <Button
                variant='outline'
                size='sm'
                className='flex-1'
                onClick={() =>
                  document.getElementById('profilePicUpload')?.click()
                }
              >
                Change Picture
              </Button>

              <Button
                variant='ghost'
                size='sm'
                className='flex-1'
                onClick={handleResetAvatar}
              >
                Reset to Default
              </Button>
            </div>

            <p className='text-xs text-muted-foreground text-center'>
              Upload JPG, PNG, or GIF (Max 5MB)
            </p>
          </CardContent>
        </Card>

        {/* Personal Information (Read-Only) */}
        <Card className='lg:col-span-2'>
          <CardHeader className='flex flex-row items-center justify-between'>
            <CardTitle>Personal Information</CardTitle>

            {/* Edit button redirects to profile-setup page */}
            <Button
              variant='outline'
              size='sm'
              onClick={() => navigate('/dashboard/profile-setup')}
            >
              Edit
            </Button>
          </CardHeader>

          <CardContent className='space-y-4'>
            <div className='grid gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <p className='text-sm text-muted-foreground'>Full Name</p>
                <p className='text-lg font-semibold'>{user.name}</p>
              </div>
              <div className='space-y-2'>
                <p className='text-sm text-muted-foreground'>Email</p>
                <p className='text-lg font-semibold'>{user.email}</p>
              </div>
            </div>

            <div className='space-y-2'>
              <p className='text-sm text-muted-foreground'>Phone Number</p>
              <p className='text-lg font-semibold'>{user.phone}</p>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <Card className='lg:col-span-3'>
          <CardHeader>
            <CardTitle>Learning Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid gap-6 md:grid-cols-3'>
              <div className='space-y-2'>
                <p className='text-sm text-muted-foreground'>
                  Enrolled Courses
                </p>
                <p className='text-3xl font-bold'>{user.enrolledCourses}</p>
              </div>
              <div className='space-y-2'>
                <p className='text-sm text-muted-foreground'>Active Courses</p>
                <p className='text-3xl font-bold'>{user.activeCourses}</p>
              </div>
              <div className='space-y-2'>
                <p className='text-sm text-muted-foreground'>
                  Certificates Earned
                </p>
                <p className='text-3xl font-bold'>{user.certificatesEarned}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card className='lg:col-span-3'>
          <CardHeader>
            <CardTitle>Account Actions</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex items-center justify-between border-b border-border pb-4'>
              <div>
                <h4 className='font-medium'>Change Password</h4>
                <p className='text-sm text-muted-foreground'>
                  Update your password to keep your account secure
                </p>
              </div>
              <Button
                variant='outline'
                onClick={() => navigate('/dashboard/change-password')}
              >
                Change Password
              </Button>
            </div>
            <div className='flex items-center justify-between'>
              <div>
                <h4 className='font-medium text-destructive'>Delete Account</h4>
                <p className='text-sm text-muted-foreground'>
                  Permanently delete your account and all data
                </p>
              </div>
              <Button variant='destructive'>Delete Account</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Change Password Modal */}
      <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <DialogContent className='sm:max-w-[425px]'>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new one
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleChangePassword} className='space-y-4'>
            {/* Old Password */}
            <div className='space-y-2'>
              <Label htmlFor='oldPassword'>Current Password</Label>
              <Input
                id='oldPassword'
                type='password'
                placeholder='Enter current password'
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                disabled={passwordLoading}
              />
            </div>

            {/* New Password */}
            <div className='space-y-2'>
              <Label htmlFor='newPassword'>New Password</Label>
              <Input
                id='newPassword'
                type='password'
                placeholder='Enter new password (min. 8 characters)'
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={passwordLoading}
              />
            </div>

            {/* Confirm Password */}
            <div className='space-y-2'>
              <Label htmlFor='confirmPassword'>Confirm New Password</Label>
              <Input
                id='confirmPassword'
                type='password'
                placeholder='Confirm new password'
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={passwordLoading}
              />
            </div>

            {/* Actions */}
            <div className='flex gap-3 justify-end pt-4'>
              <Button
                type='button'
                variant='outline'
                onClick={() => setChangePasswordOpen(false)}
                disabled={passwordLoading}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={passwordLoading}>
                {passwordLoading ? 'Changing...' : 'Change Password'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;
