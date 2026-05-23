# Session History Design
**Date:** 2026-05-23
**Status:** Approved

## Overview

Students currently lose their AI conversation feedback when they navigate away from the page. The feedback is already saved to `ai_sessions.feedback_text` server-side — this feature surfaces it in the UI so students can review past sessions.

## Placement

A "שיחות אחרונות" (Recent Sessions) section is added below the three mode cards on the existing `app/ai-practice/page.tsx` page. No new nav item or route needed.

## Data

Query added to `app/ai-practice/page.tsx` server component:

```sql
SELECT
  ai_sessions.id,
  ai_sessions.session_type,
  ai_sessions.started_at,
  ai_sessions.ended_at,
  ai_sessions.feedback_text,
  ai_sessions.messages,
  scenarios.name AS scenario_name
FROM ai_sessions
LEFT JOIN scenarios ON ai_sessions.scenario_id = scenarios.id
WHERE ai_sessions.user_id = <current_user>
ORDER BY ai_sessions.started_at DESC
LIMIT 20
```

Sessions with `feedback_text = null` are shown as abandoned (not tappable).

## Components

### `app/ai-practice/session-history.tsx` (new, client component)

Receives sessions array as props. Manages open sheet state.

**Compact card (always visible):**
- Type badge: "תרחיש" / "תרגול חופשי" / "שיחה חופשית" — color-coded per type
- Scenario name (for scenario type) or dialect label ("ניב עזתי")
- Relative date: "אתמול", "לפני 3 ימים", etc.
- One-line feedback preview: first 80 chars + "…"
- "לא הסתיים" badge if `feedback_text` is null — card is not tappable

**Sheet (slides up on tap, shadcn `Sheet`):**
- Stats row:
  - Duration: `ended_at - started_at` formatted as "X דק'"  
  - Exchanges: `Math.floor(messages.length / 2)` (user+assistant pairs)
  - Session type label
- Full `feedback_text` (whitespace preserved)
- "השמע פידבק בעברית" button → calls existing `useTTS.play(feedback, "he")`

## Architecture

- `page.tsx` stays a server component — no new API route needed
- `SessionHistory` is a thin client component that only handles open/close state
- `useTTS` hook is already available and handles Hebrew ElevenLabs TTS

## Out of Scope

- Filtering or searching sessions
- Deleting sessions
- Admin view of student session history (separate feature)
- Pagination (20 sessions is sufficient for current scale of ~15 students)
