import { createClient } from '@libsql/client';
import { readFile, readdir } from 'node:fs/promises';
try {
  process.loadEnvFile('.env');
} catch {
  /* Environment can also come from the shell. */
}
const url = process.env.TURSO_DATABASE_URL || 'file:local.db';
const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
const command = process.argv[2];
if (!['migrate', 'seed', 'reset'].includes(command))
  throw new Error('Use migrate, seed, or reset.');
if (
  (command === 'seed' || command === 'reset') &&
  (!url.startsWith('file:') || process.env.NODE_ENV === 'production')
)
  throw new Error('Demo seed and reset are local-development operations only.');
if (command === 'reset') {
  for (const table of [
    'audit_log',
    'product_contents',
    'products',
    'chapters',
    'books',
    'session',
    'account',
    'verification',
    'rateLimit',
    'user',
    'migrations',
  ])
    await db.execute(`DROP TABLE IF EXISTS "${table}"`);
}
await db.execute('PRAGMA foreign_keys=ON');
await db.execute(
  'CREATE TABLE IF NOT EXISTS migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)',
);
for (const file of (await readdir('migrations'))
  .filter((file) => file.endsWith('.sql'))
  .sort()) {
  if (
    (
      await db.execute({
        sql: 'SELECT name FROM migrations WHERE name=?',
        args: [file],
      })
    ).rows.length
  )
    continue;
  const statements = (await readFile(`migrations/${file}`, 'utf8'))
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
  await db.batch(
    [
      ...statements,
      {
        sql: 'INSERT INTO migrations VALUES (?,?)',
        args: [file, new Date().toISOString()],
      },
    ],
    'write',
  );
  console.log(`Applied ${file}`);
}
if (command === 'seed' || command === 'reset') {
  const now = new Date().toISOString();
  for (const [email, role, name] of [
    [process.env.ADMIN_EMAIL || 'author@example.test', 'admin', 'Alex Morgan'],
    ['reader@example.test', 'reader', 'Sample Reader'],
  ]) {
    await db.execute({
      sql: 'INSERT INTO user (id,name,email,emailVerified,createdAt,updatedAt,role) VALUES (?,?,?,0,?,?,?) ON CONFLICT(email) DO NOTHING',
      args: [crypto.randomUUID(), name, email, Date.now(), Date.now(), role],
    });
  }
  const samples = [
    [
      'the-hours-between',
      'The Hours Between',
      'Some encounters change the way you see everything.',
      'A letter left in a secondhand book. A stranger who knows the city by its silences. Two lives crossing in the hour when anything still feels possible.',
      'Slow burn,Contemporary,City nights',
    ],
    [
      'a-place-to-return',
      'A Place to Return',
      'The coast remembers what we try to forget.',
      'When June returns to the seaside town she left a decade ago, she finds the old house waiting—and a familiar face on the other side of the garden wall.',
      'Second chances,Coastal,Romance',
    ],
    [
      'the-last-light',
      'The Last Light',
      'One summer. A house full of secrets.',
      'An invitation to a remote artists’ retreat brings a restless photographer to the mountains. As summer slips away, the stories they tell each other begin to change.',
      'Atmospheric,Slow burn,Mystery',
    ],
  ];
  for (const [slug, title, subtitle, description, tags] of samples) {
    const id = crypto.randomUUID();
    const inserted = await db.execute({
      sql: "INSERT INTO books (id,slug,title,subtitle,description,author_name,tags,status,published_at,created_at,updated_at) VALUES (?,?,?,?,?,'Alex Morgan',?,'published',?,?,?) ON CONFLICT(slug) DO NOTHING",
      args: [id, slug, title, subtitle, description, tags, now, now, now],
    });
    if (!inserted.rowsAffected) continue;
    for (const [index, chapterTitle] of [
      'An unexpected beginning',
      'The space between words',
      'What remains unsaid',
    ].entries()) {
      const text = `The rain had stopped by the time the bookshop closed. Along the street, windows held the last of the afternoon light, each one a small, imperfect reflection of the sky.\n\nMara stood beneath the awning and unfolded the note again. It was written on thick cream paper, the kind people save for something they cannot quite bring themselves to say aloud.\n\n*If you find this, I hope you are somewhere you want to be.*\n\nThere was no name. No address. Only a small drawing of a window, open to the sea.\n\nShe had bought the book for its cover: a faded green cloth binding, its title almost worn away. Now she turned it over in her hands as though it might offer an explanation.\n\n“Most people leave receipts,” someone said.\n\nThe bookseller was leaning against the doorframe, his coat over one shoulder. Mara had noticed him earlier, carefully repairing a torn page with a brush and a strip of paper so thin she could see the light through it.\n\n“And you?” she asked.\n\n“Train tickets. Places I thought I might go back to.”\n\nAcross the road, a café switched on its lamps. The street was beginning its evening transformation, ordinary things becoming briefly unfamiliar. Mara looked at the note once more.\n\n“I don’t think this was meant for me.”\n\n“Maybe not,” he said. “But you found it.”\n\nFor a moment neither of them moved. Then he nodded toward the café, a question rather than a suggestion, and she found herself smiling before she had decided what to say.\n\n---\n\nLater, she would remember the smallest things: a chipped cup, the smell of wet wool, the way he listened without preparing an answer. She would forget what she ordered. She would forget the time.\n\nBut she would remember putting the note between them on the table, and the quiet certainty that something had begun.`;
      await db.execute({
        sql: 'INSERT INTO chapters (id,book_id,chapter_number,slug,title,summary,content_markdown,is_free,status,published_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
        args: [
          crypto.randomUUID(),
          id,
          index + 1,
          [
            'an-unexpected-beginning',
            'the-space-between-words',
            'what-remains-unsaid',
          ][index],
          chapterTitle,
          'An ordinary afternoon takes an unexpected turn.',
          index === 0
            ? text
            : 'Private sample chapter. This text must never be returned to an anonymous reader.',
          index === 0 ? 1 : 0,
          index === 2 ? 'draft' : 'published',
          index === 2 ? null : now,
          now,
          now,
        ],
      });
    }
    const product = crypto.randomUUID();
    await db.execute({
      sql: "INSERT INTO products (id,slug,name,product_type,price_cents,created_at,updated_at) VALUES (?,?,?,'book',900,?,?)",
      args: [product, `${slug}-complete`, `${title} — Complete Book`, now, now],
    });
    await db.execute({
      sql: "INSERT INTO product_contents VALUES (?,?,'book',?,?)",
      args: [crypto.randomUUID(), product, id, now],
    });
  }
  console.log(
    'Local demo seeded. Admin: ' +
      (process.env.ADMIN_EMAIL || 'author@example.test') +
      '. No passwords or login bypasses were created.',
  );
}
db.close();
