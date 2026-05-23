# Voice Conversation Latency Redesign

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate all per-turn Supabase network calls and add a strict AI response word limit to reduce voice conversation latency.

**Architecture:** Replace `getUser()` (network round-trip ~150ms) with `getSession()` (local JWT parse ~0ms) in chat API routes. Remove per-turn credits check and session save. Save the full conversation once at feedback time. Cap AI responses at 20 words via system prompt.

**Tech Stack:** Next.js 15 App Router, Supabase SSR, Anthropic SDK (Claude Haiku), ElevenLabs TTS.

---

## Changes

### 1. Chat API routes (`/api/ai/chat` and `/api/ai/free-chat`)
- Replace `supabase.auth.getUser()` with `supabase.auth.getSession()` — local JWT parse, no network call
- Remove `ai_credits` SELECT (quota check) entirely
- Remove `ai_sessions` INSERT/UPDATE after each Claude response
- Remove `ai_credits` UPDATE after each Claude response
- Still return `sessionId` as null (client keeps messages in state)

### 2. Feedback API routes (`/api/ai/feedback` and `/api/ai/feedback-free`)
- After generating feedback, INSERT the full conversation into `ai_sessions` with `messages`, `tokens_used` approximation, and `feedback_text`
- Use admin client (service role) for the insert

### 3. System prompt word limit (`lib/claude.ts` and free-chat route)
- Append to every system prompt: "ענה במשפט אחד קצר בלבד — עד 15 מילים בערבית."
- Applies to `buildScenarioSystemPrompt()` and the free-chat/conversation inline prompts

## What is NOT changed
- Auth middleware (still protects all routes)
- Feedback generation logic
- TTS pipeline
- State machine / auto-loop (separate task)
- Session ID handling on client (already tracks null)
