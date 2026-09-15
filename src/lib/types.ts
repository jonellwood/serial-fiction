export interface Book {
  owner_user_id: string | null;
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  cover_image_url: string;
  author_name: string;
  tags: string;
  content_notice: string;
  status: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  chapter_count?: number;
}
export interface Chapter {
  id: string;
  book_id: string;
  chapter_number: number;
  slug: string;
  title: string;
  summary: string;
  content_markdown: string;
  content_notice: string;
  is_free: number;
  ai_generated: number;
  price_cents: number;
  image_bundle_cents: number;
  status: string;
  published_at: string | null;
}
