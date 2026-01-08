// Update Header.tsx - Add batch indicator

import { Search, Bell, Menu, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header = ({ onMenuClick }: HeaderProps) => {
  const { user } = useApp();
  const { user: authUser } = useAuth(); // Get auth user
  const { signOut } = useAuth();
  const navigate = useNavigate();

  // Get batch from auth user
  const studentBatch = (authUser as any)?.batch;

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <header className='sticky top-0 z-50 w-full bg-card border-b border-border backdrop-blur'>
      <div className='flex h-16 items-center gap-4 px-4 md:px-6'>
        <Button
          variant='ghost'
          size='icon'
          className='md:hidden'
          onClick={onMenuClick}
        >
          <Menu className='h-5 w-5' />
        </Button>

        <div className='flex items-center gap-2'>
          <img
            src='/logo.jpg'
            alt='AB Institute Logo'
            className='h-10 w-10 rounded-lg object-cover'
          />
          <span className='hidden sm:inline-block font-semibold'>
            AB Institute
          </span>
        </div>

        {/* Batch Indicator in Header */}
        {studentBatch && (
          <div className='hidden md:flex items-center gap-2 ml-4 px-3 py-1 bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/20 rounded-full'>
            <Users className='h-4 w-4 text-blue-300' />
            <span className='text-sm font-medium text-white'>
              Batch: <span className='font-bold'>{studentBatch}</span>
            </span>
          </div>
        )}

        <div className='ml-auto flex items-center gap-4'>
          <div className='relative w-full max-w-md hidden md:block'>
            <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              type='search'
              placeholder='Search courses...'
              className='pl-9'
            />
          </div>

          <Button variant='ghost' size='icon' className='relative'>
            <Bell className='h-5 w-5' />
            <span className='absolute right-1 top-1 h-2 w-2 rounded-full bg-accent' />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' className='h-10 w-10 rounded-full p-0'>
                <Avatar>
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback>{user.name[0]}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align='end' className='w-56'>
              <DropdownMenuLabel>
                <p className='text-sm font-medium'>{user.name}</p>
                <p className='text-xs text-muted-foreground'>{user.email}</p>
                {studentBatch && (
                  <div className='mt-1 flex items-center gap-1 text-xs'>
                    <Users className='h-3 w-3' />
                    <span className='text-muted-foreground'>Batch: </span>
                    <span className='font-semibold'>{studentBatch}</span>
                  </div>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/dashboard/profile')}>
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate('/dashboard/batch-info')}
              >
                Batch Information
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className='text-destructive'
                onClick={handleLogout}
              >
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;
