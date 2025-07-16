/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { GoogleGenAI } from "@google/genai";

import { MODELS, PROVIDERS } from "@/lib/providers";
import {
  DIVIDER,
  FOLLOW_UP_SYSTEM_PROMPT,
  INITIAL_SYSTEM_PROMPT,
  REPLACE_END,
  SEARCH_START,
} from "@/lib/prompts";
import MY_TOKEN_KEY from "@/lib/get-cookie-name";

export async function POST(request: NextRequest) {
  const authHeaders = await headers();
  const userToken = request.cookies.get(MY_TOKEN_KEY())?.value;

  const body = await request.json();
  const { prompt, provider, model, redesignMarkdown, html } = body;

  if (!model || (!prompt && !redesignMarkdown)) {
    return NextResponse.json(
      { ok: false, error: "Missing required fields" },
      { status: 400 }
    );
  }

  const selectedModel = MODELS.find((m) => m.id === model);
  if (!selectedModel) {
    return NextResponse.json(
      { ok: false, error: "Invalid model selected" },
      { status: 400 }
    );
  }

  if (!selectedModel.providers.includes(provider) && provider !== "auto") {
    return NextResponse.json(
      {
        ok: false,
        error: `The selected model does not support the ${provider} provider.`,
        openSelectProvider: true,
      },
      { status: 400 }
    );
  }

  let token = userToken;

  /**
   * Handle local usage token, this bypass the need for a user token
   * and allows local testing without authentication.
   * This is useful for development and testing purposes.
   */
  if (process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY.length > 0) {
    token = process.env.GOOGLE_API_KEY;
  }

  if (!token) {
    // If no user token and no GOOGLE_API_KEY, return an error
    return NextResponse.json(
      {
        ok: false,
        message: "Google API Key is not configured.",
      },
      { status: 500 }
    );
  }

  const DEFAULT_PROVIDER = PROVIDERS["google-genai"];
  const selectedProvider =
    provider === "auto"
      ? PROVIDERS[selectedModel.autoProvider as keyof typeof PROVIDERS]
      : PROVIDERS[provider as keyof typeof PROVIDERS] ?? DEFAULT_PROVIDER;

  try {
    // Create a stream response
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Start the response
    const response = new NextResponse(stream.readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });

    (async () => {
      let completeResponse = "";
      try {
        const ai = new GoogleGenAI({ apiKey: token });
        const chatCompletion = await ai.models.generateContentStream({
          model: selectedModel.value,
          config: {
            thinkingConfig: {
              thinkingBudget: 8000,
            },
          },
          contents: [
            {
              role: "user",
              parts: [{ text: INITIAL_SYSTEM_PROMPT }],
            },
            {
              role: "user",
              parts: [
                {
                  text: redesignMarkdown
                    ? `Here is my current design as a markdown:\n\n${redesignMarkdown}\n\nNow, please create a new design based on this markdown.`
                    : html
                    ? `Here is my current HTML code:\n\n\`\`\`html\n${html}\n\`\`\`\n\nNow, please create a new design based on this HTML.`
                    : prompt,
                },
              ],
            },
          ],
        });

        for await (const chunk of chatCompletion) {
          const textChunk = chunk.text;
          if (textChunk) {
            await writer.write(encoder.encode(textChunk));
            completeResponse += textChunk;
            if (completeResponse.includes("</html>")) {
              break;
            }
          }
        }
      } catch (error: any) {
        if (error.message?.includes("exceeded your monthly included credits")) {
          await writer.write(
            encoder.encode(
              JSON.stringify({
                ok: false,
                openProModal: true,
                message: error.message,
              })
            )
          );
        } else {
          await writer.write(
            encoder.encode(
              JSON.stringify({
                ok: false,
                message:
                  error.message ||
                  "An error occurred while processing your request.",
              })
            )
          );
        }
      } finally {
        await writer?.close();
      }
    })();

    return response;
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        openSelectProvider: true,
        message:
          error?.message || "An error occurred while processing your request.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const authHeaders = await headers();
  const userToken = request.cookies.get(MY_TOKEN_KEY())?.value;

  const body = await request.json();
  const {
    prompt,
    html,
    previousPrompt,
    provider,
    model,
    selectedElementHtml,
  } = body;

  if (!prompt || !html) {
    return NextResponse.json(
      { ok: false, error: "Missing required fields" },
      { status: 400 }
    );
  }

  const selectedModel = MODELS.find((m) => m.id === model);
  if (!selectedModel) {
    return NextResponse.json(
      { ok: false, error: "Invalid model selected" },
      { status: 400 }
    );
  }

  let token = userToken;

  if (process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY.length > 0) {
    token = process.env.GOOGLE_API_KEY;
  }

  if (!token) {
    return NextResponse.json(
      {
        ok: false,
        message: "Google API Key is not configured.",
      },
      { status: 500 }
    );
  }

  const ai = new GoogleGenAI({ apiKey: token });

  try {
    // Create a stream response
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Start the response
    const response = new NextResponse(stream.readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });

    (async () => {
      let completeResponse = "";
      try {
        const chatCompletion = await ai.models.generateContentStream({
          model: selectedModel.value,
          config: {
            thinkingConfig: {
              thinkingBudget: 8000,
            },
          },
          contents: [
            {
              role: "user",
              parts: [{ text: FOLLOW_UP_SYSTEM_PROMPT }],
            },
            {
              role: "user",
              parts: [
                {
                  text: previousPrompt
                    ? previousPrompt
                    : "You are modifying the HTML file based on the user's request.",
                },
              ],
            },
            {
              role: "model",
              parts: [
                {
                  text: `The current code is: \n\`\`\`html\n${html}\n\`\`\` ${
                    selectedElementHtml
                      ? `\n\nYou have to update ONLY the following element, NOTHING ELSE: \n\n\`\`\`html\n${selectedElementHtml}\n\`\`\``
                      : ""
                  }`,
                },
              ],
            },
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
        });

        for await (const chunk of chatCompletion) {
          const textChunk = chunk.text;
          if (textChunk) {
            await writer.write(encoder.encode(textChunk));
            completeResponse += textChunk;
          }
        }
      } catch (error: any) {
        if (error.message?.includes("exceeded your monthly included credits")) {
          await writer.write(
            encoder.encode(
              JSON.stringify({
                ok: false,
                openProModal: true,
                message: error.message,
              })
            )
          );
        } else {
          await writer.write(
            encoder.encode(
              JSON.stringify({
                ok: false,
                message:
                  error.message ||
                  "An error occurred while processing your request.",
              })
            )
          );
        }
      } finally {
        await writer?.close();
      }
    })();

    return response;
  } catch (error: any) {
    if (error.message?.includes("exceeded your monthly included credits")) {
      return NextResponse.json(
        {
          ok: false,
          openProModal: true,
          message: error.message,
        },
        { status: 402 }
      );
    }
    return NextResponse.json(
      {
        ok: false,
        openSelectProvider: true,
        message:
          error.message || "An error occurred while processing your request.",
      },
      { status: 500 }
    );
  }
}
