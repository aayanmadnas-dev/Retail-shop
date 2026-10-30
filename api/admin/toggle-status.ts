import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://ozdxhhcxubfawdcoihkx.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabasePublishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_Pbtxjz114o6Q0Vxr9XJWCw_eSadQnTP';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const supabaseClient = createClient(supabaseUrl, supabasePublishableKey);
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    if (!supabaseServiceRoleKey) {
      return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured on the server.' });
    }

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

    const { businessId, status } = req.body;
    if (!businessId || !status || !['active', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Invalid businessId or status (must be active or suspended)' });
    }

    const { data: updated, error: updateError } = await adminClient
      .from('businesses')
      .update({ status })
      .eq('id', businessId)
      .select()
      .single();

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    return res.status(200).json({ success: true, business: updated });
  } catch (err: any) {
    console.error('Toggle status handler error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

