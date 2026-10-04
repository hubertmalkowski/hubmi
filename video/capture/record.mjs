// Records the showcase scenes from the running app as sharp 30fps clips.
// Needs the app on BASE_URL (default http://localhost:5173) with AI_MOCK=1 and a fresh `pnpm db:seed`.
// Usage (from the repo root): node video/capture/record.mjs [scene...]
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.BASE_URL ?? 'http://localhost:5173';
const CHROMIUM = process.env.PW_CHROMIUM_PATH;
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CLIPS = join(ROOT, 'public', 'clips');
const FPS = 30;
const VIEWPORT = { width: 1600, height: 900 };
const SCALE = 2;

mkdirSync(CLIPS, { recursive: true });

// Headless screencasts have no cursor and show scrollbars. Draw a cursor that follows
// the mouse (with a click ripple) and hide scrollbars on every page load.
const CURSOR_SCRIPT = `
(() => {
	const install = () => {
		if (document.getElementById('__cursor')) return;
		const style = document.createElement('style');
		style.textContent = \`
			html { scrollbar-width: none; }
			::-webkit-scrollbar { display: none; }
			#__cursor { position: fixed; left: 0; top: 0; z-index: 2147483647; pointer-events: none;
				width: 26px; height: 26px; transform: translate(-200px, -200px);
				filter: drop-shadow(0 2px 3px rgba(0,0,0,.35)); }
			.__ripple { position: fixed; z-index: 2147483646; pointer-events: none; width: 44px; height: 44px;
				margin: -22px 0 0 -22px; border-radius: 999px; border: 3px solid #ffdd00;
				box-shadow: 0 0 0 2px rgba(11,12,12,.6); animation: __rip .55s ease-out forwards; }
			@keyframes __rip { from { transform: scale(.3); opacity: 1 } to { transform: scale(1.5); opacity: 0 } }
		\`;
		document.head.appendChild(style);
		const c = document.createElement('div');
		c.id = '__cursor';
		c.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 2.5l15 9.2-6.6 1.4 3.9 7.2-3 1.6-3.9-7.3L4.3 19z" fill="#0b0c0c" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
		document.body.appendChild(c);
		const pos = window.__cursorPos;
		if (pos) c.style.transform = 'translate(' + pos[0] + 'px,' + pos[1] + 'px)';
		addEventListener('mousemove', (e) => {
			window.__cursorPos = [e.clientX, e.clientY];
			c.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)';
		}, true);
		addEventListener('mousedown', (e) => {
			const r = document.createElement('div');
			r.className = '__ripple';
			r.style.left = e.clientX + 'px';
			r.style.top = e.clientY + 'px';
			document.body.appendChild(r);
			setTimeout(() => r.remove(), 600);
		}, true);
	};
	if (document.body) install(); else addEventListener('DOMContentLoaded', install);
})();
`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Records `fn` via CDP screencast and writes video/public/clips/<name>.mp4 plus <name>.json markers. */
async function record(page, name, fn) {
	const cdp = await page.context().newCDPSession(page);
	const frames = [];
	cdp.on('Page.screencastFrame', async (f) => {
		frames.push({ data: f.data, t: Date.now() / 1000 });
		await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
	});
	const markers = {};
	const t0 = Date.now() / 1000;
	const mark = async (key, locator) => {
		const m = { t: Date.now() / 1000 - t0 };
		if (locator) m.box = await locator.boundingBox({ timeout: 1500 }).catch(() => null);
		markers[key] = m;
	};
	await cdp.send('Page.startScreencast', {
		format: 'jpeg',
		quality: 92,
		maxWidth: VIEWPORT.width * SCALE,
		maxHeight: VIEWPORT.height * SCALE,
		everyNthFrame: 1
	});
	await fn(mark);
	await sleep(300);
	const end = Date.now() / 1000;
	await cdp.send('Page.stopScreencast');
	await cdp.detach();

	const dir = join(CLIPS, `.${name}`);
	rmSync(dir, { recursive: true, force: true });
	mkdirSync(dir);
	// Screencast frames arrive only when the page repaints; hold each frame until the next one.
	const lines = [];
	frames.forEach((f, i) => {
		const file = `${String(i).padStart(5, '0')}.jpg`;
		writeFileSync(join(dir, file), Buffer.from(f.data, 'base64'));
		const next = frames[i + 1]?.t ?? end;
		lines.push(`file '${file}'`, `duration ${Math.max(next - f.t, 0.001).toFixed(4)}`);
	});
	lines.push(`file '${String(frames.length - 1).padStart(5, '0')}.jpg'`);
	writeFileSync(join(dir, 'list.txt'), lines.join('\n'));
	const out = join(CLIPS, `${name}.mp4`);
	execFileSync('ffmpeg', [
		'-y',
		'-loglevel',
		'error',
		'-f',
		'concat',
		'-safe',
		'0',
		'-i',
		join(dir, 'list.txt'),
		'-vf',
		`fps=${FPS},scale=${VIEWPORT.width * SCALE}:${VIEWPORT.height * SCALE}:flags=lanczos,format=yuv420p`,
		'-c:v',
		'libx264',
		'-preset',
		'slow',
		'-crf',
		'14',
		'-movflags',
		'+faststart',
		out
	]);
	rmSync(dir, { recursive: true, force: true });
	// Shift marker times to the clip's first frame.
	const first = frames[0]?.t ?? t0;
	for (const m of Object.values(markers)) m.t = +(m.t - (first - t0)).toFixed(3);
	writeFileSync(join(CLIPS, `${name}.json`), JSON.stringify(markers, null, 2));
	console.log(`${name}: ${frames.length} frames, ${(end - frames[0].t).toFixed(1)}s`);
}

