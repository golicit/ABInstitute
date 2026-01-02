import {
  Home,
  BookOpen,
  ShoppingCart,
  CreditCard,
  User,
  LogOut,
  Presentation,
  X,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  { icon: Home, label: 'Dashboard', path: '/dashboard' },
  { icon: BookOpen, label: 'My Courses', path: '/dashboard/my-courses' },
  { icon: ShoppingCart, label: 'Explore Courses', path: '/dashboard/explore' },

  {
    icon: Presentation,
    label: 'Webinar schedule & Zoom link',
    path: '/dashboard/payments',
  },
  { icon: CreditCard, label: 'Payment History', path: '/dashboard/payments' },

  { icon: User, label: 'Profile', path: '/dashboard/profile' },
];

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      {isOpen && (
        <div
          className='fixed inset-0 z-40 bg-background/80 backdrop-blur md:hidden'
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-full w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-transform',
          'md:translate-x-0 md:sticky md:top-16 md:h-[calc(100vh-4rem)]',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className='md:hidden flex items-center justify-between h-16 px-4 border-b border-sidebar-border'>
          <span className='font-semibold'>AB Institute</span>
          <Button variant='ghost' size='icon' onClick={onClose}>
            <X className='h-5 w-5' />
          </Button>
        </div>

        <nav className='p-4 space-y-1'>
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/dashboard'}
              className='flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors hover:bg-sidebar-accent'
              activeClassName='bg-sidebar-primary text-sidebar-primary-foreground font-medium'
              onClick={() => window.innerWidth < 768 && onClose()}
            >
              <item.icon className='h-5 w-5' />
              {item.label}
            </NavLink>
          ))}

          <Button
            variant='ghost'
            className='w-full justify-start gap-3 mt-4'
            onClick={async () => {
              await signOut();
              navigate('/auth');
              onClose();
            }}
          >
            <LogOut className='h-5 w-5' />
            Logout
          </Button>
        </nav>

        {/* Footer */}
        <div className='absolute bottom-4 left-0 w-full px-4 text-center text-white/90 text-sm'>
          <div className='flex flex-col items-center justify-center gap-2'>
            <span className='text-xs'>
              © {new Date().getFullYear()} AB Institute of Market Research &
              Analysis. All Rights Reserved.
            </span>

            <span className='text-xs'>Powered by</span>

            <a
              href='https://golicit.in'
              target='_blank'
              rel='noopener noreferrer'
              className='flex items-center gap-2 hover:opacity-80 transition-opacity'
            >
              <img
                src='/company_logo.png'
                alt='Golicit Logo'
                className='w-5 h-5 rounded'
              />
              <span className='font-medium text-xs'>
                Golicit Services Pvt Ltd
              </span>
            </a>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
