/**
 * Concern Categories - Industry Standard
 * Based on analysis of RepairPal, YourMechanic, and Tesla Service
 */

export interface ConcernCategory {
  id: string
  name: string
  slug: string
  icon: string
  color: string
  bgColor: string
  borderColor: string
  description: string
  subCategories?: SubCategory[]
}

export interface SubCategory {
  id: string
  name: string
  slug: string
}

export const CONCERN_CATEGORIES: ConcernCategory[] = [
  {
    id: '1',
    name: 'Maintenance',
    slug: 'maintenance',
    icon: '🔧',
    color: '#3B82F6',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500',
    description: 'Regular service, oil change, tune-up',
    subCategories: [
      { id: '1-1', name: 'Oil Change', slug: 'oil-change' },
      { id: '1-2', name: 'Tire Rotation', slug: 'tire-rotation' },
      { id: '1-3', name: 'Air Filter', slug: 'air-filter' },
      { id: '1-4', name: 'Spark Plugs', slug: 'spark-plugs' },
      { id: '1-5', name: 'Scheduled Maintenance', slug: 'scheduled-maintenance' },
    ]
  },
  {
    id: '2',
    name: 'Warning Light',
    slug: 'warning-light',
    icon: '⚠️',
    color: '#F59E0B',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500',
    description: 'Dashboard warning or indicator light',
    subCategories: [
      { id: '2-1', name: 'Check Engine Light (CEL)', slug: 'check-engine' },
      { id: '2-2', name: 'ABS / Brake Warning', slug: 'abs-warning' },
      { id: '2-3', name: 'Battery / Charging System', slug: 'battery-warning' },
      { id: '2-4', name: 'Oil Pressure / Engine Oil', slug: 'oil-warning' },
      { id: '2-5', name: 'Tire Pressure (TPMS)', slug: 'tpms-warning' },
      { id: '2-6', name: 'Airbag / SRS', slug: 'airbag-warning' },
      { id: '2-7', name: 'Traction Control / Stability', slug: 'traction-warning' },
      { id: '2-8', name: 'Coolant Temperature', slug: 'coolant-warning' },
      { id: '2-9', name: 'Other / Not Sure', slug: 'other-warning' },
    ]
  },
  {
    id: '3',
    name: 'Strange Noise',
    slug: 'strange-noise',
    icon: '🔊',
    color: '#8B5CF6',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500',
    description: 'Unusual sounds from engine, brakes, etc.',
    subCategories: [
      { id: '3-1', name: 'Squeaking / Squealing', slug: 'squeaking' },
      { id: '3-2', name: 'Grinding', slug: 'grinding' },
      { id: '3-3', name: 'Knocking / Tapping', slug: 'knocking' },
      { id: '3-4', name: 'Rattling', slug: 'rattling' },
      { id: '3-5', name: 'Clicking', slug: 'clicking' },
      { id: '3-6', name: 'Hissing / Whistling', slug: 'hissing' },
    ]
  },
  {
    id: '4',
    name: 'Performance',
    slug: 'performance',
    icon: '🚗',
    color: '#10B981',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500',
    description: 'Engine performance, acceleration issues',
    subCategories: [
      { id: '4-1', name: 'Loss of Power', slug: 'loss-of-power' },
      { id: '4-2', name: 'Rough Idle', slug: 'rough-idle' },
      { id: '4-3', name: 'Stalling', slug: 'stalling' },
      { id: '4-4', name: 'Hard to Start', slug: 'hard-start' },
      { id: '4-5', name: 'Poor Fuel Economy', slug: 'poor-mpg' },
      { id: '4-6', name: 'Hesitation / Surging', slug: 'hesitation' },
    ]
  },
  {
    id: '5',
    name: 'AC or Heat',
    slug: 'ac-heat',
    icon: '❄️',
    color: '#06B6D4',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500',
    description: 'Climate control not working properly',
    subCategories: [
      { id: '5-1', name: 'AC Not Blowing Cold', slug: 'ac-not-cold' },
      { id: '5-2', name: 'Heat Not Working', slug: 'heat-not-working' },
      { id: '5-3', name: 'AC Compressor Noise', slug: 'ac-compressor' },
      { id: '5-4', name: 'Weak Airflow', slug: 'weak-airflow' },
      { id: '5-5', name: 'Bad Smell from Vents', slug: 'bad-smell' },
    ]
  },
  {
    id: '6',
    name: 'Electrical',
    slug: 'electrical',
    icon: '🔋',
    color: '#EAB308',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500',
    description: 'Battery, alternator, electrical system',
    subCategories: [
      { id: '6-1', name: 'Dead Battery', slug: 'dead-battery' },
      { id: '6-2', name: 'Battery Won\'t Hold Charge', slug: 'battery-discharge' },
      { id: '6-3', name: 'Alternator Issue', slug: 'alternator' },
      { id: '6-4', name: 'Starter Problem', slug: 'starter' },
      { id: '6-5', name: 'Lights Not Working', slug: 'lights' },
      { id: '6-6', name: 'Electrical Short', slug: 'electrical-short' },
    ]
  },
  {
    id: '7',
    name: 'Tires or Brakes',
    slug: 'tires-brakes',
    icon: '🛞',
    color: '#EF4444',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500',
    description: 'Brake problems, tire issues',
    subCategories: [
      { id: '7-1', name: 'Brake Noise', slug: 'brake-noise' },
      { id: '7-2', name: 'Soft / Spongy Brakes', slug: 'soft-brakes' },
      { id: '7-3', name: 'Brake Pedal Vibration', slug: 'brake-vibration' },
      { id: '7-4', name: 'Tire Wear', slug: 'tire-wear' },
      { id: '7-5', name: 'Flat Tire', slug: 'flat-tire' },
      { id: '7-6', name: 'Tire Pressure Issue', slug: 'tire-pressure' },
    ]
  },
  {
    id: '8',
    name: 'Fluid Leak',
    slug: 'fluid-leak',
    icon: '💧',
    color: '#0EA5E9',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500',
    description: 'Oil, coolant, or other fluid leaking',
    subCategories: [
      { id: '8-1', name: 'Oil Leak', slug: 'oil-leak' },
      { id: '8-2', name: 'Coolant Leak', slug: 'coolant-leak' },
      { id: '8-3', name: 'Transmission Fluid Leak', slug: 'trans-leak' },
      { id: '8-4', name: 'Brake Fluid Leak', slug: 'brake-leak' },
      { id: '8-5', name: 'Power Steering Leak', slug: 'ps-leak' },
      { id: '8-6', name: 'Not Sure What\'s Leaking', slug: 'unknown-leak' },
    ]
  },
  {
    id: '9',
    name: 'Body or Paint',
    slug: 'body-paint',
    icon: '🚙',
    color: '#6B7280',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500',
    description: 'Dents, scratches, rust, body work',
  },
  {
    id: '10',
    name: 'Tech/Infotainment',
    slug: 'tech',
    icon: '📱',
    color: '#EC4899',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500',
    description: 'Radio, navigation, Bluetooth, screens',
    subCategories: [
      { id: '10-1', name: 'Screen Not Working', slug: 'screen-issue' },
      { id: '10-2', name: 'Bluetooth Won\'t Connect', slug: 'bluetooth' },
      { id: '10-3', name: 'Navigation Issue', slug: 'navigation' },
      { id: '10-4', name: 'Backup Camera', slug: 'backup-camera' },
      { id: '10-5', name: 'Radio / Audio', slug: 'radio' },
    ]
  },
  {
    id: '11',
    name: 'Keys or Locks',
    slug: 'keys-locks',
    icon: '🔑',
    color: '#14B8A6',
    bgColor: 'bg-teal-500/10',
    borderColor: 'border-teal-500',
    description: 'Key fob, door locks, trunk issues',
    subCategories: [
      { id: '11-1', name: 'Key Fob Not Working', slug: 'key-fob' },
      { id: '11-2', name: 'Door Won\'t Lock/Unlock', slug: 'door-lock' },
      { id: '11-3', name: 'Trunk Won\'t Open', slug: 'trunk' },
      { id: '11-4', name: 'Lost Key', slug: 'lost-key' },
    ]
  },
  {
    id: '12',
    name: 'Fuel System',
    slug: 'fuel-system',
    icon: '⛽',
    color: '#F97316',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500',
    description: 'Fuel pump, gas smell, fill issues',
    subCategories: [
      { id: '12-1', name: 'Smell Gas', slug: 'gas-smell' },
      { id: '12-2', name: 'Can\'t Fill Tank', slug: 'fill-issue' },
      { id: '12-3', name: 'Fuel Pump', slug: 'fuel-pump' },
      { id: '12-4', name: 'Gas Cap / Evap', slug: 'evap' },
    ]
  },
  {
    id: '13',
    name: 'Other / Multiple',
    slug: 'other',
    icon: '📝',
    color: '#64748B',
    bgColor: 'bg-slate-500/10',
    borderColor: 'border-slate-500',
    description: 'Multiple issues or something else',
  },
]

