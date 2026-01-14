import { toast } from '@/hooks/use-toast';
import axios from "axios";

// Create axios instance with default configuration
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: false,
  timeout: 15000, // 15 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to include auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user_data');
      window.location.href = '/auth';
    }
    
    // Handle network errors
    if (error.code === 'ECONNABORTED') {
      toast({
        title: "Connection Timeout",
        description: "The server took too long to respond. Please try again.",
        variant: "destructive",
      });
    }
    
    // Handle other errors
    if (!error.response) {
      toast({
        title: "Network Error",
        description: "Unable to connect to the server. Please check your internet connection.",
        variant: "destructive",
      });
    }
    
    return Promise.reject(error);
  }
);

// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Request Interfaces
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
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  [key: string]: any;
}

// Student interface
export interface Student {
  _id: string;
  name: string;
  email: string;
  tutoringStatus: 'none' | 'pending' | 'active' | 'completed';
  tutoringPurchasedAt: string;
  mentorAvailabilityNotified: boolean;
  createdAt: string;
  tutoring?: {
    status: string;
    purchasedAt: string;
    activatedAt?: string;
  };
}

// Tutoring Student interface (for 1:1 sessions)
export interface TutoringStudent {
  _id: string;
  name: string;
  email: string;
  batch?: string;
  tutoringStatus: 'none' | 'pending' | 'active' | 'completed';
  tutoring?: {
    status: string;
    purchasedAt: string;
    activatedAt?: string;
  };
}

// Dashboard Response interface
export interface DashboardResponse {
  success: boolean;
  pendingUsers: Student[];
  activeUsers: Student[];
  completedUsers: Student[];
  stats: {
    total: number;
    pending: number;
    active: number;
    completed: number;
  };
}

// Activate Response interface
export interface ActivateResponse {
  success: boolean;
  message: string;
  user: {
    id: string;
    name: string;
    email: string;
    tutoringStatus: string;
  };
}

// Bulk Activate Response interface
export interface BulkActivateResponse {
  success: boolean;
  message: string;
  results: Array<{
    userId: string;
    name: string;
    email: string;
    status: string;
  }>;
  errors: Array<{
    userId: string;
    error: string;
  }>;
}

// Notification Response interface
export interface NotificationResponse {
  success: boolean;
  message: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  notification: {
    type: string;
    message: string;
    sentAt: string;
  };
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
  type: 'tutoring' | 'course';
  [key: string]: any;
}

