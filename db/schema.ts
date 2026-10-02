import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
export const diaryDays = sqliteTable('diary_days', {
  owner: text('owner').notNull(), date: text('date').notNull(),
  content: text('content').notNull(), revision: integer('revision').notNull().default(1),
  updatedAt: text('updated_at').notNull(),
}, t => [primaryKey({ columns: [t.owner, t.date] })]);
