// k6 load test (run with AI_MOCK=1 so no AI provider is hit):
//   k6 run -e BASE=http://localhost:3000 scripts/load/intake.js
// Simulates residents browsing the library, searching and opening the intake page.
// Live classification is rate-limited per user by design, so it is not hammered here.
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE || 'http://localhost:3000';
const QUERIES = [
	'samotność seniorów',
	'transport niepełnosprawni',
	'e-recepta',
	'depresja młodzież',
	'opieka wytchnieniowa'
];

export const options = {
	stages: [
		{ duration: '30s', target: 50 },
		{ duration: '1m', target: 200 },
		{ duration: '30s', target: 0 }
	],
	thresholds: { http_req_duration: ['p(95)<800'], http_req_failed: ['rate<0.01'] }
};

export default function () {
	check(http.get(`${BASE}/`), { home: (r) => r.status === 200 });
	const q = QUERIES[Math.floor(Math.random() * QUERIES.length)];
	check(http.get(`${BASE}/knowledge/library?q=${encodeURIComponent(q)}`), {
		search: (r) => r.status === 200
	});
	check(http.get(`${BASE}/report`), { intake: (r) => r.status === 200 });
	sleep(1);
}
