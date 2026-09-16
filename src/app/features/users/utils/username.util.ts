export function normalizePart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export function generateUsername(
  name: string,
  surnames: string,
  existing: string[],
  currentUsername?: string | null,
): string {
  const firstNameRaw = name.trim().split(/\s+/)[0] ?? '';
  const normalizedName = normalizePart(firstNameRaw);
  const surnameParts = surnames
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(normalizePart)
    .filter(Boolean);
  const firstSurname = surnameParts[0] ?? '';
  const secondSurname = surnameParts[1] ?? '';
  if (!normalizedName || !firstSurname) return '';
  const base = `${normalizedName}.${firstSurname}`.slice(0, 20);
  const exists = (candidate: string) =>
    existing.includes(candidate.toLowerCase()) && candidate.toLowerCase() !== (currentUsername ?? '').toLowerCase();
  if (!exists(base)) return base;
  if (secondSurname) {
    const withDot = `${normalizedName}.${firstSurname}.${secondSurname}`.slice(0, 20);
    if (!exists(withDot)) return withDot;
    const withSecond = `${normalizedName}.${firstSurname}${secondSurname}`.slice(0, 20);
    if (!exists(withSecond)) return withSecond;
    return withDot;
  }
  return base;
}
