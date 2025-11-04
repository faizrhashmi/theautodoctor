import { Car } from 'lucide-react'

interface CarBrandLogoProps {
  brand: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10'
}

// Car brand color schemes for better visual representation
const brandColors: Record<string, string> = {
  toyota: 'text-red-500',
  honda: 'text-blue-600',
  ford: 'text-blue-700',
  chevrolet: 'text-amber-500',
  bmw: 'text-blue-500',
  mercedes: 'text-slate-300',
  'mercedes-benz': 'text-slate-300',
  audi: 'text-red-600',
  volkswagen: 'text-blue-600',
  nissan: 'text-slate-400',
  mazda: 'text-red-600',
  subaru: 'text-blue-600',
  hyundai: 'text-blue-700',
  kia: 'text-red-600',
  lexus: 'text-slate-400',
  acura: 'text-slate-400',
  infiniti: 'text-slate-500',
  jeep: 'text-green-700',
  dodge: 'text-red-700',
  ram: 'text-slate-500',
  chrysler: 'text-blue-800',
  gmc: 'text-red-600',
  buick: 'text-slate-500',
  cadillac: 'text-amber-600',
  tesla: 'text-red-600',
  volvo: 'text-blue-700',
  porsche: 'text-amber-600',
  'land rover': 'text-green-700',
  jaguar: 'text-slate-500',
  mini: 'text-slate-700',
  fiat: 'text-red-600',
  alfa: 'text-red-700',
  'alfa romeo': 'text-red-700',
  mitsubishi: 'text-red-700',
  suzuki: 'text-blue-600',
  genesis: 'text-slate-600'
}

// Don't try to recreate brand logos - just use the generic car icon
// The brand colors will differentiate them
const BrandIcons: Record<string, React.FC<{ className?: string }>> = {}

export default function CarBrandLogo({ brand, size = 'md', className = '' }: CarBrandLogoProps) {
  const normalizedBrand = brand.toLowerCase().trim()

  // Check if we have a custom icon for this brand
  const BrandIcon = BrandIcons[normalizedBrand] || BrandIcons[normalizedBrand.replace('-', ' ')]

  // Get the brand color or use default
  const colorClass = brandColors[normalizedBrand] || brandColors[normalizedBrand.replace('-', ' ')] || 'text-slate-400'

  const sizeClass = sizeClasses[size]

  if (BrandIcon) {
    return <BrandIcon className={`${sizeClass} ${colorClass} ${className}`} />
  }

  // Fallback to generic car icon with brand-specific coloring
  return <Car className={`${sizeClass} ${colorClass} ${className}`} />
}
