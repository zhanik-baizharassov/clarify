// bcrypt cost for NEW password hashes. Existing hashes keep the cost embedded in
// them (bcrypt.compare reads it from the hash), so older cost-10 hashes still work.
export const BCRYPT_COST = 12;

// bcrypt silently ignores everything past 72 BYTES of the password.
export const PASSWORD_MAX_BYTES = 72;
export const PASSWORD_TOO_LONG_MESSAGE =
  "Пароль: слишком длинный (максимум 72 байта, кириллица занимает 2 байта на символ)";

export function isPasswordWithinBcryptLimit(password: string) {
  return Buffer.byteLength(password, "utf8") <= PASSWORD_MAX_BYTES;
}

// Valid hash of a throw-away password at the current cost. Login compares against
// it when the email is unknown so that a missing account costs the same as a
// wrong password (no account enumeration by response time).
export const DUMMY_PASSWORD_HASH =
  "$2b$12$c6EXMbCva/YHij3J5DtgiOuvJsFd5p6g5hkHcB9F6TLki5pTFXkJ2";
