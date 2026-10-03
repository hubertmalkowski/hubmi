import { describe, it, expect } from 'vitest';
import { findPii, redact, validPesel, isFirstName } from './pii';

describe('validPesel', () => {
	it('accepts a valid checksum and rejects an invalid one', () => {
		expect(validPesel('44051401458')).toBe(true);
		expect(validPesel('44051401459')).toBe(false);
		expect(validPesel('1234')).toBe(false);
	});
});

describe('findPii', () => {
	const kinds = (t: string) => findPii(t).map((s) => s.kind);

	it('finds phone numbers in common Polish formats', () => {
		expect(kinds('zadzwoń 600 123 456')).toContain('phone');
		expect(kinds('tel. +48 512-345-678')).toContain('phone');
		expect(kinds('kontakt 600123456')).toContain('phone');
	});

	it('finds emails, postcodes and PESEL', () => {
		expect(kinds('pisz na anna.nowak@example.com')).toEqual(['email']);
		expect(kinds('32-400 Myślenice')).toContain('postcode');
		expect(kinds('PESEL 44051401458')).toEqual(['pesel']);
	});

	it('does not treat an invalid 11-digit number as PESEL', () => {
		expect(kinds('numer 44051401459')).not.toContain('pesel');
	});

	it('finds street addresses', () => {
		expect(kinds('mieszka przy ul. Długiej 5')).toContain('address');
		expect(kinds('os. Złotego Wieku 12/4')).toContain('address');
	});

	it('proposes first-name + surname candidates, including inflected forms', () => {
		expect(findPii('Pan Jan Kowalski mieszka sam').find((s) => s.kind === 'name')?.text).toBe(
			'Jan Kowalski'
		);
		expect(findPii('Pomagam Marii Wiśniewskiej').some((s) => s.kind === 'name')).toBe(true);
	});

	it('does not flag place names as people', () => {
		expect(findPii('w Nowym Targu i w Starym Sączu').some((s) => s.kind === 'name')).toBe(false);
	});
});

describe('isFirstName', () => {
	it('handles Polish case endings', () => {
		expect(isFirstName('Jana')).toBe(true);
		expect(isFirstName('Marii')).toBe(true);
		expect(isFirstName('Kraków')).toBe(false);
	});
});

describe('redact', () => {
	it('replaces spans with placeholders and keeps the rest', () => {
		const t = 'Jan Kowalski, tel. 600 123 456, potrzebuje pomocy.';
		expect(redact(t, findPii(t))).toBe('[osoba], tel. [telefon], potrzebuje pomocy.');
	});
});
