import { describe, it, expect } from 'vitest';
import { findAbuse } from './abuse';

const kinds = (t: string) => findAbuse(t).map((h) => h.kind);

describe('findAbuse', () => {
	it('flags threats of violence', () => {
		expect(kinds('zabije wszystkich ludzi na świecie i innych')).toContain('threat');
		expect(kinds('Zabiję go')).toContain('threat');
		expect(kinds('I will kill them')).toContain('threat');
	});

	it('flags profanity regardless of case, diacritics, leetspeak and masking', () => {
		expect(kinds('KURWA, znowu nie ma autobusu')).toContain('profanity');
		expect(kinds('k*rwa mać')).toContain('profanity');
		expect(kinds('kurw4')).toContain('profanity');
		expect(kinds('to jest gówno nie urząd')).toContain('profanity');
		expect(kinds('wypierdalać stąd')).toContain('profanity');
		expect(kinds('this is shit')).toContain('profanity');
	});

	it('leaves ordinary reports alone', () => {
		for (const t of [
			'W naszej wsi starsze osoby mieszkają same, dzieci wyjechały za granicę.',
			'Ciotka opiekuje się chorym bratem, nie ma wsparcia.',
			'Autobus jeździ dwa razy dziennie, brak transportu do lekarza.',
			'Nastolatki w gminie po szkole nie mają gdzie się podziać, 40 osób bez zajęć.',
			'Kierownik ośrodka jest bardzo pomocny, ale brakuje pieniędzy.'
		]) {
			expect(findAbuse(t), t).toEqual([]);
		}
	});
});
