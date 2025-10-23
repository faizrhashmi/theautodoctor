// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { hashPassword, makeSessionToken } from '@/lib/auth';

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

// Helper function to encrypt sensitive data (SIN/Business Number)
// In production, use a proper encryption library like crypto
function encryptSensitiveData(data: string): string {
  // TODO: Implement proper encryption
  // For now, we'll just store it as-is (NOT RECOMMENDED FOR PRODUCTION)
  // Use a library like 'crypto-js' or Node's 'crypto' module with a secret key
  return data;
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

    // Hash password
    const password_hash = hashPassword(password);

    // Encrypt sensitive data
    const encryptedSIN = encryptSensitiveData(sinOrBusinessNumber);

    // Build full address
    const full_address = `${address}, ${city}, ${province} ${postalCode}, ${country}`;

    // Prepare other certifications JSONB
    const other_certifications_jsonb = {
      certifications: otherCertifications || [],
    };

    // Create mechanic record
    const { data: mech, error } = await supabaseAdmin
      .from('mechanics')
      .insert({
        // Basic info
        name,
        email,
        phone,
        password_hash,

        // Personal details
        full_address,
        city,
        province,
        postal_code: postalCode,
        country,
        date_of_birth: dateOfBirth,
        sin_or_business_number: encryptedSIN,

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

        // Document URLs (stored in separate fields for quick access)
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
      })
      .select('id')
      .single();

    if (error) {
      console.error('[MECHANIC SIGNUP] Database error:', error);
      if (error.code === '23505') {
        return bad('Email already registered', 409);
      }
      return bad(error.message, 500);
    }

    console.log('[MECHANIC SIGNUP] Created mechanic:', mech.id);

    // Create document records in mechanic_documents table
    if (uploadedDocuments) {
      const documentInserts = [];

      if (uploadedDocuments.redSeal) {
        documentInserts.push({
          mechanic_id: mech.id,
          document_type: 'red_seal_certificate',
          file_name: 'Red Seal Certificate',
          file_size: 0, // We don't have size here
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
          console.error(
            '[MECHANIC SIGNUP] Failed to insert documents:',
            docError
          );
          // Don't fail the signup if document insert fails
        }
      }
    }

    // Create admin action record
    await supabaseAdmin.from('mechanic_admin_actions').insert({
      mechanic_id: mech.id,
      admin_id: 'system',
      action_type: 'application_submitted',
      notes: 'Application submitted by mechanic',
      metadata: {
        email,
        submitted_at: new Date().toISOString(),
      },
    });

    // Create session for the mechanic
    const token = makeSessionToken();
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days
    const { error: sErr } = await supabaseAdmin.from('mechanic_sessions').insert({
      mechanic_id: mech.id,
      token,
      expires_at: expires.toISOString(),
    });

    if (sErr) {
      console.error('[MECHANIC SIGNUP] Session creation error:', sErr);
      return bad(sErr.message, 500);
    }

    const res = NextResponse.json({
      ok: true,
      message:
        'Application submitted successfully! You will receive an email once your application is reviewed.',
      mechanicId: mech.id,
    });

    res.cookies.set('aad_mech', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    console.log('[MECHANIC SIGNUP] Success! Application submitted:', mech.id);

    // TODO: Send email notification to admin
    // TODO: Send confirmation email to mechanic

    return res;
  } catch (e: any) {
    console.error('[MECHANIC SIGNUP] Error:', e);
    return bad(e.message || 'Signup failed', 500);
  }
}
