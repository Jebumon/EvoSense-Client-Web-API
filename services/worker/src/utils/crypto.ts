import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

const DEMO_SALT = 'evosensefleet-demo-salt-2024';

export function hashPassword(password: string): string {
  return bytesToHex(sha256(password + DEMO_SALT));
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}
