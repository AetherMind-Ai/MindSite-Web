"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useMemo } from "react";
import classNames from "classnames";
import { toast } from "sonner";
import { useLocalStorage, useUpdateEffect } from "react-use";
import { ArrowUp, ChevronDown, Crosshair } from "lucide-react";
import { FaStopCircle } from "react-icons/fa";

import ProModal from "@/components/pro-modal";
import { Button } from "@/components/ui/button";
import { MODELS } from "@/lib/providers";
import { Settings } from "@/components/editor/ask-ai/settings";
import { LoginModal } from "@/components/login-modal";
import { ReImagine } from "@/components/editor/ask-ai/re-imagine";
import Loading from "@/components/loading";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { TooltipContent } from "@radix-ui/react-tooltip";
import { SelectedHtmlElement } from "./selected-html-element";
import { FollowUpTooltip } from "./follow-up-tooltip";
import { isTheSameHtml } from "@/lib/compare-html-diff";

export function AskAI({
  html,
  setHtml,
  onScrollToBottom,
  isAiWorking,
  setisAiWorking,
  isEditableModeEnabled = false,
  selectedElement,
  setSelectedElement,
  setIsEditableModeEnabled,
  onNewPrompt,
  onSuccess,
  htmlHistory,
  setHtmlHistory,
}: {
  html: string;
  setHtml: (html: string) => void;
  onScrollToBottom: () => void;
  isAiWorking: boolean;
  onNewPrompt: (prompt: string) => void;
  setisAiWorking: React.Dispatch<React.SetStateAction<boolean>>;
  onSuccess: (
    h: string,
    c: string,
    j: string,
    p: string,
    updatedLines?: number[][]
  ) => void;
  isEditableModeEnabled: boolean;
  setIsEditableModeEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  selectedElement?: HTMLElement | null;
  setSelectedElement: React.Dispatch<React.SetStateAction<HTMLElement | null>>;
  htmlHistory: { html: string; createdAt: Date; prompt: string }[];
  setHtmlHistory: React.Dispatch<
    React.SetStateAction<
      {
        html: string;
        createdAt: Date;
        prompt: string;
      }[]
    >
  >;
}) {
  const refThink = useRef<HTMLDivElement | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [hasAsked, setHasAsked] = useState(false);
  const [previousPrompt, setPreviousPrompt] = useState("");
  const [provider, setProvider] = useLocalStorage("provider", "auto");
  const [model, setModel] = useLocalStorage("model", MODELS[1].id);
  const [openProvider, setOpenProvider] = useState(false);
  const [providerError, setProviderError] = useState("");
  const [openProModal, setOpenProModal] = useState(false);
  const [think, setThink] = useState<string | undefined>(undefined);
  const [openThink, setOpenThink] = useState(false);
  const [isThinking, setIsThinking] = useState(true);
  const [controller, setController] = useState<AbortController | null>(null);
  const [isFollowUp, setIsFollowUp] = useState(true);

  const callAi = async (redesignMarkdown?: string) => {
    if (isAiWorking) return;
    if (!redesignMarkdown && !prompt.trim()) return;

    setisAiWorking(true);
    setProviderError("");
    setThink("");
    setOpenThink(false);
    setIsThinking(true);

    let contentResponse = "";
    let thinkResponse = "";
    let lastRenderTime = 0;

    const abortController = new AbortController();
    setController(abortController);

    try {
      onNewPrompt(prompt);

      const isFollowUpRequest = isFollowUp && !redesignMarkdown && !isSameHtml;
      const method = isFollowUpRequest ? "PUT" : "POST";
      const selectedElementHtml = selectedElement
        ? selectedElement.outerHTML
        : "";

      const selectedModel = MODELS.find((m) => m.id === model);
      if (!selectedModel) {
        toast.error("Invalid model selected. Please select a model in the settings.");
        setisAiWorking(false);
        return;
      }

      const body = isFollowUpRequest
        ? {
            prompt: prompt || previousPrompt,
            provider,
            previousPrompt,
            model: selectedModel.id,
            html,
            selectedElementHtml,
          }
        : {
            prompt,
            provider,
            model: selectedModel.id,
            html: isSameHtml ? "" : html,
            redesignMarkdown,
          };

      const request = await fetch("/api/ask-ai", {
        method,
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": window.location.hostname,
        },
        signal: abortController.signal,
      });

      if (request.body) {
        const reader = request.body.getReader();
        const decoder = new TextDecoder("utf-8");
        // FIX: Initialize `contentThink` to prevent runtime error.
        // It was `undefined` and would crash on `contentThink += chunk`.
        let contentThink = "";

        const read = async () => {
          const { done, value } = await reader.read();
          if (done) {
            const isJson =
              contentResponse.trim().startsWith("{") &&
              contentResponse.trim().endsWith("}");
            const jsonResponse = isJson ? JSON.parse(contentResponse) : null;

            if (jsonResponse && !jsonResponse.ok) {
              if (jsonResponse.openLogin) setOpen(true);
              else if (jsonResponse.openSelectProvider) {
                setOpenProvider(true);
                setProviderError(jsonResponse.message);
              } else if (jsonResponse.openProModal) setOpenProModal(true);
              else toast.error(jsonResponse.message);
              setisAiWorking(false);
              return;
            }

            toast.success("AI responded successfully");
            setPreviousPrompt(prompt);
            setPrompt("");
            setisAiWorking(false);
            setHasAsked(true);
            if (audio.current) audio.current.play();

            if (isFollowUpRequest) {
              let newHtml = html;
              try {
                const searchRegex =
                  /<<<<<<< SEARCH\n([\s\S]*?)=======\n([\s\S]*?)>>>>>>> REPLACE/g;
                const patches = [...contentResponse.matchAll(searchRegex)];

                if (patches.length > 0) {
                  for (const match of patches) {
                    const search = match[1];
                    const replace = match[2];
                    newHtml = newHtml.replace(search, replace);
                  }
                } else if (
                  contentResponse.length > 0 &&
                  !contentResponse.startsWith("{")
                ) {
                  const finalHtml = contentResponse.match(
                    /<HTML>([\s\S]*?)<\/HTML>/
                  )?.[1];
                  if (finalHtml) newHtml = finalHtml;
                }
                onSuccess(newHtml, "", "", prompt);
              } catch (e) {
                console.error("Failed to apply patch:", e);
                toast.error("Failed to apply changes from AI.");
              }
            } else {
              const finalHtml =
                contentResponse.match(/<HTML>([\s\S]*?)<\/HTML>/)?.[1] ?? "";
              const finalCss =
                contentResponse.match(/<CSS>([\s\S]*?)<\/CSS>/)?.[1] ?? "";
              const finalJs =
                contentResponse.match(/<JS>([\s\S]*?)<\/JS>/)?.[1] ?? "";

              onSuccess(finalHtml, finalCss, finalJs, prompt);
            }
            return;
          }

          const chunk = decoder.decode(value, { stream: true });
          thinkResponse += chunk;

          if (selectedModel?.value.includes("reasoner")) {
            const thinkMatch = thinkResponse.match(/<think>[\s\S]*/)?.[0];
            if (thinkMatch && !thinkResponse?.includes("</think>")) {
              if (contentThink.length < 3) setOpenThink(true);
              setThink(thinkMatch.replace("<think>", "").trim());
              contentThink += chunk;
              return read();
            }
          }

          contentResponse += chunk;

          if (!isFollowUpRequest) {
            const htmlMatch = contentResponse.match(/<HTML>([\s\S]*)/);
            if (htmlMatch) {
              setIsThinking(false);
              let partialDoc = htmlMatch[1];
              if (
                partialDoc.includes("<head>") &&
                !partialDoc.includes("</head>")
              )
                partialDoc += "\n</head>";
              if (
                partialDoc.includes("<body") &&
                !partialDoc.includes("</body>")
              )
                partialDoc += "\n</body>";
              if (!partialDoc.includes("</html>")) partialDoc += "\n</html>";

              const now = Date.now();
              if (now - lastRenderTime > 300) {
                setHtml(partialDoc);
                lastRenderTime = now;
              }
              if (partialDoc.length > 200) onScrollToBottom();
            }
          } else {
            setIsThinking(false);
          }
          read();
        };
        read();
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // Don't show an error toast if the user cancelled the request
        return;
      }
      setisAiWorking(false);
      toast.error(error.message || "An unexpected error occurred.");
      if (error.openLogin) setOpen(true);
    }
  };

  const stopController = () => {
    if (controller) {
      controller.abort();
      setController(null);
      setisAiWorking(false);
      setThink("");
      setOpenThink(false);
      setIsThinking(false);
    }
  };

  useUpdateEffect(() => {
    if (refThink.current) {
      refThink.current.scrollTop = refThink.current.scrollHeight;
    }
  }, [think]);

  useUpdateEffect(() => {
    if (!isThinking) {
      setOpenThink(false);
    }
  }, [isThinking]);

  const isSameHtml = useMemo(() => {
    return isTheSameHtml(html);
  }, [html]);

  return (
    <div className="px-3">
      <div className="relative bg-neutral-800 border border-neutral-700 rounded-2xl ring-[4px] focus-within:ring-neutral-500/30 focus-within:border-neutral-600 ring-transparent z-10 w-full group">
        {think && (
          <div className="w-full border-b border-neutral-700 relative overflow-hidden">
            <header
              className="flex items-center justify-between px-5 py-2.5 group hover:bg-neutral-600/20 transition-colors duration-200 cursor-pointer"
              onClick={() => {
                setOpenThink(!openThink);
              }}
            >
              <p className="text-sm font-medium text-neutral-300 group-hover:text-neutral-200 transition-colors duration-200">
                {isThinking ? "MindSite is thinking..." : "MindSite's plan"}
              </p>
              <ChevronDown
                className={classNames(
                  "size-4 text-neutral-400 group-hover:text-neutral-300 transition-all duration-200",
                  {
                    "rotate-180": openThink,
                  }
                )}
              />
            </header>
            <main
              ref={refThink}
              className={classNames(
                "overflow-y-auto transition-all duration-200 ease-in-out",
                {
                  "max-h-[0px]": !openThink,
                  "min-h-[250px] max-h-[250px] border-t border-neutral-700":
                    openThink,
                }
              )}
            >
              <p className="text-[13px] text-neutral-400 whitespace-pre-line px-5 pb-4 pt-3">
                {think}
              </p>
            </main>
          </div>
        )}
        {selectedElement && (
          <div className="px-4 pt-3">
            <SelectedHtmlElement
              element={selectedElement}
              isAiWorking={isAiWorking}
              onDelete={() => setSelectedElement(null)}
            />
          </div>
        )}
        <div className="w-full relative flex items-center justify-between">
          {isAiWorking && (
            <div className="absolute bg-neutral-800 rounded-lg bottom-0 left-4 w-[calc(100%-30px)] h-full z-1 flex items-center justify-between max-lg:text-sm">
              <div className="flex items-center justify-start gap-2">
                <Loading overlay={false} className="!size-4" />
                <p className="text-neutral-400 text-sm">
                  AI is {isThinking ? "thinking" : "coding"}...{" "}
                </p>
              </div>
              <div
                className="text-xs text-neutral-400 px-1 py-0.5 rounded-md border border-neutral-600 flex items-center justify-center gap-1.5 bg-neutral-800 hover:brightness-110 transition-all duration-200 cursor-pointer"
                onClick={stopController}
              >
                <FaStopCircle />
                Stop generation
              </div>
            </div>
          )}
          <input
            type="text"
            disabled={isAiWorking}
            className={classNames(
              "w-full bg-transparent text-sm outline-none text-white placeholder:text-neutral-400 p-4",
              {
                "!pt-2.5": selectedElement && !isAiWorking,
              }
            )}
            placeholder={
              selectedElement
                ? `Ask MindSite about the ${selectedElement.tagName.toLowerCase()} element...`
                : hasAsked
                ? "Ask MindSite for edits"
                : "Ask MindSite anything..."
            }
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault(); // Prevent form submission
                callAi();
              }
            }}
          />
        </div>
        <div className="flex items-center justify-between gap-2 px-4 pb-3">
          <div className="flex-1 flex items-center justify-start gap-1.5">
            <ReImagine onRedesign={(md) => callAi(md)} />
            {!isSameHtml && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    asChild
                    size="xs"
                    variant={isEditableModeEnabled ? "default" : "outline"}
                    onClick={() => {
                      setIsEditableModeEnabled?.(!isEditableModeEnabled);
                    }}
                    className={classNames("h-[28px]", {
                      "!text-neutral-400 hover:!text-neutral-200 !border-neutral-600 !hover:!border-neutral-500":
                        !isEditableModeEnabled,
                    })}
                  >
                    <span>
                      <Crosshair className="size-4" />
                      Edit
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent
                  align="start"
                  className="bg-neutral-950 text-xs text-neutral-200 py-1 px-2 rounded-md -translate-y-0.5"
                >
                  {/* Minor text improvement */}
                  Select an element on the page to ask MindSite to edit it
                  directly.
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <div className="flex items-center justify-end gap-2">
            <Settings
              provider={provider as string}
              model={model as string}
              onModelChange={setModel}
              open={openProvider}
              error={providerError}
              isFollowUp={!isSameHtml && isFollowUp}
              onClose={setOpenProvider}
            />
            <Button
              size="iconXs"
              disabled={isAiWorking || !prompt.trim()}
              onClick={() => callAi()}
            >
              <ArrowUp className="size-4" />
            </Button>
          </div>
        </div>
        <LoginModal open={open} onClose={() => setOpen(false)} html={html} />
        <ProModal
          html={html}
          open={openProModal}
          onClose={() => setOpenProModal(false)}
        />
        {!isSameHtml && (
          <div className="absolute top-0 right-0 -translate-y-[calc(100%+8px)] select-none text-xs text-neutral-400 flex items-center justify-center gap-2 bg-neutral-800 border border-neutral-700 rounded-md p-1 pr-2.5">
            <label
              htmlFor="Wave-checkbox"
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <Checkbox
                id="Wave-checkbox"
                checked={isFollowUp}
                onCheckedChange={(e) => {
                  const isChecked = e === true;
                  setIsFollowUp(isChecked);
                }}
              />
              Wave Update
            </label>
            <FollowUpTooltip />
          </div>
        )}
      </div>
      <audio ref={audio} id="audio" className="hidden">
        <source src="/success.mp3" type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>
    </div>
  );
}
