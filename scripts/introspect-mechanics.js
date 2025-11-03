const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  console.log('=== MECHANICS TABLE - Current Schema ===\n');

  // Get one row to see all columns
  const { data: sample, error } = await supabase
    .from('mechanics')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (sample) {
    const allCols = Object.keys(sample);
    const certCols = allCols.filter(c =>
      c.includes('red_seal') ||
      c.includes('certif') ||
      c.includes('other_certifications')
    );

    console.log('ALL COLUMNS (' + allCols.length + ' total):');
    console.log(allCols.join(', '));
    console.log('\n');

    console.log('CERTIFICATION-RELATED COLUMNS (' + certCols.length + ' total):');
    certCols.forEach(col => {
      const val = sample[col];
      const type = typeof val;
      console.log('  - ' + col + ': ' + type + (val !== null ? ' (has data)' : ' (null)'));
    });

    console.log('\n=== SAMPLE DATA (cert fields only) ===\n');
    const certData = {};
    certCols.forEach(col => certData[col] = sample[col]);
    console.log(JSON.stringify(certData, null, 2));

    // Count mechanics by cert status
    const { count: totalCount } = await supabase
      .from('mechanics')
      .select('*', { count: 'exact', head: true });

    const { count: redSealCount } = await supabase
      .from('mechanics')
      .select('*', { count: 'exact', head: true })
      .eq('red_seal_certified', true);

    console.log('\n=== STATISTICS ===\n');
    console.log('Total mechanics: ' + totalCount);
    console.log('Red Seal certified: ' + redSealCount);
    console.log('Non-Red Seal: ' + (totalCount - redSealCount));
  }
})();
