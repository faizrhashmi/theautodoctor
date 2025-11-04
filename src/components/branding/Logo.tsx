'use client'

import Image from 'next/image'
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
    sm: { container: 'h-12 w-12', imageSize: 48, text: 'text-base' },
    md: { container: 'h-14 w-14', imageSize: 56, text: 'text-xl' },
    lg: { container: 'h-18 w-18', imageSize: 72, text: 'text-2xl' },
  }

  const currentSize = sizes[size]

  const gradients = {
    default: 'from-orange-500 via-orange-600 to-red-600',
    customer: 'from-orange-500 to-red-600',
    minimal: 'from-slate-700 to-slate-800',
  }

  const logoContent = (
    <div className="flex items-center gap-2 sm:gap-3 group">
      {/* Logo Image Container with Premium Glow Effect */}
      <div className={`relative flex items-center justify-center ${currentSize.container}`}>
        {/* Ambient glow effect - represents connection and energy */}
        <div className={`absolute inset-0 rounded-full bg-gradient-to-r from-orange-500/20 via-orange-400/20 to-amber-500/20 blur-xl opacity-60 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500`} />

        {/* Logo Image - Full Size */}
        <div className="relative w-full h-full flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
          <Image
            src="/app-logo.png"
            alt="AskAutoDoctor Logo"
            width={currentSize.imageSize}
            height={currentSize.imageSize}
            className="object-contain"
            priority
          />
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
