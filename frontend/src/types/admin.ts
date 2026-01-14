export interface Student {
  _id: string;
  name: string;
  email: string;
  tutoringStatus: 'none' | 'pending' | 'active' | 'completed';
  tutoringPurchasedAt: string;
  mentorAvailabilityNotified: boolean;
  createdAt: string;
}

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