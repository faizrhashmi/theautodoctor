'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Award, Wrench, Star, Shield, Briefcase, CheckCircle, Loader2 } from 'lucide-react'

interface MechanicProfile {
  id: string
  name: string
  aboutMe: string | null
  rating: number | null
  yearsOfExperience: number | null
  specializations: string[]
  isBrandSpecialist: boolean
  brandSpecializations: string[]
  specialistTier: string | null
  redSealCertified: boolean
  shopAffiliation: string | null
  completedSessions: number
}

interface MechanicProfileModalProps {
  mechanicId: string
  isOpen: boolean
  onClose: () => void
}

export default function MechanicProfileModal({
  mechanicId,
  isOpen,
  onClose,
}: MechanicProfileModalProps) {
  const [profile, setProfile] = useState<MechanicProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && mechanicId) {
      fetchProfile()
    }
  }, [isOpen, mechanicId])

  const fetchProfile = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/mechanic/profile/${mechanicId}`)
      if (!response.ok) {
        throw new Error('Failed to load mechanic profile')
      }
      const data = await response.json()
      setProfile(data.profile)
    } catch (err) {
      console.error('Error fetching mechanic profile:', err)
      setError('Unable to load mechanic profile')
    } finally {
      setLoading(false)
    }
  }

  const renderStars = (rating: number) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
        )
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <div key={i} className="relative h-4 w-4">
            <Star className="h-4 w-4 text-slate-600" />
            <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            </div>
          </div>
        )
      } else {
        stars.push(<Star key={i} className="h-4 w-4 text-slate-600" />)
      }
    }
    return stars
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg mx-auto z-10"
          >
            <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-slate-700 rounded-2xl shadow-2xl max-h-[85vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="relative px-5 py-4 border-b border-slate-700 bg-gradient-to-r from-orange-500/10 to-slate-900/50">
                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 p-2 hover:bg-slate-800/50 rounded-lg transition-colors touch-manipulation z-10"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-slate-300" />
                </button>

                <div className="flex items-center gap-3 pr-10">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-500/20 border-2 border-orange-500/30">
                    <Wrench className="h-7 w-7 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {loading ? 'Loading...' : profile?.name || 'Mechanic Profile'}
                    </h3>
                    {profile?.shopAffiliation && (
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Briefcase className="h-3 w-3" />
                        {profile.shopAffiliation}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Content - Scrollable */}
              <div className="overflow-y-auto p-5 space-y-4">
                {loading && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="h-10 w-10 animate-spin text-orange-400 mb-3" />
                    <p className="text-sm text-slate-400">Loading profile...</p>
                  </div>
                )}

                {error && (
                  <div className="rounded-xl border border-rose-400/50 bg-rose-500/10 p-4 text-center">
                    <p className="text-sm text-rose-300">{error}</p>
                  </div>
                )}

                {!loading && !error && profile && (
                  <>
                    {/* Rating & Experience */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Rating */}
                      {profile.rating !== null && (
                        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Star className="h-4 w-4 text-yellow-400" />
                            <span className="text-xs font-semibold text-slate-400 uppercase">Rating</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-white">
                              {profile.rating.toFixed(1)}
                            </span>
                            <div className="flex gap-0.5">
                              {renderStars(profile.rating)}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Experience */}
                      {profile.yearsOfExperience !== null && (
                        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Award className="h-4 w-4 text-blue-400" />
                            <span className="text-xs font-semibold text-slate-400 uppercase">Experience</span>
                          </div>
                          <p className="text-2xl font-bold text-white">
                            {profile.yearsOfExperience}
                            <span className="text-sm font-normal text-slate-400 ml-1">
                              {profile.yearsOfExperience === 1 ? 'year' : 'years'}
                            </span>
                          </p>
                        </div>
                      )}

                      {/* Completed Sessions */}
                      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-4 w-4 text-green-400" />
                          <span className="text-xs font-semibold text-slate-400 uppercase">Sessions</span>
                        </div>
                        <p className="text-2xl font-bold text-white">
                          {profile.completedSessions}
                        </p>
                      </div>
                    </div>

                    {/* Red Seal Badge */}
                    {profile.redSealCertified && (
                      <div className="rounded-xl border-2 border-red-500/30 bg-gradient-to-r from-red-500/10 to-orange-500/10 p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
                            <Shield className="h-6 w-6 text-red-400" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">Red Seal Certified</p>
                            <p className="text-xs text-slate-400">Nationally recognized professional</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Brand Specialist */}
                    {profile.isBrandSpecialist && profile.brandSpecializations.length > 0 && (
                      <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Award className="h-4 w-4 text-orange-400" />
                          <span className="text-sm font-bold text-orange-200">
                            Brand Specialist
                            {profile.specialistTier && (
                              <span className="ml-2 text-xs font-normal text-orange-300/80">
                                ({profile.specialistTier})
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {profile.brandSpecializations.map((brand, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1.5 rounded-full bg-orange-500/20 border border-orange-500/30 text-xs font-medium text-orange-100"
                            >
                              {brand}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* About Me */}
                    {profile.aboutMe && (
                      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
                        <h4 className="text-sm font-bold text-white mb-2">About</h4>
                        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {profile.aboutMe}
                        </p>
                      </div>
                    )}

                    {/* Specializations */}
                    {profile.specializations.length > 0 && (
                      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Wrench className="h-4 w-4 text-blue-400" />
                          <h4 className="text-sm font-bold text-white">Specializations</h4>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {profile.specializations.map((spec, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1.5 rounded-lg bg-slate-700/50 border border-slate-600 text-xs font-medium text-slate-200"
                            >
                              {spec}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* No Data Message */}
                    {!profile.aboutMe &&
                      profile.specializations.length === 0 &&
                      !profile.isBrandSpecialist &&
                      !profile.redSealCertified && (
                        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 text-center">
                          <p className="text-sm text-slate-400">
                            This mechanic hasn&apos;t completed their profile yet.
                          </p>
                        </div>
                      )}
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
