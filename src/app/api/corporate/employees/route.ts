// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { email, role, employeeNumber, department } = body;

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      );
    }

    // Check if user has permission to add employees
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

    // Only admins and fleet managers can add employees
    if (!['admin', 'fleet_manager'].includes(employeeRecord.employee_role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to add employees' },
        { status: 403 }
      );
    }

    const corporateId = employeeRecord.corporate_id;

    // Find user by email or create invitation
    const { data: existingUser } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .single();

    if (!existingUser) {
      // TODO: Send invitation email to the user to sign up
      return NextResponse.json(
        {
          error:
            'User not found. Employee must create an account first before being added to corporate account.',
        },
        { status: 404 }
      );
    }

    // Check if employee already exists
    const { data: existingEmployee } = await supabaseAdmin
      .from('corporate_employees' as any)
      .select('id')
      .eq('corporate_id', corporateId)
      .eq('employee_user_id', existingUser.id)
      .single();

    if (existingEmployee) {
      return NextResponse.json(
        { error: 'This employee is already part of your corporate account' },
        { status: 400 }
      );
    }

    // Add employee to corporate account
    const { data: newEmployee, error: createError } = await supabaseAdmin
      .from('corporate_employees' as any)
      .insert({
        corporate_id: corporateId,
        employee_user_id: existingUser.id,
        employee_role: role,
        employee_number: employeeNumber,
        department,
        is_active: true,
        added_by: user.id,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating employee:', createError);
      return NextResponse.json(
        { error: 'Failed to add employee' },
        { status: 500 }
      );
    }

    // TODO: Send notification email to new employee

    return NextResponse.json({
      success: true,
      employee: newEmployee,
    });
  } catch (error) {
    console.error('Add employee error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    // Only admins and fleet managers can view all employees
    if (!['admin', 'fleet_manager'].includes(employeeRecord.employee_role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view employees' },
        { status: 403 }
      );
    }

    const corporateId = employeeRecord.corporate_id;

    // Fetch all employees
    const { data: employees, error: fetchError } = await supabaseAdmin
      .from('corporate_employees' as any)
      .select(`
        *,
        user:employee_user_id (
          id,
          email,
          full_name
        )
      `)
      .eq('corporate_id', corporateId)
      .order('created_at', { ascending: false });

    if (fetchError) {
      return NextResponse.json(
        { error: 'Failed to fetch employees' },
        { status: 500 }
      );
    }

    return NextResponse.json({ employees });
  } catch (error) {
    console.error('Get employees error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
