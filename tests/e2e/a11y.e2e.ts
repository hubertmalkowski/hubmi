import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function login(page: Page, name: RegExp) {
	await page.goto('/login');
	await page.getByRole('button', { name }).click();
	await page.waitForURL((u) => !u.pathname.startsWith('/login'));
}

async function axe(page: Page) {
	const r = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
		.analyze();
	const serious = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
	expect(
		serious.map(
			(v) =>
				`${v.id}: ${v.nodes
					.map((n) => n.target.join(' '))
					.slice(0, 3)
					.join(', ')}`
		)
	).toEqual([]);
}

const publicPages = [
	'/',
	'/report',
	'/knowledge',
	'/knowledge/library',
	'/knowledge/library/teleopieka-z-opaska',
	'/knowledge/materials',
	'/challenges',
	'/calls',
	'/tests',
	'/login',
	'/adapt/teleopieka-z-opaska'
];

for (const path of publicPages) {
	test(`no serious WCAG 2.1 AA violations: ${path}`, async ({ page }) => {
		await page.goto(path, { waitUntil: 'networkidle' });
		await axe(page);
	});
}

test('no serious violations in high contrast + dark + 150% text', async ({ page }) => {
	await page.goto('/');
	await page.evaluate(() => {
		document.cookie = `a11y=${encodeURIComponent(JSON.stringify({ scale: 150, contrast: true, dark: true, easy: false }))}; path=/`;
	});
	for (const path of ['/', '/report', '/knowledge']) {
		await page.goto(path, { waitUntil: 'networkidle' });
		await axe(page);
	}
});

test('admin pages are accessible', async ({ page }) => {
	await login(page, /Zespół ROPS/);
	for (const path of ['/admin', '/admin/trends', '/admin/innovations', '/admin/calls']) {
		await page.goto(path, { waitUntil: 'networkidle' });
		await axe(page);
	}
});

test('html lang follows the locale', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
	await page.goto('/en/report');
	await expect(page.locator('html')).toHaveAttribute('lang', 'en');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Describe the problem');
	await page.goto('/uk/report');
	await expect(page.locator('html')).toHaveAttribute('lang', 'uk');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Опишіть проблему');
});
