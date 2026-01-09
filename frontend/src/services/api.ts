import { toast } from '@/hooks/use-toast';
import axios from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: false,  // Changed to false - using JWT in headers, not cookies
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user_data');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

// API Base URL
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

// Generic API Response interface
export interface ApiResponse<T = any> {
    success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errorCode?: string;
  redirectUrl?: string;
  [key: string]: any;
}

// User interface
export interface User {
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
  batch?: string;
  
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

// Tutoring Status interface
export interface TutoringStatus {
  tutoringStatus: 'none' | 'pending' | 'active' | 'completed';
  tutoringPurchasedAt: string | null;
  mentorAvailabilityNotified: boolean;
  hasPurchasedMainCourse?: boolean;
  [key: string]: any;
}

// Payment Order Response
export interface PaymentOrderResponse {
  success: boolean;
  orderId: string;
  amount: number;
  currency: string;
  key: string;
  name?: string;
  description?: string;
  prefill?: {
    name: string;
    email: string;
    contact?: string;
  };
  theme?: {
    color: string;
  };
  notes?: Record<string, string>;
  callback_url?: string;
  cancel_url?: string;
  message?: string;
  [key: string]: any;
}

// Payment Verification Response
export interface PaymentVerificationResponse {
success: boolean;
  message: string;
  paymentId?: string;
  tutoringStatus?: string;
  redirectUrl?: string;
  [key: string]: any;
  type: 'tutoring' | 'course';
}

// Course interface
export interface Course {
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

interface AuthData {
  user: User;
  token: string;
}

// Generic API request function with timeout (as fallback)
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;

    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

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

// Auth API functions
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

  // VERIFY TOKEN
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

// Tutoring API functions - FIXED VERSION
export const tutoringAPI = {
  // Get tutoring status
  async getTutoringStatus(): Promise<ApiResponse<TutoringStatus>> {
    try {
      const response = await apiClient.get<ApiResponse<TutoringStatus>>('/api/payment/tutoring-status');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching tutoring status:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch tutoring status',
        error: error.message,
      };
    }
  },

  // Create tutoring order
  async createTutoringOrder(): Promise<ApiResponse<PaymentOrderResponse>> {
    try {
      const response = await apiClient.post<ApiResponse<PaymentOrderResponse>>('/api/payment/create-tutoring-order');
      return response.data;
    } catch (error: any) {
      console.error('Error creating tutoring order:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create tutoring order',
        error: error.message,
      };
    }
  },

  // Verify tutoring payment
  async verifyTutoringPayment(data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }): Promise<ApiResponse<PaymentVerificationResponse>> {
    try {
      const response = await apiClient.post<ApiResponse<PaymentVerificationResponse>>('/api/payment/verify-tutoring', data);
      return response.data;
    } catch (error: any) {
      console.error('Error verifying tutoring payment:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to verify tutoring payment',
        error: error.message,
      };
    }
  },

  // Mark notification as read
  async markNotificationRead(): Promise<ApiResponse<{ notified: boolean }>> {
    try {
      const response = await apiClient.post<ApiResponse<{ notified: boolean }>>('/api/payment/mark-notified');
      return response.data;
    } catch (error: any) {
      console.error('Error marking notification:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to mark notification',
        error: error.message,
      };
    }
  },

  // Schedule tutoring session
  async scheduleTutoringSession(sessionData: {
    date: string;
    time: string;
    duration: number;
    notes?: string;
  }): Promise<ApiResponse<{ sessionId: string; scheduledAt: string }>> {
    try {
      const response = await apiClient.post<ApiResponse<{ sessionId: string; scheduledAt: string }>>('/api/tutoring/schedule', sessionData);
      return response.data;
    } catch (error: any) {
      console.error('Error scheduling session:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to schedule session',
        error: error.message,
      };
    }
  },

  // Get upcoming tutoring sessions
  async getUpcomingSessions(): Promise<ApiResponse<Array<{
    _id: string;
    date: string;
    time: string;
    duration: number;
    status: 'scheduled' | 'completed' | 'cancelled';
    notes?: string;
  }>>> {
    try {
      const response = await apiClient.get<ApiResponse<any>>('/api/tutoring/sessions');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching sessions:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch sessions',
        error: error.message,
      };
    }
  },
};

// Payment API functions
export const paymentAPI = {
  // Create course payment order
  async createCourseOrder(courseId: string): Promise<ApiResponse<PaymentOrderResponse>> {
    try {
      const response = await apiClient.post<ApiResponse<PaymentOrderResponse>>('/api/payment/create-order', {
        courseId,
        type: 'course'
      });
      return response.data;
    } catch (error: any) {
      console.error('Error creating course order:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to create payment order',
        error: error.message,
      };
    }
  },

  // Verify course payment
  async verifyCoursePayment(data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }): Promise<ApiResponse<{
    paymentId: string;
    courseId: string;
    status: string;
  }>> {
    try {
      const response = await apiClient.post<ApiResponse<any>>('/api/payment/verify-payment', data);
      return response.data;
    } catch (error: any) {
      console.error('Error verifying course payment:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to verify payment',
        error: error.message,
      };
    }
  },

  // Get payment history
  async getPaymentHistory(): Promise<ApiResponse<Array<{
    _id: string;
    orderId: string;
    amount: number;
    currency: string;
    status: string;
    type: 'course' | 'tutoring';
    createdAt: string;
    paymentId?: string;
  }>>> {
    try {
      const response = await apiClient.get<ApiResponse<any>>('/api/payment/history');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching payment history:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch payment history',
        error: error.message,
      };
    }
  },
};

// Export types for use in components
export type { 
  LoginRequest, 
  RegisterRequest, 
  ForgotPasswordRequest, 
  AuthData 
};

// Export apiClient as default
export default apiClient;