ALTER TABLE chapters ADD COLUMN price_cents INTEGER NOT NULL DEFAULT 299 CHECK(price_cents >= 0);
ALTER TABLE chapters ADD COLUMN image_bundle_cents INTEGER NOT NULL DEFAULT 5000 CHECK(image_bundle_cents >= 0);
CREATE TABLE images (id TEXT PRIMARY KEY, chapter_id TEXT NOT NULL REFERENCES chapters(id), caption TEXT NOT NULL, price_cents INTEGER NOT NULL CHECK(price_cents >= 0), created_at TEXT NOT NULL);
CREATE INDEX images_chapter ON images(chapter_id);
CREATE TABLE orders (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES user(id), chapter_id TEXT NOT NULL REFERENCES chapters(id), kind TEXT NOT NULL CHECK(kind IN ('chapter','image','bundle')), total_cents INTEGER NOT NULL CHECK(total_cents >= 0), status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','fulfilled','cancelled')), reference TEXT, created_at TEXT NOT NULL);
CREATE INDEX orders_user ON orders(user_id,status);
CREATE TABLE order_items (order_id TEXT NOT NULL REFERENCES orders(id), content_type TEXT NOT NULL CHECK(content_type IN ('chapter','image')), content_id TEXT NOT NULL, credit_cents INTEGER NOT NULL CHECK(credit_cents >= 0), PRIMARY KEY(order_id,content_type,content_id));
CREATE TABLE entitlements (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES user(id), content_type TEXT NOT NULL CHECK(content_type IN ('chapter','image')), content_id TEXT NOT NULL, credit_cents INTEGER NOT NULL DEFAULT 0, order_id TEXT REFERENCES orders(id), revoked_at TEXT, created_at TEXT NOT NULL);
CREATE UNIQUE INDEX entitlement_active ON entitlements(user_id,content_type,content_id) WHERE revoked_at IS NULL;
