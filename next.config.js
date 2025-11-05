const path = require('path')

/**
 * DEVELOPMENT OPTIMIZED Next.js Config
 * This config prioritizes speed over strict checks for faster iteration
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
    // 🚀 SPEED: Optimize server actions
    serverActions: {
      bodySizeLimit: '2mb',
    },
    // 🚀 SPEED: Use optimized package imports
    optimizePackageImports: ['lucide-react', 'date-fns', 'framer-motion', 'react-hot-toast'],
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

  // 🚀 PERFORMANCE: Optimize imports
  // Note: Turbopack has issues with lucide-react modularization, so we use optimizePackageImports instead
  modularizeImports: {
    'date-fns': {
      transform: 'date-fns/{{member}}',
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

  // 🚀 SPEED: On-demand entries for faster dev server
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 60 * 1000, // 1 minute (reduced from default 60s)
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2, // Reduced from default 5 to free memory faster
  },

  webpack: (config, { dev, isServer }) => {
    config.resolve.alias['@'] = path.resolve(__dirname, 'src')

    if (dev) {
      // 🚀 SPEED: Reduce webpack stats output
      config.stats = 'errors-warnings'

      // 🚀 SPEED: Faster incremental builds with optimized cache
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
        // More aggressive caching
        compression: 'gzip',
      }

      // 🚀 SPEED: Faster module resolution
      config.resolve.symlinks = false

      // 🚀 SPEED: Skip expensive source map generation in dev
      config.devtool = 'eval-cheap-module-source-map'

      // 🚀 SPEED: Optimize module concatenation
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
      }

      // 🚀 SPEED: Faster file system checks
      if (!isServer) {
        config.watchOptions = {
          ...config.watchOptions,
          ignored: ['**/node_modules/**', '**/.git/**', '**/.next/**'],
          aggregateTimeout: 300,
          poll: false,
        }
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
