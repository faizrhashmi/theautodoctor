import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAPI } from '@/lib/auth/guards';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
    // ✅ SECURITY: Require admin authentication
    const authResult = await requireAdminAPI(req)
    if (authResult.error) return authResult.error

    const admin = authResult.data

  try {
    // Create admin client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('[CLEANUP] Starting database cleanup...');

    // Delete all data in order (respecting foreign key dependencies)

    // 1. Delete chat messages
    const { error: chatError } = await supabase
      .from('chat_messages')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    if (chatError) console.error('Chat messages error:', chatError);

    // 2. Delete session files
    const { error: filesError } = await supabase
      .from('session_files')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (filesError) console.error('Session files error:', filesError);

    // 3. Delete session requests
    const { error: requestsError } = await supabase
      .from('session_requests')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (requestsError) console.error('Session requests error:', requestsError);

    // 4. Delete diagnostic sessions
    const { error: sessionsError } = await supabase
      .from('diagnostic_sessions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (sessionsError) console.error('Diagnostic sessions error:', sessionsError);

    // 5. Delete customer vehicles
    const { error: vehiclesError } = await supabase
      .from('customer_vehicles')
      .delete()
      .neq('id', 0);
    if (vehiclesError) console.error('Customer vehicles error:', vehiclesError);

    // 6. Delete mechanic documents
    const { error: docsError } = await supabase
      .from('mechanic_documents')
      .delete()
      .neq('id', 0);
    if (docsError) console.error('Mechanic documents error:', docsError);

    // 7. Delete mechanic time off
    const { error: timeOffError } = await supabase
      .from('mechanic_time_off')
      .delete()
      .neq('id', 0);
    if (timeOffError) console.error('Mechanic time off error:', timeOffError);

    // 8. Delete mechanic sessions (must be before mechanics)
    const { error: mechSessionsError } = await supabase
      .from('mechanic_sessions')
      .delete()
      .neq('mechanic_id', '00000000-0000-0000-0000-000000000000');
    if (mechSessionsError) console.error('Mechanic sessions error:', mechSessionsError);

    // 9. Delete workshop mechanics
    const { error: workshopMechError } = await supabase
      .from('workshop_mechanics')
      .delete()
      .neq('mechanic_id', 0);
    if (workshopMechError) console.error('Workshop mechanics error:', workshopMechError);

    // 9. Delete customers
    const { error: customersError } = await supabase
      .from('customers')
      .delete()
      .neq('id', 0);
    if (customersError) console.error('Customers error:', customersError);

    // 10. Delete mechanics (using RPC for better deletion)
    console.log('[CLEANUP] Attempting to delete mechanics...');
    const { data: allMechanics } = await supabase
      .from('mechanics')
      .select('id, email');

    if (allMechanics && allMechanics.length > 0) {
      console.log(`[CLEANUP] Found ${allMechanics.length} mechanics to delete`);
      for (const mech of allMechanics) {
        const { error } = await supabase
          .from('mechanics')
          .delete()
          .eq('id', mech.id);
        if (error) {
          console.error(`Failed to delete mechanic ${mech.email}:`, error);
        } else {
          console.log(`Deleted mechanic: ${mech.email}`);
        }
      }
    }

    // 11. Delete organizations
    const { error: orgsError } = await supabase
      .from('organizations')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (orgsError) console.error('Organizations error:', orgsError);

    // 12. Delete all auth users
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error('List users error:', listError);
    } else if (users?.users) {
      console.log(`[CLEANUP] Deleting ${users.users.length} auth users...`);
      for (const user of users.users) {
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
        if (deleteError) {
          console.error(`Failed to delete user ${user.email}:`, deleteError);
        } else {
          console.log(`Deleted user: ${user.email}`);
        }
      }
    }

    // Verify cleanup
    const { count: authCount } = await supabase.auth.admin.listUsers();
    const { count: customerCount } = await supabase.from('customers').select('*', { count: 'exact', head: true });
    const { count: mechanicCount } = await supabase.from('mechanics').select('*', { count: 'exact', head: true });
    const { count: orgCount } = await supabase.from('organizations').select('*', { count: 'exact', head: true });

    console.log('[CLEANUP] Cleanup complete!');
    console.log('Remaining records:', {
      authUsers: authCount || 0,
      customers: customerCount || 0,
      mechanics: mechanicCount || 0,
      organizations: orgCount || 0
    });

    return NextResponse.json({
      success: true,
      message: 'Database cleaned successfully',
      remaining: {
        authUsers: authCount || 0,
        customers: customerCount || 0,
        mechanics: mechanicCount || 0,
        organizations: orgCount || 0
      }
    });

  } catch (error: any) {
    console.error('[CLEANUP] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
