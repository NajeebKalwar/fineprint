import OpenAI from "openai";
import { z } from "zod/v4";
import { blocksToPrompt } from "@/lib/blocks";
import { promptLibrary } from "@/lib/library-definitions";

function getRetryAfterSeconds(headers: Headers | undefined) {
  const retryAfter = headers?.get("retry-after");
  if (!retryAfter) return 10;

  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds)) return Math.max(1, Math.min(300, Math.ceil(seconds)));

  const retryAt = Date.parse(retryAfter);
  if (Number.isNaN(retryAt)) return 10;
  return Math.max(1, Math.min(300, Math.ceil((retryAt - Date.now()) / 1000)));
}

const requestSchema = z
  .object({
    blocks: z
      .array(
        z
          .object({
            id: z.string().regex(/^b\d{2,}$/),
            text: z.string().refine((text) => text.trim().length > 0),
          })
          .strict()
      )
      .min(1),
  })
  .strict()
  .superRefine(({ blocks }, ctx) => {
    const ids = new Set<string>();
    blocks.forEach(({ id }, index) => {
      if (ids.has(id)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate block id: ${id}`,
          path: ["blocks", index, "id"],
        });
      }
      ids.add(id);
    });
  });

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("Request body must be valid JSON.", { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response("Request must contain non-empty document blocks with unique ids.", {
      status: 400,
    });
  }

  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL;
  if (!apiKey || !model) {
    console.error("Document analysis is not configured: LLM_API_KEY and LLM_MODEL are required.");
    return new Response("Document analysis is not configured on the server.", { status: 500 });
  }

  let system: string;
  try {
    system = promptLibrary.prompt({
      preamble:
        "You are FinePrint, a document auditor that helps ordinary people understand leases, bills, and contracts. " +
        "The document is split into blocks like [b01], [b02]. Output ONLY OpenUI Lang, with no markdown fences and no commentary.",
      additionalRules: [
        "Every RiskCallout quote must be copied VERBATIM from the document. Never paraphrase inside a quote.",
        "Every blockId must be the id of the block that actually contains the quote or date.",
        "Choose components that fit the document type: leases get KeyDatesTimeline and FeeTable; bills get FeeTable; skip components that would be empty.",
        "Use plain English at roughly an 8th-grade reading level. You are not a lawyer; frame findings as things to question or negotiate.",
        "Include between 3 and 7 RiskCallouts, highest severity first.",
      ],
    });
  } catch (e) {
    console.error("OpenUI system prompt generation failed:", e);
    return new Response("Could not build the document analysis prompt.", { status: 500 });
  }

  let completion: Awaited<ReturnType<OpenAI["chat"]["completions"]["create"]>>;
  try {
    const client = new OpenAI({
      apiKey,
      baseURL: process.env.LLM_BASE_URL || undefined,
    });
    const request = {
      model,
      stream: true,
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Analyze this document:\n\n${blocksToPrompt(parsed.data.blocks)}` },
      ],
      thinking: { type: "disabled" },
    } satisfies OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming & {
      thinking: { type: "disabled" };
    };
    completion = await client.chat.completions.create(request);
  } catch (e) {
    console.error("Document analysis provider request failed:", e);
    if (
      e instanceof OpenAI.APIError &&
      (e.status === 429 || (typeof e.status === "number" && e.status >= 500))
    ) {
      return new Response(
        "The analysis service is temporarily busy. Please wait a few seconds and try again.",
        {
          status: 503,
          headers: { "Retry-After": String(getRetryAfterSeconds(e.headers)) },
        }
      );
    }
    return new Response("The document analysis provider could not process the request.", {
      status: 502,
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of completion as unknown as AsyncIterable<{
          choices: Array<{ delta?: { content?: string | null } }>;
        }>) {
          const t = chunk.choices[0]?.delta?.content;
          if (t) controller.enqueue(encoder.encode(t));
        }
        controller.close();
      } catch (e) {
        console.error("Document analysis stream failed:", e);
        controller.error(e);
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
  });
}