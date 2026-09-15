// Run only against npm run dev:milestone (isolated DB and local mailbox).
import { chromium } from '@playwright/test';
import { createClient } from '@libsql/client';
import { readFile, mkdir } from 'node:fs/promises';
import sharp from 'sharp';
import assert from 'node:assert/strict';
const base = 'http://localhost:5180';
const db = createClient({ url: 'file:.data/milestone.db' });
const browser = await chromium.launch({ headless: true });
const admin = await browser.newContext();
const reader = await browser.newContext();
const anon = await browser.newContext();
const page = await admin.newPage();
const rp = await reader.newPage();
const errors = [];
for (const p of [page, rp]) p.on('pageerror', (e) => errors.push(e.message));
async function login(p, email) {
  await p.goto(base + '/login');
  const age = p.getByRole('button', { name: 'I am 18 or older' });
  await age.waitFor();
  await age.click();
  await p.waitForTimeout(1000);
  await p.getByLabel('Email address').fill(email);
  await p.getByRole('button', { name: 'Email me a sign-in link' }).click();
  try {
    await p
      .getByRole('heading', { name: 'Check your inbox.' })
      .waitFor({ timeout: 10000 });
  } catch (e) {
    console.log(
      'Login error:',
      await p.locator('h1,.form-error,.notice,button').allTextContents(),
      errors,
    );
    await p.screenshot({ path: '.data/login-test.png' });
    throw e;
  }
  const mail = JSON.parse(
    await readFile('.data/milestone-mailbox.json', 'utf8'),
  );
  assert.equal(mail.email, email);
  assert.equal(new URL(mail.url).origin, base);
  await p.goto(mail.url);
  await p.waitForURL('**/account');
}
try {
  await db.execute('DELETE FROM rateLimit');
  await login(page, 'author@example.test');
  await login(rp, 'reader@example.test');
  const book = (
    await db.execute("SELECT id FROM books WHERE slug='the-hours-between'")
  ).rows[0];
  const chapterId = crypto.randomUUID(),
    slug = `image-check-${Date.now()}`;
  const max = (
    await db.execute({
      sql: 'SELECT MAX(chapter_number) AS n FROM chapters WHERE book_id=?',
      args: [book.id],
    })
  ).rows[0];
  await db.execute({
    sql: "INSERT INTO chapters(id,book_id,chapter_number,slug,title,content_markdown,is_free,status,created_at,updated_at) VALUES(?,?,?,?,?,'A protected test chapter.',0,'published','','')",
    args: [
      chapterId,
      book.id,
      Number(max.n) + 1,
      slug,
      'Illustrated test chapter',
    ],
  });
  const editor = `${base}/admin/books/${book.id}/chapters/${chapterId}`;
  const pixels = await sharp({
    create: { width: 300, height: 200, channels: 3, background: '#59826a' },
  })
    .png()
    .toBuffer();
  const editorResponse = await page.goto(editor);
  console.log(
    'Editor status',
    editorResponse.status(),
    await page.locator('h1').allTextContents(),
  );
  await page.locator('input[name="image"]').setInputFiles({
    name: 'illustration.png',
    mimeType: 'image/png',
    buffer: pixels,
  });
  await page.getByLabel('Caption / alternative text').fill('A quiet forest');
  await page.getByLabel('This image is AI-generated').check();
  await page
    .getByRole('button', { name: 'Upload illustration', exact: true })
    .click();
  await page
    .getByText('Image uploaded.', { exact: false })
    .waitFor({ timeout: 10000 })
    .catch(async (e) => {
      console.log(
        'Upload response',
        await page.locator('h1,.form-error,.notice').allTextContents(),
      );
      throw e;
    });
  for (let n = 1; n < 6; n++) {
    const response = await admin.request.post(editor + '?/upload', {
      headers: { origin: base },
      multipart: {
        caption: `Forest ${n}`,
        image_price: '9.99',
        image: { name: 'forest.png', mimeType: 'image/png', buffer: pixels },
      },
    });
    assert.equal(response.status(), 200);
  }
  const images = (
    await db.execute({
      sql: 'SELECT id FROM images WHERE chapter_id=? ORDER BY created_at,id',
      args: [chapterId],
    })
  ).rows;
  assert.equal(images.length, 6);
  await page.reload();
  await page.getByRole('button', { name: 'Insert in chapter' }).first().click();
  await page
    .getByLabel('Chapter text')
    .fill(
      'A protected test chapter.\n\n' +
        images.map((i) => `![Illustration](asset:${i.id})`).join('\n\n'),
    );
  await page.getByLabel('This chapter contains AI-generated text').check();
  await page
    .getByRole('button', { name: 'Save chapter', exact: false })
    .click();
  await page.getByText('Chapter saved.', { exact: true }).waitFor();
  const read = `${base}/read/the-hours-between/${slug}`;
  assert.equal(
    (await anon.request.get(`${base}/media/${images[0].id}`)).status(),
    403,
  );
  assert.equal(
    (
      await anon.request.get(`${base}/media/${images[0].id}?preview=1`)
    ).status(),
    403,
  );
  await rp.goto(read);
  await rp.getByRole('button', { name: 'Request access', exact: true }).click();
  await page.goto(base + '/admin/access');
  let panel = page
    .locator('section.panel')
    .filter({ hasText: 'Illustrated test chapter · chapter' })
    .first();
  await panel
    .getByLabel('Verified payment reference')
    .fill('LOCAL TEST chapter payment');
  await panel.getByRole('button', { name: 'Confirm and grant access' }).click();
  await rp.goto(read);
  await rp.getByText('A protected test chapter.', { exact: true }).waitFor();
  assert.equal(await rp.getByRole('link', { name: 'Unlock image' }).count(), 6);
  await rp
    .getByRole('link', { name: 'Complete your image collection — $50.00' })
    .waitFor();
  assert.equal(
    (await reader.request.get(`${base}/media/${images[0].id}`)).status(),
    403,
  );
  const preview = await reader.request.get(
    `${base}/media/${images[0].id}?preview=1`,
  );
  assert.equal(preview.status(), 200);
  await mkdir('.data/screenshots', { recursive: true });
  await rp.setViewportSize({ width: 390, height: 844 });
  await rp.screenshot({
    path: '.data/screenshots/images-locked-mobile.png',
    fullPage: true,
  });
  assert.ok(
    await rp.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  );
  await rp.getByRole('link', { name: 'Unlock image' }).first().click();
  await rp.getByRole('button', { name: 'Request access', exact: true }).click();
  await page.goto(base + '/admin/access');
  panel = page
    .locator('section.panel')
    .filter({ hasText: 'Illustrated test chapter · image' })
    .first();
  await panel
    .getByLabel('Verified payment reference')
    .fill('LOCAL TEST image payment');
  await panel.getByRole('button', { name: 'Confirm and grant access' }).click();
  await rp.goto(read);
  await rp
    .getByRole('link', { name: 'Complete your image collection — $40.01' })
    .waitFor();
  assert.equal(await rp.getByRole('link', { name: 'Unlock image' }).count(), 5);
  const original = await reader.request.get(`${base}/media/${images[0].id}`);
  assert.equal(original.status(), 200);
  assert.notDeepEqual(await original.body(), await preview.body());
  await rp
    .getByRole('link', { name: 'Complete your image collection' })
    .click();
  await rp.getByRole('button', { name: 'Request access', exact: true }).click();
  await page.goto(base + '/admin/access');
  panel = page
    .locator('section.panel')
    .filter({ hasText: 'Illustrated test chapter · bundle' })
    .first();
  await panel
    .getByLabel('Verified payment reference')
    .fill('LOCAL TEST bundle payment');
  await panel.getByRole('button', { name: 'Confirm and grant access' }).click();
  await rp.goto(read);
  assert.equal(await rp.getByRole('link', { name: 'Unlock image' }).count(), 0);
  await rp.screenshot({
    path: '.data/screenshots/images-unlocked-mobile.png',
    fullPage: true,
  });
  await rp.goto(base + '/library');
  await rp
    .getByRole('heading', { name: 'Illustrated test chapter' })
    .first()
    .waitFor();
  const forged = await reader.request.post(base + '/admin/access?/fulfill', {
    headers: { origin: base },
    form: { id: 'anything', reference: 'forged' },
  });
  assert.equal(forged.status(), 403);
  await rp.goto(read);
  await rp
    .getByText('Author disclosure: this chapter contains AI-generated text.', {
      exact: true,
    })
    .waitFor();
  await rp
    .getByText('Author disclosure: AI-generated image', { exact: true })
    .waitFor();
  await page.goto(base + '/admin/users?email=reader%40example.test');
  await page.locator('select[name="role"]').selectOption('author');
  await page.getByRole('button', { name: 'Update role', exact: true }).click();
  const writer = await browser.newContext(),
    wp = await writer.newPage();
  await login(wp, 'reader@example.test');
  assert.equal((await writer.request.get(editor)).status(), 404);
  assert.equal((await writer.request.get(base + '/admin/users')).status(), 403);
  await page.goto(`${base}/admin/books/${book.id}/team`);
  await page.getByLabel('Collaborator email').fill('reader@example.test');
  await page
    .getByRole('button', { name: 'Add collaborator', exact: true })
    .click();
  assert.equal((await writer.request.get(editor)).status(), 200);
  assert.equal(
    (await writer.request.get(`${base}/admin/books/${book.id}/team`)).status(),
    403,
  );
  await page
    .getByRole('button', { name: 'Remove collaborator', exact: true })
    .click();
  assert.equal((await writer.request.get(editor)).status(), 404);
  await page.goto(base + '/admin/users?email=reader%40example.test');
  await page.locator('select[name="role"]').selectOption('reader');
  await page.getByRole('button', { name: 'Update role', exact: true }).click();
  await writer.close();
  assert.deepEqual(errors, []);
  console.log(
    'PASS: local upload, six blurred previews, protected originals, chapter request, image purchase credit, collection completion, library, mobile layout, AI disclosures, admin role changes and scoped collaborator grant/removal.',
  );
} finally {
  await browser.close();
  db.close();
}
