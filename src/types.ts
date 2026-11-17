import type { Context, Hono } from 'hono';

export type Env = {
  DB: D1Database;
  ASSETS?: R2Bucket;
  STATIC?: Fetcher;
  APP_URL?: string;
};

export type App = Hono<{ Bindings: Env; Variables: { customStore?: string } }>;
export type AppContext = Context<{ Bindings: Env; Variables: { customStore?: string } }>;

export type UserRow = {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  first_name: string | null;
  last_name: string | null;
  bio: string | null;
  whatsapp_number: string;
  avatar_url: string | null;
  role: string;
  created_at: string;
};

export type StoreRow = {
  username: string;
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  user_bio: string | null;
  whatsapp_number: string;
  avatar_url: string | null;
  logo_url: string | null;
  store_name: string;
  tagline: string;
  store_bio: string | null;
  currency: string;
  theme: string | null;
  button_style: string;
  show_badge: number;
  section_order: string;
  status: string;
  custom_domain: string | null;
  custom_domain_request: string | null;
  social_links: string | null;
  trust_badges_json: string | null;
  banners_json: string | null;
};

export type ProductRow = {
  store_username: string;
  product_id: string;
  image_url: string;
  images_json: string | null;
  name: string;
  price: number;
  description: string;
  status: string;
  created_at: string;
  category: string;
  stock: number;
  collection_name: string | null;
  variants_json: string | null;
  highlights_json: string | null;
};

export type PostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  cover_url: string;
  category: string;
  status: string;
  author_id: string | null;
  meta_description: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

export type ShowcaseRow = {
  id: string;
  store_username: string;
  title: string;
  description: string;
  image_url: string;
  link_url: string;
  file_url: string;
  sort_order: number;
  created_at: string;
};

export type OrderRow = {
  id: string;
  store_username: string;
  product_id: string;
  quantity: number;
  revenue: number;
  date: string;
  notes: string | null;
  status: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  payment_method: string;
};
