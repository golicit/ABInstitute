// src/contexts/AppContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { toast } from '@/hooks/use-toast';

export interface Course {
  id: string;
  title: string;
  instructor: string;
  thumbnail: string;
  description: string;
  price: number;
  progress: number;
  isEnrolled: boolean;
  duration: string;
  lessonsCount: number;
  category: string;
  rating: number;
  students: number;
}

export interface Payment {
  id: string;
  courseId: string;
  courseName: string;
  amount: number;
  status: 'paid' | 'failed' | 'pending';
  date: string;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  phone: string;
  enrolledCourses: number;
  activeCourses: number;
  certificatesEarned: number;
}

interface AppContextType {
  user: AppUser;
  courses: Course[];
  payments: Payment[];
  loading: boolean;
  updateUser: (user: Partial<AppUser>) => void;
  enrollCourse: (courseId: string) => void;
  updateCourseProgress: (courseId: string, progress: number) => void;
  refreshCourses: () => Promise<void>;
  refreshDashboard: () => Promise<void>;
}

const LOCAL_PROGRESS_KEY = 'course_progress';

const AppContext = createContext<AppContextType | undefined>(undefined);

// Initial user (minimal)
const initialUser: AppUser = {
  id: '1',
  name: 'Student',
  email: 'student@example.com',
  avatar: '',
  phone: '',
  enrolledCourses: 1,
  activeCourses: 1,
  certificatesEarned: 0,
};

// Your single real course
const REAL_COURSE: Course = {
  id: 'option-analysis-strategy',
  title: 'Option Analysis Strategy by A. Bhattacharjee',
  instructor: 'A. Bhattacharjee',
  thumbnail: '/course/1.jpeg',
  description: 'Master the Systematic Trading Strategy by A. Bhattacharjee',
  price: 1499,
  progress: 0,
  isEnrolled: true,
  duration: 'Self-paced',
  lessonsCount: 57,
  category: 'Trading',
  rating: 5,
  students: 0,
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { user: authUser, initialized: authInitialized } = useAuth();

  const [user, setUser] = useState<AppUser>(initialUser);
  const [courses, setCourses] = useState<Course[]>([REAL_COURSE]);
  const [payments] = useState<Payment[]>([]);
  const [appLoading, setAppLoading] = useState(false);

  const refreshCourses = async () => {
    // Keep single real course
    setCourses([REAL_COURSE]);
  };

  // Sync app user with auth user
  useEffect(() => {
    if (authInitialized) {
      setAppLoading(true);

      if (authUser) {
        // Convert auth user to app user format
        setUser({
          id: authUser._id || authUser._id || '1',
          name: authUser.name || 'User',
          email: authUser.email || '',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${
            authUser.name || 'User'
          }`,
          phone: '',
          enrolledCourses: 1,
          activeCourses: 1,
          certificatesEarned: 0,
        });

        // Load saved progress
        const savedProgress = JSON.parse(
          localStorage.getItem(LOCAL_PROGRESS_KEY) || '{}'
        );
        if (Object.keys(savedProgress).length > 0) {
          setCourses((prev) =>
            prev.map((course) => ({
              ...course,
              progress: savedProgress[course.id] || course.progress,
            }))
          );
        }
      } else {
        // No auth user, keep default
        setUser(initialUser);
      }

      setAppLoading(false);
    }
  }, [authUser, authInitialized]);

  const enrollCourse = (courseId: string) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === courseId ? { ...c, isEnrolled: true } : c))
    );
    setUser((prev) => ({
      ...prev,
      enrolledCourses: prev.enrolledCourses + 1,
      activeCourses: prev.activeCourses + 1,
    }));
    toast({
      title: 'Enrolled!',
      description: `You are now enrolled.`,
    });
  };

  const updateCourseProgress = (courseId: string, progress: number) => {
    // Update React state
    setCourses((prev) =>
      prev.map((course) =>
        course.id === courseId
          ? { ...course, progress, isEnrolled: true }
          : course
      )
    );

    // Save to localStorage
    const saved = JSON.parse(localStorage.getItem(LOCAL_PROGRESS_KEY) || '{}');
    saved[courseId] = progress;
    localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(saved));
  };

  const refreshDashboard = async () => {
    // This is now handled by the useEffect above
    refreshCourses();
  };

  return (
    <AppContext.Provider
      value={{
        user,
        courses,
        payments,
        loading: appLoading,
        updateUser: (u) => setUser((prev) => ({ ...prev, ...u })),
        enrollCourse,
        updateCourseProgress,
        refreshCourses,
        refreshDashboard,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
};
