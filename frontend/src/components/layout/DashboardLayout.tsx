import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const disableRightClick = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', disableRightClick);
    return () => document.removeEventListener('contextmenu', disableRightClick);
  }, []);

  return (
    // 🔥 IMPORTANT: background applied HERE
    <div className='min-h-screen bg-background text-foreground'>
      <Header onMenuClick={() => setSidebarOpen(true)} />

      {/* 🔥 IMPORTANT: bg-background added */}
      <div className='flex w-full bg-background'>
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className='flex-1 min-h-[calc(100vh-4rem)] p-4 md:p-6 lg:p-8 overflow-y-auto bg-background'>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
