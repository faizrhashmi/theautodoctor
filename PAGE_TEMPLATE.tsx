/**
 * STANDARD AUTHENTICATED PAGE TEMPLATE
 *
 * Copy this template for any new protected page.
 * Replace [PageName], [role], and [page-path] with actual values.
 *
 * Roles: 'customer' | 'mechanic' | 'workshop' | 'admin'
 */

'use client'

import { AuthGuard } from '@/components/AuthGuard'
import { useAuthGuard } from '@/hooks/useAuthGuard'

// Your imports here
// import { YourComponents } from './components'

// Your interfaces here
// interface YourData { ... }

/**
 * Main page content component
 * User is GUARANTEED to exist here thanks to AuthGuard
 */
function [PageName]Content() {
  // Get authenticated user - guaranteed to exist
  const { user } = useAuthGuard({ requiredRole: '[role]' })

  // Your state and logic here
  // const [data, setData] = useState<YourData | null>(null)

  // useEffect(() => {
  //   // Load data using user.id
  //   // user is guaranteed to exist - no need to check!
  // }, [user])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Your page content */}
      <h1>Welcome {user.email}</h1>
    </div>
  )
}

/**
 * Page export with AuthGuard protection
 * This handles all authentication automatically:
 * - Shows loading state
 * - Shows clear error messages
 * - Auto-redirects if not authenticated
 * - Prevents render until user is verified
 */
export default function [PageName]() {
  return (
    <AuthGuard
      requiredRole="[role]"
      redirectTo="/signup?redirect=/[page-path]"
    >
      <[PageName]Content />
    </AuthGuard>
  )
}
