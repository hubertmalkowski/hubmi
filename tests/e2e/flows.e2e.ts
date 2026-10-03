import { test, expect, type Page } from '@playwright/test';

async function login(page: Page, name: RegExp) {
	await page.goto('/login');
	await page.getByRole('button', { name }).click();
	await page.waitForURL((u) => !u.pathname.startsWith('/login'));
}

test('report a need → live classification → results page', async ({ page }) => {
	await page.goto('/report', { waitUntil: 'networkidle' });
	await page
		.getByLabel('Na czym polega problem?')
		.fill(
			'W naszej wsi seniorzy siedzą całymi dniami sami w domach w Zawoi. Nie ma domu kultury, a autobus jeździ dwa razy dziennie.'
		);
	// live classification shows the detected place
	await expect(page.getByText(/Miejsce: Zawoja/)).toBeVisible({ timeout: 15_000 });
	await page.getByRole('button', { name: 'Znajdź rozwiązania' }).click();
	await page.waitForURL(/\/report\/[0-9a-f-]{36}$/);
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Wyniki dla Twojego zgłoszenia');
	// either matches or an open challenge, never an empty page
	await expect(
		page.getByRole('heading', {
			name: /Pasujące rozwiązania|Nie ma jeszcze sprawdzonego rozwiązania/
		})
	).toBeVisible({ timeout: 30_000 });
	await expect(page.getByRole('heading', { name: 'Historia zgłoszenia' })).toBeVisible();
});

test('personal data is redacted before the report is shown to others', async ({
	page,
	browser
}) => {
	await page.goto('/report');
	await page
		.getByLabel('Na czym polega problem?')
		.fill(
			'Pan Jan Kowalski, tel. 600 123 456, mieszka sam w Tarnowie i od tygodnia nie wychodzi z domu. Sąsiedzi się martwią.'
		);
	await page.getByRole('button', { name: 'Znajdź rozwiązania' }).click();
	await page.waitForURL(/\/report\/[0-9a-f-]{36}$/);
	await expect(
		page.getByRole('heading', { name: /Pasujące|Nie ma jeszcze|czeka na sprawdzenie/ })
	).toBeVisible({ timeout: 30_000 });
	// a different visitor sees the redacted text only
	const other = await browser.newPage();
	await other.goto(page.url());
	const quote = other.locator('blockquote');
	await expect(quote).not.toContainText('Kowalski');
	await expect(quote).not.toContainText('600 123 456');
	await other.close();
});

test('idea → admin reply → author sees the reply and new status', async ({ page, browser }) => {
	await login(page, /Ola \(NGO\)/);
	await page.goto('/ideas/new', { waitUntil: 'networkidle' });
	await page.getByLabel('Nazwa pomysłu').fill('Wiejskie śniadania sąsiedzkie');
	await page
		.getByLabel('Na czym polega pomysł i jaki problem rozwiązuje?')
		.fill(
			'Raz w tygodniu sąsiedzi jedzą razem śniadanie w świetlicy, żeby samotni seniorzy mieli kontakt z ludźmi.'
		);
	await page.getByRole('button', { name: 'Dalej' }).click();
	await page.getByLabel('Komu pomoże?').fill('Samotnym seniorom na wsi');
	await page.getByRole('button', { name: 'Dalej' }).click();
	await page
		.getByLabel('Jak to działa w praktyce?')
		.fill(
			'Koło gospodyń przygotowuje śniadanie, wolontariusze przywożą seniorów, gmina użycza świetlicy.'
		);
	await page.getByRole('button', { name: 'Dalej' }).click();
	await page.getByRole('button', { name: 'Wyślij pomysł' }).click();
	await page.waitForURL(/\/ideas\/[0-9a-f-]{36}\?created=1/);
	const ideaUrl = page.url().split('?')[0];

	const admin = await browser.newPage();
	await login(admin, /Zespół ROPS/);
	await admin.goto('/admin', { waitUntil: 'networkidle' });
	const card = admin.locator('li', { hasText: 'Wiejskie śniadania sąsiedzkie' }).first();
	await card.getByRole('button', { name: 'Szkic odpowiedzi' }).click();
	await expect(card.getByLabel('Odpowiedź do autora')).not.toHaveValue('', { timeout: 15_000 });
	await card.getByLabel('Zmień status').selectOption('in_review');
	await card.getByRole('button', { name: 'Wyślij odpowiedź' }).click();
	await expect(admin.getByText('Odpowiedź wysłana')).toBeVisible();
	await admin.close();

	await page.goto(ideaUrl);
	await expect(page.getByText('W ocenie').first()).toBeVisible();
	await expect(page.getByText('Zespół Hubu Innowacji Społecznych')).toBeVisible();
});

test('library search highlights Polish inflected matches', async ({ page }) => {
	await page.goto('/knowledge/library?q=' + encodeURIComponent('samotność seniorów'));
	await expect(page.getByRole('status')).toContainText('Znaleziono');
	await expect(page.locator('mark').first()).toBeVisible();
});

test('closed grant calls cannot be applied to', async ({ page }) => {
	await login(page, /Ola \(NGO\)/);
	await page.goto('/calls');
	await expect(page.getByRole('heading', { name: 'Trwające nabory' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Złóż wniosek' })).toHaveCount(1);
});
