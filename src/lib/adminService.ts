import { supabase } from './supabase';
import type { Business } from '../types/database';

export interface CreateBusinessPayload {
  name: string;
  owner_name: string;
  email: string;
  password: string;
  phone?: string;
  address?: string;
}

export interface CreateBusinessResponse {
  success: boolean;
  business?: Business;
  credentials?: {
    email: string;
    password: string;
  };
  error?: string;
}

export const adminService = {
  /**
   * Create a new business and its owner auth credentials.
   * Calls the secure serverless backend.
   */
  async createBusiness(payload: CreateBusinessPayload, token?: string): Promise<CreateBusinessResponse> {
    try {
      // 1. First attempt to call the serverless API endpoint
      const response = await fetch('/api/admin/create-business', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        return data;
      }

      // If serverless endpoint returned an error response
      const errData = await response.json().catch(() => null);
      if (errData?.error) {
        // If error is specific (like "Email already registered" or "Forbidden"), return it
        if (!response.status || response.status < 500) {
          return { success: false, error: errData.error };
        }
      }

      // If in local dev and the API route is not running (e.g. 404 or 500 server key missing),
      // provide local fallback with informative message
      return {
        success: false,
        error: errData?.error || `Serverless endpoint failed with status ${response.status}. Ensure SUPABASE_SERVICE_ROLE_KEY is set in your Vercel or environment settings.`,
      };
    } catch (err: any) {
      console.error('adminService.createBusiness error:', err);
      return {
        success: false,
        error: err.message || 'Network error while creating business. Check connection.',
      };
    }
  },

  /**
   * Toggle business status between active and suspended
   */
  async toggleBusinessStatus(businessId: string, status: 'active' | 'suspended', token?: string) {
    try {
      const response = await fetch('/api/admin/toggle-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ businessId, status }),
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, business: data.business };
      }

      // Fallback: direct Supabase call if allowed by RLS
      const { data, error } = await supabase
        .from('businesses')
        .update({ status })
        .eq('id', businessId)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, business: data as Business };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update business status' };
    }
  },

  /**
   * Fetch all registered businesses (Super Admin only)
   */
  
async getBusinesses(token?: string): Promise<{
  businesses: Business[];
  error?: string;
}> {
  try {
    if (!token) {
      return {
        businesses: [],
        error: 'Admin session expired. Please log in again.',
      };
    }

   const response = await fetch('/api/admin/list-business', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const responseText = await response.text();

let result;

try {
  result = JSON.parse(responseText);
} catch {
  throw new Error(
    `API returned invalid JSON (HTTP ${response.status}). Check Vercel deployment and API route.`
  );
}

    if (!response.ok) {
      return {
        businesses: [],
        error: result.error || 'Failed to fetch businesses',
      };
    }

    return {
      businesses: result.businesses || [],
    };
  } catch (err: any) {
    console.error('getBusinesses error:', err);

    return {
      businesses: [],
      error: err.message || 'Network error while fetching businesses',
    };
  }
},

  /**
   * Setup initial Super Admin
   */
  async setupSuperAdmin(payload: { email: string; password: string; full_name: string; secret_key?: string }) {
    try {
      const response = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to initialize Super Admin' };
      }
      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message || 'Setup request failed' };
    }
  },
};

