import { NextRequest, NextResponse } from 'next/server'
import { requireCustomerAPI } from '@/lib/auth/guards'

export async function GET(req: NextRequest) {
  // ✅ SECURITY: Require customer authentication
  const authResult = await requireCustomerAPI(req)
  if (authResult.error) return authResult.error

  const customer = authResult.data
  console.log(`[CUSTOMER] ${customer.email} fetching analytics`)

  try {
    const customerId = customer.id

    // Mock analytics data - replace with actual database queries
    const analyticsData = {
      monthlySpending: [
        { month: 'Jan 2024', amount: 450.00, trend: 'up' as const, change: 12 },
        { month: 'Feb 2024', amount: 520.00, trend: 'up' as const, change: 15 },
        { month: 'Mar 2024', amount: 380.00, trend: 'down' as const, change: -8 },
        { month: 'Apr 2024', amount: 410.00, trend: 'up' as const, change: 5 },
        { month: 'May 2024', amount: 490.00, trend: 'up' as const, change: 20 },
      ],
      serviceDistribution: [
        { type: 'Diagnostic', count: 12, percentage: 40, color: '#3B82F6' },
        { type: 'Maintenance', count: 8, percentage: 27, color: '#10B981' },
        { type: 'Repair', count: 6, percentage: 20, color: '#F59E0B' },
        { type: 'Consultation', count: 4, percentage: 13, color: '#8B5CF6' },
      ],
      mechanicRatings: [
        { id: '1', name: 'Mike Johnson', rating: 4.8, sessions: 5, specialization: 'Engine Specialist' },
        { id: '2', name: 'Sarah Chen', rating: 4.9, sessions: 3, specialization: 'Electrical Systems' },
        { id: '3', name: 'David Wilson', rating: 4.7, sessions: 4, specialization: 'Transmission' },
      ],
      vehicleStats: {
        total_vehicles: 3,
        most_serviced: 'Toyota Camry',
        average_mileage: 45600,
      }
    }

    return NextResponse.json(analyticsData)
  } catch (error) {
    console.error('[CUSTOMER ANALYTICS API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}