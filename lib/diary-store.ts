import { env } from 'cloudflare:workers';
export function diaryDB(){const db=(env as any).DB as D1Database | undefined;if(!db)throw new Error('DIARY_STORAGE_UNAVAILABLE');return db;}
