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
import Logo from '/logo.jpg';

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
    <header
      className=' 
        sticky top-0 left-0 w-full z-50
        bg-[rgba(0,21,41,0.8)]
        backdrop-blur-[10px]
        border-b border-white/10
        shadow-[0_4px_20px_rgba(0,0,0,0.15)]'
    >
      <div className='flex h-16 items-center gap-4 px-4 md:px-6'>
        <Button
          variant='ghost'
          size='icon'
          className='md:hidden'
          onClick={onMenuClick}
        >
          <Menu className='h-5 w-5' />
        </Button>

        <div className='flex items-center gap-2 h-12 w-12'>
          <img
            src={Logo}
            alt='AB Institute Logo'
            className='h-full w-full rounded-lg object-cover'
          />
          <span className='hidden text-lg font-semibold text-white whitespace-nowrap sm:inline-block'>
            AB Institute
          </span>
        </div>

        <div className='flex flex-1 items-center gap-4 md:gap-6'>
          <div className='relative ml-auto w-full max-w-md'>
            <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              type='search'
              placeholder='Search courses...'
              className='pl-9 bg-background'
            />
          </div>

          <Button variant='ghost' size='icon' className='relative'>
            <Bell className='h-5 w-5' />
            <span className='absolute right-1 top-1 flex h-2 w-2 rounded-full bg-accent'></span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                className='relative h-10 w-10 rounded-full'
              >
                <Avatar>
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-56'>
              <DropdownMenuLabel>
                <div className='flex flex-col space-y-1'>
                  <p className='text-sm font-medium'>{user.name}</p>
                  <p className='text-xs text-muted-foreground'>{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/dashboard/profile')}>
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/dashboard/profile')}>
                Settings
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
