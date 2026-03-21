/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@de/db', '@de/scoring', '@de/ui', '@de/ai'],
  experimental: {
    serverComponentsExternalPackages: ['@anthropic-ai/sdk'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
    ],
  },
}

module.exports = nextConfig
