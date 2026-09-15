ALTER TABLE books ADD COLUMN owner_user_id TEXT REFERENCES user(id);
CREATE INDEX books_owner ON books(owner_user_id);
CREATE TABLE book_collaborators (book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE, PRIMARY KEY(book_id,user_id));
ALTER TABLE chapters ADD COLUMN ai_generated INTEGER NOT NULL DEFAULT 0 CHECK(ai_generated IN (0,1));
ALTER TABLE images ADD COLUMN ai_generated INTEGER NOT NULL DEFAULT 0 CHECK(ai_generated IN (0,1));
