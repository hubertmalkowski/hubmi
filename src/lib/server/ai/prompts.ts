// Claude prompts. Every prompt gets only database records plus redacted user text and
// is told to use only those facts. Mocks keep the app usable offline.
import { z } from 'zod';
import { structured, streamText, type ChatMessage } from './claude';
import { models } from '../env';
import type Anthropic from '@anthropic-ai/sdk';
import type { Canvas, FormField } from '../db/schema';

export type Locale = 'pl' | 'en' | 'uk';
const LANG: Record<Locale, string> = { pl: 'Polish', en: 'English', uk: 'Ukrainian' };

const GROUNDING =
	'Use only the facts provided in the user message. If information is missing, say so plainly ("brak danych" in Polish) instead of inventing it. Never include personal data.';

// ---------- match reasons ----------

export async function matchReasons(
	need: string,
	items: { id: string; title: string; summary: string }[],
	locale: Locale
): Promise<Record<string, string>> {
	if (!items.length) return {};
	const out = await structured({
		kind: 'match.reasons',
		system: `You explain to a resident why a social innovation could help with the problem they reported. One short sentence (max 25 words) per innovation, in ${LANG[locale]}, plain language, no jargon. ${GROUNDING}`,
		user: `Problem:\n${need}\n\nInnovations:\n${items.map((i) => `[${i.id}] ${i.title}: ${i.summary}`).join('\n')}`,
		schema: z.object({ reasons: z.array(z.object({ id: z.string(), text: z.string() })) }),
		mock: () => ({
			reasons: items.map((i) => ({
				id: i.id,
				text:
					locale === 'pl'
						? `To rozwiązanie odpowiada na podobną potrzebę: ${lowerFirst(i.summary).slice(0, 110)}`
						: locale === 'uk'
							? `Це рішення відповідає на схожу потребу: ${i.title}.`
							: `This addresses a similar need: ${i.title}.`
			}))
		})
	});
	return Object.fromEntries(out.reasons.map((r) => [r.id, r.text]));
}

// ---------- challenge ----------

export async function challengeText(needs: string[]): Promise<{ title: string; description: string }> {
	return structured({
		kind: 'challenge.create',
		system: `You turn reported social problems into an open innovation challenge for the Małopolska Social Innovation Hub. Write in Polish. Title: max 12 words, starts with "Jak" (How might we). Description: max 80 words, describe who is affected and what is missing, without naming any person or address. ${GROUNDING}`,
		user: needs.map((n, i) => `${i + 1}. ${n}`).join('\n'),
		schema: z.object({ title: z.string(), description: z.string() }),
		mock: () => ({
			title: `Jak odpowiedzieć na problem: ${needs[0].split(/[.!?]/)[0].slice(0, 70).toLowerCase()}?`,
			description: `Mieszkańcy zgłaszają potrzebę, na którą Biblioteka Innowacji nie ma jeszcze sprawdzonego rozwiązania. ${needs[0].slice(0, 200)}`
		})
	});
}

// ---------- normalize to Polish for BM25 ----------

export async function normalizePl(text: string): Promise<string> {
	const out = await structured({
		kind: 'need.normalize_pl',
		system: 'Translate the text into natural Polish. Keep the meaning, do not add anything.',
		user: text,
		schema: z.object({ polish: z.string() }),
		mock: () => ({ polish: text })
	});
	return out.polish;
}

// ---------- easy read ----------

export async function easyRead(text: string, locale: Locale): Promise<string> {
	const out = await structured({
		kind: 'a11y.easy_read',
		system: `Rewrite the text as easy-to-read text (tekst łatwy do czytania) in ${LANG[locale]}: short sentences, one idea per sentence, common words, explain any necessary term, no abbreviations. Keep every fact, add nothing.`,
		user: text,
		schema: z.object({ text: z.string() }),
		maxTokens: 4096,
		mock: () => ({
			text: text
				.split(/(?<=[.!?])\s+/)
				.map((s) => s.replace(/,\s*/g, '. '))
				.join('\n')
		})
	});
	return out.text;
}

// ---------- admin reply ----------

export async function adminReply(item: { kind: string; title: string; text: string; status: string }): Promise<string> {
	const out = await structured({
		kind: 'admin.reply',
		system: `You draft a short, warm reply (max 120 words, Polish) from the Małopolska Social Innovation Hub team (ROPS Kraków) to a person who submitted an ${item.kind}. Thank them, state the current status in plain words and the next step. Sign as "Zespół Hubu Innowacji Społecznych". ${GROUNDING}`,
		user: `Submission: ${item.title}\n${item.text}\n\nCurrent status: ${item.status}`,
		schema: z.object({ draft: z.string() }),
		mock: () => ({
			draft: `Dzień dobry,\n\ndziękujemy za zgłoszenie „${item.title}”. Zapoznaliśmy się z nim i przekazaliśmy je do oceny (status: ${item.status}). W ciągu 7 dni skontaktuje się z Panią/Panem ekspert, który pomoże rozwinąć pomysł i wskaże możliwe źródła finansowania.\n\nZespół Hubu Innowacji Społecznych`
		})
	});
	return out.draft;
}

