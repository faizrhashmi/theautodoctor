// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseServer();

    // Verify admin user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const corporateId = params.id;

    // Fetch corporate business
    const { data: business, error: businessError } = await supabaseAdmin
      .from('corporate_businesses' as any)
      .select('*')
      .eq('id', corporateId)
      .single();

    if (businessError || !business) {
      return NextResponse.json(
        { error: 'Corporate business not found' },
        { status: 404 }
      );
    }

    // Get current billing period (current month)
    const now = new Date();
    const billingPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const billingPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Fetch sessions for this billing period
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('sessions')
      .select('id, created_at, type, status')
      .eq('corporate_id', corporateId)
      .gte('created_at', billingPeriodStart.toISOString())
      .lte('created_at', billingPeriodEnd.toISOString())
      .in('status', ['completed', 'active']);

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
      return NextResponse.json(
        { error: 'Failed to fetch sessions' },
        { status: 500 }
      );
    }

    const sessionsCount = sessions?.length || 0;

    // Calculate invoice amounts
    // TODO: Implement proper pricing logic based on session types
    const baseRatePerSession = 50.0; // $50 per session
    const subtotal = sessionsCount * baseRatePerSession;
    const discountAmount = (subtotal * ((business as any)?.discount_percentage || 0)) / 100;
    const taxRate = 0.13; // 13% HST for Ontario
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * taxRate;
    const totalAmount = taxableAmount + taxAmount;

    // Generate invoice number
    const { data: invoiceNumberData, error: invoiceNumberError } =
      await (supabaseAdmin as any).rpc('generate_corporate_invoice_number');

    if (invoiceNumberError) {
      console.error('Error generating invoice number:', invoiceNumberError);
      return NextResponse.json(
        { error: 'Failed to generate invoice number' },
        { status: 500 }
      );
    }

    const invoiceNumber = invoiceNumberData;

    // Calculate due date (30 days from now by default)
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 30);

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('corporate_invoices' as any)
      .insert({
        invoice_number: invoiceNumber,
        corporate_id: corporateId,
        billing_period_start: billingPeriodStart.toISOString().split('T')[0],
        billing_period_end: billingPeriodEnd.toISOString().split('T')[0],
        subtotal_amount: subtotal,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        sessions_count: sessionsCount,
        session_ids: sessions?.map((s) => s.id) || [],
        status: 'draft',
        due_date: dueDate.toISOString().split('T')[0],
      })
      .select()
      .single();

    if (invoiceError) {
      console.error('Error creating invoice:', invoiceError);
      return NextResponse.json(
        { error: 'Failed to create invoice' },
        { status: 500 }
      );
    }

    // TODO: Generate PDF invoice
    // TODO: Send invoice email

    return NextResponse.json({
      success: true,
      message: 'Invoice generated successfully',
      invoice,
    });
  } catch (error) {
    console.error('Generate invoice error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
