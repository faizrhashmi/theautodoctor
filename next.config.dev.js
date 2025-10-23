const path = require('path')

/**
 * DEVELOPMENT OPTIMIZED Next.js Config
 * This config prioritizes speed over strict checks for faster iteration
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
    // Enable Turbopack for faster development (Next.js 14+)
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },

  // SPEED: Skip type checking in dev - use separate terminal for `npm run typecheck`
  typescript: {
    ignoreBuildErrors: true,
  },

  // SPEED: Skip ESLint in dev - use separate terminal for `npm run lint`
  eslint: {
    ignoreDuringBuilds: true,
  },

  // SPEED: Disable source maps in development
  productionBrowserSourceMaps: false,

  // SPEED: Use SWC minifier (faster than Terser)
  swcMinify: true,

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

  webpack: (config, { dev, isServer }) => {
    config.resolve.alias['@'] = path.resolve(__dirname, 'src')

    if (dev) {
      // SPEED: Reduce webpack stats output
      config.stats = 'errors-warnings'

      // SPEED: Faster incremental builds
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
      }
    }

    return config
  },

  // MINIMAL headers for dev (skip CSP complexity)
  async headers() {
    // Only essential headers in dev for speed
    if (process.env.NODE_ENV === 'development') {
      return []
    }

    // Full security headers for production
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

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: CONTENT_SECURITY_POLICY },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(self), interest-cohort=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
