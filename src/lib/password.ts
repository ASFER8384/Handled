import { hash as argonHash, verify as argonVerify } from '@node-rs/argon2';

/**
 * OWASP-recommended Argon2id parameters (19 MiB, t=2, p=1). Argon2id is this
 * library's default algorithm, so the tuning here is all that needs stating.
 * Raising memoryCost/timeCost later invalidates nothing — argon2 encodes its
 * own parameters in the hash string, so old hashes keep verifying.
 */
const OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} as const;

export function hashPassword(password: string): Promise<string> {
  return argonHash(password, OPTIONS);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argonVerify(hash, password, OPTIONS);
  } catch {
    // Malformed or non-argon2 hash — treat as a failed login, never a 500.
    return false;
  }
}
