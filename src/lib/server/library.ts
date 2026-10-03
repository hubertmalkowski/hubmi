import { and, desc, eq, inArray, sql as dsql, arrayContains } from 'drizzle-orm';
import { db } from './db';
import { innovations } from './db/schema';
import { hybridSearch } from './search/hybrid';
import { es } from './search/es';
import { INDEX } from './search/indices';

export type LibraryQuery = {
	q?: string;
	area?: string;
	group?: string;
	stage?: string;
	page?: number;
};
export const PAGE_SIZE = 12;

export type LibraryItem = {
	id: string;
	slug: string;
	title: string;
	summary: string;
	areaSlug: string;
	targetGroups: string[];
	stage: string;
	highlights?: Partial<Record<'title' | 'summary' | 'description', string[]>>;
};

/** Library listing: hybrid search when there is a query, otherwise filtered browse. */
export async function searchLibrary(
	qy: LibraryQuery
): Promise<{ items: LibraryItem[]; total: number }> {
	const filters = {
		area: qy.area || undefined,
		group: qy.group || undefined,
		stage: qy.stage || undefined
	};
	if (qy.q?.trim()) {
		const hits = await hybridSearch({ text: qy.q, filters, size: 30, depth: 30 });
		const rows = hits.length
			? await db
					.select()
					.from(innovations)
					.where(
						inArray(
							innovations.id,
							hits.map((h) => h.id)
						)
					)
			: [];
		const byId = new Map(rows.map((r) => [r.id, r]));
		const items = hits.flatMap((h) => {
			const r = byId.get(h.id);
			return r ? [{ ...toItem(r), highlights: h.highlights }] : [];
		});
		return { items, total: items.length };
	}
	const where = and(
		eq(innovations.status, 'published'),
		filters.area ? eq(innovations.areaSlug, filters.area) : undefined,
		filters.group ? arrayContains(innovations.targetGroups, [filters.group]) : undefined,
		filters.stage
			? eq(innovations.stage, filters.stage as 'idea' | 'prototype' | 'tested' | 'implemented')
			: undefined
	);
	const page = Math.max(1, qy.page ?? 1);
	const [rows, [{ n }]] = await Promise.all([
		db
			.select()
			.from(innovations)
			.where(where)
			.orderBy(desc(innovations.stage), innovations.title)
			.limit(PAGE_SIZE)
			.offset((page - 1) * PAGE_SIZE),
		db
			.select({ n: dsql<number>`count(*)::int` })
			.from(innovations)
			.where(where)
	]);
	return { items: rows.map(toItem), total: n };
}

function toItem(r: typeof innovations.$inferSelect): LibraryItem {
	return {
		id: r.id,
		slug: r.slug,
		title: r.title,
		summary: r.summary,
		areaSlug: r.areaSlug,
		targetGroups: r.targetGroups,
		stage: r.stage
	};
}

/** Nearest innovations by embedding (for "related" lists). */
export async function relatedInnovations(id: string, embedding: number[] | null, k = 3) {
	if (!embedding?.length) return [];
	try {
		const res = await es.search<{ slug: string; title: string; summary: string }>({
			index: INDEX.innovations,
			size: k + 1,
			knn: {
				field: 'embedding',
				query_vector: embedding,
				k: k + 1,
				num_candidates: 50,
				filter: { term: { status: 'published' } }
			},
			_source: ['slug', 'title', 'summary']
		});
		return res.hits.hits
			.filter((h) => h._id !== id && h._source)
			.slice(0, k)
			.map((h) => h._source!);
	} catch {
		return [];
	}
}
