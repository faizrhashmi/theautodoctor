import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function investigateSessionProblems() {
  console.log('🔍 INVESTIGATING SESSION REQUESTS PROBLEMS');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Get all session requests
  const { data: sessions, error } = await supabase
    .from('session_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching sessions:', error);
    return;
  }

  console.log(`✅ Fetched ${sessions?.length || 0} session requests\n`);

  if (!sessions || sessions.length === 0) {
    console.log('No sessions to analyze.');
    return;
  }

  // Analysis 1: Status breakdown
  console.log('📊 ANALYSIS 1: STATUS BREAKDOWN');
  console.log('─────────────────────────────────────────────────────');
  const byStatus = sessions.reduce((acc: any, s: any) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, {});

  Object.entries(byStatus).forEach(([status, count]) => {
    const percentage = ((count as number / sessions.length) * 100).toFixed(1);
    console.log(`  ${status.padEnd(15)}: ${count} (${percentage}%)`);
  });
  console.log('');

  // Analysis 2: Assignment status
  console.log('📊 ANALYSIS 2: MECHANIC ASSIGNMENT');
  console.log('─────────────────────────────────────────────────────');
  const assigned = sessions.filter(s => s.mechanic_id !== null).length;
  const unassigned = sessions.filter(s => s.mechanic_id === null).length;
  console.log(`  Assigned to mechanic: ${assigned} (${((assigned/sessions.length)*100).toFixed(1)}%)`);
  console.log(`  Never assigned:       ${unassigned} (${((unassigned/sessions.length)*100).toFixed(1)}%)`);
  console.log('');

  // Analysis 3: Time analysis
  console.log('📊 ANALYSIS 3: TIME ANALYSIS');
  console.log('─────────────────────────────────────────────────────');
  const dates = sessions.map(s => new Date(s.created_at));
  const oldest = new Date(Math.min(...dates.map(d => d.getTime())));
  const newest = new Date(Math.max(...dates.map(d => d.getTime())));

  console.log(`  Oldest session:  ${oldest.toLocaleDateString()} ${oldest.toLocaleTimeString()}`);
  console.log(`  Newest session:  ${newest.toLocaleDateString()} ${newest.toLocaleTimeString()}`);
  console.log(`  Time span:       ${Math.ceil((newest.getTime() - oldest.getTime()) / (1000 * 60 * 60 * 24))} days`);
  console.log('');

  // Analysis 4: Session types
  console.log('📊 ANALYSIS 4: SESSION TYPES');
  console.log('─────────────────────────────────────────────────────');
  const byType = sessions.reduce((acc: any, s: any) => {
    const type = s.session_type || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  Object.entries(byType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
  console.log('');

  // Analysis 5: Customer analysis
  console.log('📊 ANALYSIS 5: CUSTOMER ANALYSIS');
  console.log('─────────────────────────────────────────────────────');
  const byCustomer = sessions.reduce((acc: any, s: any) => {
    const customer = s.customer_email || s.customer_id || 'unknown';
    if (!acc[customer]) {
      acc[customer] = { count: 0, cancelled: 0, completed: 0, pending: 0 };
    }
    acc[customer].count++;
    acc[customer][s.status] = (acc[customer][s.status] || 0) + 1;
    return acc;
  }, {});

  console.log(`  Unique customers: ${Object.keys(byCustomer).length}`);
  console.log(`\n  Top 5 customers by session count:`);
  const topCustomers = Object.entries(byCustomer)
    .sort((a: any, b: any) => b[1].count - a[1].count)
    .slice(0, 5);

  topCustomers.forEach(([customer, data]: [string, any], i: number) => {
    const email = customer.includes('@') ? customer : `ID: ${customer.substring(0, 8)}...`;
    console.log(`    ${i+1}. ${email}`);
    console.log(`       Total: ${data.count}, Completed: ${data.completed || 0}, Cancelled: ${data.cancelled || 0}, Pending: ${data.pending || 0}`);
  });
  console.log('');

  // Analysis 6: Mechanics involved
  console.log('📊 ANALYSIS 6: MECHANICS INVOLVED');
  console.log('─────────────────────────────────────────────────────');
  const uniqueMechanics = new Set(sessions.filter(s => s.mechanic_id).map(s => s.mechanic_id));
  console.log(`  Unique mechanics assigned: ${uniqueMechanics.size}`);

  if (uniqueMechanics.size > 0) {
    const byMechanic = sessions.reduce((acc: any, s: any) => {
      if (s.mechanic_id) {
        if (!acc[s.mechanic_id]) {
          acc[s.mechanic_id] = { count: 0, cancelled: 0, completed: 0, pending: 0 };
        }
        acc[s.mechanic_id].count++;
        acc[s.mechanic_id][s.status] = (acc[s.mechanic_id][s.status] || 0) + 1;
      }
      return acc;
    }, {});

    console.log(`\n  Sessions per mechanic:`);
    Object.entries(byMechanic).forEach(([mechId, data]: [string, any], i: number) => {
      console.log(`    Mechanic ${mechId.substring(0, 8)}...`);
      console.log(`       Total: ${data.count}, Completed: ${data.completed || 0}, Cancelled: ${data.cancelled || 0}, Pending: ${data.pending || 0}`);
    });
  }
  console.log('');

  // Analysis 7: Cancelled sessions deep dive
  console.log('📊 ANALYSIS 7: CANCELLED SESSIONS DEEP DIVE');
  console.log('─────────────────────────────────────────────────────');
  const cancelled = sessions.filter(s => s.status === 'cancelled');
  const cancelledWithMechanic = cancelled.filter(s => s.mechanic_id !== null).length;
  const cancelledWithoutMechanic = cancelled.filter(s => s.mechanic_id === null).length;

  console.log(`  Total cancelled: ${cancelled.length}`);
  console.log(`  Cancelled after mechanic assigned: ${cancelledWithMechanic}`);
  console.log(`  Cancelled before mechanic assigned: ${cancelledWithoutMechanic}`);
  console.log('');

  // Analysis 8: Time from creation to acceptance
  console.log('📊 ANALYSIS 8: RESPONSE TIME ANALYSIS');
  console.log('─────────────────────────────────────────────────────');
  const sessionsWithAcceptance = sessions.filter(s => s.accepted_at);

  if (sessionsWithAcceptance.length > 0) {
    const responseTimes = sessionsWithAcceptance.map(s => {
      const created = new Date(s.created_at).getTime();
      const accepted = new Date(s.accepted_at).getTime();
      return (accepted - created) / 1000 / 60; // minutes
    });

    const avgResponse = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const minResponse = Math.min(...responseTimes);
    const maxResponse = Math.max(...responseTimes);

    console.log(`  Sessions with acceptance: ${sessionsWithAcceptance.length}`);
    console.log(`  Average response time: ${avgResponse.toFixed(2)} minutes`);
    console.log(`  Fastest response: ${minResponse.toFixed(2)} minutes`);
    console.log(`  Slowest response: ${maxResponse.toFixed(2)} minutes`);
  } else {
    console.log(`  No sessions have accepted_at timestamp`);
  }
  console.log('');

  // Analysis 9: Workshop routing
  console.log('📊 ANALYSIS 9: WORKSHOP ROUTING');
  console.log('─────────────────────────────────────────────────────');
  const withWorkshop = sessions.filter(s => s.workshop_id !== null).length;
  const withPreferredWorkshop = sessions.filter(s => s.preferred_workshop_id !== null).length;
  const routingTypes = sessions.reduce((acc: any, s: any) => {
    const type = s.routing_type || 'none';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  console.log(`  Sessions with workshop_id: ${withWorkshop}`);
  console.log(`  Sessions with preferred_workshop_id: ${withPreferredWorkshop}`);
  console.log(`  Routing types:`, routingTypes);
  console.log('');

  // Analysis 10: Sample cancelled sessions
  console.log('📊 ANALYSIS 10: SAMPLE CANCELLED SESSIONS (First 5)');
  console.log('─────────────────────────────────────────────────────');
  cancelled.slice(0, 5).forEach((s: any, i: number) => {
    console.log(`\n  ${i+1}. Session ID: ${s.id.substring(0, 8)}...`);
    console.log(`     Customer: ${s.customer_email || 'N/A'}`);
    console.log(`     Type: ${s.session_type || 'N/A'}`);
    console.log(`     Created: ${new Date(s.created_at).toLocaleString()}`);
    console.log(`     Mechanic: ${s.mechanic_id ? s.mechanic_id.substring(0, 8) + '...' : 'None'}`);
    console.log(`     Workshop: ${s.workshop_id ? s.workshop_id.substring(0, 8) + '...' : 'None'}`);
    console.log(`     Routing: ${s.routing_type || 'N/A'}`);
  });
  console.log('\n');

  // Summary and conclusions
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🎯 KEY FINDINGS & CONCLUSIONS');
  console.log('═══════════════════════════════════════════════════════════\n');

  const cancelRate = (byStatus['cancelled'] || 0) / sessions.length * 100;
  const unassignedRate = unassigned / sessions.length * 100;
  const completionRate = (byStatus['completed'] || 0) / sessions.length * 100;

  console.log('1. CANCELLATION ISSUE:');
  console.log(`   - ${cancelRate.toFixed(1)}% of sessions are cancelled`);
  console.log(`   - ${cancelledWithoutMechanic} cancelled before mechanic assignment`);
  console.log(`   - ${cancelledWithMechanic} cancelled after mechanic assignment`);
  console.log('   ⚠️ DIAGNOSIS: High cancellation suggests either:');
  console.log('      • Test data from development/testing');
  console.log('      • Customers not finding mechanics fast enough');
  console.log('      • UX issues in booking flow');
  console.log('');

  console.log('2. ASSIGNMENT ISSUE:');
  console.log(`   - ${unassignedRate.toFixed(1)}% of sessions never got a mechanic`);
  console.log(`   - Only ${uniqueMechanics.size} unique mechanics involved`);
  console.log('   ⚠️ DIAGNOSIS: Matching system may not be working, or:');
  console.log('      • Not enough mechanics available');
  console.log('      • Mechanics not accepting requests');
  console.log('      • Geographic/specialty mismatch');
  console.log('');

  console.log('3. SUCCESS RATE:');
  console.log(`   - Only ${completionRate.toFixed(1)}% completion rate`);
  console.log(`   - ${byStatus['completed'] || 0} successfully completed sessions`);
  console.log('   ⚠️ DIAGNOSIS: Very low success rate indicates:');
  console.log('      • This is likely TEST DATA from development');
  console.log('      • Or significant platform issues');
  console.log('');

  console.log('4. CUSTOMER BEHAVIOR:');
  console.log(`   - ${Object.keys(byCustomer).length} unique customers`);
  console.log(`   - Average ${(sessions.length / Object.keys(byCustomer).length).toFixed(1)} sessions per customer`);
  console.log('   💡 Some customers created multiple sessions (possibly testing)');
  console.log('');

  console.log('5. RECOMMENDATION:');
  if (cancelRate > 70 && completionRate < 20) {
    console.log('   ✅ This appears to be TEST/DEVELOPMENT DATA');
    console.log('   ✅ High cancellation rate is NORMAL for testing');
    console.log('   ✅ Can use this data for testing workflows');
    console.log('   ⚠️ Consider creating more COMPLETED sessions for positive path testing');
  } else {
    console.log('   ❌ If this is production data, there are serious issues');
    console.log('   ❌ Investigate mechanic matching system');
    console.log('   ❌ Improve customer experience to reduce cancellations');
  }
  console.log('');

  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: sessions.length,
      byStatus,
      assigned,
      unassigned,
      uniqueMechanics: uniqueMechanics.size,
      uniqueCustomers: Object.keys(byCustomer).length,
      cancelRate: cancelRate.toFixed(1),
      completionRate: completionRate.toFixed(1),
    },
    sessions: sessions.map(s => ({
      id: s.id,
      customer_email: s.customer_email,
      customer_id: s.customer_id,
      mechanic_id: s.mechanic_id,
      status: s.status,
      session_type: s.session_type,
      created_at: s.created_at,
      accepted_at: s.accepted_at,
      workshop_id: s.workshop_id,
      routing_type: s.routing_type,
    })),
  };

  const reportPath = path.join(process.cwd(), 'session-requests-analysis.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`✅ Detailed analysis saved to: ${reportPath}\n`);
}

async function main() {
  try {
    await investigateSessionProblems();
  } catch (error) {
    console.error('❌ Investigation failed:', error);
    process.exit(1);
  }
}

main();
