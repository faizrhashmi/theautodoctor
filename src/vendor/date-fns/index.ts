export type Locale = { code?: string }

type FormatOptions = { locale?: Locale }

type StartOfWeekOptions = { weekStartsOn?: number }

type DateLike = Date | number | string

function toDate(value: DateLike): Date {
  if (value instanceof Date) {
    return new Date(value.getTime())
  }
  if (typeof value === 'number') {
    return new Date(value)
  }
  if (typeof value === 'string') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed
    }
  }
  throw new TypeError('Invalid time value')
}

function resolveLocale(options?: FormatOptions): string {
  if (options?.locale?.code) {
    return options.locale.code
  }
  if (typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function') {
    try {
      return new Intl.DateTimeFormat().resolvedOptions().locale
    } catch (error) {
      return 'en-US'
    }
  }
  return 'en-US'
}

export function format(dateInput: DateLike, formatStr: string, options?: FormatOptions): string {
  const date = toDate(dateInput)
  const locale = resolveLocale(options)

  const normalized = formatStr.trim()

  switch (normalized) {
    case 'MMMM yyyy':
      return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date)
    case 'MMM d, yyyy':
      return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
    case 'EEE MMM d':
    case 'EEE, MMM d':
      return new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' }).format(date)
    case 'EEEE, MMMM d':
      return new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'long', day: 'numeric' }).format(date)
    case 'MMMM d':
      return new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric' }).format(date)
    case 'MMM d':
      return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date)
    case 'EEEE':
      return new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date)
    case 'EEE':
      return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date)
    case 'H:mm':
      return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', hour12: false }).format(date)
    case 'h:mm a':
      return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', hour12: true }).format(date)
    case 'h a':
      return new Intl.DateTimeFormat(locale, { hour: 'numeric', hour12: true }).format(date)
    case 'P':
    case 'PP':
    case 'PPP':
      return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date)
    case 'PPPP':
      return new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(date)
    default:
      if (/^\d{1,2}:\d{2}\s?[AP]M$/i.test(normalized)) {
        return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(date)
      }
      return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
  }
}

export function parse(value: string, _formatStr: string, referenceDate: DateLike, _options?: FormatOptions): Date {
  const base = toDate(referenceDate)
  if (!value) {
    return base
  }

  const direct = new Date(value)
  if (!Number.isNaN(direct.getTime())) {
    return direct
  }

  // Fallback: try Date.parse with locale-specific month/day names removed
  const normalized = value.replace(/\u00A0/g, ' ').trim()
  const trial = new Date(normalized)
  if (!Number.isNaN(trial.getTime())) {
    return trial
  }

  // As a last resort, return the reference date
  return base
}

export function startOfWeek(dateInput: DateLike, options?: StartOfWeekOptions): Date {
  const date = toDate(dateInput)
  const weekStartsOn = options?.weekStartsOn ?? 0
  const day = date.getDay()
  const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn
  const result = new Date(date)
  result.setDate(date.getDate() - diff)
  result.setHours(0, 0, 0, 0)
  return result
}

export function getDay(dateInput: DateLike): number {
  return toDate(dateInput).getDay()
}

export function addMinutes(dateInput: DateLike, amount: number): Date {
  const date = toDate(dateInput)
  return new Date(date.getTime() + amount * 60_000)
}

export function addHours(dateInput: DateLike, amount: number): Date {
  return addMinutes(dateInput, amount * 60)
}

export function addDays(dateInput: DateLike, amount: number): Date {
  const date = toDate(dateInput)
  const result = new Date(date)
  result.setDate(result.getDate() + amount)
  return result
}

export function addWeeks(dateInput: DateLike, amount: number): Date {
  return addDays(dateInput, amount * 7)
}

export function addMonths(dateInput: DateLike, amount: number): Date {
  const date = toDate(dateInput)
  const result = new Date(date)
  result.setMonth(result.getMonth() + amount)
  return result
}

export function startOfDay(dateInput: DateLike): Date {
  const date = toDate(dateInput)
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

export function endOfDay(dateInput: DateLike): Date {
  const date = toDate(dateInput)
  const result = new Date(date)
  result.setHours(23, 59, 59, 999)
  return result
}

export function startOfMonth(dateInput: DateLike): Date {
  const date = toDate(dateInput)
  const result = new Date(date.getFullYear(), date.getMonth(), 1)
  result.setHours(0, 0, 0, 0)
  return result
}

export function endOfMonth(dateInput: DateLike): Date {
  const date = toDate(dateInput)
  const result = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  result.setHours(23, 59, 59, 999)
  return result
}

export function isSameDay(left: DateLike, right: DateLike): boolean {
  const a = toDate(left)
  const b = toDate(right)
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function isSameMonth(left: DateLike, right: DateLike): boolean {
  const a = toDate(left)
  const b = toDate(right)
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

export function differenceInMinutes(later: DateLike, earlier: DateLike): number {
  const end = toDate(later)
  const start = toDate(earlier)
  return Math.round((end.getTime() - start.getTime()) / 60_000)
}

export function max(dates: DateLike[]): Date {
  if (!dates.length) {
    throw new Error('max requires at least one date')
  }
  return dates.map(toDate).reduce((acc, current) => (current > acc ? current : acc))
}

export function min(dates: DateLike[]): Date {
  if (!dates.length) {
    throw new Error('min requires at least one date')
  }
  return dates.map(toDate).reduce((acc, current) => (current < acc ? current : acc))
}

export function set(dateInput: DateLike, values: { hours?: number; minutes?: number; seconds?: number; milliseconds?: number }): Date {
  const date = toDate(dateInput)
  const result = new Date(date)
  if (typeof values.hours === 'number') {
    result.setHours(values.hours)
  }
  if (typeof values.minutes === 'number') {
    result.setMinutes(values.minutes)
  }
  if (typeof values.seconds === 'number') {
    result.setSeconds(values.seconds)
  }
  if (typeof values.milliseconds === 'number') {
    result.setMilliseconds(values.milliseconds)
  }
  return result
}

export function isBefore(left: DateLike, right: DateLike): boolean {
  return toDate(left).getTime() < toDate(right).getTime()
}

export function isAfter(left: DateLike, right: DateLike): boolean {
  return toDate(left).getTime() > toDate(right).getTime()
}
