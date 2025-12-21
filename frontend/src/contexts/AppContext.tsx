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
  refreshUserAvatar: () => void; // Added for manual avatar refresh
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
  thumbnail: '/course/Cover.jpeg',
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
  const {
    user: authUser,
    initialized: authInitialized,
    updateUser: updateAuthUser,
  } = useAuth();

  const [user, setUser] = useState<AppUser>(initialUser);
  const [courses, setCourses] = useState<Course[]>([REAL_COURSE]);
  const [payments] = useState<Payment[]>([]);
  const [appLoading, setAppLoading] = useState(false);

  const refreshCourses = async () => {
    setCourses([REAL_COURSE]);
  };

  // Generate unique avatar URL
  const generateAvatarUrl = (userId: string, userName: string): string => {
    // Create a unique seed using userId and userName
    const cleanName = userName.replace(/\s+/g, '_').toLowerCase();
    const seed = `${userId}_${cleanName}`;

    // Add cache busting parameter based on userId
    const timestamp = Date.now();
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&cb=${userId}_${timestamp}`;
  };

  // Get user ID from authUser (handles both _id and id)
  const getUserId = (): string => {
    if (!authUser) return 'guest';

    // Check for both _id and id properties
    const userId = (authUser as any)._id || (authUser as any).id;

    if (!userId) {
      console.warn('No user ID found in authUser:', authUser);
      return 'unknown';
    }

    return userId.toString();
  };

  // Sync app user with auth user
  useEffect(() => {
    if (authInitialized) {
      setAppLoading(true);

      if (authUser) {
        const userId = getUserId();
        const userName = authUser.name || 'User';
        const userEmail = authUser.email || '';

        console.log('🔄 Syncing app user:', { userId, userName, userEmail });

        // Check if user has a Google profile picture
        const googlePicture = (authUser as any).picture;
        let avatarUrl: string;

        if (googlePicture) {
          // For Google pictures, add cache busting with userId
          const separator = googlePicture.includes('?') ? '&' : '?';
          avatarUrl = `${googlePicture}${separator}cb=${userId}_${Date.now()}`;
        } else {
          // Generate DiceBear avatar
          avatarUrl = generateAvatarUrl(userId, userName);
        }

        // Check if we have a custom avatar in localStorage
        const customAvatarKey = `custom_avatar_${userId}`;
        const customAvatar = localStorage.getItem(customAvatarKey);
        if (customAvatar) {
          avatarUrl = customAvatar;
        }

        // Clear previous user's avatar cache if switching users
        const lastUserId = localStorage.getItem('last_user_id');
        if (lastUserId && lastUserId !== userId) {
          // Clear old user's custom avatar
          localStorage.removeItem(`custom_avatar_${lastUserId}`);
        }

        // Store current user ID
        localStorage.setItem('last_user_id', userId);

        const newAppUser: AppUser = {
          id: userId,
          name: userName,
          email: userEmail,
          avatar: avatarUrl,
          phone: '',
          enrolledCourses: 1,
          activeCourses: 1,
          certificatesEarned: 0,
        };

        console.log('✅ Setting app user:', newAppUser);
        setUser(newAppUser);

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
        // No auth user - reset to default
        console.log('🔄 No auth user, setting guest');
        const guestAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=guest_${Date.now()}`;
        setUser({
          ...initialUser,
          avatar: guestAvatar,
        });

        // Clear last user ID
        localStorage.removeItem('last_user_id');
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
    setCourses((prev) =>
      prev.map((course) =>
        course.id === courseId
          ? { ...course, progress, isEnrolled: true }
          : course
      )
    );

    const saved = JSON.parse(localStorage.getItem(LOCAL_PROGRESS_KEY) || '{}');
    saved[courseId] = progress;
    localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(saved));
  };

  const refreshUserAvatar = () => {
    if (authUser) {
      const userId = getUserId();
      const userName = authUser.name || 'User';

      // Check for custom avatar first
      const customAvatarKey = `custom_avatar_${userId}`;
      const customAvatar = localStorage.getItem(customAvatarKey);

      let avatarUrl: string;

      if (customAvatar) {
        avatarUrl = customAvatar;
      } else {
        // Check for Google picture
        const googlePicture = (authUser as any).picture;
        if (googlePicture) {
          const separator = googlePicture.includes('?') ? '&' : '?';
          avatarUrl = `${googlePicture}${separator}cb=${userId}_${Date.now()}`;
        } else {
          avatarUrl = generateAvatarUrl(userId, userName);
        }
      }

      setUser((prev) => ({
        ...prev,
        avatar: avatarUrl,
      }));

      console.log('🔄 Refreshed avatar:', avatarUrl);
    }
  };

  const refreshDashboard = async () => {
    await refreshCourses();
  };

  const updateUserWithAvatar = (updatedUser: Partial<AppUser>) => {
    setUser((prev) => {
      const newUser = { ...prev, ...updatedUser };

      // If avatar is being updated, save it as custom avatar
      if (updatedUser.avatar && authUser) {
        const userId = getUserId();
        const customAvatarKey = `custom_avatar_${userId}`;
        localStorage.setItem(customAvatarKey, updatedUser.avatar);

        // Also update auth user if it has an avatar field
        if (updateAuthUser && (authUser as any).avatar !== undefined) {
          updateAuthUser({ ...authUser, avatar: updatedUser.avatar } as any);
        }
      }

      return newUser;
    });
  };

  return (
    <AppContext.Provider
      value={{
        user,
        courses,
        payments,
        loading: appLoading,
        updateUser: updateUserWithAvatar,
        enrollCourse,
        updateCourseProgress,
        refreshCourses,
        refreshDashboard,
        refreshUserAvatar,
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