// ---------- feedback summary ----------

export async function feedbackSummary(items: { rating: number; text: string | null; category: string | null }[]) {
	return structured({
		kind: 'tests.feedback_summary',
		system: `Summarize tester feedback for the innovator in Polish: the top 3 concrete improvements, each with how many testers raised it. ${GROUNDING}`,
		user: items.map((f) => `- [${f.category ?? 'other'}] ocena ${f.rating}/5: ${f.text ?? ''}`).join('\n'),
		schema: z.object({ improvements: z.array(z.object({ text: z.string(), count: z.number().int() })) }),
		mock: () => ({
			improvements: items
				.filter((f) => f.text)
				.slice(0, 3)
				.map((f) => ({ text: f.text!.slice(0, 120), count: 1 }))
		})
	});
}

// ---------- translate ----------

export async function translate(text: string, locale: Locale): Promise<string> {
	if (locale === 'pl') return text;
	const out = await structured({
		kind: 'i18n.translate',
		system: `Translate from Polish into ${LANG[locale]}. Keep names of programmes and institutions recognizable. Output only the translation.`,
		user: text,
		schema: z.object({ translation: z.string() }),
		maxTokens: 4096,
		mock: () => ({ translation: text })
	});
	return out.translation;
}

// ---------- innovation assistant (streamed, with canvas tool) ----------

export const CANVAS_FIELDS = [
	'problem',
	'beneficiaries',
	'solution',
	'value',
	'partners',
	'resources',
	'costs',
	'risks',
	'measures'
] as const;

export const saveCanvasTool: Anthropic.Beta.BetaTool = {
	name: 'save_canvas',
	description:
		'Save an agreed, concise entry into one field of the Social Innovation Canvas when the user has settled on it in the conversation.',
	strict: true,
	input_schema: {
		type: 'object',
		properties: {
			field: { type: 'string', enum: [...CANVAS_FIELDS] },
			value: { type: 'string' }
		},
		required: ['field', 'value'],
		additionalProperties: false
	}
};

export function assistantStream(opts: {
	idea: { title: string; essence: string; forWhom: string; howItWorks: string };
	canvas: Canvas;
	related: { title: string; summary: string }[];
	messages: ChatMessage[];
	locale: Locale;
	onCanvas: (field: string, value: string) => void;
}) {
	return streamText({
		kind: 'ideas.assistant',
		model: models.generate,
		system: `You are the Innovation Creator Assistant of the Małopolska Social Innovation Hub (ROPS Kraków). You help residents and NGOs develop a social innovation idea using the Social Innovation Canvas fields: ${CANVAS_FIELDS.join(', ')}.
Reply in ${LANG[opts.locale]}. Be concrete and encouraging, ask one question at a time, suggest at least one unconventional angle when useful, and point to similar innovations from the library when given. Keep answers under 180 words. When the user agrees on a canvas field, call save_canvas.`,
		messages: [
			{
				role: 'user',
				content: `Idea: ${JSON.stringify(opts.idea)}\nCanvas so far: ${JSON.stringify(opts.canvas)}\nSimilar innovations in the library: ${opts.related.map((r) => `${r.title} (${r.summary})`).join('; ') || 'none'}`
			},
			{ role: 'assistant', content: 'Rozumiem pomysł. W czym mogę pomóc?' },
			...opts.messages
		],
		tools: [saveCanvasTool],
		onToolUse: (name, input) => {
			const i = input as { field?: string; value?: string };
			if (name === 'save_canvas' && i.field && i.value) opts.onCanvas(i.field, i.value);
		},
		mock: () => {
			const last = opts.messages.at(-1);
			const q = typeof last?.content === 'string' ? last.content : '';
			const rel = opts.related[0];
			return `Dobry kierunek. Zacznijmy od problemu: kto dokładnie odczuwa go najbardziej i jak często? ${
				rel ? `W Bibliotece jest podobne rozwiązanie „${rel.title}”, warto sprawdzić, czym Twój pomysł się od niego różni. ` : ''
			}Nietypowy pomysł: zaangażuj osoby, których problem dotyczy, jako współprowadzących pilotaż.${q ? `\n\n(Twoja wiadomość: „${q.slice(0, 80)}”)` : ''}`;
		}
	});
}

// ---------- grant application pre-fill (always Polish) ----------

