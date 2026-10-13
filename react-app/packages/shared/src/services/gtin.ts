// Product barcodes (GTIN: UPC-A, UPC-E, EAN-8, EAN-13). Scanners misread
// sometimes; the last digit is a checksum, so a bad read can be rejected
// instead of looked up (which is what produced "not found" errors).

const digitsOnly = (s: string) => s.replace(/\D/g, '');

/** GS1 check digit is valid for an 8/12/13/14-digit code. */
export function isValidGtin(code: string): boolean {
  const d = digitsOnly(code);
  if (d !== code.trim() || ![8, 12, 13, 14].includes(d.length)) return false;
  const nums = d.split('').map(Number);
  const check = nums.pop()!;
  // Weights 3,1,3,1… from the right (excluding the check digit)
  const sum = nums.reverse().reduce((s, n, i) => s + n * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

/** Expand a UPC-E (8 digits, number system 0/1) to UPC-A (12 digits). */
export function upcEToA(upce: string): string | null {
  const d = digitsOnly(upce);
  if (d.length !== 8 || !/^[01]/.test(d)) return null;
  const [ns, a, b, c, x, y, z, check] = d.split('');
  let body: string;
  if (z === '0' || z === '1' || z === '2') body = `${a}${b}${z}0000${c}${x}${y}`;
  else if (z === '3') body = `${a}${b}${c}00000${x}${y}`;
  else if (z === '4') body = `${a}${b}${c}${x}00000${y}`;
  else body = `${a}${b}${c}${x}${y}0000${z}`;
  return `${ns}${body}${check}`;
}

/**
 * The same product's code in the forms different databases use:
 * EAN-13 (Open Food Facts), UPC-A 12-digit (Walmart), and Kroger's
 * 13-digit product id (UPC without the check digit, zero-padded).
 */
export function gtinForms(code: string): { ean13: string; upcA: string | null; krogerId: string } | null {
  let d = digitsOnly(code);
  if (d.length === 8 && /^[01]/.test(d) && !isValidGtin(d)) d = upcEToA(d) ?? d;
  else if (d.length === 8 && /^[01]/.test(d)) {
    // Valid as EAN-8 too; UPC-E is far more common on US groceries
    const a = upcEToA(d);
    if (a && isValidGtin(a)) d = a;
  }
  if (d.length === 14 && d.startsWith('0')) d = d.slice(1);
  if (d.length === 12) d = `0${d}`;
  if (d.length === 8) d = d.padStart(13, '0');
  if (d.length !== 13) return null;
  return {
    ean13: d,
    upcA: d.startsWith('0') ? d.slice(1) : null,
    krogerId: d.slice(0, 12).padStart(13, '0'),
  };
}
