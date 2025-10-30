'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Car,
  DollarSign,
  Calendar,
  Edit,
  Trash2,
  ArrowLeft,
  AlertCircle,
  X
} from 'lucide-react'

interface Client {
  id: string
  customer_name: string
  phone: string
  email?: string
  address?: string
  vehicle_info?: {
    make?: string
    model?: string
    year?: number
    vin?: string
  }
  notes?: string
  preferred_contact_method?: string
  total_jobs: number
  total_revenue: number
  last_service_date?: string
  created_at: string
}

export default function MechanicCRMPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<Client[]>([])
  const [filteredClients, setFilteredClients] = useState<Client[]>([])
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<string>('name')
  const [showAddModal, setShowAddModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // New client form
  const [formData, setFormData] = useState({
    customer_name: '',
    phone: '',
    email: '',
    address: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: '',
    vehicle_vin: '',
    notes: '',
    preferred_contact_method: 'phone'
  })

  useEffect(() => {
    loadClients()
  }, [sortBy])

  useEffect(() => {
    filterClients()
  }, [clients, searchQuery])

  const loadClients = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/mechanics/clients?sort_by=${sortBy}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load clients')
      }

      setClients(data.clients || [])

    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const filterClients = () => {
    if (!searchQuery) {
      setFilteredClients(clients)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredClients(
        clients.filter(c =>
          c.customer_name.toLowerCase().includes(query) ||
          c.phone.includes(query) ||
          (c.email && c.email.toLowerCase().includes(query))
        )
      )
    }
  }

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const payload: any = {
        customer_name: formData.customer_name,
        phone: formData.phone,
        preferred_contact_method: formData.preferred_contact_method
      }

      if (formData.email) payload.email = formData.email
      if (formData.address) payload.address = formData.address
      if (formData.vehicle_make) payload.vehicle_make = formData.vehicle_make
      if (formData.vehicle_model) payload.vehicle_model = formData.vehicle_model
      if (formData.vehicle_year) payload.vehicle_year = parseInt(formData.vehicle_year)
      if (formData.vehicle_vin) payload.vehicle_vin = formData.vehicle_vin
      if (formData.notes) payload.notes = formData.notes

      const response = await fetch('/api/mechanics/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add client')
      }

      // Reset form and close modal
      setFormData({
        customer_name: '',
        phone: '',
        email: '',
        address: '',
        vehicle_make: '',
        vehicle_model: '',
        vehicle_year: '',
        vehicle_vin: '',
        notes: '',
        preferred_contact_method: 'phone'
      })
      setShowAddModal(false)

      // Reload clients
      await loadClients()

    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this client?')) {
      return
    }

    try {
      const response = await fetch(`/api/mechanics/clients/${clientId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete client')
      }

      await loadClients()

    } catch (err: any) {
      alert(err.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading clients...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Client Management (CRM)</h1>
              <p className="text-slate-400 mt-1">
                Manage your client relationships and service history
              </p>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Client</span>
            </button>
          </div>
        </div>

        {/* Search and Sort */}
        <div className="mb-6 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg shadow-sm p-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search clients by name, phone, or email..."
                className="w-full pl-10 pr-4 py-2 border border-slate-700 rounded-lg bg-slate-900 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="name">Sort by Name</option>
                <option value="last_service">Sort by Last Service</option>
                <option value="total_revenue">Sort by Revenue</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-8 h-8 text-blue-600" />
              <h3 className="text-lg font-semibold text-white">Total Clients</h3>
            </div>
            <p className="text-3xl font-bold text-white">{clients.length}</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-8 h-8 text-green-600" />
              <h3 className="text-lg font-semibold text-white">Total Client Revenue</h3>
            </div>
            <p className="text-3xl font-bold text-white">
              ${clients.reduce((sum, c) => sum + c.total_revenue, 0).toFixed(2)}
            </p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-8 h-8 text-purple-600" />
              <h3 className="text-lg font-semibold text-white">Active This Month</h3>
            </div>
            <p className="text-3xl font-bold text-white">
              {clients.filter(c => c.last_service_date && new Date(c.last_service_date) > new Date(Date.now() - 30*24*60*60*1000)).length}
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-300">Error</p>
              <p className="text-sm text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Clients List */}
        {filteredClients.length > 0 ? (
          <div className="space-y-4">
            {filteredClients.map(client => (
              <div
                key={client.id}
                className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-sm border-2 border-slate-700 hover:border-blue-300 transition-all p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">
                      {client.customer_name}
                    </h3>

                    <div className="grid md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Phone className="w-4 h-4" />
                        <span>{client.phone}</span>
                      </div>

                      {client.email && (
                        <div className="flex items-center gap-2 text-slate-400">
                          <Mail className="w-4 h-4" />
                          <span>{client.email}</span>
                        </div>
                      )}

                      {client.address && (
                        <div className="flex items-center gap-2 text-slate-400">
                          <MapPin className="w-4 h-4" />
                          <span>{client.address}</span>
                        </div>
                      )}

                      {client.vehicle_info && (
                        <div className="flex items-center gap-2 text-slate-400">
                          <Car className="w-4 h-4" />
                          <span>
                            {client.vehicle_info.year} {client.vehicle_info.make} {client.vehicle_info.model}
                          </span>
                        </div>
                      )}
                    </div>

                    {client.notes && (
                      <p className="mt-3 text-sm text-slate-300 italic">{client.notes}</p>
                    )}

                    <div className="mt-4 flex items-center gap-6 text-sm">
                      <div>
                        <span className="text-slate-400">Total Jobs:</span>
                        <span className="ml-2 font-semibold text-white">{client.total_jobs}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Total Revenue:</span>
                        <span className="ml-2 font-semibold text-green-600">
                          ${client.total_revenue.toFixed(2)}
                        </span>
                      </div>
                      {client.last_service_date && (
                        <div>
                          <span className="text-slate-400">Last Service:</span>
                          <span className="ml-2 font-semibold text-white">
                            {new Date(client.last_service_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleDeleteClient(client.id)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-red-500/30"
                      title="Delete client"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-sm p-12 text-center">
            <Users className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {searchQuery ? 'No Clients Found' : 'No Clients Yet'}
            </h3>
            <p className="text-slate-400 mb-6">
              {searchQuery
                ? 'Try adjusting your search query.'
                : 'Add your first client to start managing your customer relationships.'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                <Plus className="w-5 h-5" />
                Add Your First Client
              </button>
            )}
          </div>
        )}

        {/* Add Client Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-800/50 backdrop-blur-sm">
                <h2 className="text-2xl font-bold text-white">Add New Client</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddClient} className="p-6 space-y-6">
                {/* Basic Info */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Customer Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.customer_name}
                        onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Preferred Contact
                      </label>
                      <select
                        value={formData.preferred_contact_method}
                        onChange={(e) => setFormData({ ...formData, preferred_contact_method: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="phone">Phone</option>
                        <option value="email">Email</option>
                        <option value="text">Text</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Address
                      </label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Vehicle Info */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Vehicle Information</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Make</label>
                      <input
                        type="text"
                        value={formData.vehicle_make}
                        onChange={(e) => setFormData({ ...formData, vehicle_make: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Model</label>
                      <input
                        type="text"
                        value={formData.vehicle_model}
                        onChange={(e) => setFormData({ ...formData, vehicle_model: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Year</label>
                      <input
                        type="number"
                        value={formData.vehicle_year}
                        onChange={(e) => setFormData({ ...formData, vehicle_year: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">VIN</label>
                      <input
                        type="text"
                        value={formData.vehicle_vin}
                        onChange={(e) => setFormData({ ...formData, vehicle_vin: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>

                {/* Submit */}
                <div className="flex items-center gap-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Adding Client...' : 'Add Client'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-6 py-3 text-slate-400 hover:bg-slate-700 rounded-lg transition-colors font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