// Webinar/Session interfaces
export interface Webinar {
  _id: string;
  title: string;
  description: string;
  type: 'webinar' | 'one_on_one';
  scheduledTime: string;
  duration: number;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  meetingLink: string;
  zohoMeetingId: string;
  meetingPassword?: string;
  teacherId: {
    _id: string;
    name: string;
    email: string;
  };
  studentId?: {
    _id: string;
    name: string;
    email: string;
  };
  batch?: {
    _id: string;
    batchName: string;
  };
  participants: Array<{
    userId: string;
    email: string;
    joined: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleWebinarRequest {
  title: string;
  description: string;
  batchId?: string;
  studentId?: string;
  scheduledTime: string;
  duration: number;
  type: 'webinar' | 'one_on_one';
}

export interface WebinarResponse {
  success: boolean;
  data: Webinar;
  message?: string;
}

export interface WebinarsListResponse {
  success: boolean;
  data: Webinar[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
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

// Batch interface
export interface Batch {
  _id: string;
  batchName: string;
  year: number;
  seriesNumber: number;
  suffix: string;
  studentCount: number;
  createdAt: string;
  updatedAt: string;
}

interface CreateCourseRequest {
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  thumbnail?: string;
  category?: string;
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

// Session interface for tutoring
export interface TutoringSession {
  _id: string;
  date: string;
  time: string;
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  studentId: string;
  teacherId: string;
  meetingLink?: string;
  createdAt: string;
  updatedAt: string;
}

// Generic API request function with better error handling
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // Add auth token if exists
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(options.headers as Record<string, string> || {}),
    };

    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      headers,
      signal: controller.signal,
      ...options,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API Error:', error);
    
    if (error instanceof Error && error.name === 'AbortError') {
      toast({
        title: "Request Timeout",
        description: "Server took too long to respond. Please try again.",
        variant: "destructive",
      });
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
      const message = error.response?.data?.message || "Network error occurred";
      toast({
        title: "Login Error",
        description: message,
        variant: "destructive",
      });
      return {
        success: false,
        message,
        error: error.message,
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
      const message = error.response?.data?.message || "Network error occurred";
      toast({
        title: "Registration Error",
        description: message,
        variant: "destructive",
      });
      return {
        success: false,
        message,
        error: error.message,
      };
    }
  },

  // GOOGLE LOGIN
  async googleLogin(token: string, userInfo: any): Promise<ApiResponse<AuthData>> {
    try {
      const res = await apiClient.post<ApiResponse<AuthData>>(
        "/api/auth/google",
        { token, userInfo }
      );

      if (res.data.success && res.data.data) {
        localStorage.setItem("token", res.data.data.token);
        localStorage.setItem("user_data", JSON.stringify(res.data.data.user));
        
        toast({
          title: "Success",
          description: "Logged in with Google successfully!",
        });
      }

      return res.data;
    } catch (error: any) {
      toast({
        title: "Google Login Failed",
        description: "Unable to login with Google. Please try again.",
        variant: "destructive",
      });
      return {
        success: false,
        message: "Google login failed",
        error: error.message,
      };
    }
  },

  // FORGOT PASSWORD
  async forgotPassword(data: ForgotPasswordRequest): Promise<ApiResponse<any>> {
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
    } catch (error: any) {
      toast({
        title: "Request Failed",
        description: "Unable to process password reset request",
        variant: "destructive",
      });
      return {
        success: false,
        message: "Network error occurred",
        error: error.message,
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
    } catch (error: any) {
      return {
        success: false,
        message: "Token invalid or expired",
        error: error.message,
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

  // GET STORED USER
  getStoredUser(): User | null {
    try {
      const userData = localStorage.getItem("user_data");
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error("Error parsing stored user:", error);
      return null;
    }
  },

  // GET TOKEN
  getToken(): string | null {
    return localStorage.getItem("token");
  },

  // UPDATE PROFILE
  async updateProfile(profileData: Partial<User>): Promise<ApiResponse<User>> {
    try {
      const res = await apiClient.put<ApiResponse<User>>(
        "/api/auth/profile",
        profileData
      );
      
      if (res.data.success && res.data.data) {
        localStorage.setItem("user_data", JSON.stringify(res.data.data));
        toast({
          title: "Success",
          description: "Profile updated successfully!",
        });
      }
      
      return res.data;
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.response?.data?.message || "Failed to update profile",
        variant: "destructive",
      });
      return {
        success: false,
        message: "Failed to update profile",
        error: error.message,
      };
    }
  },
};

// Courses API functions
export const coursesAPI = {
  // Get all courses
  async getAllCourses(): Promise<ApiResponse<Course[]>> {
    return await apiRequest<Course[]>('/api/courses', {
      method: 'GET',
    });
  },

  // Get course by slug
  async getCourseBySlug(slug: string): Promise<ApiResponse<Course>> {
    return await apiRequest<Course>(`/api/courses/slug/${slug}`, {
      method: 'GET',
    });
  },

  // Get course by ID
  async getCourseById(id: string): Promise<ApiResponse<Course>> {
    return await apiRequest<Course>(`/api/courses/${id}`, {
      method: 'GET',
    });
  },

  // Create new course
  async createCourse(courseData: CreateCourseRequest): Promise<ApiResponse<Course>> {
    return await apiRequest<Course>('/api/courses', {
      method: 'POST',
      body: JSON.stringify(courseData),
    });
  },

  // Update course
  async updateCourse(id: string, courseData: Partial<CreateCourseRequest>): Promise<ApiResponse<Course>> {
    return await apiRequest<Course>(`/api/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(courseData),
    });
  },

  // Delete course
  async deleteCourse(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return await apiRequest<{ deleted: boolean }>(`/api/courses/${id}`, {
      method: 'DELETE',
    });
  },

  // Enroll in course
  async enrollInCourse(courseId: string): Promise<ApiResponse<{ enrolled: boolean }>> {
    return await apiRequest<{ enrolled: boolean }>(`/api/courses/${courseId}/enroll`, {
      method: 'POST',
    });
  },

  // Get course progress
  async getCourseProgress(courseId: string): Promise<ApiResponse<{ progress: number }>> {
    return await apiRequest<{ progress: number }>(`/api/courses/${courseId}/progress`, {
      method: 'GET',
    });
  },
};

// Dashboard API functions
export const dashboardAPI = {
  // Get user dashboard data
  async getDashboardData(): Promise<ApiResponse<DashboardData>> {
    return await apiRequest<DashboardData>('/api/dashboard', {
      method: 'GET',
    });
  },

  // Get admin dashboard data
  async getAdminDashboard(): Promise<ApiResponse<{
    totalUsers: number;
    totalCourses: number;
    totalPayments: number;
    recentUsers: User[];
    recentPayments: any[];
  }>> {
    return await apiRequest<any>('/api/admin/dashboard', {
      method: 'GET',
    });
  },

  // Get user enrolled courses
  async getEnrolledCourses(): Promise<ApiResponse<Course[]>> {
    return await apiRequest<Course[]>('/api/users/enrolled-courses', {
      method: 'GET',
    });
  },

  // Get user stats
  async getUserStats(): Promise<ApiResponse<UserStats>> {
    return await apiRequest<UserStats>('/api/users/stats', {
      method: 'GET',
    });
  },
};

// Tutoring API functions
export const tutoringAPI = {
  // Get tutoring status
  async getTutoringStatus(): Promise<ApiResponse<TutoringStatus>> {
    try {
      const response = await apiClient.get<ApiResponse<TutoringStatus>>('/api/tutoring/status');
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
      const response = await apiClient.post<ApiResponse<PaymentOrderResponse>>('/api/tutoring/create-order');
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
      const response = await apiClient.post<ApiResponse<PaymentVerificationResponse>>('/api/tutoring/verify-payment', data);
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
      const response = await apiClient.post<ApiResponse<{ notified: boolean }>>('/api/tutoring/mark-notified');
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
      const response = await apiClient.post<ApiResponse<{ sessionId: string; scheduledAt: string }>>(
        '/api/tutoring/schedule',
        sessionData
      );
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
  async getUpcomingSessions(): Promise<ApiResponse<TutoringSession[]>> {
    try {
      const response = await apiClient.get<ApiResponse<TutoringSession[]>>('/api/tutoring/sessions');
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

  // Cancel session
  async cancelSession(sessionId: string): Promise<ApiResponse<{ cancelled: boolean }>> {
    try {
      const response = await apiClient.put<ApiResponse<{ cancelled: boolean }>>(
        `/api/tutoring/sessions/${sessionId}/cancel`
      );
      return response.data;
    } catch (error: any) {
      console.error('Error cancelling session:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to cancel session',
        error: error.message,
      };
    }
  },

  // Reschedule session
  async rescheduleSession(
    sessionId: string,
    newDateTime: { date: string; time: string }
  ): Promise<ApiResponse<TutoringSession>> {
    try {
      const response = await apiClient.put<ApiResponse<TutoringSession>>(
        `/api/tutoring/sessions/${sessionId}/reschedule`,
        newDateTime
      );
      return response.data;
    } catch (error: any) {
      console.error('Error rescheduling session:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to reschedule session',
        error: error.message,
      };
    }
  },
};

// Admin Tutoring API functions
export const adminTutoringAPI = {
  // Get tutoring dashboard data
  async getTutoringDashboard(): Promise<ApiResponse<DashboardResponse>> {
    try {
      const response = await apiClient.get<ApiResponse<DashboardResponse>>('/api/admin/tutoring-dashboard');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching tutoring dashboard:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch dashboard data',
        error: error.message,
      };
    }
  },

  // Activate tutoring for a student
  async activateTutoring(userId: string): Promise<ApiResponse<ActivateResponse>> {
    try {
      const response = await apiClient.post<ApiResponse<ActivateResponse>>(
        '/api/admin/activate-tutoring',
        { userId }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error activating tutoring:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to activate tutoring',
        error: error.message,
      };
    }
  },

  // Bulk activate tutoring
  async bulkActivateTutoring(userIds: string[]): Promise<ApiResponse<BulkActivateResponse>> {
    try {
      const response = await apiClient.post<ApiResponse<BulkActivateResponse>>(
        '/api/admin/bulk-activate-tutoring',
        { userIds }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error bulk activating tutoring:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to bulk activate tutoring',
        error: error.message,
      };
    }
  },

  // Send notification to student
  async sendNotification(data: {
    userId: string;
    type: string;
    message: string;
  }): Promise<ApiResponse<NotificationResponse>> {
    try {
      const response = await apiClient.post<ApiResponse<NotificationResponse>>(
        '/api/admin/send-notification',
        data
      );
      return response.data;
    } catch (error: any) {
      console.error('Error sending notification:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to send notification',
        error: error.message,
      };
    }
  },

  // Search students
  async searchStudents(query: string, status?: string): Promise<ApiResponse<{ users: Student[] }>> {
    try {
      const params = new URLSearchParams();
      if (query) params.append('query', query);
      if (status) params.append('status', status);
      
      const response = await apiClient.get<ApiResponse<{ users: Student[] }>>(
        `/api/admin/search-students?${params.toString()}`
      );
      return response.data;
    } catch (error: any) {
      console.error('Error searching students:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to search students',
        error: error.message,
      };
    }
  },

  // Get student details
  async getStudentDetails(userId: string): Promise<ApiResponse<Student & { sessions: TutoringSession[] }>> {
    try {
      const response = await apiClient.get<ApiResponse<Student & { sessions: TutoringSession[] }>>(
        `/api/admin/students/${userId}`
      );
      return response.data;
    } catch (error: any) {
      console.error('Error fetching student details:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch student details',
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
      const response = await apiClient.post<ApiResponse<PaymentOrderResponse>>(
        '/api/payment/create-order',
        { courseId, type: 'course' }
      );
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
    courseId?: string;
  }): Promise<ApiResponse<{
    success: boolean;
    paymentId: string;
    courseId?: string;
    status: string;
    message: string;
  }>> {
    try {
      const response = await apiClient.post<ApiResponse<any>>(
        '/api/payment/verify-payment',
        data
      );
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
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    type: 'course' | 'tutoring';
    createdAt: string;
    paymentId?: string;
    courseName?: string;
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

  // Get payment details
  async getPaymentDetails(paymentId: string): Promise<ApiResponse<any>> {
    try {
      const response = await apiClient.get<ApiResponse<any>>(`/api/payment/${paymentId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching payment details:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch payment details',
        error: error.message,
      };
    }
  },
};

// Webinar API functions
export const webinarAPI = {
  async getWebinars(filters?: {
    type?: 'webinar' | 'one_on_one';
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<WebinarsListResponse>> {
    try {
      const params = new URLSearchParams();
      if (filters?.type) params.append('type', filters.type);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());

      const response = await apiClient.get<ApiResponse<WebinarsListResponse>>(
        `/api/webinars?${params.toString()}`
      );
      return response.data;
    } catch (error: any) {
      console.error('Error fetching webinars:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch webinars',
        error: error.message,
      };
    }
  },

  // Schedule webinar
  async scheduleWebinar(data: ScheduleWebinarRequest): Promise<ApiResponse<Webinar>> {
    try {
      const endpoint = data.type === 'webinar' 
        ? '/api/webinars/schedule-batch'
        : '/api/webinars/schedule-one-on-one';
      
      const response = await apiClient.post<ApiResponse<Webinar>>(endpoint, data);
      
      if (response.data.success) {
        toast({
          title: 'Success',
          description: `${data.type === 'webinar' ? 'Webinar' : 'Session'} scheduled successfully!`,
        });
      }
      
      return response.data;
    } catch (error: any) {
      console.error('Error scheduling:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to schedule',
        variant: 'destructive',
      });
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to schedule',
        error: error.message,
      };
    }
  },

  // Get all batches for webinar scheduling
  async getBatches(): Promise<ApiResponse<Batch[]>> {
    try {
      const response = await apiClient.get<ApiResponse<Batch[]>>('/api/batches');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching batches:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch batches',
        error: error.message,
      };
    }
  },

  // Get students with tutoring for 1:1 sessions
async getStudentsWithTutoring(): Promise<ApiResponse<TutoringStudent[]>> {
  try {
    const response = await apiClient.get<ApiResponse<TutoringStudent[]>>('/api/tutoring-students');
    console.log('API Response for tutoring students:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Error fetching tutoring students:', error);
    return {
      success: false,
      message: error.response?.data?.message || 'Failed to fetch tutoring students',
      error: error.message,
    };
  }
},

  // Get all webinars
  async getAllWebinars(): Promise<ApiResponse<Webinar[]>> {
    try {
      const response = await apiClient.get<ApiResponse<Webinar[]>>('/api/webinars');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching webinars:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch webinars',
        error: error.message,
      };
    }
  },

  // Get webinar by ID
  async getWebinarById(id: string): Promise<ApiResponse<Webinar>> {
    try {
      const response = await apiClient.get<ApiResponse<Webinar>>(`/api/webinars/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching webinar:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch webinar',
        error: error.message,
      };
    }
  },

  // Update webinar
  async updateWebinar(id: string, data: Partial<ScheduleWebinarRequest>): Promise<ApiResponse<Webinar>> {
    try {
      const response = await apiClient.put<ApiResponse<Webinar>>(`/api/webinars/${id}`, data);
      return response.data;
    } catch (error: any) {
      console.error('Error updating webinar:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update webinar',
        error: error.message,
      };
    }
  },

  // Cancel webinar
  async cancelWebinar(id: string): Promise<ApiResponse<{ cancelled: boolean }>> {
    try {
      const response = await apiClient.delete<ApiResponse<{ cancelled: boolean }>>(`/api/webinars/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error cancelling webinar:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to cancel webinar',
        error: error.message,
      };
    }
  },

  // Join webinar
  async joinWebinar(id: string): Promise<ApiResponse<{ meetingLink: string; meetingPassword?: string }>> {
    try {
      const response = await apiClient.post<ApiResponse<any>>(`/api/webinars/${id}/join`);
      return response.data;
    } catch (error: any) {
      console.error('Error joining webinar:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to join webinar',
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
  AuthData,
  DashboardData,
  UserStats
};

// Export apiClient as default
export default apiClient;