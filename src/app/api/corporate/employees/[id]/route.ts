// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const employeeId = params.id;

    // Get employee record to check permissions
    const { data: employeeToRemove, error: fetchError } = await supabaseAdmin
      .from('corporate_employees' as any)
      .select('corporate_id, employee_user_id')
      .eq('id', employeeId)
      .single();

    if (fetchError || !employeeToRemove) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to remove employees
    const { data: currentUserEmployee, error: permissionError } =
      await supabaseAdmin
        .from('corporate_employees' as any)
        .select('corporate_id, employee_role, is_active')
        .eq('employee_user_id', user.id)
        .eq('is_active', true)
        .single();

    if (permissionError || !currentUserEmployee) {
      return NextResponse.json(
        { error: 'You do not have access to a corporate account' },
        { status: 403 }
      );
    }

    // Verify same corporate account
    if (currentUserEmployee.corporate_id !== employeeToRemove.corporate_id) {
      return NextResponse.json(
        { error: 'Cannot remove employee from different corporate account' },
        { status: 403 }
      );
    }

    // Only admins and fleet managers can remove employees
    if (!['admin', 'fleet_manager'].includes(currentUserEmployee.employee_role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to remove employees' },
        { status: 403 }
      );
    }

    // Prevent removing yourself
    if (employeeToRemove.employee_user_id === user.id) {
      return NextResponse.json(
        { error: 'Cannot remove yourself from the corporate account' },
        { status: 400 }
      );
    }

    // Mark employee as inactive (soft delete)
    const { error: updateError } = await supabaseAdmin
      .from('corporate_employees' as any)
      .update({
        is_active: false,
        removed_at: new Date().toISOString(),
        removed_by: user.id,
      })
      .eq('id', employeeId);

    if (updateError) {
      console.error('Error removing employee:', updateError);
      return NextResponse.json(
        { error: 'Failed to remove employee' },
        { status: 500 }
      );
    }

    // TODO: Send notification email to removed employee

    return NextResponse.json({
      success: true,
      message: 'Employee removed successfully',
    });
  } catch (error) {
    console.error('Remove employee error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
