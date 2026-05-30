# Scenario clue checklist (during voice conversation)

## Context

Scenario `hints` (a `string[]` on the `scenarios` table) are shown to the student only
in the **briefing** of a voice scenario, and sent to the AI as background. During the
actual voice conversation (`app/ai-practice/[id]/voice-chat.tsx`, "chat" phase) the
student sees only the orb/transcript — no clues, no way to track progress.

The student wants the scenario's clues visible **during** the conversation, with a way to
**mark each one off** as they get its answer.

Constraint: a voice conversation exposes only the student's live speech to the app; the
full exchange isn't available until the call ends (fetched from ElevenLabs at feedback
time). So mid-call **auto-detection isn't possible** — marking is **manual**.

## Decisions (locked)

- Clues = the existing **`hints`** array (no new field, no schema change). Admin can reword
  hints to read as trackable clues.
- **Manual** check-off (tap each clue).
- **Live aid only** — session-only state, resets each conversation, **no persistence, no
  API, no backend change**.
- Shown during the **voice** scenario conversation only (the text scenario chat already
  shows hints in its header; out of scope here).
- Layout: a **collapsible panel at the top** of the voice chat screen (approach A), so it
  doesn't crowd the centered orb.

## Component

`app/ai-practice/[id]/clue-checklist.tsx` (client):
- Props: `hints: string[]`.
- State: `checked: boolean[]` (all false initially) + `open: boolean` (default open).
- Renders nothing if `hints.length === 0`.
- Toggle header: 💡 "רמזים — {checkedCount}/{total}" + chevron.
- Expanded: each hint a tappable row; tap toggles its checkbox (✓ + dimmed/strikethrough
  when done). Styled for the dark voice screen (`bg-[#0A0A0A]`): light text, subtle borders.

## Integration

In `voice-chat.tsx`, render `<ClueChecklist hints={hints} />` inside the **chat phase**,
pinned under the header (above the flex-centered orb area). It mounts when the chat phase
renders and unmounts on briefing/feedback, so checks reset automatically per conversation.
`hints` is already derived there (`(scenario.hints as string[] | null) ?? []`).

## Error handling

None needed — pure client UI with no I/O. No hints → panel not rendered.

## Testing

- `npx tsc --noEmit` clean (don't run `next build`; it clobbers the dev server's `.next`).
- Manual: start a scenario with hints → during the conversation the collapsible "רמזים"
  panel shows; tapping a clue checks it and updates the count; ending and restarting the
  conversation resets all checks.

## Out of scope (YAGNI)

Persisting marks, showing coverage in feedback, auto-detecting answers, the text scenario
chat, a separate objectives field.
