import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Business, Profile } from '../types/database';
import type { AuthState } from '../types/auth';

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyOtpAndResetPassword: (email: string, token: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchUserData = useCallback(async (currentUser: User) => {
    try {
      // 1. Fetch user profile from Supabase
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }

      if (profileData) {
        setProfile(profileData as Profile);

        // 2. If user is business owner and has business_id, fetch business info
        if (profileData.business_id) {
          const { data: businessData, error: businessError } = await supabase
            .from('businesses')
            .select('*')
            .eq('id', profileData.business_id)
            .maybeSingle();

          if (businessError) {
            console.error('Error fetching business:', businessError);
          }
          if (businessData) {
            setBusiness(businessData as Business);
          } else {
            setBusiness(null);
          }
        } else {
          setBusiness(null);
        }
      } else {
        // Fallback: check user metadata for role if profile row is not yet created
        const metaRole = currentUser.user_metadata?.role;
        const metaBusinessId = currentUser.user_metadata?.business_id;
        const metaFullName = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User';

        if (metaRole) {
          const simulatedProfile: Profile = {
            user_id: currentUser.id,
            full_name: metaFullName,
            role: metaRole,
            business_id: metaBusinessId || null,
            created_at: currentUser.created_at,
          };
          setProfile(simulatedProfile);

          if (metaBusinessId) {
            const { data: bData } = await supabase
              .from('businesses')
              .select('*')
              .eq('id', metaBusinessId)
              .maybeSingle();
            if (bData) setBusiness(bData as Business);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load user data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user);
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user);
      } else {
        setProfile(null);
        setBusiness(null);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserData]);

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setIsLoading(false);
        return { success: false, error: error.message };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        await fetchUserData(data.user);
      }

      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err.message || 'Login failed. Please check credentials.' };
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setBusiness(null);
    setIsLoading(false);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserData(user);
    }
  };

  const sendPasswordReset = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to send reset email.' };
    }
  };

  const verifyOtpAndResetPassword = async (
    email: string,
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      // 1. Verify OTP token with Supabase recovery type
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'recovery',
      });

      if (verifyError) {
        return { success: false, error: verifyError.message };
      }

      // 2. Update user password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update password.' };
    }
  };

  const isSuperAdmin = profile?.role === 'super_admin';
  const isBusinessOwner = profile?.role === 'business_owner';
  const isSuspended = business?.status === 'suspended';

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        business,
        isLoading,
        isSuperAdmin,
        isBusinessOwner,
        isSuspended,
        signIn,
        signOut,
        refreshProfile,
        sendPasswordReset,
        verifyOtpAndResetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
