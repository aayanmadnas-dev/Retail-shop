
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://ozdxhhcxubfawdcoihkx.supabase.co';

const publishableKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization token' });
    }

    if (!publishableKey || !serviceRoleKey) {
      return res.status(500).json({
        error: 'Supabase server environment variables are missing',
      });
    }

    const token = authHeader.slice(7);

    // Verify the logged-in user
    const authClient = createClient(supabaseUrl, publishableKey);

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid admin session' });
    }

    // Verify Super Admin role
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profileError || profile?.role !== 'super_admin') {
      return res.status(403).json({
        error: 'Super Admin access required',
      });
    }

    // Fetch all businesses using server-side permissions
    const { data: businesses, error } = await adminClient
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Business listing error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      success: true,
      businesses: businesses || [],
    });
  } catch (error: any) {
    console.error('List businesses API error:', error);

    return res.status(500).json({
      error: error.message || 'Failed to fetch businesses',
    });
  }
}