/** Moves the mouse along an eased path, like a person would. */
async function glide(page, locator, { steps = 28, dx = 0.5, dy = 0.5 } = {}) {
	const box = await locator.boundingBox();
	const to = [box.x + box.width * dx, box.y + box.height * dy];
	const from = await page.evaluate(
		() => window.__cursorPos ?? [innerWidth * 0.62, innerHeight * 0.78]
	);
	for (let i = 1; i <= steps; i++) {
		const k = i / steps;
		const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
		await page.mouse.move(from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e);
		await sleep(14);
	}
}

async function smoothScroll(page, y, ms = 900) {
	await page.evaluate(
		([y, ms]) =>
			new Promise((done) => {
				const start = scrollY,
					t0 = performance.now();
				const step = (now) => {
					const k = Math.min((now - t0) / ms, 1);
					const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
					scrollTo(0, start + (y - start) * e);
					if (k < 1) requestAnimationFrame(step);
					else done();
				};
				requestAnimationFrame(step);
			}),
		[y, ms]
	);
}

async function newPage(browser, { a11y, user } = {}) {
	const ctx = await browser.newContext({
		viewport: VIEWPORT,
		deviceScaleFactor: SCALE,
		locale: 'pl-PL'
	});
	if (a11y) {
		await ctx.addCookies([
			{
				name: 'a11y',
				value: encodeURIComponent(
					JSON.stringify({ scale: 100, contrast: false, dark: false, easy: false, ...a11y })
				),
				url: BASE
			}
		]);
	}
	await ctx.addInitScript(CURSOR_SCRIPT);
	const page = await ctx.newPage();
	if (user) {
		await page.goto(`${BASE}/login`);
		await page.getByRole('button', { name: user }).click();
		await page.waitForURL((u) => !u.pathname.startsWith('/login'));
	}
	return page;
}

const REPORT =
	'Moja mama z Kościeliska chce rozmawiać z wnukami za granicą przez wideorozmowę, ale nie ma tabletu ani internetu.';

