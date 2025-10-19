import crypto from 'crypto';

const ITER = 120000;
const KEYLEN = 64;
const DIGEST = 'sha512';

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, ITER, KEYLEN, DIGEST).toString('hex');
  return `pbkdf2$${DIGEST}$${ITER}$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  try {
    const [scheme, digest, iterStr, salt, hash] = stored.split('$');
    if (scheme !== 'pbkdf2') return false;
    const iter = parseInt(iterStr, 10);
    const test = crypto.pbkdf2Sync(password, salt, iter, Buffer.from(hash, 'hex').length, digest).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(test, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}

export function makeSessionToken() {
  return crypto.randomBytes(24).toString('hex');
}
