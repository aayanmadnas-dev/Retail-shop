import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Public Super Admin bootstrap has been permanently disabled for application security
  return res.status(403).json({
    error: 'Public Super Admin initialization has been permanently disabled. Existing authorized credentials must be used.',
  });
}
