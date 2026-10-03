import { Client } from '@elastic/elasticsearch';
import { env } from '../env';

export const es = new Client({
	node: env.elasticsearchUrl,
	...(env.elasticsearchApiKey ? { auth: { apiKey: env.elasticsearchApiKey } } : {}),
	requestTimeout: 5000,
	maxRetries: 2
});
