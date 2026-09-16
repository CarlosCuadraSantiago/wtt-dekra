import { describe, expect, it } from 'vitest';
import { generateUsername, normalizePart } from './username.util';

describe('normalizePart', () => {
  it('should trim, lowercase and strip accents', () => {
    expect(normalizePart('  ÁlVaro  ')).toBe('alvaro');
    expect(normalizePart('Martín')).toBe('martin');
    expect(normalizePart('García')).toBe('garcia');
  });

  it('should remove non-alphanumeric characters', () => {
    expect(normalizePart('O\'Neil-Jr.')).toBe('oneiljr');
    expect(normalizePart('a_b.c-d')).toBe('abcd');
    expect(normalizePart('123-abc')).toBe('123abc');
  });

  it('should handle empty and whitespace', () => {
    expect(normalizePart('')).toBe('');
    expect(normalizePart('   ')).toBe('');
  });

  it('should strip diacritics via NFD', () => {
    expect(normalizePart('ñandú')).toBe('nandu');
    expect(normalizePart('café')).toBe('cafe');
    expect(normalizePart('São')).toBe('sao');
  });
});

describe('generateUsername', () => {
  it('should generate base username as name.firstSurname lowercased', () => {
    expect(generateUsername('Carlos', 'Montes Gallardo', [])).toBe('carlos.montes');
  });

  it('should use first name token only and first surname only for base', () => {
    expect(generateUsername('  Ana María ', ' Ruiz Ferrer ', [])).toBe('ana.ruiz');
  });

  it('should normalize accents and strip special chars', () => {
    expect(generateUsername('Álvaro', 'García Sánchez', [])).toBe('alvaro.garcia');
  });

  it('should return empty when name or first surname missing', () => {
    expect(generateUsername('', 'Montes', [])).toBe('');
    expect(generateUsername('Carlos', '', [])).toBe('');
    expect(generateUsername('   ', '   ', [])).toBe('');
    expect(generateUsername('Carlos', '---', [])).toBe('');
  });

  it('should fallback to second surname dot variant on collision', () => {
    const existing = ['carlos.montes'];
    expect(generateUsername('Carlos', 'Montes Gallardo', existing)).toBe('carlos.montes.gallar');
  });

  it('should fallback to concatenated second surname when dot variant also collides', () => {
    // withDot truncated to 20: 'carlos.montes.gallar' (22 -> 20)
    const existing = ['carlos.montes', 'carlos.montes.gallar'];
    expect(generateUsername('Carlos', 'Montes Gallardo', existing)).toBe('carlos.montesgallard');
  });

  it('should return withDot when both variants collide (last fallback)', () => {
    const existing = ['carlos.montes', 'carlos.montes.gallar', 'carlos.montesgallard'];
    expect(generateUsername('Carlos', 'Montes Gallardo', existing)).toBe('carlos.montes.gallar');
  });

  it('should be case-insensitive when caller lowercases existing (as UserForm does)', () => {
    const existing = ['carlos.montes']; // UserForm stores lowercased usernames
    expect(generateUsername('Carlos', 'Montes Gallardo', existing)).toBe('carlos.montes.gallar');
  });

  it('should allow reusing currentUsername even if it exists', () => {
    const existing = ['carlos.montes', 'ana.ruiz'];
    expect(generateUsername('Carlos', 'Montes', existing, 'carlos.montes')).toBe('carlos.montes');
    // currentUsername bypasses collision check — truncated withDot is returned even though existing has base
    expect(generateUsername('Carlos', 'Montes Gallardo', ['carlos.montes'], 'carlos.montes.gallar')).toBe(
      'carlos.montes.gallar',
    );
  });

  it('should truncate base to 20 characters', () => {
    const name = 'Alexandrina';
    const surnames = 'Constantinopoulos Papadopoulos';
    const result = generateUsername(name, surnames, []);
    expect(result.length).toBeLessThanOrEqual(20);
    // base is `${normalizedName}.${firstSurname}` sliced
    expect(result).toBe('alexandrina.constant');
  });

  it('should truncate dot-variant to 20', () => {
    const existing = ['alexandrina.constant'];
    const result = generateUsername('Alexandrina', 'Constantinopoulos Papadopoulos', existing);
    expect(result.length).toBeLessThanOrEqual(20);
  });

  it('should return base when no second surname and collision exists', () => {
    const existing = ['ana.ruiz'];
    expect(generateUsername('Ana', 'Ruiz', existing)).toBe('ana.ruiz');
  });

  it('should handle surnames with extra spaces and non-alphanumeric', () => {
    expect(generateUsername('Carlos', '  Montes   Gallardo  ', [])).toBe('carlos.montes');
    expect(generateUsername('Carlos', "O'Neil Jr", [])).toBe('carlos.oneil');
  });
});
