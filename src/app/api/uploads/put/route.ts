// src/app/api/uploads/put/route.ts
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function PUT(req: Request) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path');
  if (!path) return NextResponse.json({ error: 'Missing path' }, { status: 400 });

  // Read the uploaded data
  const buffer = await req.arrayBuffer();

  // TODO: Upload `buffer` to your storage (e.g., Supabase Storage) here.
  // This stub responds OK so the front-end flow can proceed without errors.
  return NextResponse.json({ ok: true, path, bytes: buffer.byteLength }, { status: 200 });
}
