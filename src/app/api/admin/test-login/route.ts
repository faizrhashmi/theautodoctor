// Test route to verify admin login functionality
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { requireAdminAPI } from '@/lib/auth/guards'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest) {
  // ✅ SECURITY: Require admin authentication for test tools
  const authResult = await requireAdminAPI(request)
  if (authResult.error) return authResult.error

  const admin = authResult.data
  console.log(`[ADMIN TEST] ${admin.email} using test login tool`)
  try {
    const { email, password } = await request.json()

    console.log('Test login attempt for:', email)

    // Create a test response
    const response = NextResponse.json({ status: 'testing' })

    // Create Supabase client with proper cookie handling
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        get(name: string) {
          const cookie = request.cookies.get(name)
          console.log(`Getting cookie ${name}:`, cookie?.value ? 'exists' : 'not found')
          return cookie?.value
        },
        set(name: string, value: string, options: any) {
          console.log(`Setting cookie ${name} with options:`, {
            ...options,
            secure: options.secure,
            sameSite: options.sameSite,
            domain: options.domain,
            path: options.path
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          console.log(`Removing cookie ${name}`)
          response.cookies.set({ name, value: '', ...options, maxAge: 0 })
        },
      },
    })

    // Attempt login
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        details: {
          code: error.code,
          status: error.status
        }
      }, { status: 400 })
    }

    // Check what we got back
    const debugInfo = {
      success: true,
      session: {
        exists: !!data.session,
        accessToken: data.session?.access_token ? 'present' : 'missing',
        refreshToken: data.session?.refresh_token ? 'present' : 'missing',
        expiresAt: data.session?.expires_at
      },
      user: {
        id: data.user?.id,
        email: data.user?.email,
        role: data.user?.role,
        emailConfirmed: data.user?.email_confirmed_at,
        metadata: data.user?.user_metadata
      },
      cookies: Array.from(response.cookies.getAll()).map(c => ({
        name: c.name,
        hasValue: !!c.value,
        options: {
          secure: c.secure,
          httpOnly: c.httpOnly,
          sameSite: c.sameSite,
          domain: c.domain,
          path: c.path
        }
      }))
    }

    return NextResponse.json(debugInfo)

  } catch (error: any) {
    console.error('Test login error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  // ✅ SECURITY: Require admin authentication for test tools
  const authResult = await requireAdminAPI(request)
  if (authResult.error) return authResult.error

  const admin = authResult.data
  console.log(`[ADMIN TEST] ${admin.email} viewing test login form`)

  // Simple test form
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Admin Login Test</title>
      <style>
        body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
        input { display: block; width: 100%; padding: 8px; margin: 10px 0; }
        button { background: #333; color: white; padding: 10px 20px; border: none; cursor: pointer; }
        pre { background: #f5f5f5; padding: 15px; overflow: auto; }
        .error { color: red; }
        .success { color: green; }
      </style>
    </head>
    <body>
      <h1>Admin Login Test</h1>
      <form id="testForm">
        <input type="email" id="email" placeholder="Email" value="faizhashmi@me.com" required>
        <input type="password" id="password" placeholder="Password" required>
        <button type="submit">Test Login</button>
      </form>
      <div id="result"></div>

      <script>
        document.getElementById('testForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const resultDiv = document.getElementById('result');
          resultDiv.innerHTML = 'Testing...';

          try {
            const response = await fetch('/api/admin/test-login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: document.getElementById('email').value,
                password: document.getElementById('password').value
              })
            });

            const data = await response.json();
            resultDiv.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';

            if (data.success) {
              resultDiv.className = 'success';
              setTimeout(() => {
                window.location.href = '/admin/intakes';
              }, 2000);
            } else {
              resultDiv.className = 'error';
            }
          } catch (error) {
            resultDiv.innerHTML = '<div class="error">Error: ' + error.message + '</div>';
          }
        });
      </script>
    </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' }
  })
}