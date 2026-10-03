// Minimal Markdown → blocks for AI output (headings, lists, paragraphs, **bold**).
// Rendered with Svelte elements, never {@html}, so model output cannot inject markup.
export type Inline = { text: string; bold: boolean };
export type Block =
	| { type: 'h'; level: 2 | 3; text: string }
	| { type: 'p'; parts: Inline[] }
	| { type: 'ol' | 'ul'; items: Inline[][] };

export function inline(s: string): Inline[] {
	return s
		.split(/(\*\*[^*]+\*\*)/g)
		.filter(Boolean)
		.map((p) =>
			p.startsWith('**') && p.endsWith('**')
				? { text: p.slice(2, -2), bold: true }
				: { text: p, bold: false }
		);
}

export function parseMarkdown(md: string): Block[] {
	const blocks: Block[] = [];
	let para: string[] = [];
	let list: { type: 'ol' | 'ul'; items: Inline[][] } | null = null;
	const flush = () => {
		if (para.length) blocks.push({ type: 'p', parts: inline(para.join(' ')) });
		para = [];
		if (list) blocks.push(list);
		list = null;
	};
	for (const raw of md.split('\n')) {
		const line = raw.trim();
		let mm: RegExpMatchArray | null;
		if (!line) flush();
		else if ((mm = line.match(/^(#{2,3})\s+(.*)$/))) {
			flush();
			blocks.push({ type: 'h', level: mm[1].length as 2 | 3, text: mm[2] });
		} else if ((mm = line.match(/^\d+[.)]\s+(.*)$/))) {
			if (para.length) flush();
			if (list?.type !== 'ol') {
				flush();
				list = { type: 'ol', items: [] };
			}
			list!.items.push(inline(mm[1]));
		} else if ((mm = line.match(/^[-*]\s+(.*)$/))) {
			if (para.length) flush();
			if (list?.type !== 'ul') {
				flush();
				list = { type: 'ul', items: [] };
			}
			list!.items.push(inline(mm[1]));
		} else {
			if (list) flush();
			para.push(line);
		}
	}
	flush();
	return blocks;
}
