const fs = require('fs');

const content = `import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  if (!url || !key) {
    console.warn('[supabase] Missing environment variables')
    throw new Error('Supabase client requires URL and key')
  }

  if (!browserClient) {
    browserClient = createBrowserClient<Database>(url, key, {
      cookies: {
        get(name: string) {
          if (typeof document === 'undefined') return null
          const cookie = document.cookie.split('; ').find(row => row.startsWith(\`\${name}=\`))
          return cookie ? decodeURIComponent(cookie.split('=')[1]) : null
        },
        set(name: string, value: string, options: any) {
          if (typeof document === 'undefined') return
          const opts = Object.entries(options)
            .filter(([_, v]) => v !== null && v !== undefined)
            .map(([k, v]) => {
              const key = k.replace(/([A-Z])/g, '-$1').toLowerCase()
              return typeof v === 'boolean' ? (v ? key : '') : \`\${key}=\${v}\`
            })
            .filter(Boolean)
            .join('; ')
          document.cookie = \`\${name}=\${value}; \${opts}\`
        },
        remove(name: string, options: any) {
          if (typeof document === 'undefined') return
          const opts = Object.entries(options)
            .filter(([_, v]) => v !== null && v !== undefined)
            .map(([k, v]) => {
              const key = k.replace(/([A-Z])/g, '-$1').toLowerCase()
              return typeof v === 'boolean' ? (v ? key : '') : \`\${key}=\${v}\`
            })
            .filter(Boolean)
            .join('; ')
          document.cookie = \`\${name}=; \${opts}; max-age=0\`
        },
      },
      auth: {
        flowType: 'pkce',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })

    if (process.env.NODE_ENV === 'development') {
      browserClient.auth.onAuthStateChange((event, session) => {
        console.log('[Supabase Client] Auth state:', event, session?.user?.email)
      })
    }
  }

  return browserClient
}

export function clearAuthStorage() {
  if (typeof window === 'undefined') return
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) return
  const projectId = new URL(url).hostname.split('.')[0]
  const cookies = [\`sb-\${projectId}-auth-token\`, 'sb-access-token', 'sb-refresh-token']
  cookies.forEach(name => { document.cookie = \`\${name}=; path=/; max-age=0\` })
  try {
    localStorage.removeItem('sb-access-token')
    localStorage.removeItem('sb-refresh-token')
  } catch(e) {}
}

export async function checkAuthStatus() {
  const supabase = createClient()
  const { data: { session }, error } = await supabase.auth.getSession()
  return { session, error, isAuthenticated: !!session }
}
`;

fs.writeFileSync('src/lib/supabase.ts', content, 'utf8');
console.log('✅ Updated src/lib/supabase.ts with cookie-based storage');
