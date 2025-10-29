/**
 * Concern Categories - Virtual Mechanic Focused
 * Optimized for remote diagnostics, education, and guidance
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
  // DIAGNOSTIC HELP
  {
    id: '1',
    name: 'Diagnostic Help',
    slug: 'diagnostic-help',
    icon: '🔍',
    color: '#F59E0B',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500',
    description: 'Decode warning lights, error codes, or symptoms',
    subCategories: [
      { id: '1-1', name: 'Check Engine Light (CEL)', slug: 'check-engine' },
      { id: '1-2', name: 'Scan Code Analysis', slug: 'scan-code' },
      { id: '1-3', name: 'Warning Light Explanation', slug: 'warning-light' },
      { id: '1-4', name: 'Symptom Diagnosis', slug: 'symptom-diagnosis' },
      { id: '1-5', name: 'Strange Noise Analysis', slug: 'noise-analysis' },
      { id: '1-6', name: 'Performance Issue Diagnosis', slug: 'performance-diagnosis' },
    ]
  },

  // SECOND OPINION
  {
    id: '2',
    name: 'Second Opinion',
    slug: 'second-opinion',
    icon: '💭',
    color: '#3B82F6',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500',
    description: 'Review repair quotes and get unbiased advice',
    subCategories: [
      { id: '2-1', name: 'Quote Review - Is This Fair?', slug: 'quote-review' },
      { id: '2-2', name: 'Prioritize Multiple Repairs', slug: 'prioritize-repairs' },
      { id: '2-3', name: 'Do I Really Need This?', slug: 'need-verification' },
      { id: '2-4', name: 'Alternative Solutions', slug: 'alternatives' },
      { id: '2-5', name: 'Cost Breakdown Explanation', slug: 'cost-breakdown' },
      { id: '2-6', name: 'Dealer vs Independent Shop', slug: 'shop-comparison' },
    ]
  },

  // DIY GUIDANCE
  {
    id: '3',
    name: 'DIY Guidance',
    slug: 'diy-guidance',
    icon: '🛠️',
    color: '#10B981',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500',
    description: 'Get expert help to fix it yourself',
    subCategories: [
      { id: '3-1', name: 'Step-by-Step Repair Help', slug: 'step-by-step' },
      { id: '3-2', name: 'Tool Recommendations', slug: 'tool-recommendations' },
      { id: '3-3', name: 'Parts Identification', slug: 'parts-identification' },
      { id: '3-4', name: 'Safety Checks & Tips', slug: 'safety-tips' },
      { id: '3-5', name: 'Verify My DIY Fix', slug: 'verify-fix' },
      { id: '3-6', name: 'Maintenance Schedule', slug: 'maintenance-schedule' },
    ]
  },

  // PRE-PURCHASE INSPECTION
  {
    id: '4',
    name: 'Pre-Purchase',
    slug: 'pre-purchase',
    icon: '🔎',
    color: '#8B5CF6',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500',
    description: 'Buying a car? Get expert advice first',
    subCategories: [
      { id: '4-1', name: 'What to Check/Inspect', slug: 'inspection-checklist' },
      { id: '4-2', name: 'Review Inspection Report', slug: 'review-report' },
      { id: '4-3', name: 'Fair Price Assessment', slug: 'price-assessment' },
      { id: '4-4', name: 'Red Flags to Look For', slug: 'red-flags' },
      { id: '4-5', name: 'Is This Car Worth It?', slug: 'car-evaluation' },
      { id: '4-6', name: 'Used Car Questions', slug: 'used-car-questions' },
    ]
  },

  // SYSTEM EDUCATION
  {
    id: '5',
    name: 'Learn About Your Car',
    slug: 'education',
    icon: '📖',
    color: '#06B6D4',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500',
    description: 'Understand how your vehicle works',
    subCategories: [
      { id: '5-1', name: 'How Does [System] Work?', slug: 'system-explanation' },
      { id: '5-2', name: 'What Does This Part Do?', slug: 'part-function' },
      { id: '5-3', name: 'Maintenance Schedule Advice', slug: 'maintenance-advice' },
      { id: '5-4', name: 'Preventive Care Tips', slug: 'preventive-care' },
      { id: '5-5', name: 'Understanding Dashboard', slug: 'dashboard-guide' },
      { id: '5-6', name: 'Fluid & Filter Guide', slug: 'fluids-filters' },
    ]
  },

  // TECH/INFOTAINMENT
  {
    id: '6',
    name: 'Tech/Infotainment',
    slug: 'tech',
    icon: '📱',
    color: '#EC4899',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500',
    description: 'Screen, Bluetooth, nav, or electronics',
    subCategories: [
      { id: '6-1', name: 'Bluetooth Won\'t Connect', slug: 'bluetooth' },
      { id: '6-2', name: 'Screen Not Working', slug: 'screen-issue' },
      { id: '6-3', name: 'Navigation Issues', slug: 'navigation' },
      { id: '6-4', name: 'Backup Camera Problems', slug: 'backup-camera' },
      { id: '6-5', name: 'Radio / Audio System', slug: 'radio' },
      { id: '6-6', name: 'Key Fob Programming', slug: 'key-fob' },
      { id: '6-7', name: 'USB/Charging Ports', slug: 'usb-charging' },
    ]
  },

  // WARNING LIGHTS & CODES
  {
    id: '7',
    name: 'Warning Lights',
    slug: 'warning-lights',
    icon: '⚠️',
    color: '#EF4444',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500',
    description: 'Dashboard lights and what they mean',
    subCategories: [
      { id: '7-1', name: 'Check Engine Light', slug: 'cel' },
      { id: '7-2', name: 'ABS / Brake Warning', slug: 'abs-warning' },
      { id: '7-3', name: 'Battery / Charging Light', slug: 'battery-warning' },
      { id: '7-4', name: 'Oil Pressure Warning', slug: 'oil-warning' },
      { id: '7-5', name: 'Tire Pressure (TPMS)', slug: 'tpms' },
      { id: '7-6', name: 'Airbag / SRS Light', slug: 'airbag' },
      { id: '7-7', name: 'Coolant Temperature', slug: 'coolant' },
      { id: '7-8', name: 'Other Warning Light', slug: 'other-warning' },
    ]
  },

  // PERFORMANCE ISSUES
  {
    id: '8',
    name: 'Performance',
    slug: 'performance',
    icon: '⚡',
    color: '#F97316',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500',
    description: 'Engine, acceleration, or power issues',
    subCategories: [
      { id: '8-1', name: 'Loss of Power', slug: 'loss-of-power' },
      { id: '8-2', name: 'Rough Idle / Stalling', slug: 'rough-idle' },
      { id: '8-3', name: 'Hard to Start', slug: 'hard-start' },
      { id: '8-4', name: 'Poor Fuel Economy', slug: 'poor-mpg' },
      { id: '8-5', name: 'Hesitation / Surging', slug: 'hesitation' },
      { id: '8-6', name: 'Transmission Issues', slug: 'transmission' },
    ]
  },

  // STRANGE NOISES
  {
    id: '9',
    name: 'Strange Noise',
    slug: 'strange-noise',
    icon: '🔊',
    color: '#14B8A6',
    bgColor: 'bg-teal-500/10',
    borderColor: 'border-teal-500',
    description: 'Unusual sounds - let\'s identify them',
    subCategories: [
      { id: '9-1', name: 'Squeaking / Squealing', slug: 'squeaking' },
      { id: '9-2', name: 'Grinding / Scraping', slug: 'grinding' },
      { id: '9-3', name: 'Knocking / Tapping', slug: 'knocking' },
      { id: '9-4', name: 'Rattling / Vibration', slug: 'rattling' },
      { id: '9-5', name: 'Clicking / Ticking', slug: 'clicking' },
      { id: '9-6', name: 'Hissing / Whistling', slug: 'hissing' },
    ]
  },

  // BRAKES & STOPPING
  {
    id: '10',
    name: 'Brakes & Stopping',
    slug: 'brakes',
    icon: '🛑',
    color: '#DC2626',
    bgColor: 'bg-red-600/10',
    borderColor: 'border-red-600',
    description: 'Brake problems or safety concerns',
    subCategories: [
      { id: '10-1', name: 'Brake Noise', slug: 'brake-noise' },
      { id: '10-2', name: 'Soft / Spongy Brakes', slug: 'soft-brakes' },
      { id: '10-3', name: 'Pedal Vibration/Pulsing', slug: 'brake-vibration' },
      { id: '10-4', name: 'Parking Brake Issue', slug: 'parking-brake' },
      { id: '10-5', name: 'Brake Maintenance Advice', slug: 'brake-maintenance' },
    ]
  },

  // ELECTRICAL SYSTEM
  {
    id: '11',
    name: 'Electrical Issues',
    slug: 'electrical',
    icon: '🔋',
    color: '#EAB308',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500',
    description: 'Battery, starting, or electrical problems',
    subCategories: [
      { id: '11-1', name: 'Dead Battery', slug: 'dead-battery' },
      { id: '11-2', name: 'Won\'t Start / No Crank', slug: 'no-start' },
      { id: '11-3', name: 'Battery Keeps Dying', slug: 'battery-drain' },
      { id: '11-4', name: 'Alternator Concerns', slug: 'alternator' },
      { id: '11-5', name: 'Lights Not Working', slug: 'lights' },
      { id: '11-6', name: 'Starter Problems', slug: 'starter' },
    ]
  },

  // AC & CLIMATE CONTROL
  {
    id: '12',
    name: 'AC & Climate',
    slug: 'ac-climate',
    icon: '❄️',
    color: '#0EA5E9',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500',
    description: 'Heating, cooling, or ventilation',
    subCategories: [
      { id: '12-1', name: 'AC Not Blowing Cold', slug: 'ac-not-cold' },
      { id: '12-2', name: 'Heat Not Working', slug: 'heat-not-working' },
      { id: '12-3', name: 'Weak Airflow', slug: 'weak-airflow' },
      { id: '12-4', name: 'Bad Smell from Vents', slug: 'bad-smell' },
      { id: '12-5', name: 'AC Compressor Noise', slug: 'ac-compressor' },
      { id: '12-6', name: 'Defrost Not Working', slug: 'defrost' },
    ]
  },

  // FLUID LEAKS
  {
    id: '13',
    name: 'Fluid Leak',
    slug: 'fluid-leak',
    icon: '💧',
    color: '#0284C7',
    bgColor: 'bg-sky-600/10',
    borderColor: 'border-sky-600',
    description: 'Identify what\'s leaking and severity',
    subCategories: [
      { id: '13-1', name: 'Oil Leak', slug: 'oil-leak' },
      { id: '13-2', name: 'Coolant Leak', slug: 'coolant-leak' },
      { id: '13-3', name: 'Transmission Fluid', slug: 'trans-leak' },
      { id: '13-4', name: 'Brake Fluid', slug: 'brake-leak' },
      { id: '13-5', name: 'Power Steering Leak', slug: 'ps-leak' },
      { id: '13-6', name: 'Not Sure What Color', slug: 'unknown-leak' },
    ]
  },

  // TIRE ISSUES
  {
    id: '14',
    name: 'Tire Issues',
    slug: 'tire-issues',
    icon: '🛞',
    color: '#64748B',
    bgColor: 'bg-slate-500/10',
    borderColor: 'border-slate-500',
    description: 'Tire wear, pressure, or problems',
    subCategories: [
      { id: '14-1', name: 'Uneven Tire Wear', slug: 'tire-wear' },
      { id: '14-2', name: 'Tire Pressure Questions', slug: 'tire-pressure' },
      { id: '14-3', name: 'When to Replace Tires?', slug: 'tire-replacement' },
      { id: '14-4', name: 'Tire Rotation Advice', slug: 'tire-rotation' },
      { id: '14-5', name: 'Vibration While Driving', slug: 'vibration' },
    ]
  },

  // FUEL & EXHAUST
  {
    id: '15',
    name: 'Fuel & Exhaust',
    slug: 'fuel-exhaust',
    icon: '⛽',
    color: '#16A34A',
    bgColor: 'bg-green-600/10',
    borderColor: 'border-green-600',
    description: 'Gas smell, emissions, or fuel problems',
    subCategories: [
      { id: '15-1', name: 'Smell Gas / Fuel Odor', slug: 'gas-smell' },
      { id: '15-2', name: 'Can\'t Fill Gas Tank', slug: 'fill-issue' },
      { id: '15-3', name: 'Excessive Exhaust Smoke', slug: 'exhaust-smoke' },
      { id: '15-4', name: 'Fuel Pump Issues', slug: 'fuel-pump' },
      { id: '15-5', name: 'Failed Emissions Test', slug: 'emissions' },
    ]
  },

  // ESTIMATE & PLANNING
  {
    id: '16',
    name: 'Cost Estimate',
    slug: 'cost-estimate',
    icon: '💰',
    color: '#059669',
    bgColor: 'bg-emerald-600/10',
    borderColor: 'border-emerald-600',
    description: 'What should this repair cost?',
    subCategories: [
      { id: '16-1', name: 'Repair Cost Estimate', slug: 'repair-cost' },
      { id: '16-2', name: 'Parts vs Labor Breakdown', slug: 'parts-labor' },
      { id: '16-3', name: 'Is This Quote Fair?', slug: 'quote-fair' },
      { id: '16-4', name: 'Aftermarket vs OEM Parts', slug: 'parts-comparison' },
      { id: '16-5', name: 'Maintenance Cost Guide', slug: 'maintenance-cost' },
    ]
  },

  // SAFETY CONCERNS
  {
    id: '17',
    name: 'Safety Concern',
    slug: 'safety',
    icon: '🚨',
    color: '#B91C1C',
    bgColor: 'bg-red-700/10',
    borderColor: 'border-red-700',
    description: 'Is it safe to drive?',
    subCategories: [
      { id: '17-1', name: 'Is It Safe to Drive?', slug: 'safe-to-drive' },
      { id: '17-2', name: 'Urgent Safety Issue', slug: 'urgent-safety' },
      { id: '17-3', name: 'Recall Information', slug: 'recall' },
      { id: '17-4', name: 'Accident Damage Assessment', slug: 'accident-damage' },
    ]
  },

  // GENERAL QUESTION
  {
    id: '18',
    name: 'General Question',
    slug: 'general',
    icon: '❓',
    color: '#6B7280',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500',
    description: 'Ask anything about your vehicle',
  },

  // MULTIPLE ISSUES
  {
    id: '19',
    name: 'Multiple Issues',
    slug: 'multiple',
    icon: '📋',
    color: '#7C3AED',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500',
    description: 'Several problems at once',
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
    // DIAGNOSTIC
    'check-engine': `My check engine light came on [when]. It is steady / blinking (specify). The car is running normally / has these symptoms: [describe any rough idle, loss of power, unusual sounds, etc.].`,
    'scan-code': `I have these trouble codes: [list codes like P0420, P0171, etc.]. Can you help me understand what they mean and what to fix first?`,
    'noise-analysis': `I hear a [type of noise] coming from [location]. It happens when [describe conditions - speed, turning, braking, etc.]. Started [when].`,

    // SECOND OPINION
    'quote-review': `I received a quote for $[amount] to fix [problem]. The shop says I need: [list repairs]. Does this seem fair? What should I prioritize?`,
    'need-verification': `My mechanic recommends [repair/service]. Do I really need this? The car has [mileage] miles and is a [year make model].`,

    // DIY
    'step-by-step': `I want to [describe repair] myself. Can you guide me through it? I have [describe tools/experience level].`,
    'verify-fix': `I just replaced/fixed [describe what you did]. Can you help me verify it's done correctly and test it?`,

    // PRE-PURCHASE
    'inspection-checklist': `I'm looking at a [year make model] with [mileage] miles for $[price]. What should I check before buying?`,
    'review-report': `I have a pre-purchase inspection report. Can you help me understand what's serious and what's normal wear?`,

    // PERFORMANCE
    'loss-of-power': `My car lacks power when [accelerating/going uphill/etc.]. Started [when]. No warning lights / has these lights: [specify].`,
    'rough-idle': `Engine idles roughly / stalls when [describe conditions]. RPM is [normal/fluctuating/etc.]. Started [when].`,

    // ELECTRICAL
    'dead-battery': `Battery is [age] old. Car won't start / needs jump / starts then dies (specify). Happens [always/sometimes/morning only/etc.].`,
    'no-start': `Car won't start. I hear [click/nothing/grinding/etc.] when I turn the key. Lights are [working/dim/off]. Battery is [age/condition].`,

    // AC/CLIMATE
    'ac-not-cold': `AC blows warm air / not blowing at all (specify). Started [when]. Makes unusual noise: [yes/no - describe if yes].`,

    // SAFETY
    'safe-to-drive': `I have [describe problem]. Is it safe to drive? How urgent is this repair?`,

    // DEFAULT
    'default': `Please describe your concern in detail:\n\n- What's happening?\n- When did it start?\n- When does it occur? (always, only when cold/hot, specific conditions)\n- Any warning lights?\n- Recent repairs or changes?`,
  }

  if (subCategorySlug && templates[subCategorySlug]) {
    return templates[subCategorySlug]
  }

  // Default template
  return templates['default'] || `Please describe your concern in detail, including what's happening, when it started, and any other symptoms you've noticed.`
}
