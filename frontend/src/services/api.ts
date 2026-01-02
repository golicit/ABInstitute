import { toast } from '@/hooks/use-toast';
import axios from "axios";


export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: false,  // Changed to false - using JWT in headers, not cookies
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  console.log('auth token ', token);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// API Base URL - Update this to match your backend URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

interface ForgotPasswordRequest {
  email: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

// Update the User interface
interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  profileCompleted: boolean;
  
  // Payment fields
  paymentStatus: 'pending' | 'paid' | 'failed';
  isPaidUser: boolean;
  lastPaymentDate?: string;
  payments?: string[];
  
  // Profile fields
  fullName?: string;
  phone?: string;
  gender?: string;
  city?: string;
  state?: string;
  profileImage?: string;
  provider?: 'local' | 'google';
  picture?: string;
  
  // Orders
  orders?: Array<{
    orderId: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: Date;
    paymentId: string;
  }>;
}


interface AuthData {
  user: User;
  token: string;
}

// Generic API request function with timeout
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;

    console.log('API Request:', url, options);

    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
      ...options,
    });

    clearTimeout(timeoutId);

    const data = await response.json();
    console.log('API Response:', data);

    return data;
  } catch (error) {
    console.error('API Error:', error);
    
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        message: 'Request timeout - server may be unavailable',
        error: 'Timeout',
      };
    }
    
    return {
      success: false,
      message: 'Network error occurred',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Auth API functions (FINAL FIXED VERSION)
export const authAPI = {
  // LOGIN
  async login(credentials: LoginRequest): Promise<ApiResponse<AuthData>> {
    try {
      const res = await apiClient.post<ApiResponse<AuthData>>(
        "/api/auth/login",
        credentials
      );

      if (res.data.success && res.data.data) {
        // Store token and user data in localStorage
        localStorage.setItem("token", res.data.data.token);
        localStorage.setItem("user_data", JSON.stringify(res.data.data.user));
        
        toast({
          title: "Success",
          description: "Logged in successfully!",
        });
      } else {
        toast({
          title: "Login Failed",
          description: res.data.message || "Invalid credentials",
          variant: "destructive",
        });
      }

      return res.data;
    } catch (error: any) {
      return {
        success: false,
        message: "Network error",
      };
    }
  },

  // REGISTER
  async register(userData: RegisterRequest): Promise<ApiResponse<AuthData>> {
    try {
      const res = await apiClient.post<ApiResponse<AuthData>>(
        "/api/auth/register",
        userData
      );

      if (res.data.success && res.data.data) {
        // Store token and user data in localStorage
        localStorage.setItem("token", res.data.data.token);
        localStorage.setItem("user_data", JSON.stringify(res.data.data.user));
        
        toast({
          title: "Success",
          description: "Account created successfully!",
        });
      } else {
        toast({
          title: "Registration Failed",
          description: res.data.message || "Failed to create account",
          variant: "destructive",
        });
      }

      return res.data;
    } catch (error: any) {
      return {
        success: false,
        message: "Network error",
      };
    }
  },

  // GOOGLE LOGIN
  async googleLogin(token: string, userInfo: any): Promise<ApiResponse<any>> {
    try {
      const res = await apiClient.post<ApiResponse<any>>(
        `${import.meta.env.VITE_API_BASE_URL}/auth/google`,
        { token, userInfo }
      );

      return res.data;
    } catch (error) {
      return {
        success: false,
        message: "Google login failed",
      };
    }
  },

  // FORGOT PASSWORD
  async forgotPassword(
    data: ForgotPasswordRequest
  ): Promise<ApiResponse<any>> {
    try {
      const res = await apiClient.post<ApiResponse<any>>(
        "/api/auth/forgot-password",
        data
      );

      if (res.data.success) {
        toast({
          title: "Success",
          description: "Password reset email sent!",
        });
      } else {
        toast({
          title: "Error",
          description: res.data.message,
          variant: "destructive",
        });
      }

      return res.data;
    } catch (error) {
      return {
        success: false,
        message: "Network error",
      };
    }
  },

  // VERIFY TOKEN  (cookie-based)
  async verifyToken(): Promise<ApiResponse<{ user: User }>> {
    try {
      const res = await apiClient.get<ApiResponse<{ user: User }>>(
        "/api/auth/verify"
      );
      return res.data;
    } catch (e) {
      return {
        success: false,
        message: "Token invalid",
      };
    }
  },

  // LOGOUT
  logout(): void {
    localStorage.removeItem("token");
    localStorage.removeItem("user_data");
    toast({
      title: "Logged out",
      description: "You have been logged out successfully",
    });
  },

  // GET STORED USER (fallback only)
  getStoredUser(): User | null {
    const userData = localStorage.getItem("user_data");
    return userData ? JSON.parse(userData) : null;
  },

  // GET TOKEN (fallback only)
  getToken(): string | null {
    return localStorage.getItem("token");
  },
};





// Export types for use in components
export type { User, AuthData, LoginRequest, RegisterRequest, ForgotPasswordRequest, ApiResponse };

// Courses API functions
export const coursesAPI = {
  // Get all courses
  async getAllCourses(): Promise<ApiResponse<Course[]>> {
    return await apiRequest<Course[]>('/courses', {
      method: 'GET',
    });
  },

  // Get course by slug
  async getCourseBySlug(slug: string): Promise<ApiResponse<Course>> {
    return await apiRequest<Course>(`/courses/${slug}`, {
      method: 'GET',
    });
  },

  // Create new course
  async createCourse(courseData: CreateCourseRequest): Promise<ApiResponse<Course>> {
    return await apiRequest<Course>('/courses', {
      method: 'POST',
      body: JSON.stringify(courseData),
    });
  },
};

// Dashboard API functions
export const dashboardAPI = {
  // Get user dashboard data
  async getDashboardData(userId: string): Promise<ApiResponse<DashboardData>> {
    return await apiRequest<DashboardData>(`/dashboard/${userId}`, {
      method: 'GET',
    });
  },

  // Get user enrolled courses
  async getEnrolledCourses(userId: string): Promise<ApiResponse<Course[]>> {
    return await apiRequest<Course[]>(`/users/${userId}/enrolled-courses`, {
      method: 'GET',
    });
  },

  // Get user stats
  async getUserStats(userId: string): Promise<ApiResponse<UserStats>> {
    return await apiRequest<UserStats>(`/users/${userId}/stats`, {
      method: 'GET',
    });
  },
};

// Course interface for backend
interface Course {
  _id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  originalPrice?: number;
  thumbnail?: string;
  instructor?: string;
  duration?: string;
  lessonsCount?: number;
  category?: string;
  rating?: number;
  students?: number;
  progress?: number;
  isEnrolled?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateCourseRequest {
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
}

interface DashboardData {
  user: User;
  enrolledCourses: Course[];
  activeCourses: Course[];
  stats: UserStats;
}

interface UserStats {
  enrolledCourses: number;
  activeCourses: number;
  certificatesEarned: number;
  hoursLearned: number;
}