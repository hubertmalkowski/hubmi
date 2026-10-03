import { desc, eq, sql as dsql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { testCampaigns, testSignups, innovations } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const rows = await db
		.select({
			id: testCampaigns.id,
			title: testCampaigns.title,
			description: testCampaigns.description,
			slots: testCampaigns.slots,
			open: testCampaigns.open,
			innovation: innovations.title,
			signed: dsql<number>`(select count(*)::int from ${testSignups} where ${testSignups.campaignId} = ${testCampaigns.id})`
		})
		.from(testCampaigns)
		.leftJoin(innovations, eq(innovations.id, testCampaigns.innovationId))
		.orderBy(desc(testCampaigns.open), desc(testCampaigns.createdAt));
	return { campaigns: rows };
};
