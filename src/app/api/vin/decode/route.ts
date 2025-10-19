import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const vin = (searchParams.get('vin') || '').trim();
  if (!vin || vin.length < 11) return NextResponse.json({ error: 'Invalid VIN' }, { status: 400 });

  const resp = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${encodeURIComponent(vin)}?format=json`, { cache: 'no-store' });
  const data = await resp.json();

  let year = '', make = '', model = '';
  if (Array.isArray(data?.Results)) {
    for (const r of data.Results) {
      if (r.Variable === 'Model Year') year = r.Value || year;
      if (r.Variable === 'Make') make = r.Value || make;
      if (r.Variable === 'Model') model = r.Value || model;
    }
  }
  return NextResponse.json({ vin, year, make, model, raw: data });
}
