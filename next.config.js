/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js']
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.google.com',
        pathname: '/favicon.ico',
      },
      {
        protocol: 'https',
        hostname: 'www.facebook.com',
        pathname: '/favicon.ico',
      },
      {
        protocol: 'https',
        hostname: 'www.apple.com',
        pathname: '/favicon.ico',
      },
    ],
  },
}

module.exports = nextConfig
