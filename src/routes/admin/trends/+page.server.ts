import { trends } from '$lib/server/trends';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => trends();
