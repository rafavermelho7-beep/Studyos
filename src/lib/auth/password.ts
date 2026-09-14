import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// A real bcrypt hash of an arbitrary, unused password. Login compares
// against this when the email doesn't exist so the response takes the same
// time either way — otherwise "no such user" returns near-instantly while
// "wrong password" takes ~bcrypt's cost, and that timing gap is an email
// enumeration oracle. Computed once at module load, not per request.
export const DUMMY_PASSWORD_HASH = bcrypt.hashSync("not-a-real-password-timing-decoy", SALT_ROUNDS);
