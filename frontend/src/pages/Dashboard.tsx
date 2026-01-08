// src/pages/Dashboard.tsx

import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Award, TrendingUp, Clock, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/services/api';
import { toast } from 'sonner';

const DashboardSkeleton = () => {
  return (
    <div className='space-y-8 animate-pulse'>
      {/* Hero Skeleton */}
      <div className='rounded-xl bg-white/10 h-32 w-full' />

      {/* Stats Skeleton */}
      <div className='grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className='bg-white/10 border border-white/10 rounded-xl h-28'
          />
        ))}
      </div>

      {/* Continue Learning Skeleton */}
      <div>
        <div className='h-6 bg-white/10 w-48 rounded mb-4' />

        <div className='grid gap-4 md:grid-cols-2'>
          {[1, 2].map((i) => (
            <div
              key={i}
              className='bg-white/10 border border-white/10 rounded-xl h-40'
            />
          ))}
        </div>
      </div>

      {/* Certificates Skeleton */}
      <div className='bg-white/10 border border-white/10 rounded-xl h-48' />
    </div>
  );
};

// ======================
// 🔵 Progress Ring
// ======================
const ProgressRing = ({
  size = 64,
  stroke = 6,
  value = 0,
}: {
  size?: number;
  stroke?: number;
  value: number;
}) => {
  const radius = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg width={size} height={size}>
      <defs>
        <linearGradient id='grad1' x1='0%' y1='0%' x2='100%' y2='0%'>
          <stop offset='0%' stopColor='hsl(var(--primary))' />
          <stop offset='100%' stopColor='hsl(var(--accent))' />
        </linearGradient>
      </defs>

      <circle
        cx={cx}
        cy={cy}
        r={radius}
        stroke='rgba(255,255,255,0.08)'
        strokeWidth={stroke}
        fill='transparent'
      />

      <circle
        cx={cx}
        cy={cy}
        r={radius}
        stroke='url(#grad1)'
        strokeWidth={stroke}
        strokeLinecap='round'
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${cx} ${cy})`}
        fill='transparent'
      />

      <text
        x='50%'
        y='50%'
        dominantBaseline='middle'
        textAnchor='middle'
        fontSize={12}
        fill='#fff'
        fontWeight={600}
      >
        {value}%
      </text>
    </svg>
  );
};

// Batch Info Component
const BatchInfoCard = ({ batchName }: { batchName: string }) => {
  const [batchDetails, setBatchDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (batchName) {
      fetchBatchDetails();
    }
  }, [batchName]);

  const fetchBatchDetails = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/api/students/my-batch`);
      if (response.data) {
        setBatchDetails(response.data);
      }
    } catch (error) {
      console.error('Error fetching batch details:', error);
    } finally {
      setLoading(false);
    }
  };

  // Extract batch details from name
  const getBatchInfo = (batchName: string) => {
    if (!batchName) return { series: '', suffix: '', year: '' };

    // Example: ABINS20262001A
    const match = batchName.match(/ABINS(\d{4})(\d{4})([A-Z])/);
    if (match) {
      return {
        year: match[1],
        series: match[2],
        suffix: match[3],
      };
    }
    return { series: '', suffix: '', year: '' };
  };

  const batchInfo = getBatchInfo(batchName);

  return (
    <Card className='bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-500/20'>
      <CardHeader className='pb-3'>
        <CardTitle className='text-white flex items-center gap-2'>
          <Users className='h-5 w-5' />
          Your Batch
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className='flex flex-col items-center justify-center p-4'>
          {/* Batch Badge */}
          <div className='mb-4'>
            <div className='inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-full text-xl font-bold shadow-lg'>
              {batchName}
            </div>
          </div>

          {/* Batch Details */}
          <div className='grid grid-cols-3 gap-4 w-full max-w-md'>
            <div className='text-center p-3 bg-white/10 rounded-lg'>
              <p className='text-sm text-white/70'>Series</p>
              <p className='text-xl font-bold text-white'>{batchInfo.series}</p>
            </div>
            <div className='text-center p-3 bg-white/10 rounded-lg'>
              <p className='text-sm text-white/70'>Suffix</p>
              <p className='text-xl font-bold text-white'>{batchInfo.suffix}</p>
            </div>
            <div className='text-center p-3 bg-white/10 rounded-lg'>
              <p className='text-sm text-white/70'>Year</p>
              <p className='text-xl font-bold text-white'>{batchInfo.year}</p>
            </div>
          </div>

          {/* Additional Info */}
          {batchDetails && (
            <div className='mt-4 text-center'>
              <p className='text-white/80'>
                Students in batch:{' '}
                <span className='font-bold'>
                  {batchDetails.studentCount || 0}/25
                </span>
              </p>
              <p className='text-sm text-white/60 mt-2'>
                Each batch has maximum 25 students for optimal learning
              </p>
            </div>
          )}

          {/* View Batch Details Button */}
          <Button
            variant='outline'
            className='mt-6 border-white/30 text-white hover:bg-white/10'
            onClick={fetchBatchDetails}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'View Batch Details'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// ======================
// 🔵 Dashboard Page
// ======================
const Dashboard = () => {
  const { user, courses, updateUser } = useApp();
  const { user: authUser } = useAuth(); // Get auth user for batch info
  const navigate = useNavigate();

  // Get batch from auth user (this should come from backend)
  const studentBatch = (authUser as any)?.batch || user.batch;

  // ======================
  // 1️⃣ Real-time course lists
  // ======================
  const enrolledCourses = courses.filter((c) => c.isEnrolled);
  const activeCourses = courses.filter(
    (c) => c.isEnrolled && c.progress > 0 && c.progress < 100
  );
  const continueLearning = activeCourses; // alias

  // ======================
  // 2️⃣ Hours learned (pages viewed → hours)
  // ======================
  const getTotalPagesViewed = () => {
    let total = 0;
    const vp = JSON.parse(
      localStorage.getItem('viewedPages_option-analysis-strategy') || '{}'
    );
    Object.values(vp).forEach((arr: any) => {
      total += arr.length;
    });
    return total;
  };

  const hoursLearned = ((getTotalPagesViewed() * 1.5) / 60).toFixed(1);

  // ======================
  // 3️⃣ Stats (dynamic) - Updated to include batch
  // ======================
  const stats = [
    {
      title: 'Enrolled Courses',
      value: enrolledCourses.length,
      icon: BookOpen,
    },
    {
      title: 'Active Courses',
      value: activeCourses.length,
      icon: TrendingUp,
    },
    {
      title: 'Certificates',
      value: user.certificatesEarned,
      icon: Award,
    },
    {
      title: 'Hours Learned',
      value: hoursLearned,
      icon: Clock,
    },
  ];

  // ======================
  // 4️⃣ Certificate Auto-Unlock
  // ======================
  const CERT_UNLOCK_KEY = 'certificates_unlocked_v1';

  useEffect(() => {
    if (!courses.length) return;

    const stored = JSON.parse(localStorage.getItem(CERT_UNLOCK_KEY) || '{}');
    let count = Object.values(stored).filter(Boolean).length;
    let changed = false;

    courses.forEach((course) => {
      if (course.progress >= 100 && !stored[course.id]) {
        stored[course.id] = true;
        count++;
        changed = true;
      }
    });

    if (changed) {
      localStorage.setItem(CERT_UNLOCK_KEY, JSON.stringify(stored));
      updateUser({ certificatesEarned: count });
    } else {
      updateUser({ certificatesEarned: count });
    }
  }, [courses]);

  const unlockedCertificates = useMemo(() => {
    const stored = JSON.parse(localStorage.getItem(CERT_UNLOCK_KEY) || '{}');
    return Object.keys(stored)
      .filter((k) => stored[k])
      .map((id) => courses.find((c) => c.id === id))
      .filter(Boolean);
  }, [courses]);

  // ======================
  // 5️⃣ Loading State
  // ======================
  if (!courses || courses.length === 0) {
    return <DashboardSkeleton />;
  }

  // ======================
  // UI Starts Here
  // ======================
  return (
    <div className='space-y-8'>
      {/* HERO with Batch Info */}
      <div className='rounded-xl bg-gradient-primary/80 p-8 text-white shadow-lg'>
        <div className='flex flex-col md:flex-row justify-between items-start md:items-center'>
          <div>
            <h1 className='text-3xl font-bold mb-2'>
              Welcome back, {user.name.split(' ')[0]} 👋
            </h1>
            <p className='text-white/70'>
              Continue your progress — your courses, achievements and
              certificates.
            </p>
          </div>

          {/* Batch Badge in Header */}
          {studentBatch && (
            <div className='mt-4 md:mt-0 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30'>
              <span className='text-sm text-white/70 mr-2'>Batch:</span>
              <span className='font-bold text-white'>{studentBatch}</span>
            </div>
          )}
        </div>
      </div>

      {/* DASHBOARD BANNER IMAGE */}
      <div className='w-full flex justify-center'>
        <div className='relative w-full max-w-6xl rounded-2xl overflow-hidden shadow-2xl'>
          <img
            src='/dashboard-banner.jpeg'
            alt='Learning Banner'
            className='
              w-full
              h-[220px]
              sm:h-[300px]
              md:h-[420px]
              lg:h-[480px]
              xl:h-[520px]
              object-cover
              object-top
            '
          />

          {/* Very light overlay (optional, keeps image sharp) */}
          <div className='absolute inset-0 bg-black/10' />
        </div>
      </div>

      {/* BATCH INFORMATION CARD - NEW SECTION */}
      {studentBatch && (
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
          {/* Batch Card - Takes 1/3 on large screens */}
          <div className='lg:col-span-1'>
            <BatchInfoCard batchName={studentBatch} />
          </div>

          {/* Stats Grid - Takes 2/3 on large screens */}
          <div className='lg:col-span-2'>
            <div className='grid gap-6 grid-cols-1 sm:grid-cols-2'>
              {stats.map((s) => (
                <Card
                  key={s.title}
                  className='bg-card border border-border shadow-md rounded-xl shadow'
                >
                  <CardContent className='flex items-center gap-4 p-6'>
                    <div className='rounded-lg p-3 bg-gradient-to-br from-[#F6A32F]/20 to-[#F67315]/10'>
                      <s.icon className='h-6 w-6 text-white' />
                    </div>

                    <div>
                      <p className='text-sm text-white/70'>{s.title}</p>
                      <p className='text-2xl font-bold text-white'>{s.value}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* If no batch, show regular stats grid */}
      {!studentBatch && (
        <div className='grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'>
          {stats.map((s) => (
            <Card
              key={s.title}
              className='bg-card border border-border shadow-md rounded-xl shadow'
            >
              <CardContent className='flex items-center gap-4 p-6'>
                <div className='rounded-lg p-3 bg-gradient-to-br from-[#F6A32F]/20 to-[#F67315]/10'>
                  <s.icon className='h-6 w-6 text-white' />
                </div>

                <div>
                  <p className='text-sm text-white/70'>{s.title}</p>
                  <p className='text-2xl font-bold text-white'>{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* CONTINUE LEARNING */}
      <h2 className='text-2xl font-bold text-white'>Continue Learning</h2>

      <div className='grid gap-4 md:grid-cols-2'>
        {continueLearning.length === 0 && (
          <Card className='bg-card border border-border shadow-md p-6 text-white/70'>
            No active courses.
          </Card>
        )}

        {continueLearning.map((course) => (
          <Card
            key={course.id}
            className='relative overflow-hidden rounded-xl shadow-lg transform hover:-translate-y-1 transition-all cursor-pointer'
            onClick={() => navigate(`/dashboard/course/${course.id}`)}
          >
            {/* Background Thumbnail */}
            <div
              className='absolute inset-0 bg-cover bg-center opacity-25 blur-sm'
              style={{ backgroundImage: `url(${course.thumbnail})` }}
            />

            {/* Overlay */}
            <div className='absolute inset-0 bg-gradient-to-br from-black/60 to-black/80' />

            <div className='relative flex items-stretch z-10'>
              <div className='p-4 flex items-center'>
                <ProgressRing value={course.progress} />
              </div>

              <div className='flex-1 p-4'>
                <h3 className='text-lg text-white font-semibold line-clamp-2'>
                  {course.title}
                </h3>
                <p className='text-sm text-white/70 mt-1'>
                  {course.instructor}
                </p>

                <div className='mt-4 flex items-center justify-between'>
                  <div className='w-2/3'>
                    <div className='text-xs text-white/60'>Progress</div>
                    <div className='w-full bg-white/10 rounded h-2 mt-2 overflow-hidden'>
                      <div
                        style={{ width: `${course.progress}%` }}
                        className='h-2 bg-primary'
                      />
                    </div>
                  </div>

                  <Button
                    className='bg-primary text-primary-foreground hover:bg-primary/90'
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/dashboard/course/${course.id}`);
                    }}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* CERTIFICATES */}
      <Card className='bg-card border border-border shadow-md p-6'>
        <CardHeader>
          <CardTitle className='text-white'>Certificates</CardTitle>
        </CardHeader>
        <CardContent>
          {unlockedCertificates.length === 0 ? (
            <p className='text-white/70'>No certificates unlocked yet.</p>
          ) : (
            unlockedCertificates.map((c) => (
              <p key={c.id} className='text-white/80 py-1'>
                🎓 {c.title}
              </p>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