const scenes = {
	// Resident types a problem, sees live hints, submits, gets a redacted report and a match.
	async report(browser) {
		const page = await newPage(browser);
		// Warm the routes so the recording has no compile delays.
		await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
		await page.goto('about:blank');
		await record(page, 'report', async (mark) => {
			await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
			await page.mouse.move(1100, 760);
			await sleep(900);
			const ta = page.locator('textarea').first();
			await glide(page, ta, { dx: 0.3, dy: 0.35 });
			await page.mouse.down();
			await page.mouse.up();
			await ta.focus();
			await mark('typeStart', ta);
			await ta.pressSequentially(REPORT, { delay: 38 });
			await mark('typeEnd', ta);
			await page.getByText('Podobne w Bibliotece').waitFor({ timeout: 15_000 });
			await sleep(400);
			await mark(
				'preview',
				page
					.getByText('Podobne w Bibliotece')
					.locator('xpath=ancestor::*[self::section or self::div][2]')
			);
			await mark('place', page.getByText('Kościelisko', { exact: true }).first());
			await sleep(1600);
			const send = page.locator('form button[type=submit]').first();
			await glide(page, send);
			await sleep(150);
			await mark('submit', send);
			await send.click();
			await page.waitForURL(/\/report\/[0-9a-f-]{36}$/);
			await mark('resultsLoad');
			await page
				.getByRole('heading', { name: /Pasujące rozwiązania/ })
				.waitFor({ timeout: 30_000 });
			await mark('matched', page.getByRole('heading', { name: /Pasujące rozwiązania/ }));
			await sleep(500);
			await mark('quote', page.locator('blockquote').first());
			await mark(
				'matchCard',
				page.locator('article, li, div').filter({ hasText: 'Dlaczego pasuje' }).last()
			);
			await mark('notOnly', page.getByText('Nie tylko u Ciebie'));
			const adopt = page.getByRole('link', { name: /Wdroż u siebie/ }).first();
			await sleep(1200);
			await glide(page, adopt);
			await mark('adopt', adopt);
			await sleep(2600);
		});
		await page.context().close();
	},

	// County map of open challenges.
	async map(browser) {
		const page = await newPage(browser);
		await page.goto(`${BASE}/knowledge`, { waitUntil: 'networkidle' });
		await page.goto('about:blank');
		await record(page, 'map', async (mark) => {
			await page.goto(`${BASE}/knowledge`, { waitUntil: 'networkidle' });
			await page.mouse.move(1300, 300);
			await sleep(600);
			await smoothScroll(page, 330, 1400);
			await sleep(300);
			const svg = page
				.locator('svg')
				.filter({ has: page.locator('path') })
				.nth(0);
			await mark('map', svg);
			const target = page.getByText('wielicki', { exact: true }).first();
			await glide(page, target, { steps: 36 });
			await mark('county', target);
			await sleep(2600);
		});
		await page.context().close();
	},

	// Open challenges list.
	async challenges(browser) {
		const page = await newPage(browser);
		await page.goto(`${BASE}/challenges`, { waitUntil: 'networkidle' });
		await page.goto('about:blank');
		await record(page, 'challenges', async (mark) => {
			await page.goto(`${BASE}/challenges`, { waitUntil: 'networkidle' });
			await page.mouse.move(1200, 500);
			await sleep(700);
			await smoothScroll(page, 360, 1600);
			const btn = page.getByRole('link', { name: /Mam pomysł/ }).nth(2);
			await glide(page, btn);
			await mark('idea', btn);
			await sleep(1600);
		});
		await page.context().close();
	},

	// NGO fills in an idea card; the completeness checklist ticks as she types.
	async idea(browser) {
		const page = await newPage(browser, { user: /Ola \(NGO\)/ });
		await page.goto(`${BASE}/ideas/new`, { waitUntil: 'networkidle' });
		await page.goto('about:blank');
		await record(page, 'idea', async (mark) => {
			await page.goto(`${BASE}/ideas/new`, { waitUntil: 'networkidle' });
			await page.mouse.move(1200, 600);
			await sleep(500);
			const name = page.getByLabel('Nazwa pomysłu');
			await glide(page, name, { dx: 0.2 });
			await page.mouse.down();
			await page.mouse.up();
			await name.pressSequentially('Sąsiedzkie śniadania', { delay: 35 });
			const desc = page.getByLabel('Na czym polega pomysł i jaki problem rozwiązuje?');
			await glide(page, desc, { dx: 0.2 });
			await page.mouse.down();
			await page.mouse.up();
			await mark('checklist', page.getByText('Czy fiszka jest kompletna?').locator('xpath=..'));
			await desc.pressSequentially(
				'Raz w tygodniu sąsiedzi jedzą razem śniadanie w świetlicy, żeby samotni seniorzy mieli kontakt z ludźmi. Koło gospodyń gotuje, wolontariusze przywożą seniorów.',
				{ delay: 22 }
			);
			await mark('typed');
			await sleep(1800);
		});
		await page.context().close();
	},

	// ROPS dashboard with regional trends.
	async trends(browser) {
		const page = await newPage(browser, { user: /Zespół ROPS/ });
		await page.goto(`${BASE}/admin/trends`, { waitUntil: 'networkidle' });
		await page.goto('about:blank');
		await record(page, 'trends', async (mark) => {
			await page.goto(`${BASE}/admin/trends`, { waitUntil: 'networkidle' });
			await page.mouse.move(1300, 700);
			await mark('stats', page.getByText('Wszystkie zgłoszenia').locator('xpath=../..'));
			await sleep(800);
			await smoothScroll(page, 260, 1600);
			await sleep(1600);
		});
		await page.context().close();
	},

	// Same home page in three accessibility variants for the split-screen moment.
	async a11y(browser) {
		const variants = [
			['a11y-contrast', { contrast: true, scale: 150 }, '/'],
			['a11y-dark', { dark: true }, '/'],
			['a11y-uk', {}, '/uk']
		];
		for (const [name, a11y, path] of variants) {
			const page = await newPage(browser, { a11y });
			await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
			await page.goto('about:blank');
			await record(page, name, async () => {
				await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
				await sleep(2800);
			});
			await page.context().close();
		}
	}
};

const browser = await chromium.launch(CHROMIUM ? { executablePath: CHROMIUM } : {});
const wanted = process.argv.slice(2);
for (const [name, fn] of Object.entries(scenes)) {
	if (wanted.length && !wanted.includes(name)) continue;
	await fn(browser);
}
await browser.close();
if (!existsSync(CLIPS)) process.exit(1);