export async function applicationPrefill(opts: {
	idea: { title: string; essence: string; forWhom: string; howItWorks: string; stage: string };
	canvas: Canvas;
	call: { name: string; description: string };
	fields: FormField[];
}): Promise<Record<string, string>> {
	const shape = Object.fromEntries(opts.fields.map((f) => [f.key, z.string()]));
	const out = await structured({
		kind: 'calls.prefill',
		model: models.generate,
		maxTokens: 8000,
		system: `You pre-fill a grant application form for a social innovation in Polish, in a clear and factual style. Respect each field's maximum length. ${GROUNDING}`,
		user: `Call: ${opts.call.name}\n${opts.call.description}\n\nIdea: ${JSON.stringify(opts.idea)}\nCanvas: ${JSON.stringify(opts.canvas)}\n\nFields:\n${opts.fields
			.map((f) => `- ${f.key}: ${f.label_pl}${f.help_pl ? ` (${f.help_pl})` : ''}${f.max_length ? ` [max ${f.max_length} znaków]` : ''}${f.options ? ` options: ${f.options.join(' | ')}` : ''}`)
			.join('\n')}`,
		schema: z.object(shape),
		mock: () =>
			Object.fromEntries(
				opts.fields.map((f) => {
					const src: Record<string, string> = {
						title: opts.idea.title,
						problem: opts.canvas.problem ?? opts.idea.essence,
						beneficiaries: opts.canvas.beneficiaries ?? opts.idea.forWhom,
						solution: opts.canvas.solution ?? opts.idea.howItWorks,
						budget: opts.canvas.costs ?? 'brak danych',
						partners: opts.canvas.partners ?? 'brak danych'
					};
					const v = f.options ? f.options[0] : (src[f.key] ?? opts.idea.essence);
					return [f.key, f.max_length ? v.slice(0, f.max_length) : v];
				})
			)
	});
	return out as Record<string, string>;
}

// ---------- Middleman: implementation sheet ----------

export type InstitutionProfile = {
	institutionType: string;
	placeName?: string;
	populationBand: string;
	budgetBand: string;
	existingServices: string[];
	staff: string;
	notes?: string;
};

export function adaptStream(opts: {
	innovation: { title: string; description: string; implementationNotes: string; costHint: string; slug: string };
	profile: InstitutionProfile;
	placeStats?: string;
	locale: Locale;
}) {
	return streamText({
		kind: 'adapt.sheet',
		model: models.generate,
		system: `You are the "Middleman Innowacji" of the Małopolska Social Innovation Hub. You adapt a proven social innovation into a public service plan for a specific institution. Write Markdown in ${LANG[opts.locale]} with exactly these sections: "## Opis usługi", "## Dla kogo", "## Kroki wdrożenia" (numbered), "## Zasoby i role", "## Szacunkowe koszty" (ranges, clearly labelled as estimates), "## Ryzyka i jak im zapobiegać", "## Źródło". Translate the section headings if the language is not Polish. ${GROUNDING}`,
		messages: [
			{
				role: 'user',
				content: `Innovation:\n${JSON.stringify(opts.innovation)}\n\nInstitution profile:\n${JSON.stringify(opts.profile)}\n\nLocal context:\n${opts.placeStats ?? 'brak danych'}`
			}
		],
		mock: () => `## Opis usługi
${opts.innovation.title} jako usługa ${opts.profile.institutionType} ${opts.profile.placeName ? `w gminie ${opts.profile.placeName}` : ''}. ${opts.innovation.description}

## Dla kogo
Mieszkańcy gminy (${opts.profile.populationBand}), w pierwszej kolejności osoby wskazane w diagnozie potrzeb.

## Kroki wdrożenia
1. Powołanie koordynatora i zespołu (${opts.profile.staff}).
2. Diagnoza potrzeb i wybór grupy pilotażowej.
3. Przygotowanie regulaminu i umów z partnerami.
4. Pilotaż przez 3 miesiące z cotygodniowym monitoringiem.
5. Ocena, korekta i włączenie do programu usług społecznych.

## Zasoby i role
${opts.innovation.implementationNotes || 'brak danych'}
Istniejące usługi do wykorzystania: ${opts.profile.existingServices.join(', ') || 'brak danych'}.

## Szacunkowe koszty
Szacunek: ${opts.innovation.costHint || 'brak danych'} (budżet instytucji: ${opts.profile.budgetBand}). Kwoty są orientacyjne.

## Ryzyka i jak im zapobiegać
- Niska frekwencja: zaangażuj sołtysów i parafię w rekrutację.
- Rotacja kadry: dokumentuj procedury od pierwszego dnia.

## Źródło
Biblioteka Innowacji Społecznych ROPS Kraków: ${opts.innovation.slug}`
	});
}

function lowerFirst(s: string) {
	return s.charAt(0).toLowerCase() + s.slice(1);
}

export { type ChatMessage };
