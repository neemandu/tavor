// One-off setup: cap every voice talk with the Khalid agent at 4 minutes.
// This is enforced by ElevenLabs itself (conversation_config.conversation.
// max_duration_seconds on the agent), not by our client — a student can't
// bypass it by tampering with browser JS.
//
//   node scripts/configure-elevenlabs-agent.mjs           # GET + show proposed diff, no writes
//   node scripts/configure-elevenlabs-agent.mjs --apply   # PATCH the agent
//
// Reads ELEVENLABS_API_KEY / ELEVENLABS_AGENT_ID from .env.local.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MAX_DURATION_SECONDS = 4 * 60;

function loadEnv() {
  const env = {};
  const text = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const env = loadEnv();
  const apiKey = env.ELEVENLABS_API_KEY;
  const agentId = env.ELEVENLABS_AGENT_ID;
  if (!apiKey || !agentId) {
    console.error("Missing ELEVENLABS_API_KEY / ELEVENLABS_AGENT_ID in .env.local");
    process.exit(1);
  }

  const getRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
    headers: { "xi-api-key": apiKey },
  });
  if (!getRes.ok) {
    console.error("GET agent failed:", getRes.status, await getRes.text());
    process.exit(1);
  }
  const agent = await getRes.json();
  const conversation = agent?.conversation_config?.conversation ?? {};

  console.log("Current conversation config:", JSON.stringify(conversation, null, 2));
  const current = conversation.max_duration_seconds;

  if (current === MAX_DURATION_SECONDS) {
    console.log(`max_duration_seconds is already ${MAX_DURATION_SECONDS}. Nothing to do.`);
    return;
  }

  console.log(`\nProposed change: max_duration_seconds ${current ?? "(unset, defaults to 600)"} -> ${MAX_DURATION_SECONDS}`);

  if (!apply) {
    console.log("\nDry run — no changes made. Re-run with --apply to PATCH the agent.");
    return;
  }

  const patchBody = {
    conversation_config: {
      conversation: {
        ...conversation,
        max_duration_seconds: MAX_DURATION_SECONDS,
      },
    },
  };

  const patchRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
    method: "PATCH",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(patchBody),
  });

  if (!patchRes.ok) {
    console.error("PATCH failed:", patchRes.status, await patchRes.text());
    process.exit(1);
  }

  const updated = await patchRes.json();
  console.log("PATCH ok. New conversation config:", JSON.stringify(updated?.conversation_config?.conversation, null, 2));
}

main();
