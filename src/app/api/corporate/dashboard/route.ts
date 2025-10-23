// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServer();

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find corporate employee record for this user
    const { data: employeeRecord, error: employeeError } = await supabaseAdmin
      .from('corporate_employees' as any)
      .select('corporate_id, employee_role, is_active')
      .eq('employee_user_id', user.id)
      .eq('is_active', true)
      .single();

    if (employeeError || !employeeRecord) {
      return NextResponse.json(
        { error: 'You do not have access to a corporate account' },
        { status: 403 }
      );
    }

    const corporateId = employeeRecord.corporate_id;

    // Fetch corporate account details
    const { data: account, error: accountError } = await supabaseAdmin
      .from('corporate_businesses' as any)
      .select('*')
      .eq('id', corporateId)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Corporate account not found' },
        { status: 404 }
      );
    }

    // Fetch employees (only if user is admin or fleet_manager)
    let employees = [];
    if (['admin', 'fleet_manager'].includes(employeeRecord.employee_role)) {
      const { data: employeesData } = await supabaseAdmin
        .from('corporate_employees' as any)
        .select(`
          *,
          user:employee_user_id (
            email,
            full_name
          )
        `)
        .eq('corporate_id', corporateId)
        .order('created_at', { ascending: false });

      employees = employeesData || [];
    }

    // Fetch vehicles
    const { data: vehicles } = await supabaseAdmin
      .from('corporate_vehicles' as any)
      .select('*')
      .eq('corporate_id', corporateId)
      .order('created_at', { ascending: false });

    // Fetch invoices (only if user is admin or fleet_manager)
    let invoices = [];
    if (['admin', 'fleet_manager'].includes(employeeRecord.employee_role)) {
      const { data: invoicesData } = await supabaseAdmin
        .from('corporate_invoices' as any)
        .select('*')
        .eq('corporate_id', corporateId)
        .order('created_at', { ascending: false })
        .limit(12);

      invoices = invoicesData || [];
    }

    // Fetch recent sessions
    const { data: sessions } = await supabaseAdmin
      .from('sessions')
      .select(`
        id,
        created_at,
        status,
        type,
        corporate_employee_id,
        corporate_vehicle_id
      `)
      .eq('corporate_id', corporateId)
      .order('created_at', { ascending: false })
      .limit(50);

    // Enrich sessions with employee and vehicle data
    const enrichedSessions = sessions?.map((session) => {
      const employee = employees.find(
        (e) => e.id === session.corporate_employee_id
      );
      const vehicle = vehicles?.find(
        (v) => v.id === session.corporate_vehicle_id
      );

      return {
        ...session,
        employee: employee
          ? {
              full_name: employee.user?.full_name || 'Unknown',
              email: employee.user?.email || '',
            }
          : null,
        vehicle: vehicle
          ? {
              make: vehicle.make,
              model: vehicle.model,
              license_plate: vehicle.license_plate,
            }
          : null,
      };
    });

    return NextResponse.json({
      account,
      employees,
      vehicles: vehicles || [],
      invoices,
      sessions: enrichedSessions || [],
    });
  } catch (error) {
    console.error('Corporate dashboard error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
