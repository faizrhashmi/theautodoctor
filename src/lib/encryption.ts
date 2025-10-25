/**
 * PII Encryption Utility
 *
 * Uses AES-256-GCM encryption for sensitive personally identifiable information (PII)
 * like SIN numbers, business numbers, and other regulated data.
 *
 * IMPORTANT: Set ENCRYPTION_KEY environment variable before using in production.
 * Generate key with: openssl rand -hex 32
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32 // 256 bits
const IV_LENGTH = 16 // 128 bits
const TAG_LENGTH = 16 // 128 bits
const ENCODING = 'hex' as const

/**
 * Get encryption key from environment
 * @throws {Error} If ENCRYPTION_KEY is not set or invalid
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY

  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is not set. ' +
      'Generate with: openssl rand -hex 32'
    )
  }

  if (key.length !== KEY_LENGTH * 2) { // hex encoding doubles length
    throw new Error(
      `ENCRYPTION_KEY must be ${KEY_LENGTH * 2} hex characters (${KEY_LENGTH} bytes). ` +
      `Current length: ${key.length}`
    )
  }

  return Buffer.from(key, ENCODING)
}

/**
 * Encrypt sensitive PII data
 *
 * @param plaintext - The plain text data to encrypt (e.g., SIN, business number)
 * @returns Encrypted string in format: iv:authTag:encrypted (all hex-encoded)
 *
 * @example
 * const encryptedSIN = encryptPII("123456789")
 * // Returns: "a1b2c3d4....:e5f6g7h8....:i9j0k1l2...."
 */
export function encryptPII(plaintext: string): string {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new Error('Plaintext must be a non-empty string')
  }

  try {
    const iv = randomBytes(IV_LENGTH)
    const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv)

    let encrypted = cipher.update(plaintext, 'utf8', ENCODING)
    encrypted += cipher.final(ENCODING)

    const authTag = cipher.getAuthTag()

    // Format: iv:authTag:encrypted (all hex-encoded)
    return `${iv.toString(ENCODING)}:${authTag.toString(ENCODING)}:${encrypted}`
  } catch (error) {
    console.error('[Encryption] Failed to encrypt PII:', error)
    throw new Error('Encryption failed. Check ENCRYPTION_KEY configuration.')
  }
}

/**
 * Decrypt sensitive PII data
 *
 * @param ciphertext - The encrypted string (format: iv:authTag:encrypted)
 * @returns Decrypted plain text
 *
 * @example
 * const decryptedSIN = decryptPII("a1b2c3d4....:e5f6g7h8....:i9j0k1l2....")
 * // Returns: "123456789"
 */
export function decryptPII(ciphertext: string): string {
  if (!ciphertext || typeof ciphertext !== 'string') {
    throw new Error('Ciphertext must be a non-empty string')
  }

  try {
    const parts = ciphertext.split(':')

    if (parts.length !== 3) {
      throw new Error(
        'Invalid ciphertext format. Expected format: iv:authTag:encrypted'
      )
    }

    const [ivHex, authTagHex, encrypted] = parts

    const iv = Buffer.from(ivHex, ENCODING)
    const authTag = Buffer.from(authTagHex, ENCODING)

    const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted, ENCODING, 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error) {
    console.error('[Encryption] Failed to decrypt PII:', error)
    throw new Error('Decryption failed. Data may be corrupted or key is incorrect.')
  }
}

/**
 * Mask SIN for display (show last 3 digits only)
 *
 * @param sin - The SIN to mask (9 digits)
 * @returns Masked SIN in format: •••-•••-789
 *
 * @example
 * maskSIN("123456789")
 * // Returns: "•••-•••-789"
 */
export function maskSIN(sin: string): string {
  if (!sin) return '•••-•••-•••'

  // Remove any non-digit characters
  const digitsOnly = sin.replace(/\D/g, '')

  if (digitsOnly.length !== 9) {
    return '•••-•••-•••'
  }

  const lastThree = digitsOnly.slice(-3)
  return `•••-•••-${lastThree}`
}

/**
 * Mask business number for display (show last 4 digits only)
 *
 * @param businessNumber - The business number to mask
 * @returns Masked business number in format: •••••••-••••-RT0001
 *
 * @example
 * maskBusinessNumber("123456789RT0001")
 * // Returns: "•••••••-••••-RT0001"
 */
export function maskBusinessNumber(businessNumber: string): string {
  if (!businessNumber) return '•••••••••-••••••'

  // GST/HST format: 9 digits + 2 letters + 4 digits (e.g., 123456789RT0001)
  if (businessNumber.length >= 15) {
    const lastPart = businessNumber.slice(-6) // RT0001
    return `•••••••••-••••-${lastPart}`
  }

  // Fallback for other formats
  const lastFour = businessNumber.slice(-4)
  return `${'•'.repeat(businessNumber.length - 4)}-${lastFour}`
}

/**
 * Validate SIN format (basic check)
 *
 * @param sin - The SIN to validate
 * @returns true if SIN appears to be valid format (9 digits)
 */
export function isValidSINFormat(sin: string): boolean {
  if (!sin) return false

  // Remove any non-digit characters
  const digitsOnly = sin.replace(/\D/g, '')

  // Must be exactly 9 digits
  return digitsOnly.length === 9
}

/**
 * Validate business number format (basic check)
 *
 * @param businessNumber - The business number to validate
 * @returns true if business number appears to be valid format
 */
export function isValidBusinessNumberFormat(businessNumber: string): boolean {
  if (!businessNumber) return false

  // Remove any non-alphanumeric characters
  const cleaned = businessNumber.replace(/[^A-Z0-9]/gi, '')

  // GST/HST format: 9 digits + 2 letters + 4 digits (e.g., 123456789RT0001)
  const gstPattern = /^\d{9}[A-Z]{2}\d{4}$/i

  // BN9 format: 9 digits (business number without program account)
  const bn9Pattern = /^\d{9}$/

  return gstPattern.test(cleaned) || bn9Pattern.test(cleaned)
}

/**
 * Check if a value is already encrypted
 *
 * @param value - The value to check
 * @returns true if value appears to be encrypted (has our format)
 */
export function isEncrypted(value: string): boolean {
  if (!value) return false

  const parts = value.split(':')

  // Our encrypted format has exactly 3 parts (iv:authTag:encrypted)
  if (parts.length !== 3) return false

  // Each part should be hex-encoded (even length)
  return parts.every(part => part.length > 0 && part.length % 2 === 0)
}
