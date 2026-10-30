import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://ozdxhhcxubfawdcoihkx.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabasePublishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_Pbtxjz114o6Q0Vxr9XJWCw_eSadQnTP';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.split(' ')[1];

    // Client for token verification
    const supabaseClient = createClient(supabaseUrl, supabasePublishableKey);
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    // Verify user is Super Admin
    if (supabaseServiceRoleKey) {
      const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: profile } = await adminClient
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile || profile.role !== 'super_admin') {
        return res.status(403).json({ error: 'Forbidden: Super Admin access required' });
      }

      const { name, owner_name, email, password, phone, address } = req.body;

      if (!name || !email || !password || !owner_name) {
        return res.status(400).json({ error: 'Missing required fields (name, owner_name, email, password)' });
      }

      // 1. Create auth user with pre-confirmed email
      const { data: authUser, error: createAuthError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: owner_name,
          role: 'business_owner',
        },
      });

      if (createAuthError) {
        return res.status(400).json({ error: createAuthError.message });
      }

      const newUserId = authUser.user.id;

      // 2. Insert into businesses table
      const { data: business, error: businessError } = await adminClient
        .from('businesses')
        .insert({
          name,
          email,
          phone: phone || null,
          address: address || null,
          status: 'active',
        })
        .select()
        .single();

      if (businessError) {
        // Rollback created auth user
        await adminClient.auth.admin.deleteUser(newUserId);
        return res.status(400).json({ error: `Failed to create business: ${businessError.message}` });
      }

      // 3. Insert into profiles table
      const { error: profileError } = await adminClient
        .from('profiles')
        .insert({
          user_id: newUserId,
          full_name: owner_name,
          role: 'business_owner',
          business_id: business.id,
        });

      if (profileError) {
        return res.status(400).json({ error: `Failed to create owner profile: ${profileError.message}` });
      }

      return res.status(201).json({
        success: true,
        business,
        credentials: {
          email,
          password,
        },
      });
    } else {
      return res.status(500).json({
        error: 'SUPABASE_SERVICE_ROLE_KEY is not configured on the server.',
      });
    }
  } catch (err: any) {
    console.error('Create business handler error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

