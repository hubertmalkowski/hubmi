// Small text helpers shared by the mock providers and entity extraction.

const DIACRITICS: Record<string, string> = {
	ą: 'a',
	ć: 'c',
	ę: 'e',
	ł: 'l',
	ń: 'n',
	ó: 'o',
	ś: 's',
	ź: 'z',
	ż: 'z'
};

export function fold(s: string): string {
	return s
		.toLowerCase()
		.replace(/[ąćęłńóśźż]/g, (c) => DIACRITICS[c] ?? c)
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '');
}

const STOP = new Set(
	(
		'a aby albo ale ani bo by czy dla do i ich jak jest juz lub na nad nie o od oraz po pod przez sa sie ' +
		'tak tam ten to w we z za ze ktory ktora ktore jego jej ich nas nam the of and or to in on for with is are ' +
		'be by an at as it this that from'
	).split(' ')
);

/** Lowercased, diacritic-folded word stems (first 4 chars), stopwords removed. */
export function stems(s: string): string[] {
	return fold(s)
		.split(/[^\p{L}\p{N}]+/u)
		.filter((w) => w.length > 2 && !STOP.has(w))
		.map((w) => w.slice(0, 4));
}

/** Overlap coefficient between two texts' stem sets, 0..1. */
export function overlap(a: string, b: string): number {
	const A = new Set(stems(a));
	const B = new Set(stems(b));
	if (!A.size || !B.size) return 0;
	let hit = 0;
	for (const w of A) if (B.has(w)) hit++;
	return hit / Math.min(A.size, B.size);
}

export function hash(s: string): string {
	let h1 = 0xdeadbeef ^ s.length;
	let h2 = 0x41c6ce57 ^ s.length;
	for (let i = 0; i < s.length; i++) {
		const c = s.charCodeAt(i);
		h1 = Math.imul(h1 ^ c, 2654435761);
		h2 = Math.imul(h2 ^ c, 1597334677);
	}
	h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
	h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
	return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

export function sigmoid(x: number) {
	return 1 / (1 + Math.exp(-x));
}

export function clamp(x: number, lo = 0, hi = 1) {
	return Math.min(hi, Math.max(lo, x));
}
