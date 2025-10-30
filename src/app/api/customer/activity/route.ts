import { NextRequest, NextResponse } from 'next/server'
import { requireCustomerAPI } from '@/lib/auth/guards'

export async function GET(req: NextRequest) {
  // ✅ SECURITY: Require customer authentication
  const authResult = await requireCustomerAPI(req)
  if (authResult.error) return authResult.error

  const customer = authResult.data
  console.log(`[CUSTOMER] ${customer.email} fetching activity`)

  try {
    const customerId = customer.id

    // Mock activity data - replace with actual database queries
    const activityData = {
      sessions: [
        { id: '1', type: 'Diagnostic', mechanic: 'Mike Johnson', status: 'completed', date: '2024-05-15', duration: '45 min', cost: 89.99, vehicle: 'Toyota Camry' },
        { id: '2', type: 'Maintenance', mechanic: 'Sarah Chen', status: 'completed', date: '2024-05-10', duration: '2 hours', cost: 245.50, vehicle: 'Honda Civic' },
        { id: '3', type: 'Consultation', mechanic: 'David Wilson', status: 'scheduled', date: '2024-05-20', duration: '30 min', cost: 49.99, vehicle: 'Ford F-150' },
      ],
      quotes: [
        { id: '1', vehicle: 'Toyota Camry', amount: 1200.00, status: 'pending' as const, created: '2024-05-15', expires: '2024-05-29' },
        { id: '2', vehicle: 'Honda Civic', amount: 850.00, status: 'approved' as const, created: '2024-05-10', expires: '2024-05-24' },
        { id: '3', vehicle: 'Ford F-150', amount: 2100.00, status: 'pending' as const, created: '2024-05-18', expires: '2024-06-01' },
      ],
      warranties: [
        { id: '1', service: 'Brake System Repair', expires: '2025-05-15', months: 12, status: 'active' as const },
        { id: '2', service: 'Engine Tune-up', expires: '2024-11-10', months: 6, status: 'active' as const },
        { id: '3', service: 'Transmission Service', expires: '2024-08-20', months: 3, status: 'active' as const },
      ],
      timeline: [
        { id: '1', type: 'session' as const, title: 'Diagnostic Session Completed', description: 'Mike Johnson completed diagnostic on Toyota Camry', date: '2 hours ago', icon: 'wrench' },
        { id: '2', type: 'quote' as const, title: 'New Quote Received', description: 'Quote #Q-2345 for brake repair is ready for review', date: '1 day ago', icon: 'file-text' },
        { id: '3', type: 'payment' as const, title: 'Payment Processed', description: 'Payment of $245.50 for maintenance service', date: '2 days ago', icon: 'dollar-sign' },
        { id: '4', type: 'warranty' as const, title: 'Warranty Activated', description: '12-month warranty activated for brake system repair', date: '1 week ago', icon: 'shield' },
      ]
    }

    return NextResponse.json(activityData)
  } catch (error) {
    console.error('[CUSTOMER ACTIVITY API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}