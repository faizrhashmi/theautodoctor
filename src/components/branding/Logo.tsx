'use client'

import { Car, Wrench, Zap } from 'lucide-react'
import Link from 'next/link'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  href?: string
  variant?: 'default' | 'customer' | 'minimal'
}

export default function Logo({
  size = 'md',
  showText = true,
  href = '/',
  variant = 'default'
}: LogoProps) {
  const sizes = {
    sm: { container: 'h-8 w-8', icon: 'h-4 w-4', text: 'text-base' },
    md: { container: 'h-10 w-10', icon: 'h-5 w-5', text: 'text-xl' },
    lg: { container: 'h-14 w-14', icon: 'h-7 w-7', text: 'text-2xl' },
  }

  const currentSize = sizes[size]

  const gradients = {
    default: 'from-orange-500 via-orange-600 to-red-600',
    customer: 'from-orange-500 to-red-600',
    minimal: 'from-slate-700 to-slate-800',
  }

  const logoContent = (
    <div className="flex items-center gap-2 sm:gap-3 group">
      {/* Icon Container with Gradient */}
      <div className={`flex ${currentSize.container} items-center justify-center rounded-xl bg-gradient-to-br ${gradients[variant]} shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 relative overflow-hidden`}>
        {/* Animated shine effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Stacked Icons for depth */}
        <div className="relative">
          <Car className={`${currentSize.icon} text-white relative z-10`} />
          <Wrench className={`${currentSize.icon} text-white/30 absolute top-0 left-0 translate-x-1 translate-y-1`} />
          <Zap className={`${currentSize.icon} text-white/40 absolute -top-0.5 -right-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
        </div>
      </div>

      {/* Brand Text */}
      {showText && (
        <div className="flex flex-col">
          <span className={`${currentSize.text} font-bold bg-gradient-to-r from-orange-500 via-orange-400 to-amber-500 bg-clip-text text-transparent leading-none`}>
            AskAutoDoctor
          </span>
          {size === 'lg' && (
            <span className="text-xs text-slate-400 font-medium tracking-wide">
              Expert Diagnostics
            </span>
          )}
        </div>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="inline-block">
        {logoContent}
      </Link>
    )
  }

  return logoContent
}
