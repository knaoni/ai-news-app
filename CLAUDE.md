# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 커뮤니케이션 규칙

1. 모든 작업 설명, 진행 상황, 질문, 오류 원인, 해결 방법, 최종 결과는 한국어로 작성한다.
2. 영어로 표시되는 기술 용어는 필요할 때만 사용하고, 초보자도 이해할 수 있도록 한국어로 설명한다.
3. 작업 완료 후에는 무엇을 수정했는지, 정상 작동 여부, 다음에 해야 할 일을 한국어로 간단하게 정리한다.
4. 사용자가 직접 선택하거나 승인해야 하는 경우, 어떤 번호를 선택해야 하는지 한국어로 안내한다.
5. 프로그램 내부의 변수명, 함수명, 파일명 등은 기존 영어 표기를 유지한다.
6. 이 CLAUDE.md의 다른 규칙은 삭제하거나 변경하지 않는다.

## 프로젝트 현황

이 저장소는 현재 **M0** 단계(프로젝트 스캐폴드만 존재)입니다 — 전체 마일스톤 표는 `PRD.md` §6 참고. `src/app/`에는 아직 `create-next-app`이 생성한 기본 페이지만 있고, 앱 기능/DB 스키마/인증/외부 연동은 전혀 구현되지 않았습니다. 제품 범위, 데이터 모델, 빌드 순서에 대해서는 `PRD.md`를 기준 문서로 삼고, 어떤 마일스톤이든 작업 시작 전에 먼저 읽을 것. UI/컴포넌트 작업(특히 M5 대시보드·카드 UI)을 할 때는 `ui.md`의 레이아웃·컬러·컴포넌트 스타일 규칙을 먼저 확인할 것.

## 명령어

```bash
npm run dev      # Next.js 개발 서버 (Turbopack), http://localhost:3000
npm run build    # 프로덕션 빌드
npm run start    # 프로덕션 빌드 서빙
npm run lint      # eslint (flat config, eslint-config-next core-web-vitals + typescript)
```

아직 테스트 러너는 설정되어 있지 않습니다. `drizzle-kit` 설정 파일도 아직 없음(M1에서 필요 — 아래 참고).

## 기술 스택 (`PRD.md` §4 기준)

| 영역 | 선택 |
|---|---|
| 프레임워크 | Next.js 16 (App Router), TypeScript, Tailwind CSS v4, `src/` 레이아웃, `@/*` → `./src/*` |
| 인증 | Clerk (`@clerk/nextjs`) |
| DB | Neon Postgres + Drizzle ORM (`drizzle-orm`, `@neondatabase/serverless`, `neon-http` 드라이버), 스키마는 `drizzle-kit`으로 관리 |
| LLM | Claude API (`@anthropic-ai/sdk`) — 번역, 요약, 카테고리 분류에 사용 |
| Notion | `@modelcontextprotocol/sdk`로 Notion MCP 서버에 OAuth 2.0 + PKCE + Dynamic Client Registration 방식으로 연결 (Notion REST API 직접 호출 아님) |
| 배포 | Vercel |

**알아둘 설치 이슈:** `npm install` 과정에서 `esbuild`의 postinstall 스크립트(`drizzle-kit`이 내부적으로 사용)가 차단됩니다. M1에서 `drizzle-kit` 명령이 실패하면 먼저 `npm install-scripts approve esbuild` (또는 `npm rebuild`)를 실행할 것.

## 아키텍처 (설계 단계 — 전체 내용은 `PRD.md` 참고)

이 앱은 멀티유저 구조이며, 번역/요약된 기사 본문은 전역으로 캐시되지만 분류와 저장 상태는 사용자별로 분리되어 있습니다. 쿼리와 API 라우트를 설계할 때 이 구분을 유지할 것:

- **`articles`**: `url`(UNIQUE) 기준 전역 캐시. 몇 명의 사용자가 가져오든 Claude를 통한 번역/요약은 **기사당 1회만** 수행 — 이는 의도된 비용 절감 설계이며 누락이 아님. `translationStatus`(pending/completed/failed) 보유.
- **`categories`**: 사용자별(`UNIQUE(userId, name)`), 최초 로그인 시 기본값으로 시드되고 자유롭게 수정 가능.
- **`articleClassifications`**: 조인 테이블이면서 동시에 각 사용자의 개인 피드 역할도 겸함. `UNIQUE(userId, articleId)`, nullable `categoryId`(`ON DELETE SET NULL`), 자체 `classificationStatus` 보유. 카테고리를 삭제하면 해당 행을 삭제하지 않고 `pending`으로 되돌려, 다음 '뉴스 가져오기' 시 사용자의 현재 카테고리 목록 기준으로 재분류되도록 함.
- **`notionConnections`**: 사용자별 Notion OAuth 토큰을 **저장 시 암호화**(AES-256-GCM)하여 보관, `defaultParentPageId` 포함.
- **`mcpOauthClientRegistrations`**: Notion MCP 서버에 대한 Dynamic Client Registration 결과를 앱 전체에서 캐시 — 사용자마다가 아니라 앱 전체에서 1회만 등록.
- **`notionSaves`**: `UNIQUE(userId, articleId)`로 중복 저장 방지.

**핵심 흐름** ('뉴스 가져오기' 버튼 클릭 시 on-demand로 동작, 주기적 크론 없음): RSS 수집 → 신규 기사 추출 → Claude 번역/요약(캐시 확인 후 기사당 1회) → 요청한 사용자의 현재 카테고리 기준으로 Claude 분류 → 카드로 렌더링 → 클라이언트 측에서 카테고리 필터링.

**Notion 연동은 의도적으로 REST API 직접 호출이 아닌 MCP 기반으로 설계**되어 OAuth/DCR 복잡도가 추가됨 (`PRD.md` §6 비고 참고). M6 구현 시에는 실제 연동 코드를 작성하기 전에 실제 OAuth 핸드셰이크와 MCP 툴 스키마를 라이브 연결로 먼저 검증할 것 — MCP 서버의 실제 동작이 여기 적힌 가정과 다를 수 있음.
