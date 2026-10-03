// Fails if a locale is missing keys present in the Polish base, or uses different {params}.
import { readFileSync } from 'node:fs';

const load = (l: string) =>
	JSON.parse(readFileSync(`messages/${l}.json`, 'utf8')) as Record<string, string>;
const params = (s: string) =>
	[...s.matchAll(/\{(\w+)\}/g)]
		.map((m) => m[1])
		.sort()
		.join(',');
const base = load('pl');
let failed = false;
for (const locale of ['en', 'uk']) {
	const msgs = load(locale);
	for (const [key, text] of Object.entries(base)) {
		if (key === '$schema') continue;
		if (!(key in msgs)) {
			console.error(`[${locale}] missing: ${key}`);
			failed = true;
		} else if (params(msgs[key]) !== params(text)) {
			console.error(
				`[${locale}] params differ for ${key}: "${params(text)}" vs "${params(msgs[key])}"`
			);
			failed = true;
		}
	}
	for (const key of Object.keys(msgs))
		if (!(key in base)) console.warn(`[${locale}] extra key: ${key}`);
}
if (failed) process.exit(1);
console.log('messages ok');
