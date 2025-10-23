// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

function bad(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return bad('Supabase not configured', 500);
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const documentType = formData.get('type') as string;
    const email = formData.get('email') as string;

    if (!file) {
      return bad('No file provided');
    }

    if (!documentType) {
      return bad('Document type is required');
    }

    if (!email) {
      return bad('Email is required');
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return bad('File size exceeds 10MB limit');
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return bad(
        'Invalid file type. Only PDF, JPG, PNG, and WEBP files are allowed'
      );
    }

    // Sanitize filename
    const timestamp = Date.now();
    const sanitizedEmail = email.replace(/[^a-zA-Z0-9]/g, '_');
    const fileExt = file.name.split('.').pop();
    const fileName = `${sanitizedEmail}_${documentType}_${timestamp}.${fileExt}`;
    const filePath = `mechanic_documents/${fileName}`;

    // Convert file to buffer
    const buffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('documents') // Make sure this bucket exists
      .upload(filePath, uint8Array, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('[DOCUMENT UPLOAD] Storage error:', uploadError);
      return bad(`Failed to upload document: ${uploadError.message}`, 500);
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('documents')
      .getPublicUrl(filePath);

    console.log('[DOCUMENT UPLOAD] Success:', {
      fileName,
      type: documentType,
      size: file.size,
      email,
    });

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: filePath,
      fileName: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error: any) {
    console.error('[DOCUMENT UPLOAD] Error:', error);
    return bad(error.message || 'Upload failed', 500);
  }
}
