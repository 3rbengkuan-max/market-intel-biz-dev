import Anthropic from "@anthropic-ai/sdk";
import type { SourceCheckStatus } from "@/lib/types";

export function anthropicClient(): { client: Anthropic; model: string } {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    const err = new Error("no_anthropic_key");
    err.name = "NoKeyError";
    throw err;
  }
  return {
    client: new Anthropic({ apiKey: key }),
    model: process.env.ANTHROPIC_MODEL || "claude-opus-5",
  };
}

/** Pull the first balanced JSON value out of a model response. */
export function extractJson<T = unknown>(text: string): T {
  const cleaned = text.replace(/```(?:json)?/gi, "");
  const firstObj = cleaned.indexOf("{");
  const firstArr = cleaned.indexOf("[");
  let start = -1;
  let open = "{";
  let close = "}";
  if (firstArr !== -1 && (firstObj === -1 || firstArr < firstObj)) {
    start = firstArr;
    open = "[";
    close = "]";
  } else {
    start = firstObj;
  }
  const end = cleaned.lastIndexOf(close);
  if (start === -1 || end <= start) throw new Error("No JSON found in model output.");
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

/**
 * Run a messages request that uses server-side tools (web_search / web_fetch),
 * continuing automatically across pause_turn until the model finishes.
 */
export async function runServerTools(
  params: Anthropic.MessageCreateParamsNonStreaming,
  maxContinuations = 3,
): Promise<Anthropic.Message> {
  const { client } = anthropicClient();
  let response = await client.messages.create(params);
  let messages = [...params.messages];
  let continuations = 0;
  while (response.stop_reason === "pause_turn" && continuations < maxContinuations) {
    messages = [...messages, { role: "assistant", content: response.content }];
    response = await client.messages.create({ ...params, messages });
    continuations += 1;
  }
  return response;
}

function textOf(msg: Anthropic.Message): string {
  return msg.content
    .filter((b) => b.type === "text")
    .map((b) => ("text" in b ? b.text : ""))
    .join("\n");
}

function fetchErrored(msg: Anthropic.Message): boolean {
  for (const b of msg.content as Array<{ type: string; content?: unknown }>) {
    if (b.type === "web_fetch_tool_result") {
      const c = b.content as { error_code?: string } | unknown;
      if (c && typeof c === "object" && "error_code" in (c as object)) return true;
    }
  }
  return false;
}

/**
 * Verify whether the page at `url` actually supports an intel item, using Claude's
 * robust server-side web_fetch (not a naive server fetch that big sites block).
 */
export async function verifySourceAlignment(
  url: string,
  intel: { title: string; description: string | null },
): Promise<{ status: SourceCheckStatus; notes: string }> {
  const { model } = anthropicClient();

  const system = `You verify whether a cited web page actually supports a market-intelligence claim.
Use the web_fetch tool to retrieve the URL, then compare its real content against the INTEL ITEM.
Decide:
- "aligned": the page clearly supports the core claim.
- "partial": the page is on-topic and partially supports it, but key specifics are missing or loose.
- "misaligned": the page has real content but does not support the claim, is about something else, or contradicts it.
- "unreachable": the page could not be retrieved, or it is a paywall/login/error/empty page with no usable content — so the claim could not be checked.
Respond with ONLY JSON: {"status":"aligned"|"partial"|"misaligned"|"unreachable","notes":"one or two sentences citing what the page does or doesn't say"}`;

  const user = `INTEL ITEM
Title: ${intel.title}
Description: ${intel.description ?? "(none)"}

Fetch this URL and judge alignment: ${url}`;

  const msg = await runServerTools({
    model,
    max_tokens: 1024,
    system,
    messages: [{ role: "user", content: user }],
    tools: [{ type: "web_fetch_20260209", name: "web_fetch", max_uses: 2 }],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  if (msg.stop_reason === "refusal") {
    return { status: "partial", notes: "The AI declined to assess this source; review it manually." };
  }

  const raw = textOf(msg);
  let parsed: { status?: string; notes?: string };
  try {
    parsed = extractJson(raw);
  } catch {
    return {
      status: fetchErrored(msg) ? "unreachable" : "partial",
      notes: "Could not parse the alignment result; review manually.",
    };
  }
  const status: SourceCheckStatus =
    parsed.status === "aligned" ||
    parsed.status === "misaligned" ||
    parsed.status === "unreachable"
      ? parsed.status
      : "partial";
  return { status, notes: String(parsed.notes ?? "").trim().slice(0, 600) || "No explanation returned." };
}
