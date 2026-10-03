import { describe, it, expect } from 'vitest';
import { tokenMatches, nameMatches } from './places';
import { fold } from '../ai/text';

const t = (s: string) =>
	fold(s)
		.split(/[^\p{L}]+/u)
		.filter(Boolean);

describe('place token matching', () => {
	it('matches Polish inflected place names', () => {
		expect(nameMatches(t('Zawoja'), t('w Zawoi'))).toBe(true);
		expect(nameMatches(t('Tarnów'), t('w Tarnowie'))).toBe(true);
		expect(nameMatches(t('Nowy Sącz'), t('w Nowym Sączu'))).toBe(true);
		expect(nameMatches(t('Kościelisko'), t('z Kościeliska'))).toBe(true);
		expect(nameMatches(t('Kraków'), t('do Krakowa'))).toBe(true);
	});

	it('requires every word of a multi-word name', () => {
		expect(nameMatches(t('Wielka Wieś'), t('w naszej wsi'))).toBe(false);
		expect(nameMatches(t('Nowy Targ'), t('nowy sklep'))).toBe(false);
	});

	it('rejects different words that only share a beginning', () => {
		expect(tokenMatches('koscielec', 'koscieliska')).toBe(false);
		expect(tokenMatches('bochnia', 'bochenski')).toBe(false);
	});
});
