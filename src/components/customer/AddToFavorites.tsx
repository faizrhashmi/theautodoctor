'use client'

import { useState } from 'react'

interface AddToFavoritesProps {
  customerId: string
  providerId: string
  providerName: string
  providerType: 'workshop' | 'independent'
  isFavorited?: boolean
  onFavoriteChange?: (isFavorited: boolean) => void
}

export default function AddToFavorites({
  customerId,
  providerId,
  providerName,
  providerType,
  isFavorited = false,
  onFavoriteChange
}: AddToFavoritesProps) {
  const [favorited, setFavorited] = useState(isFavorited)
  const [loading, setLoading] = useState(false)

  async function toggleFavorite() {
    setLoading(true)

    try {
      if (favorited) {
        // Remove from favorites
        // Note: We'd need to store the favorite_id to do this properly
        // For now, this is a placeholder
        alert('Remove from favorites functionality needs favorite_id')
        setLoading(false)
        return
      } else {
        // Add to favorites
        const response = await fetch('/api/customer/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_id: customerId,
            provider_id: providerId,
            provider_type: providerType
          })
        })

        if (response.ok) {
          setFavorited(true)
          onFavoriteChange?.(true)
        } else {
          const error = await response.json()
          alert(error.error || 'Failed to add to favorites')
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
      alert('Failed to update favorites')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggleFavorite}
      disabled={loading}
      className={`inline-flex items-center px-4 py-2 border rounded-lg font-medium transition-colors ${
        favorited
          ? 'border-red-500 text-red-700 bg-red-50 hover:bg-red-100'
          : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
      title={favorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <svg
        className={`w-5 h-5 mr-2 ${favorited ? 'fill-current' : 'stroke-current'}`}
        fill={favorited ? 'currentColor' : 'none'}
        stroke={favorited ? 'none' : 'currentColor'}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
      {loading ? 'Processing...' : favorited ? 'Favorited' : 'Add to Favorites'}
    </button>
  )
}
