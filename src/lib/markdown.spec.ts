import { describe, it, expect } from 'vitest';
import { parseMarkdown } from './markdown';

describe('parseMarkdown', () => {
	it('parses headings, ordered and bullet lists, and bold text', () => {
		const b = parseMarkdown('## Kroki\n1. Pierwszy\n2. **Drugi**\n\n- punkt\n\nZwykły tekst');
		expect(b[0]).toEqual({ type: 'h', level: 2, text: 'Kroki' });
		expect(b[1]).toMatchObject({ type: 'ol' });
		expect(b[1].type === 'ol' && b[1].items[1]).toEqual([{ text: 'Drugi', bold: true }]);
		expect(b[2]).toMatchObject({ type: 'ul' });
		expect(b[3]).toEqual({ type: 'p', parts: [{ text: 'Zwykły tekst', bold: false }] });
	});

	it('keeps raw HTML as plain text', () => {
		const b = parseMarkdown('<script>alert(1)</script>');
		expect(b).toEqual([{ type: 'p', parts: [{ text: '<script>alert(1)</script>', bold: false }] }]);
	});
});
