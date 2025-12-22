'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface Props {
  children: React.ReactNode;
}

const MAX_VIOLATIONS = 3;
const VIOLATION_KEY = 'ereader_violations';

export default function EReaderSecurityWrapper({ children }: Props) {
  const { signOut, user } = useAuth();

  /* 🚨 Track violations (session-based) */
  const recordViolation = () => {
    const current = Number(sessionStorage.getItem(VIOLATION_KEY) || 0) + 1;
    sessionStorage.setItem(VIOLATION_KEY, String(current));
    return current;
  };

  /* 🔐 Force logout */
  const forceLogout = async () => {
    sessionStorage.removeItem(VIOLATION_KEY);

    toast({
      title: 'Security Violation',
      description:
        'Multiple restricted actions detected. You have been logged out.',
      variant: 'destructive',
    });

    // small delay so toast is visible
    setTimeout(async () => {
      await signOut();
      window.location.href = '/auth';
    }, 1500);
  };

  /* 🔒 Keyboard blocking */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      const isRestricted =
        e.key === 'PrintScreen' ||
        (e.ctrlKey && ['c', 's', 'p', 'x'].includes(key)) ||
        (e.metaKey && ['c', 's', 'p', 'x'].includes(key));

      if (isRestricted) {
        e.preventDefault();
        e.stopPropagation();

        const count = recordViolation();

        if (count >= MAX_VIOLATIONS) {
          forceLogout();
          return;
        }

        toast({
          title: 'Restricted Action',
          description: `This action is not allowed (${count}/${MAX_VIOLATIONS})`,
          variant: 'destructive',
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  /* 🔒 Disable right-click */
  useEffect(() => {
    const blockContext = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', blockContext);
    return () => document.removeEventListener('contextmenu', blockContext);
  }, []);

  /* 🔒 Tab switch / minimize detection */
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        const count = recordViolation();

        if (count >= MAX_VIOLATIONS) {
          forceLogout();
          return;
        }

        toast({
          title: 'Warning',
          description: `Screen capture attempts are monitored (${count}/${MAX_VIOLATIONS})`,
          variant: 'destructive',
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  return (
    <div className='relative select-none'>
      {/* 🔥 Dynamic watermark */}
      <div className='pointer-events-none fixed inset-0 z-50 flex items-center justify-center'>
        <div className='text-white/15 text-3xl rotate-[-30deg] text-center leading-relaxed'>
          {user?.email || 'Authorized User'}
          <br />
          {new Date().toLocaleString()}
        </div>
      </div>

      {/* 🔐 Protected content */}
      {children}

      {/* 📜 Legal disclaimer */}
      <p className='mt-4 text-xs text-center text-white/60'>
        Screenshots, screen recording, copying or redistribution of this content
        is prohibited. Repeated violations may result in account termination.
      </p>
    </div>
  );
}
