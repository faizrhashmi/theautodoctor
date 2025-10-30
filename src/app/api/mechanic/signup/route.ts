/**
 * MECHANIC SIGNUP API - Unified Supabase Auth
 *
 * This endpoint creates a new mechanic account using Supabase Authentication.
 * It creates:
 * 1. User in auth.users table (Supabase Auth)
 * 2. Profile in profiles table (role='mechanic')
 * 3. Mechanic record in mechanics table (linked via user_id)
 *
 * SECURITY: Uses Supabase Auth - NO custom password hashing or session tables
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { encryptPII } from '@/lib/encryption';

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function POST(req: NextRequest) {
  if (!supabaseAdmin) return bad('Supabase not configured on server', 500);

  try {
    const body = await req.json();
    const {
      // Personal Information
      name,
      email,
      phone,
      password,
      address,
      city,
      province,
      postalCode,
      country,
      dateOfBirth,
      sinOrBusinessNumber,

      // Credentials
      redSealCertified,
      redSealNumber,
      redSealProvince,
      redSealExpiry,
      yearsOfExperience,
      specializations,
      otherCertifications,

      // Shop Information
      shopAffiliation,
      shopName,
      shopAddress,
      businessLicenseNumber,

      // Insurance & Background
      liabilityInsurance,
      insurancePolicyNumber,
      insuranceExpiry,
      criminalRecordCheck,

      // Uploaded document URLs
      uploadedDocuments,
    } = body;

    console.log('[MECHANIC SIGNUP] New application from:', email);

    // Validate required fields
    if (!email || !password || !name) {
      return bad('Email, password, and name are required');
    }

    if (!yearsOfExperience || !specializations || specializations.length === 0) {
      return bad('Credentials information is required');
    }

    if (!liabilityInsurance || !criminalRecordCheck) {
      return bad('Insurance and background check are required');
    }

    // ========================================================================
    // STEP 1: Create Supabase Auth User
    // ========================================================================
    console.log('[MECHANIC SIGNUP] Creating auth user...');

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // Require email verification
      user_metadata: {
        full_name: name,
        role: 'mechanic',
        phone,
      },
    });

    if (authError || !authData.user) {
      console.error('[MECHANIC SIGNUP] Auth error:', authError);
      return bad(authError?.message || 'Failed to create account', 400);
    }

    const userId = authData.user.id;
    console.log('[MECHANIC SIGNUP] Auth user created:', userId);

    // ========================================================================
    // STEP 2: Wait for trigger to create profile, then upsert
    // ========================================================================
    await new Promise(resolve => setTimeout(resolve, 100));

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        full_name: name,
        phone,
        role: 'mechanic',
        account_type: 'independent_mechanic',
        source: 'direct',
        email_verified: false,
        account_status: 'active',
      }, {
        onConflict: 'id'
      });

    if (profileError) {
      console.error('[MECHANIC SIGNUP] Profile error:', profileError);
      // Don't fail - profile might be created by trigger
    }

    // ========================================================================
    // STEP 3: Encrypt sensitive data
    // ========================================================================
    const encryptedSIN = sinOrBusinessNumber ? encryptPII(sinOrBusinessNumber) : null;

    // Build full address
    const full_address = address ? `${address}, ${city}, ${province} ${postalCode}, ${country}` : null;

    // Prepare other certifications JSONB
    const other_certifications_jsonb = {
      certifications: otherCertifications || [],
    };

    // ========================================================================
    // STEP 4: Create mechanic record linked to Supabase Auth
    // ========================================================================
    console.log('[MECHANIC SIGNUP] Creating mechanic profile...');

    const { data: mech, error: mechanicError } = await supabaseAdmin
      .from('mechanics')
      .insert({
        // CRITICAL: Link to Supabase Auth user
        user_id: userId,

        // Basic info
        name,
        email,
        phone,

        // NOTE: password_hash is now NULLABLE - we use Supabase Auth
        password_hash: null,

        // Account type tracking (for B2C → B2B2C transition)
        account_type: 'independent',
        source: 'direct',
        workshop_id: null, // Independent mechanics have no workshop
        invited_by: null,
        invite_accepted_at: null,
        requires_sin_collection: process.env.NEXT_PUBLIC_ENABLE_SIN_COLLECTION === 'true',
        sin_collection_completed_at: encryptedSIN ? new Date().toISOString() : null,

        // Personal details
        full_address,
        city,
        province,
        postal_code: postalCode,
        country,
        date_of_birth: dateOfBirth,
        sin_encrypted: encryptedSIN,

        // Credentials
        red_seal_certified: redSealCertified || false,
        red_seal_number: redSealNumber || null,
        red_seal_province: redSealProvince || null,
        red_seal_expiry_date: redSealExpiry || null,
        years_of_experience: parseInt(yearsOfExperience) || 0,
        specializations,
        other_certifications: other_certifications_jsonb,

        // Shop info
        shop_affiliation: shopAffiliation || null,
        shop_name: shopName || null,
        shop_address: shopAddress || null,
        business_license_number: businessLicenseNumber || null,

        // Insurance & Background
        liability_insurance: liabilityInsurance || false,
        insurance_policy_number: insurancePolicyNumber || null,
        insurance_expiry: insuranceExpiry || null,
        criminal_record_check: criminalRecordCheck || false,

        // Document URLs
        certification_documents: uploadedDocuments?.redSeal
          ? [uploadedDocuments.redSeal]
          : [],
        business_license_document: uploadedDocuments?.businessLicense || null,
        insurance_document: uploadedDocuments?.insurance || null,
        crc_document: uploadedDocuments?.crc || null,

        // Application status
        application_status: 'pending',
        background_check_status: 'pending',
        application_submitted_at: new Date().toISOString(),
        current_step: 6, // Completed all steps
        service_tier: 'virtual_only', // Default to virtual-only until approved
      })
      .select('id')
      .single();

    if (mechanicError) {
      console.error('[MECHANIC SIGNUP] Mechanic insert error:', mechanicError);

      // Cleanup: Delete auth user if mechanic creation fails
      await supabaseAdmin.auth.admin.deleteUser(userId);

      if (mechanicError.code === '23505') {
        return bad('Email already registered', 409);
      }
      return bad(mechanicError.message, 500);
    }

    console.log('[MECHANIC SIGNUP] Mechanic profile created:', mech.id);

    // ========================================================================
    // STEP 5: Create document records
    // ========================================================================
    if (uploadedDocuments) {
      const documentInserts = [];

      if (uploadedDocuments.redSeal) {
        documentInserts.push({
          mechanic_id: mech.id,
          document_type: 'red_seal_certificate',
          file_name: 'Red Seal Certificate',
          file_size: 0,
          file_type: 'application/pdf',
          storage_path: uploadedDocuments.redSeal,
          storage_url: uploadedDocuments.redSeal,
        });
      }

      if (uploadedDocuments.businessLicense) {
        documentInserts.push({
          mechanic_id: mech.id,
          document_type: 'business_license',
          file_name: 'Business License',
          file_size: 0,
          file_type: 'application/pdf',
          storage_path: uploadedDocuments.businessLicense,
          storage_url: uploadedDocuments.businessLicense,
        });
      }

      if (uploadedDocuments.insurance) {
        documentInserts.push({
          mechanic_id: mech.id,
          document_type: 'insurance_certificate',
          file_name: 'Insurance Certificate',
          file_size: 0,
          file_type: 'application/pdf',
          storage_path: uploadedDocuments.insurance,
          storage_url: uploadedDocuments.insurance,
        });
      }

      if (uploadedDocuments.crc) {
        documentInserts.push({
          mechanic_id: mech.id,
          document_type: 'criminal_record_check',
          file_name: 'Criminal Record Check',
          file_size: 0,
          file_type: 'application/pdf',
          storage_path: uploadedDocuments.crc,
          storage_url: uploadedDocuments.crc,
        });
      }

      if (documentInserts.length > 0) {
        const { error: docError } = await supabaseAdmin
          .from('mechanic_documents')
          .insert(documentInserts);

        if (docError) {
          console.error('[MECHANIC SIGNUP] Document insert error:', docError);
          // Don't fail signup if document insert fails
        }
      }
    }

    // ========================================================================
    // STEP 6: Create admin action record
    // ========================================================================
    await supabaseAdmin.from('mechanic_admin_actions').insert({
      mechanic_id: mech.id,
      admin_id: 'system',
      action_type: 'application_submitted',
      notes: 'Application submitted by mechanic via Supabase Auth',
      metadata: {
        email,
        user_id: userId,
        submitted_at: new Date().toISOString(),
      },
    });

    // ========================================================================
    // STEP 7: Return success (NO SESSION CREATION)
    // ========================================================================
    // NOTE: We do NOT create a session here - user must verify email and log in
    // This is more secure and follows Supabase Auth best practices

    console.log('[MECHANIC SIGNUP] ✅ Success! Application submitted:', {
      mechanicId: mech.id,
      userId: userId,
      email: email,
    });

    return NextResponse.json({
      ok: true,
      message: 'Application submitted successfully! Please check your email to verify your account before logging in.',
      mechanicId: mech.id,
      userId: userId,
      requiresEmailVerification: true,
    });

    // TODO: Send email notification to admin
    // TODO: Send confirmation email to mechanic (Supabase handles verification email)

  } catch (e: any) {
    console.error('[MECHANIC SIGNUP] Unexpected error:', e);
    return bad(e.message || 'Signup failed', 500);
  }
}
