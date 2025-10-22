const path = require('path')

/**
 * Content Security Policy
 * SECURITY: Prevents XSS, clickjacking, and other code injection attacks
 *
 * Note: Next.js requires 'unsafe-eval' and 'unsafe-inline' in development
 * Consider tightening these in production with nonces
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob: https://js.stripe.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.livekit.cloud wss://*.livekit.cloud https://api.stripe.com",
  "worker-src 'self' blob:",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join('; ')

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
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
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname, 'src')
    return config
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Content Security Policy - Prevents XSS and injection attacks
          {
            key: 'Content-Security-Policy',
            value: CONTENT_SECURITY_POLICY,
          },
          // X-Frame-Options - Prevents clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // X-Content-Type-Options - Prevents MIME-sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Referrer-Policy - Controls referrer information
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Permissions-Policy - Restricts browser features
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), geolocation=(self), interest-cohort=()',
          },
          // X-DNS-Prefetch-Control - Controls DNS prefetching
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          // Strict-Transport-Security - Forces HTTPS (only in production)
          ...(process.env.NODE_ENV === 'production'
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=63072000; includeSubDomains; preload',
                },
              ]
            : []),
        ],
      },
    ]
  },
}

module.exports = nextConfig
