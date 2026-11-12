# UI 가이드 (ui.md)

AI 뉴스 수집기의 UI 디자인 가이드. 메인 화면(대시보드)의 레이아웃, 컴포넌트, 스타일 규칙을 정의한다. Tailwind CSS v4를 사용하며, `src/app/globals.css`에 정의된 `--background` / `--foreground` 토큰과 다크모드(`prefers-color-scheme`) 전략을 그대로 따른다.

## 1. 디자인 원칙

- **깔끔함**: 불필요한 장식, 그림자, 테두리를 최소화하고 여백으로 구조를 나눈다.
- **읽기 편함**: 본문(요약문)의 가독성을 최우선으로 — 넓은 줄간격, 적당한 줄 길이, 충분한 대비.
- **일관성**: 색상은 zinc 그레이스케일 + 포인트 컬러 1개로 제한. 버튼/배지 모양은 전부 `rounded-full`로 통일(기존 `AutoSignInModal` 컴포넌트와 동일한 패턴).
- **라이트/다크 동시 지원**: 모든 색상 클래스는 `dark:` variant를 함께 지정한다.

## 2. 컬러

| 역할 | Light | Dark |
|---|---|---|
| 배경(페이지) | `bg-white` / `bg-zinc-50` | `dark:bg-black` / `dark:bg-zinc-950` |
| 카드 배경 | `bg-white` | `dark:bg-zinc-900` |
| 기본 텍스트 | `text-zinc-900` | `dark:text-zinc-100` |
| 보조 텍스트(메타, 요약 설명) | `text-zinc-500` | `dark:text-zinc-400` |
| 테두리/구분선 | `border-zinc-200` | `dark:border-zinc-800` |
| 강조(선택된 카테고리, 주요 버튼) | `bg-foreground` (`#171717`) | `dark:bg-foreground`(`#ededed`) + `text-background` |
| 호버 | `hover:bg-zinc-100` | `dark:hover:bg-zinc-800` |

포인트 컬러가 추가로 필요한 경우(예: '저장됨' 배지)에만 `emerald` 계열을 제한적으로 사용한다. 그 외 상태 표시는 전부 zinc 명도 차이로 표현한다.

## 3. 타이포그래피

- 폰트: 기존 설정 유지 (`--font-sans` = Geist Sans).
- 페이지 제목(앱 이름/헤더): `text-lg font-semibold`
- 카드 제목(기사 제목 한국어): `text-base font-medium leading-snug`
- 카드 요약문: `text-sm leading-relaxed text-zinc-500 dark:text-zinc-400`
- 메타 정보(출처, 날짜): `text-xs text-zinc-400 dark:text-zinc-500`
- 카테고리 칩 라벨: `text-sm font-medium`

## 4. 전체 레이아웃

메인 대시보드는 위에서부터 다음 순서로 구성된다.

```
┌─────────────────────────────────────────────┐
│ 헤더: 앱 이름 + 뉴스 가져오기 버튼 + 사용자 메뉴 │
├─────────────────────────────────────────────┤
│ 카테고리 바: [전체] [카테고리1] [카테고리2] … [+ 추가] │
├─────────────────────────────────────────────┤
│ 뉴스 카드 그리드                              │
│  [카드] [카드] [카드]                         │
│  [카드] [카드] [카드]                         │
└─────────────────────────────────────────────┘
```

- 콘텐츠 최대 너비: `max-w-6xl mx-auto px-4 sm:px-6`
- 헤더/카테고리 바/카드 영역 사이는 `py-4` ~ `py-6` 간격으로 분리.
- 헤더는 `sticky top-0` + `backdrop-blur` + 하단 `border-b`로 스크롤 시에도 고정.

### 4.1 헤더

- 좌측: 앱 이름 "AI 뉴스 수집기" (`text-lg font-semibold`)
- 우측: '뉴스 가져오기' 버튼(주요 액션, 강조 스타일) + Clerk `UserButton`
- 뉴스 가져오기 버튼 스타일: `rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-[#383838] dark:hover:bg-[#ccc]` (로딩 중에는 스피너 + `opacity-70 cursor-not-allowed`)

### 4.2 카테고리 바

