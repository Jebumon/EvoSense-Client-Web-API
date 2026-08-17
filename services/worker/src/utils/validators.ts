export function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePhone(phone?: string) {
  if (!phone) return true;
  return /^\+?[1-9]\d{1,14}$/.test(phone);
}

export function validateIMEI(imei: string) {
  return /^\d{15}$/.test(imei);
}
