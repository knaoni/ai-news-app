import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// 공식 @notionhq/notion-mcp-server(v2.6.1)를 stdio로 매번 새로 띄워서 호출한다.
// 실제 라이브 호출로 확인한 동작(최신 Notion API의 database/data source 분리 때문에
// 아래 순서가 꼭 필요함):
// - API-retrieve-a-database: { database_id } -> 이제 properties를 직접 주지 않고
//   data_sources: [{ id, name }] 배열만 반환한다(데이터베이스 자체에는 속성 스키마가 없음).
// - API-retrieve-a-data-source: { data_source_id } -> 실제 속성 스키마(이름별 type)는
//   여기서만 얻을 수 있다.
// - API-post-page: parent는 { type: "data_source_id", data_source_id }여야 한다
//   (database_id를 parent로 주면 속성을 못 찾아 "title 속성을 찾을 수 없습니다" 류의
//   오류가 난다 — 실제로 겪은 문제).
const NOTION_MCP_SERVER_BIN = path.join(
  process.cwd(),
  "node_modules/@notionhq/notion-mcp-server/bin/cli.mjs",
);

type NotionToolContent = { type: string; text?: string };
type NotionToolResult = { content?: NotionToolContent[]; isError?: boolean };

async function withNotionMcpClient<T>(
  run: (client: Client) => Promise<T>,
): Promise<T> {
  const token = process.env.NOTION_API_KEY;
  if (!token) {
    throw new Error("NOTION_API_KEY 환경 변수가 설정되어 있지 않습니다.");
  }

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [NOTION_MCP_SERVER_BIN],
    env: { ...process.env, NOTION_TOKEN: token },
  });
  const client = new Client({ name: "ai-news-collector", version: "0.1.0" });

  try {
    await client.connect(transport);
    return await run(client);
  } finally {
    await client.close();
  }
}

async function callNotionTool(
  client: Client,
  name: string,
  args: Record<string, unknown>,
) {
  const result = (await client.callTool({ name, arguments: args })) as NotionToolResult;
  const text = result.content?.find((block) => block.type === "text")?.text ?? "";

  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  // 실제로 401 등 Notion API 오류가 나면 MCP 결과의 isError 플래그는 설정되지 않고,
  // text 안에 {status, object: "error", message} 형태의 Notion 에러 객체가 그대로 담겨온다
  // (라이브 호출로 확인함). 두 경우를 모두 오류로 처리한다.
  const isNotionErrorPayload = parsed?.object === "error";
  if (result.isError || isNotionErrorPayload) {
    const message =
      (isNotionErrorPayload ? (parsed?.message as string | undefined) : undefined) ??
      (text || "알 수 없는 오류");
    throw new Error(`Notion API 오류(${name}): ${message}`);
  }

  return { parsed, text };
}

type DataSourceSchema = {
  dataSourceId: string;
  // 속성 타입(title/rich_text/url/select/date 등) -> 실제 속성 이름.
  // 워크스페이스마다 속성 이름(한글/영문 등)이 다를 수 있어 이름 대신 타입으로 찾는다.
  propertyNameByType: Record<string, string>;
};

// 데이터 소스 스키마는 거의 바뀌지 않으므로 프로세스 생존 기간 동안 캐싱해 불필요한
// Notion API 호출(API-retrieve-a-database, API-retrieve-a-data-source)을 줄인다.
let cachedSchema: DataSourceSchema | null = null;

async function getDataSourceSchema(
  client: Client,
  databaseId: string,
): Promise<DataSourceSchema> {
  if (cachedSchema) {
    return cachedSchema;
  }

  const { parsed: database } = await callNotionTool(client, "API-retrieve-a-database", {
    database_id: databaseId,
  });

  const dataSources = database?.data_sources as
    | Array<{ id: string; name: string }>
    | undefined;
  const dataSourceId = dataSources?.[0]?.id;
  if (!dataSourceId) {
    throw new Error("Notion 데이터베이스에서 data source를 찾을 수 없습니다.");
  }

  const { parsed: dataSource } = await callNotionTool(
    client,
    "API-retrieve-a-data-source",
    { data_source_id: dataSourceId },
  );

  const properties = dataSource?.properties as
    | Record<string, { type: string }>
    | undefined;
  if (!properties) {
    throw new Error("Notion data source에서 속성 스키마를 찾을 수 없습니다.");
  }

  const propertyNameByType: Record<string, string> = {};
  for (const [name, value] of Object.entries(properties)) {
    // 같은 타입이 여러 개면 먼저 나온 것을 사용한다(이 앱은 타입당 속성이 하나뿐인
    // 데이터베이스를 전제로 한다).
    if (!(value.type in propertyNameByType)) {
      propertyNameByType[value.type] = name;
    }
  }

  if (!propertyNameByType.title) {
    throw new Error("Notion 데이터베이스에서 title 속성을 찾을 수 없습니다.");
  }

  cachedSchema = { dataSourceId, propertyNameByType };
  return cachedSchema;
}

export type NotionArticleInput = {
  title: string;
  summary: string | null;
  url: string;
  source: string;
  categoryName: string | null;
  publishedAt: Date | null;
};

export type NotionSavedPage = {
  pageId: string;
  pageUrl: string;
};

export async function saveArticleToNotion(
  article: NotionArticleInput,
): Promise<NotionSavedPage> {
  const databaseId = process.env.NOTION_DATABASE_ID;
  if (!databaseId) {
    throw new Error("NOTION_DATABASE_ID 환경 변수가 설정되어 있지 않습니다.");
  }

  return withNotionMcpClient(async (client) => {
    const { dataSourceId, propertyNameByType } = await getDataSourceSchema(
      client,
      databaseId,
    );

    const properties: Record<string, unknown> = {
      [propertyNameByType.title]: {
        title: [{ type: "text", text: { content: article.title } }],
      },
    };

    if (propertyNameByType.rich_text && article.summary) {
      properties[propertyNameByType.rich_text] = {
        rich_text: [{ type: "text", text: { content: article.summary } }],
      };
    }

    if (propertyNameByType.url) {
      properties[propertyNameByType.url] = { url: article.url };
    }

    if (propertyNameByType.select && article.categoryName) {
      properties[propertyNameByType.select] = {
        select: { name: article.categoryName },
      };
    }

    if (propertyNameByType.date) {
      const date = article.publishedAt ?? new Date();
      properties[propertyNameByType.date] = {
        date: { start: date.toISOString().slice(0, 10) },
      };
    }

    const { parsed } = await callNotionTool(client, "API-post-page", {
      parent: { type: "data_source_id", data_source_id: dataSourceId },
      properties,
    });

    const pageId = parsed?.id;
    const pageUrl = parsed?.url;
    if (typeof pageId !== "string" || typeof pageUrl !== "string") {
      throw new Error("Notion 페이지 생성 응답을 해석할 수 없습니다.");
    }

    return { pageId, pageUrl };
  });
}
