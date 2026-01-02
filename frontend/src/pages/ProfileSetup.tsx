'use client';

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useApp } from '@/contexts/AppContext';
import { apiClient } from '@/services/api';
import { toast } from 'sonner';

/**
 * Premium ProfileSetup page
 * - Floating labels
 * - Focus glow and subtle animations
 * - Validation hints
 * - OTP redirect when email changes
 * - No avatar upload on this page
 */

export default function ProfileSetup() {
  const navigate = useNavigate();
  const { user, updateUser } = useApp();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    gender: '',
    city: '',
    state: '',
  });

  const [originalEmail, setOriginalEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Prefill user data
  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        gender: '',
        city: '',
        state: '',
      });
      setOriginalEmail(user.email || '');
    }
  }, [user]);

  // Simple client-side validation
  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.fullName.trim()) e.fullName = 'Full name is required';
    if (!formData.email.trim()) e.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(formData.email))
      e.email = 'Enter a valid email';
    if (!formData.phone.trim()) e.phone = 'Phone number is required';
    else if (!/^[0-9+\-\s]{7,20}$/.test(formData.phone))
      e.phone = 'Enter a valid phone number';
    if (!formData.gender) e.gender = 'Please select gender';
    if (!formData.city.trim()) e.city = 'City is required';
    if (!formData.state.trim()) e.state = 'State is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please fix the errors in the form.');
      return;
    }

    setLoading(true);

    try {
      // If email changed -> redirect to OTP verification page
      if (formData.email !== originalEmail) {
        toast.info('Email change detected. OTP verification required.');
        navigate('/dashboard/email-verification', { state: { formData } });
        setLoading(false);
        return;
      }

      // Save to backend (placeholder)
      await apiClient.post('/api/user/profile', {
        email: formData.email,
        fullName: formData.fullName,
        phone: formData.phone,
        gender: formData.gender,
        city: formData.city,
        state: formData.state,
      });

      // update app context
      updateUser({
        name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
      });

      toast.success('Profile updated!');
      navigate('/dashboard/profile');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Floating label helper (we use 'peer' classes on inputs)
  const floatingLabel = (label: string) => (
    <span
      className='absolute left-3 -top-3 bg-gradient-to-br from-[#0b1f3a] to-[#090e1d] px-1 text-xs text-white/90'
      aria-hidden
    >
      {label}
    </span>
  );

  return (
    <main className='min-h-screen flex items-start justify-center px-4 py-6'>
      <div className='w-full max-w-4xl'>
        <div className='mb-8'>
          <h1 className='text-5xl font-extrabold text-white tracking-tight'>
            Edit Profile
          </h1>

          <p className='text-white/80 text-lg mt-3 leading-relaxed max-w-2xl'>
            Keep your profile information up to date so we can personalize your
            learning experience. Changing your email address requires
            verification.
          </p>
        </div>

        <Card className='bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl overflow-hidden'>
          <CardHeader className='px-8 py-6 border-b border-white/10'>
            <CardTitle className='text-2xl font-semibold text-white'>
              Account Details
            </CardTitle>
          </CardHeader>

          <CardContent className='p-8'>
            <form onSubmit={handleSubmit} className='space-y-8'>
              {/* GRID ROW 1 */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
                {/* FULL NAME */}
                <div className='relative'>
                  <Label className='text-white text-base mb-2 block'>
                    Full Name
                  </Label>
                  <Input
                    className='bg-white/20 text-white placeholder:text-gray-300 border-white/30 h-12 text-base'
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                    required
                  />
                </div>

                {/* EMAIL */}
                <div className='relative'>
                  <Label className='text-white text-base mb-2 block'>
                    Email
                  </Label>
                  <Input
                    type='email'
                    className='bg-white/20 text-white placeholder:text-gray-300 border-white/30 h-12 text-base'
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                  />
                  {formData.email !== originalEmail && (
                    <p className='text-yellow-300 text-sm mt-2'>
                      ⚠️ Email change requires OTP verification
                    </p>
                  )}
                </div>
              </div>

              {/* GRID ROW 2 */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
                {/* PHONE */}
                <div className='relative'>
                  <Label className='text-white text-base mb-2 block'>
                    Phone Number
                  </Label>
                  <Input
                    type='tel'
                    className='bg-white/20 text-white placeholder:text-gray-300 border-white/30 h-12 text-base'
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    required
                  />
                </div>

                {/* GENDER */}
                <div className='relative'>
                  <Label className='text-white text-base mb-2 block'>
                    Gender
                  </Label>
                  <select
                    className='w-full bg-white/20 border border-white/30 text-white p-3 rounded-lg h-12 text-base outline-none'
                    value={formData.gender}
                    onChange={(e) =>
                      setFormData({ ...formData, gender: e.target.value })
                    }
                    required
                  >
                    <option value='' className='text-black'>
                      Select
                    </option>
                    <option value='Male' className='text-black'>
                      Male
                    </option>
                    <option value='Female' className='text-black'>
                      Female
                    </option>
                    <option value='Other' className='text-black'>
                      Other
                    </option>
                  </select>
                </div>
              </div>

              {/* GRID ROW 3 */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
                {/* CITY */}
                <div className='relative'>
                  <Label className='text-white text-base mb-2 block'>
                    City
                  </Label>
                  <Input
                    className='bg-white/20 text-white placeholder:text-gray-300 border-white/30 h-12 text-base'
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    required
                  />
                </div>

                {/* STATE */}
                <div className='relative'>
                  <Label className='text-white text-base mb-2 block'>
                    State
                  </Label>
                  <Input
                    className='bg-white/20 text-white placeholder:text-gray-300 border-white/30 h-12 text-base'
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({ ...formData, state: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className='flex items-center gap-4'>
                <Button
                  type='submit'
                  className='bg-[#F6A32F] hover:bg-[#d88c25] text-white font-semibold px-8 py-3 text-lg rounded-lg'
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>

                <Button
                  type='button'
                  variant='ghost'
                  className='text-white/80 text-lg'
                  onClick={() => navigate('/dashboard/profile')}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
