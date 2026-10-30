import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://ozdxhhcxubfawdcoihkx.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, full_name, secret_key } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Email, password, and full_name are required' });
    }

    const keyToUse = secret_key || supabaseServiceRoleKey;
    if (!keyToUse) {
      return res.status(400).json({
        error: 'SUPABASE_SERVICE_ROLE_KEY is required to initialize the Super Admin.',
      });
    }

    const adminClient = createClient(supabaseUrl, keyToUse, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if Super Admin already exists
    const { data: existingAdmin } = await adminClient
      .from('profiles')
      .select('user_id')
      .eq('role', 'super_admin')
      .limit(1);

    if (existingAdmin && existingAdmin.length > 0) {
      return res.status(400).json({ error: 'Super Admin already initialized. Please sign in via the admin portal.' });
    }

    // Create auth user
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role: 'super_admin',
      },
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // Insert Super Admin profile
    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert({
        user_id: authUser.user.id,
        full_name,
        role: 'super_admin',
        business_id: null,
      });

    if (profileError) {
      return res.status(400).json({ error: profileError.message });
    }

    return res.status(201).json({
      success: true,
      message: 'Super Admin successfully initialized! You can now log in.',
    });
  } catch (err: any) {
    console.error('Setup error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
