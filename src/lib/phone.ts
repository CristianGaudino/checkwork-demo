// A number as typed ("087 123 4567", "+353 87…", "00353 87…") in international digits, for call and WhatsApp links. An Irish
// number typed with its leading 0 gets 353. Null when it is too short to dial.
export function intlDigits(phone: string): string | null {
  const d = phone.replace(/\D/g, "");
  const intl = phone.trim().startsWith("+") ? d : d.startsWith("00") ? d.slice(2) : d.startsWith("0") ? `353${d.slice(1)}` : d;
  return intl.length >= 8 ? intl : null;
}
export const telHref = (phone: string) => {
  const d = intlDigits(phone);
  return d ? `tel:+${d}` : null;
};
export const waHref = (phone: string) => {
  const d = intlDigits(phone);
  return d ? `https://wa.me/${d}` : null;
};
