# AI 뉴스 수집 앱 — PRD

## 1. 프로젝트 개요

해외 AI 뉴스(TechCrunch AI, The Verge AI 등)를 RSS로 수집하여 Claude API로 한국어 번역/요약·카테고리 자동 분류한 뒤, 카드 형태로 보여주는 멀티유저 웹 앱. 사용자는 로그인 후 '뉴스 가져오기' 버튼으로 필요할 때마다 뉴스를 수집하고, 카테고리별로 필터링해 보며, 관심 있는 뉴스는 Notion에 저장할 수 있다.

## 2. 핵심 기능

1. **로그인**: Clerk 기반 인증. 로그인하지 않으면 앱에 접근할 수 없음(멀티유저, 각자 계정으로 사용).
2. **뉴스 가져오기**: '뉴스 가져오기' 버튼 클릭 시 등록된 RSS 피드에서 신규 뉴스를 수집(주기적 크론이 아닌 on-demand).
3. **번역/요약**: Claude API가 영문 원문을 한국어로 번역하고 요약.
4. **카테고리 자동 분류**: Claude API가 사용자가 정의한 카테고리 목록 중에서만 뉴스를 분류.
5. **카테고리 관리**: 기본 카테고리를 미리 제공하고, 사용자가 자유롭게 추가/삭제/수정 가능.
6. **카테고리별 필터링**: 특정 카테고리에 해당하는 뉴스만 선택해서 볼 수 있음.
7. **Notion 저장**: 뉴스 카드의 'Notion 저장' 버튼 클릭 시 해당 뉴스를 사용자의 Notion에 저장 (Notion MCP 서버를 통한 연동).

## 3. 사용자 흐름

1. 앱 접속 → 로그인하지 않았으면 Clerk 로그인/회원가입 화면으로 이동
2. 로그인 성공 → 메인 피드 화면 진입 (최초 로그인 시 기본 카테고리 자동 생성)
3. '뉴스 가져오기' 버튼 클릭
   → 서버가 RSS 피드 파싱 → 신규 기사 추출 → Claude로 번역/요약(기사당 1회, 캐싱) → 사용자의 카테고리 목록 기준으로 Claude가 분류 → 결과를 카드 목록으로 화면에 표시
4. 카테고리 필터 UI에서 특정 카테고리를 선택 → 해당 카테고리의 뉴스 카드만 표시
5. 설정 화면에서 카테고리 추가/수정/삭제 → 다음 '뉴스 가져오기' 시 변경된 카테고리 기준으로 재분류
6. 뉴스 카드의 'Notion 저장' 버튼 클릭
   → (최초 1회) Notion 계정 연동 OAuth 진행 → 이후에는 클릭 시 바로 해당 뉴스가 사용자의 Notion에 페이지로 저장되고, 카드에 '저장됨' 표시

## 4. 기술 스택

| 영역 | 기술 |
|---|---|
| 프레임워크 | Next.js (App Router) |
| 로그인 | Clerk |
| 데이터베이스 | Neon (Postgres) + Drizzle ORM (`neon-http` 드라이버) |
| 번역/요약/분류 | Claude API (`@anthropic-ai/sdk`) |
| Notion 저장 | Notion MCP 서버 (`@modelcontextprotocol/sdk`, OAuth 2.0 + PKCE + Dynamic Client Registration) |
| 배포 | Vercel |

## 5. 데이터베이스 구조

- **users**: `id`(Clerk userId), `email`, `createdAt`
- **articles** (전역 캐시, `url` UNIQUE): `titleOriginal`, `contentOriginal`, `source`, `publishedAt`, `titleKo`, `summaryKo`, `translationStatus`(pending/completed/failed), `translationError`
  - 같은 기사를 여러 사용자가 가져와도 번역/요약은 기사당 1회만 수행 (Claude API 비용 절감)
- **categories**: `userId`, `name`, `description`(Claude 분류 정확도 향상용), `isDefault`, `position` — `UNIQUE(userId, name)`
- **articleClassifications**: `userId`, `articleId`, `categoryId`(nullable, `ON DELETE SET NULL`), `classificationStatus`(pending/classified/failed) — `UNIQUE(userId, articleId)`. 사용자별 피드 역할도 겸함. 카테고리 삭제 시 참조 행은 `pending`으로 되돌려 다음 fetch 때 재분류
- **notionConnections**: `userId` PK, `accessTokenEnc`/`refreshTokenEnc`(AES-256-GCM 암호화), `tokenExpiresAt`, `workspaceName`, `defaultParentPageId`
- **mcpOauthClientRegistrations**: Notion MCP의 Dynamic Client Registration 결과를 앱 전체에서 1회만 등록해 캐시
- **notionSaves**: `userId`, `articleId`, `notionPageId`, `notionPageUrl`, `savedAt` — `UNIQUE(userId, articleId)`로 중복 저장 방지

## 6. 구현 단계

| 단계 | 내용 | 검증 방법 |
|---|---|---|
| M0 | 프로젝트 초기화 (Next.js, 의존성 설치) | `npm run dev` 기본 페이지 로드 |
| M1 | DB/스키마 구축 (Neon + Drizzle) | `drizzle-kit studio`로 테이블 확인 |
| M2 | Clerk 로그인 연동 + 기본 카테고리 자동 생성 | 비로그인 접근 시 redirect, 로그인 후 기본 카테고리 생성 확인 |
| M3 | RSS 수집 + Claude 번역/요약 파이프라인 | `/api/news/fetch` 호출 후 번역 결과 저장 확인, 재요청 시 중복 호출 없음 확인 |
| M4 | 카테고리 CRUD + Claude 분류 파이프라인 | 카테고리 추가/삭제 후 재분류 동작 확인 |
| M5 | 카드 UI + 카테고리 필터링 | 가져오기 → 카드 렌더 → 필터 전환 확인 |
| M6 | Notion MCP 연동 (OAuth + 저장) | 연결 → 저장 버튼 클릭 → 실제 Notion에 페이지 생성 확인, 중복 저장 방지 확인 |
| M7 | Vercel 배포 | 배포 URL에서 전체 플로우(로그인→가져오기→필터→Notion 저장) 재현 |

> Notion 저장 기능은 공식 REST API 직접 연동보다 복잡한 MCP 기반 방식을 선택했으며, OAuth 핸드셰이크 세부 스펙과 MCP 툴 스키마를 M6 착수 시점에 실제 연결 테스트로 먼저 확인해야 한다.
