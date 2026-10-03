// Embeddings: Voyage multilingual model, or a deterministic hashed bag-of-stems
// vector offline (cosine similarity then tracks lexical overlap).
import { VoyageAIClient } from 'voyageai';
import { env, mockEmbeddings } from '../env';
import { recordAi } from './audit';
import { stems, fold } from './text';

let client: VoyageAIClient | undefined;
const getClient = () => (client ??= new VoyageAIClient({ apiKey: env.voyageApiKey }));

export const embeddingModel = () => (mockEmbeddings() ? 'mock-hash' : env.embeddingModel);

function mockVector(text: string): number[] {
	const dims = env.embeddingDims;
	const v = new Array<number>(dims).fill(0);
	const add = (tok: string, w: number) => {
		let h = 2166136261;
		for (let i = 0; i < tok.length; i++) h = Math.imul(h ^ tok.charCodeAt(i), 16777619);
		v[Math.abs(h) % dims] += w;
	};
	for (const s of stems(text)) add(s, 1);
	const f = fold(text).replace(/[^a-z0-9 ]/g, ' ');
	for (let i = 0; i < f.length - 3; i++) add(f.slice(i, i + 4), 0.15);
	const norm = Math.hypot(...v) || 1;
	return v.map((x) => x / norm);
}

export async function embed(texts: string[], inputType: 'query' | 'document'): Promise<number[][]> {
	if (!texts.length) return [];
	if (mockEmbeddings()) return texts.map(mockVector);
	const started = performance.now();
	const out: number[][] = [];
	for (let i = 0; i < texts.length; i += 64) {
		const batch = texts.slice(i, i + 64);
		const res = await getClient().embed({
			input: batch,
			model: env.embeddingModel,
			inputType,
			outputDimension: env.embeddingDims
		});
		for (const d of res.data ?? []) out.push(d.embedding ?? []);
		recordAi({
			kind: `embed.${inputType}`,
			provider: 'voyage',
			model: env.embeddingModel,
			usage: { input_tokens: res.usage?.totalTokens ?? 0 },
			latencyMs: performance.now() - started
		});
	}
	return out;
}

export async function embedOne(text: string, inputType: 'query' | 'document') {
	return (await embed([text], inputType))[0];
}

export function cosine(a: number[], b: number[]) {
	let dot = 0;
	let na = 0;
	let nb = 0;
	for (let i = 0; i < a.length; i++) {
		dot += a[i] * b[i];
		na += a[i] * a[i];
		nb += b[i] * b[i];
	}
	return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}
