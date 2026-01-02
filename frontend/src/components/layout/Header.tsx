import { Search, Bell, Menu } from 'lucide-react';
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
  const { signOut } = useAuth();
  const navigate = useNavigate();

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
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/dashboard/profile')}>
                Profile
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
