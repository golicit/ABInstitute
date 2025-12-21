import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { authAPI, User } from '@/services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (
    email: string,
    password: string,
    name: string
  ) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updateUser: (updatedUser: Partial<User>) => void; // Added for profile updates
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Function to load user from localStorage
  const loadUserFromStorage = () => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const parsedUser = JSON.parse(userStr);
        setUser(parsedUser);
        console.log('Loaded user from localStorage:', parsedUser.email);
        return parsedUser;
      }
    } catch (error) {
      console.error('Error loading user from localStorage:', error);
    }
    return null;
  };

  useEffect(() => {
    // Load user from localStorage immediately on mount
    loadUserFromStorage();

    // Check for stored user data and verify token on app load
    const initializeAuth = async () => {
      try {
        setLoading(true);

        const token = authAPI.getToken();

        // If no token, skip verification
        if (!token) {
          console.log('No token found, skipping verification');
          setLoading(false);
          setInitialized(true);
          return;
        }

        // Verify token if we have one
        try {
          console.log('Verifying token...');
          const response = await authAPI.verifyToken();
          console.log('Token verification response:', response);

          if (response.success && response.data) {
            // Update user state with verified user
            setUser(response.data.user);
            // Update localStorage with verified user data
            localStorage.setItem('user', JSON.stringify(response.data.user));
            console.log(
              'Token verified successfully:',
              response.data.user.email
            );
          } else {
            console.log('Token verification failed or token invalid');
            // Token invalid, clear storage
            authAPI.logout();
            localStorage.removeItem('user');
            setUser(null);
          }
        } catch (error) {
          console.log('Token verification error:', error);
          // If verification fails, clear storage
          authAPI.logout();
          localStorage.removeItem('user');
          setUser(null);
        }
      } catch (error) {
        console.log('Auth initialization error:', error);
        setUser(null);
      } finally {
        setLoading(false);
        setInitialized(true);
        console.log('Auth initialization complete');
      }
    };

    // Add a safety timeout
    const timeoutId = setTimeout(() => {
      console.log('Auth initialization timeout');
      setLoading(false);
      setInitialized(true);
    }, 10000);

    initializeAuth().then(() => {
      clearTimeout(timeoutId);
    });

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);

    try {
      const response = await authAPI.login({ email, password });

      if (response.success && response.data) {
        setUser(response.data.user);
        // Store in localStorage
        localStorage.setItem('user', JSON.stringify(response.data.user));
        setLoading(false);
        return { error: null };
      }

      // Explicit invalid credential handling
      setLoading(false);
      return {
        error: response?.message || 'Invalid email or password',
      };
    } catch (err) {
      setLoading(false);
      return {
        error: 'Something went wrong. Please try again.',
      };
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    setLoading(true);

    try {
      const response = await authAPI.register({ email, password, name });

      if (response.success && response.data) {
        setUser(response.data.user);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        setLoading(false);
        return { error: null };
      }

      setLoading(false);
      return { error: response.message || 'Registration failed' };
    } catch (error) {
      setLoading(false);
      return { error: 'Registration failed. Please try again.' };
    }
  };

  const signOut = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear all user-related data from localStorage
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      // Clear all avatar caches
      const allKeys = Object.keys(localStorage);
      allKeys.forEach((key) => {
        if (key.startsWith('avatar_')) {
          localStorage.removeItem(key);
        }
      });
      setUser(null);
    }
  };

  const signInWithGoogle = async (): Promise<{ error: any }> => {
    setLoading(true);

    try {
      if (!(window as any).google) {
        console.error('Google SDK not loaded');
        setLoading(false);
        return { error: 'Google SDK not loaded' };
      }

      return new Promise((resolve) => {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          scope: 'email profile',
          callback: async (tokenResponse: any) => {
            try {
              if (tokenResponse.error) {
                console.error('Google auth error:', tokenResponse.error);
                setLoading(false);
                return resolve({ error: tokenResponse.error });
              }

              console.log('✅ Access token received, sending to backend');

              const res = await fetch(
                `${import.meta.env.VITE_BACKEND_URL}/api/auth/google-oauth`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    token: tokenResponse.access_token, // ✅ IMPORTANT
                  }),
                }
              );

              const data = await res.json();
              console.log('Backend response:', data);

              if (data.success && data.token && data.user) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                setUser(data.user);
                setLoading(false);
                resolve({ error: null });
              } else {
                setLoading(false);
                resolve({ error: data.error || 'Google login failed' });
              }
            } catch (err) {
              console.error('Google login error:', err);
              setLoading(false);
              resolve({ error: err });
            }
          },
        });

        client.requestAccessToken(); // ✅ THIS IS REQUIRED
      });
    } catch (error) {
      console.error('Google sign-in error:', error);
      setLoading(false);
      return { error };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const response = await authAPI.forgotPassword({ email });

      if (response.success) {
        return { error: null };
      }

      return { error: response.message || 'Failed to send reset email' };
    } catch (error) {
      return { error: 'Failed to send reset email. Please try again.' };
    }
  };

  // Function to update user profile
  const updateUser = (updatedUser: Partial<User>) => {
    if (user) {
      const newUser = { ...user, ...updatedUser };
      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        initialized,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        resetPassword,
        updateUser, // Added
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
