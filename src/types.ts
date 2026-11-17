import type { Context, Hono } from 'hono';

export type Env = {
  DB: D1Database;
  ASSETS?: R2Bucket;
  STATIC?: Fetcher;
  APP_URL?: string;
};

export type App = Hono<{ Bindings: Env }>;
export type AppContext = Context<{ Bindings: Env }>;

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
