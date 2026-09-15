import { chromium } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createClient } from '@libsql/client';

const base = 'http://localhost:5173';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const db = createClient({ url: 'file:local.db' });
const slug = `browser-check-${Date.now()}`;
try {
  await page.goto(base);
  await page.getByRole('button', { name: 'I am 18 or older' }).click();
  await page
    .getByRole('heading', { name: 'Some stories stay with you.' })
    .waitFor();
  await mkdir('.data/screenshots', { recursive: true });
  await page.screenshot({
    path: '.data/screenshots/home-desktop.png',
    fullPage: true,
  });
  // Rasterize the original vector app icon, preserving the vector as its source.
  for (const size of [192, 512]) {
    const icon = await context.newPage();
    await icon.setViewportSize({ width: size, height: size });
    await icon.goto(`${base}/icon.svg`);
    await icon.screenshot({
      path: `static/icon-${size}.png`,
      omitBackground: true,
    });
    await icon.close();
  }
  const paid = await context.request.get(
    `${base}/read/the-hours-between/the-space-between-words`,
    { maxRedirects: 0 },
  );
  assert.equal(paid.status(), 303);
  assert.ok(!(await paid.text()).includes('Private sample chapter'));
  const draft = await context.request.get(
    `${base}/read/the-hours-between/what-remains-unsaid`,
  );
  assert.equal(draft.status(), 404);
  const payload = await context.request.get(
    `${base}/books/the-hours-between/__data.json`,
  );
  assert.ok(!(await payload.text()).includes('content_markdown'));
  const csrf = await context.request.post(`${base}/admin/books/new`, {
    headers: { origin: 'https://evil.test' },
    form: { title: 'Forged' },
  });
  assert.equal(csrf.status(), 403);
  await page.goto(`${base}/read/the-hours-between/an-unexpected-beginning`);
  await page.getByText('The rain had stopped', { exact: false }).waitFor();
  await page.getByRole('button', { name: 'Reader settings' }).click();
  await page.getByLabel('Appearance').selectOption('dark');
  await page.reload();
  await page.locator('.reader-dark').waitFor();
  await page.getByRole('button', { name: 'Reader settings' }).click();
  await page.getByLabel('Appearance').selectOption('sepia');
  await page.getByRole('button', { name: 'Reader settings' }).click();
  await page.screenshot({
    path: '.data/screenshots/reader-desktop.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base);
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: '.data/screenshots/home-mobile.png',
    fullPage: true,
  });
  await page.goto(`${base}/read/the-hours-between/an-unexpected-beginning`);
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: '.data/screenshots/reader-mobile.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto(`${base}/admin`);
  await page.waitForURL('**/login?next=/admin');
  await page.getByLabel('Email address').fill('author@example.test');
  await page.getByRole('button', { name: 'Email me a sign-in link' }).click();
  await page.getByRole('heading', { name: 'Check your inbox.' }).waitFor();
  const mail = JSON.parse(await readFile('.data/mailbox.json', 'utf8'));
  assert.equal(mail.email, 'author@example.test');
  await page.goto(mail.url);
  await page.waitForURL(`${base}/admin`);
  await page.getByRole('link', { name: 'Create a book' }).click();
  await page.getByLabel('Book title').fill('Browser Check Story');
  await page.getByLabel('URL slug').fill(slug);
  await page
    .getByLabel('Description', { exact: true })
    .fill('An automated publishing acceptance test.');
  await page.getByLabel('Publication status').selectOption('published');
  await page.getByRole('button', { name: 'Create book' }).click();
  await page.getByRole('link', { name: 'Add chapter' }).click();
  await page.getByLabel('Chapter title').fill('A tested beginning');
  await page.getByLabel('URL slug').fill('a-tested-beginning');
  await page
    .getByLabel('Chapter text')
    .fill(
      'A browser-tested first chapter.\n\n**A safe, strong sentence.**\n\n<script>window.storyXss=true</script>',
    );
  await page.getByRole('button', { name: 'Preview Markdown' }).click();
  await page
    .getByRole('heading', { name: 'Unsaved Markdown preview' })
    .waitFor();
  assert.equal(await page.evaluate(() => window.storyXss), undefined);
  await page.getByLabel('Publication status').selectOption('published');
  await page.getByLabel('Free chapter').check();
  await page.getByRole('button', { name: 'Save chapter' }).click();
  await page.getByText('Chapter saved.', { exact: true }).waitFor();
  const anonymous = await browser.newContext();
  const published = await anonymous.request.get(
    `${base}/read/${slug}/a-tested-beginning`,
  );
  assert.equal(published.status(), 200);
  assert.ok(
    (await published.text()).includes('A browser-tested first chapter.'),
  );
  assert.ok(!(await published.text()).includes('window.storyXss'));
  await page.getByLabel('Publication status').selectOption('draft');
  await page.getByRole('button', { name: 'Save chapter' }).click();
  await page.getByText('Chapter saved.', { exact: true }).waitFor();
  // Wait for the enhanced form request to complete before checking another session.
  await page.waitForLoadState('networkidle');
  const unpublished = await anonymous.request.get(
    `${base}/read/${slug}/a-tested-beginning`,
  );
  assert.equal(unpublished.status(), 404);
  // Regression: return to the book and reopen a second, non-free chapter.
  await page.locator('.back-link').click();
  await page.getByRole('link', { name: 'Add chapter' }).click();
  await page.getByLabel('Chapter title').fill('Second private chapter');
  await page.getByLabel('URL slug').fill('second-private-chapter');
  await page.getByLabel('Chapter number').fill('2');
  await page.getByLabel('Chapter text').fill('Private regression fixture.');
  await page.getByRole('button', { name: 'Save chapter' }).click();
  await page.waitForURL(/chapters\/(?!new)[^/]+\?saved=1$/);
  await page.locator('.back-link').click();
  await page.getByRole('link', { name: /Second private chapter/ }).click();
  assert.equal(
    await page.getByLabel('Chapter title').inputValue(),
    'Second private chapter',
  );
  assert.equal(
    await page.getByLabel('Publication status').inputValue(),
    'draft',
  );
  await page.getByLabel('Publication status').selectOption('published');
  await page.getByRole('button', { name: 'Save chapter' }).click();
  await page.waitForLoadState('networkidle');
  await page.locator('.back-link').click();
  await page.getByRole('link', { name: /Second private chapter/ }).click();
  assert.equal(
    await page.getByLabel('Publication status').inputValue(),
    'published',
  );
  assert.equal(
    (
      await anonymous.request.get(
        `${base}/read/${slug}/second-private-chapter`,
        { maxRedirects: 0 },
      )
    ).status(),
    303,
  );
  await anonymous.close();
  await page.goto(`${base}/account`);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.waitForURL(base + '/');
  await page.goto(`${base}/login?next=/admin`);
  await page.getByLabel('Email address').fill('reader@example.test');
  await page.getByRole('button', { name: 'Email me a sign-in link' }).click();
  await page.getByRole('heading', { name: 'Check your inbox.' }).waitFor();
  const readerMail = JSON.parse(await readFile('.data/mailbox.json', 'utf8'));
  assert.equal(readerMail.email, 'reader@example.test');
  await page.goto(readerMail.url);
  const denied = await page.goto(`${base}/admin`);
  assert.equal(denied.status(), 403);
  const mutation = await context.request.post(`${base}/admin/books/new`, {
    form: { title: 'Forbidden' },
  });
  assert.equal(mutation.status(), 403);
  assert.deepEqual(errors, []);
  console.log(
    'PASS: desktop/mobile UI, safe Markdown, paid/draft isolation, CSRF, magic-link login and continuation, admin publishing, anonymous reading, unpublishing, logout, reader admin denial.',
  );
} catch (error) {
  await page.screenshot({
    path: '.data/screenshots/failure.png',
    fullPage: true,
  });
  throw error;
} finally {
  const rows = await db.execute({
    sql: 'SELECT id FROM books WHERE slug=?',
    args: [slug],
  });
  for (const row of rows.rows) {
    await db.batch(
      [
        {
          sql: 'DELETE FROM audit_log WHERE target_id IN (SELECT id FROM chapters WHERE book_id=?) OR target_id=?',
          args: [row.id, row.id],
        },
        { sql: 'DELETE FROM chapters WHERE book_id=?', args: [row.id] },
        { sql: 'DELETE FROM books WHERE id=?', args: [row.id] },
      ],
      'write',
    );
  }
  db.close();
  await browser.close();
}