뉴스 카드 목록 **바로 위**에 가로로 배치. 카테고리가 많아질 수 있으므로 `flex gap-2 overflow-x-auto` 로 가로 스크롤을 허용하고, 스크롤바는 숨긴다.

- 기본 항목: 맨 앞에 "전체" 칩을 항상 고정 배치.
- 각 카테고리 칩(버튼):
  - 비활성: `rounded-full border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800`
  - 활성(선택됨): `rounded-full bg-foreground px-3 py-1.5 text-sm font-medium text-background`
- **카테고리 추가 버튼**: 카테고리 칩 목록의 **맨 끝**에 위치. 다른 칩과 구분되도록 점선 테두리 + 아이콘(`+`)만 사용.
  - 스타일: `rounded-full border border-dashed border-zinc-300 px-3 py-1.5 text-sm text-zinc-400 dark:border-zinc-700 dark:text-zinc-500 hover:border-zinc-400 hover:text-zinc-600 dark:hover:border-zinc-600 dark:hover:text-zinc-300`
  - 클릭 시 카테고리 추가용 인라인 입력 또는 모달 오픈(구현 단계는 M4에서 결정).

### 4.3 뉴스 카드 그리드

- 그리드: `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3`
- 데이터가 없을 때(최초 진입/필터 결과 없음): 그리드 대신 중앙 정렬된 안내 문구 + '뉴스 가져오기' 버튼 재노출.

## 5. 뉴스 카드 컴포넌트

```
┌───────────────────────────────┐
│ [출처]            2026.11.12   │  ← 메타 정보
│ 기사 제목(한국어, 2줄 말줄임)      │  ← 카드 제목
│ 요약문(3~4줄, 말줄임)             │  ← 요약
│ [카테고리 배지]                  │
│                [Notion 저장]   │  ← 액션 (우측 정렬)
└───────────────────────────────┘
```

- 카드 컨테이너: `rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 transition-shadow hover:shadow-sm`
- 제목: `line-clamp-2`, 요약: `line-clamp-3` 또는 `line-clamp-4`로 카드 높이를 균일하게 유지.
- 카테고리 배지(카드 내부, 해당 기사가 속한 카테고리 표시): 카테고리 바의 비활성 칩보다 한 단계 작은 `text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400`
- Notion 저장 버튼:
  - 미저장: `rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800`
  - 저장됨: 버튼 대신 `text-emerald-600 dark:text-emerald-400`의 체크 아이콘 + "저장됨" 텍스트로 전환(비활성, 클릭 불가).
- 번역/분류가 아직 처리 중(`pending`)인 카드: 제목/요약 영역을 스켈레톤(`animate-pulse bg-zinc-100 dark:bg-zinc-800`)으로 표시.
- 번역 실패(`failed`) 카드: 카드 하단에 작은 경고 텍스트 `text-xs text-red-500` 로 실패 안내만 표시(카드 자체는 숨기지 않음).

## 6. 상태/피드백

- '뉴스 가져오기' 진행 중: 버튼 내부 스피너 + 헤더 하단에 얇은 진행 바(선택적).
- 토스트/알림이 필요한 경우(가져오기 완료, Notion 저장 완료 등): 화면 우하단에 `rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-4 py-2 text-sm shadow-lg` 형태로 짧게 노출 후 자동 사라짐.

## 7. 반응형 규칙

- 모바일(`< sm`): 카드 1열, 카테고리 바는 가로 스크롤 유지, 헤더의 '뉴스 가져오기' 버튼은 아이콘+짧은 텍스트로 축소 가능.
- 태블릿(`sm ~ lg`): 카드 2열.
- 데스크톱(`≥ lg`): 카드 3열, 콘텐츠 최대 너비 `max-w-6xl`로 중앙 정렬.

## 8. 접근성

- 카테고리 칩/카드 버튼은 모두 `<button>` 요소 사용, 포커스 시 `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400` 적용.
- 아이콘만 있는 버튼(카테고리 추가 등)에는 `aria-label` 필수.
- 다크모드 대비는 WCAG AA 기준(본문 텍스트 4.5:1 이상)을 만족하는 zinc 명도 조합만 사용한다(위 표 기준 준수).
