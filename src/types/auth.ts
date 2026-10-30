import type { User, Session } from '@supabase/supabase-js';
import type { Business, Profile } from './database';

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  business: Business | null;
  isLoading: boolean;
  isSuperAdmin: boolean;
  isBusinessOwner: boolean;
  isSuspended: boolean;
}

