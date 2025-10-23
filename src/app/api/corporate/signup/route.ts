// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      companyName,
      companyEmail,
      companyPhone,
      companyWebsite,
      businessType,
      industry,
      streetAddress,
      city,
      province,
      postalCode,
      contactName,
      contactEmail,
      contactPhone,
      contactTitle,
      businessRegistrationNumber,
      taxId,
      fleetSize,
      estimatedMonthlyUsage,
      currentChallenges,
      desiredFeatures,
    } = body;

    // Validate required fields
    if (!companyName || !companyEmail || !contactName || !contactEmail || !businessType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if company email already exists
    const { data: existingCompany } = await supabaseAdmin
      .from('corporate_businesses' as any)
      .select('id')
      .eq('company_email', companyEmail)
      .single();

    if (existingCompany) {
      return NextResponse.json(
        { error: 'A corporate account with this email already exists' },
        { status: 400 }
      );
    }

    // Determine subscription tier based on fleet size
    let subscriptionTier = 'basic';
    if (fleetSize === '100+') {
      subscriptionTier = 'enterprise';
    } else if (fleetSize === '51-100' || fleetSize === '26-50') {
      subscriptionTier = 'professional';
    }

    // Create corporate business record
    const { data: corporateBusiness, error: createError } = await supabaseAdmin
      .from('corporate_businesses' as any)
      .insert({
        company_name: companyName,
        company_email: companyEmail,
        company_phone: companyPhone,
        company_website: companyWebsite,
        business_type: businessType,
        industry,
        street_address: streetAddress,
        city,
        province,
        postal_code: postalCode,
        country: 'Canada',
        primary_contact_name: contactName,
        primary_contact_email: contactEmail,
        primary_contact_phone: contactPhone,
        primary_contact_title: contactTitle,
        business_registration_number: businessRegistrationNumber,
        tax_id: taxId,
        fleet_size: parseInt(fleetSize?.split('-')[0] || '0'),
        subscription_tier: subscriptionTier,
        approval_status: 'pending',
        is_active: false,
        metadata: {
          estimated_monthly_usage: estimatedMonthlyUsage,
          current_challenges: currentChallenges,
          desired_features: desiredFeatures,
          application_source: 'website',
        },
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating corporate business:', createError);
      return NextResponse.json(
        { error: 'Failed to create corporate account application' },
        { status: 500 }
      );
    }

    // TODO: Send notification email to admin
    // TODO: Send confirmation email to applicant

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
      businessId: corporateBusiness.id,
    });
  } catch (error) {
    console.error('Corporate signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
