// Vercel Serverless Function: Expose Supabase config from environment variables
export default function handler(req: any, res: any) {
  // Support both VITE_ prefix and non-prefix env variables
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

  if (url && anonKey) {
    return res.status(200).json({
      success: true,
      supabase: {
        url: url.trim(),
        anonKey: anonKey.trim(),
        source: 'server_env',
      },
    });
  }

  return res.status(200).json({
    success: false,
    supabase: null,
    message: 'Environment variable VITE_SUPABASE_URL atau SUPABASE_URL belum diatur di Vercel.',
  });
}
