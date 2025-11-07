/**
 * Vehicle Brands - Comprehensive List
 * Organized by popularity and market presence in the US
 */

export interface VehicleBrand {
  value: string
  label: string
  group: 'Popular' | 'Luxury' | 'Import' | 'Domestic' | 'Other'
}

export const VEHICLE_BRANDS: VehicleBrand[] = [
  // Popular (Most Common)
  { value: 'toyota', label: 'Toyota', group: 'Popular' },
  { value: 'honda', label: 'Honda', group: 'Popular' },
  { value: 'ford', label: 'Ford', group: 'Popular' },
  { value: 'chevrolet', label: 'Chevrolet', group: 'Popular' },
  { value: 'nissan', label: 'Nissan', group: 'Popular' },
  { value: 'jeep', label: 'Jeep', group: 'Popular' },
  { value: 'ram', label: 'Ram', group: 'Popular' },
  { value: 'gmc', label: 'GMC', group: 'Popular' },
  { value: 'hyundai', label: 'Hyundai', group: 'Popular' },
  { value: 'subaru', label: 'Subaru', group: 'Popular' },
  { value: 'kia', label: 'Kia', group: 'Popular' },
  { value: 'mazda', label: 'Mazda', group: 'Popular' },

  // Luxury
  { value: 'bmw', label: 'BMW', group: 'Luxury' },
  { value: 'mercedes-benz', label: 'Mercedes-Benz', group: 'Luxury' },
  { value: 'audi', label: 'Audi', group: 'Luxury' },
  { value: 'lexus', label: 'Lexus', group: 'Luxury' },
  { value: 'tesla', label: 'Tesla', group: 'Luxury' },
  { value: 'cadillac', label: 'Cadillac', group: 'Luxury' },
  { value: 'porsche', label: 'Porsche', group: 'Luxury' },
  { value: 'land-rover', label: 'Land Rover', group: 'Luxury' },
  { value: 'jaguar', label: 'Jaguar', group: 'Luxury' },
  { value: 'genesis', label: 'Genesis', group: 'Luxury' },
  { value: 'infiniti', label: 'Infiniti', group: 'Luxury' },
  { value: 'acura', label: 'Acura', group: 'Luxury' },
  { value: 'lincoln', label: 'Lincoln', group: 'Luxury' },
  { value: 'volvo', label: 'Volvo', group: 'Luxury' },
  { value: 'alfa-romeo', label: 'Alfa Romeo', group: 'Luxury' },
  { value: 'maserati', label: 'Maserati', group: 'Luxury' },
  { value: 'bentley', label: 'Bentley', group: 'Luxury' },
  { value: 'rolls-royce', label: 'Rolls-Royce', group: 'Luxury' },
  { value: 'aston-martin', label: 'Aston Martin', group: 'Luxury' },
  { value: 'lamborghini', label: 'Lamborghini', group: 'Luxury' },
  { value: 'ferrari', label: 'Ferrari', group: 'Luxury' },
  { value: 'mclaren', label: 'McLaren', group: 'Luxury' },

  // Import
  { value: 'volkswagen', label: 'Volkswagen', group: 'Import' },
  { value: 'mitsubishi', label: 'Mitsubishi', group: 'Import' },
  { value: 'mini', label: 'MINI', group: 'Import' },
  { value: 'fiat', label: 'Fiat', group: 'Import' },
  { value: 'smart', label: 'Smart', group: 'Import' },
  { value: 'polestar', label: 'Polestar', group: 'Import' },

  // Domestic
  { value: 'dodge', label: 'Dodge', group: 'Domestic' },
  { value: 'chrysler', label: 'Chrysler', group: 'Domestic' },
  { value: 'buick', label: 'Buick', group: 'Domestic' },

  // Other / Classic / Discontinued
  { value: 'pontiac', label: 'Pontiac', group: 'Other' },
  { value: 'saturn', label: 'Saturn', group: 'Other' },
  { value: 'mercury', label: 'Mercury', group: 'Other' },
  { value: 'hummer', label: 'Hummer', group: 'Other' },
  { value: 'saab', label: 'Saab', group: 'Other' },
  { value: 'scion', label: 'Scion', group: 'Other' },
  { value: 'oldsmobile', label: 'Oldsmobile', group: 'Other' },
  { value: 'plymouth', label: 'Plymouth', group: 'Other' },
  { value: 'geo', label: 'Geo', group: 'Other' },
  { value: 'isuzu', label: 'Isuzu', group: 'Other' },
  { value: 'daewoo', label: 'Daewoo', group: 'Other' },
  { value: 'suzuki', label: 'Suzuki', group: 'Other' },
  { value: 'fisker', label: 'Fisker', group: 'Other' },
  { value: 'lucid', label: 'Lucid', group: 'Other' },
  { value: 'rivian', label: 'Rivian', group: 'Other' },
  { value: 'other', label: 'Other / Not Listed', group: 'Other' },
]

/**
 * Get brands grouped by category for react-select
 */
export function getGroupedBrands() {
  const groups: Record<VehicleBrand['group'], VehicleBrand[]> = {
    Popular: [],
    Luxury: [],
    Import: [],
    Domestic: [],
    Other: []
  }

  VEHICLE_BRANDS.forEach(brand => {
    groups[brand.group].push(brand)
  })

  return [
    { label: 'Popular Brands', options: groups.Popular },
    { label: 'Luxury Brands', options: groups.Luxury },
    { label: 'Import Brands', options: groups.Import },
    { label: 'Domestic Brands', options: groups.Domestic },
    { label: 'Other Brands', options: groups.Other }
  ]
}

/**
 * Get brand label by value
 */
export function getBrandLabel(value: string): string {
  const brand = VEHICLE_BRANDS.find(b => b.value === value)
  return brand?.label || value
}
