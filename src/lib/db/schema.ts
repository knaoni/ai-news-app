import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// enums
// ---------------------------------------------------------------------------

export const translationStatusEnum = pgEnum("translation_status", [
  "pending",
  "completed",
  "failed",
]);

export const classificationStatusEnum = pgEnum("classification_status", [
  "pending",
  "classified",
  "failed",
]);

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk userId (예: "user_xxx")
  email: text("email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// articles (전역 캐시 — 기사당 번역/요약은 1회만 수행)
// ---------------------------------------------------------------------------

export const articles = pgTable(
  "articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    url: text("url").notNull(),
    titleOriginal: text("title_original").notNull(),
    contentOriginal: text("content_original").notNull(),
    source: text("source").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    titleKo: text("title_ko"),
    summaryKo: text("summary_ko"),
    translationStatus: translationStatusEnum("translation_status")
      .notNull()
      .default("pending"),
    translationError: text("translation_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("articles_url_unique").on(table.url)],
);

// ---------------------------------------------------------------------------
// categories (사용자별)
// ---------------------------------------------------------------------------

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    color: text("color").notNull().default("#71717a"),
    isDefault: boolean("is_default").notNull().default(false),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("categories_user_id_name_unique").on(table.userId, table.name),
  ],
);

// ---------------------------------------------------------------------------
// articleClassifications (조인 테이블이자 사용자별 피드)
// ---------------------------------------------------------------------------

export const articleClassifications = pgTable(
  "article_classifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    classificationStatus: classificationStatusEnum("classification_status")
      .notNull()
      .default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("article_classifications_user_id_article_id_unique").on(
      table.userId,
      table.articleId,
    ),
  ],
);

// ---------------------------------------------------------------------------
// notionConnections (사용자별, 1:1 — 토큰은 애플리케이션에서 AES-256-GCM 암호화 후 저장)
// ---------------------------------------------------------------------------

export const notionConnections = pgTable("notion_connections", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  accessTokenEnc: text("access_token_enc").notNull(),
  refreshTokenEnc: text("refresh_token_enc"),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
  workspaceName: text("workspace_name"),
  defaultParentPageId: text("default_parent_page_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

// ---------------------------------------------------------------------------
// mcpOauthClientRegistrations (Notion MCP 서버에 대한 Dynamic Client
// Registration 결과를 앱 전체에서 1회만 등록해 캐시 — userId 없음)
//
// 주의: PRD/CLAUDE.md에 정확한 컬럼이 명시되어 있지 않아 RFC 7591 Dynamic
// Client Registration 응답 구조를 기준으로 잠정 설계함. M6에서 Notion MCP
// 서버와 실제 OAuth 핸드셰이크를 해본 뒤 컬럼을 재검토할 것.
// ---------------------------------------------------------------------------

export const mcpOauthClientRegistrations = pgTable(
  "mcp_oauth_client_registrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mcpServerUrl: text("mcp_server_url").notNull(),
    clientId: text("client_id").notNull(),
    clientSecretEnc: text("client_secret_enc"),
    registrationPayload: jsonb("registration_payload"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("mcp_oauth_client_registrations_server_url_unique").on(
      table.mcpServerUrl,
    ),
  ],
);

// ---------------------------------------------------------------------------
// notionSaves (사용자별, 중복 저장 방지)
// ---------------------------------------------------------------------------

export const notionSaves = pgTable(
  "notion_saves",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    notionPageId: text("notion_page_id").notNull(),
    notionPageUrl: text("notion_page_url").notNull(),
    savedAt: timestamp("saved_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("notion_saves_user_id_article_id_unique").on(
      table.userId,
      table.articleId,
    ),
  ],
);

// ---------------------------------------------------------------------------
// relations
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many, one }) => ({
  categories: many(categories),
  articleClassifications: many(articleClassifications),
  notionConnection: one(notionConnections, {
    fields: [users.id],
    references: [notionConnections.userId],
  }),
  notionSaves: many(notionSaves),
}));

export const articlesRelations = relations(articles, ({ many }) => ({
  classifications: many(articleClassifications),
  notionSaves: many(notionSaves),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, {
    fields: [categories.userId],
    references: [users.id],
  }),
  classifications: many(articleClassifications),
}));

export const articleClassificationsRelations = relations(
  articleClassifications,
  ({ one }) => ({
    user: one(users, {
      fields: [articleClassifications.userId],
      references: [users.id],
    }),
    article: one(articles, {
      fields: [articleClassifications.articleId],
      references: [articles.id],
    }),
    category: one(categories, {
      fields: [articleClassifications.categoryId],
      references: [categories.id],
    }),
  }),
);

export const notionConnectionsRelations = relations(
  notionConnections,
  ({ one }) => ({
    user: one(users, {
      fields: [notionConnections.userId],
      references: [users.id],
    }),
  }),
);

export const notionSavesRelations = relations(notionSaves, ({ one }) => ({
  user: one(users, {
    fields: [notionSaves.userId],
    references: [users.id],
  }),
  article: one(articles, {
    fields: [notionSaves.articleId],
    references: [articles.id],
  }),
}));