/**
 * Get category by slug
 */
export function getCategoryBySlug(slug: string): ConcernCategory | undefined {
  return CONCERN_CATEGORIES.find(cat => cat.slug === slug)
}

/**
 * Get sub-category by slug
 */
export function getSubCategoryBySlug(categorySlug: string, subCategorySlug: string): SubCategory | undefined {
  const category = getCategoryBySlug(categorySlug)
  return category?.subCategories?.find(sub => sub.slug === subCategorySlug)
}

/**
 * Get templates for specific concerns (to pre-fill description field)
 */
export function getConcernTemplate(categorySlug: string, subCategorySlug?: string): string {
  const templates: Record<string, string> = {
    'check-engine': `My check engine light came on recently. It is steady/blinking (please specify). I first noticed it [when]. The car is running normally/has issues (please describe any symptoms like rough idle, loss of power, unusual sounds, etc.).`,

    'oil-leak': `I noticed an oil leak under my vehicle in the [location - front/center/rear]. There is a small spot/puddle of fluid (please specify). I first noticed it [when]. The car is/isn't losing oil quickly (please specify).`,

    'brake-noise': `My brakes are making a squealing/grinding/clicking sound (please specify). It happens when stopping/turning/both (please specify). This started [when]. The braking performance is normal/reduced (please specify).`,

    'ac-not-cold': `My AC is not blowing cold air. It is blowing warm air/not blowing at all (please specify). This started [when]. There is/isn't any unusual smell or noise (please describe if present).`,

    'dead-battery': `My battery is dead or won't hold a charge. The battery is [age] old. The car won't start/starts with jump/starts but dies (please specify). This started happening [when]. There are/aren't any other electrical issues (please describe if present).`,

    // Add more templates based on sub-category slugs
    'abs': `My ABS light is on. It came on [when]. The brakes are working normally/feel different (please specify). There is/isn't a warning message on the dashboard (please describe).`,

    'battery-light': `My battery warning light is on. It came on [when]. The car is running normally/having electrical issues (please describe any symptoms). The battery is [age] old.`,

    'oil-change': `I need an oil change. The car has [mileage] miles. Last oil change was [when]. Using conventional/synthetic oil (please specify).`,

    'squeaking': `I hear a squeaking noise from my car. It happens when driving/turning/braking (please specify). The sound is coming from [location]. This started [when].`,
  }

  if (subCategorySlug && templates[subCategorySlug]) {
    return templates[subCategorySlug]
  }

  // Default template - clean and simple
  return `Please describe your concern in detail, including what's happening, when it started, and any other symptoms you've noticed.`
}
