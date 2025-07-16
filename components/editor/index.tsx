"use client";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { editor } from "monaco-editor";
import Editor from "@monaco-editor/react";
import { CopyIcon } from "lucide-react";
import {
  useCopyToClipboard,
  useEvent,
  useLocalStorage,
  useMount,
  useUnmount,
  useUpdateEffect,
} from "react-use";
import classNames from "classnames";
import { useRouter, useSearchParams } from "next/navigation";

import { Header } from "@/components/editor/header";
import { Footer } from "@/components/editor/footer";
import { defaultHTML, defaultCSS, defaultJS } from "@/lib/consts";
import { Preview } from "@/components/editor/preview";
import { useEditor } from "@/hooks/useEditor";
import { AskAI } from "@/components/editor/ask-ai";
import { DeployButton } from "./deploy-button";
import { Project } from "@/types";
import { SaveButton } from "./save-button";
import { LoadProject } from "../my-projects/load-project";
import { isTheSameHtml } from "@/lib/compare-html-diff";
import { Sidebar } from "../sidebar";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { NewProjectModal } from "./new-project-modal";

export const AppEditor = ({ project }: { project?: Project | null }) => {
  const [html, setHtml] = useLocalStorage("html_content", project?.html ?? defaultHTML);
  const [css, setCss] = useLocalStorage("css_content", project?.css ?? defaultCSS);
  const [js, setJs] = useLocalStorage("js_content", project?.js ?? defaultJS);
  const { htmlHistory, setHtmlHistory, prompts, setPrompts } = useEditor(html ?? defaultHTML);
  const [, copyToClipboard] = useCopyToClipboard();
  // get query params from URL
  const searchParams = useSearchParams();
  const router = useRouter();
  const deploy = searchParams.get("deploy") === "true";

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const preview = useRef<HTMLDivElement>(null);
  const editor = useRef<HTMLDivElement>(null);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const resizer = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const monacoRef = useRef<any>(null);

  const [currentTab, setCurrentTab] = useState("chat");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [isResizing, setIsResizing] = useState(false);
  const [isAiWorking, setIsAiWorking] = useState(false);
  const [isEditableModeEnabled, setIsEditableModeEnabled] = useState(false);
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(
    null
  );
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>("index.html"); // Default to index.html
  const [editorLanguage, setEditorLanguage] = useState("html"); // New state for editor language
  const [previewHtml, setPreviewHtml] = useState(defaultHTML); // New state for preview HTML

  /**
   * Resets the layout based on screen size
   * - For desktop: Sets editor to 1/3 width and preview to 2/3
   * - For mobile: Removes inline styles to let CSS handle it
   */
  const resetLayout = () => {
    if (!editor.current || !preview.current) return;

    // lg breakpoint is 1024px based on useBreakpoint definition and Tailwind defaults
    if (window.innerWidth >= 1024) {
      // Set initial 1/3 - 2/3 sizes for large screens, accounting for resizer width
      const resizerWidth = resizer.current?.offsetWidth ?? 8; // w-2 = 0.5rem = 8px
      const availableWidth = window.innerWidth - resizerWidth;
      const initialEditorWidth = availableWidth / 3; // Editor takes 1/3 of space
      const initialPreviewWidth = availableWidth - initialEditorWidth; // Preview takes 2/3
      editor.current.style.width = `${initialEditorWidth}px`;
      preview.current.style.width = `${initialPreviewWidth}px`;
    } else {
      // Remove inline styles for smaller screens, let CSS flex-col handle it
      editor.current.style.width = "";
      preview.current.style.width = "";
    }
  };

  /**
   * Handles resizing when the user drags the resizer
   * Ensures minimum widths are maintained for both panels
   */
  const handleResize = (e: MouseEvent) => {
    if (!editor.current || !preview.current || !resizer.current) return;

    const resizerWidth = resizer.current.offsetWidth;
    const minWidth = 100; // Minimum width for editor/preview
    const maxWidth = window.innerWidth - resizerWidth - minWidth;

    const editorWidth = e.clientX;
    const clampedEditorWidth = Math.max(
      minWidth,
      Math.min(editorWidth, maxWidth)
    );
    const calculatedPreviewWidth =
      window.innerWidth - clampedEditorWidth - resizerWidth;

    editor.current.style.width = `${clampedEditorWidth}px`;
    preview.current.style.width = `${calculatedPreviewWidth}px`;
  };

  const handleMouseDown = () => {
    setIsResizing(true);
    document.addEventListener("mousemove", handleResize);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseUp = () => {
    setIsResizing(false);
    document.removeEventListener("mousemove", handleResize);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  useMount(() => {
    if (deploy && project?._id) {
      toast.success("Your project is deployed! 🎉", {
        action: {
          label: "See Project",
          onClick: () => {
            window.open(
              `https://huggingface.co/spaces/${project?.space_id}`,
              "_blank"
            );
          },
        },
      });
      router.replace(`/projects/${project?.space_id}`);
    }

    resetLayout();
    if (!resizer.current) return;
    resizer.current.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("resize", resetLayout);
  });
  useUnmount(() => {
    document.removeEventListener("mousemove", handleResize);
    document.removeEventListener("mouseup", handleMouseUp);
    if (resizer.current) {
      resizer.current.removeEventListener("mousedown", handleMouseDown);
    }
    window.removeEventListener("resize", resetLayout);
  });

  // Prevent accidental navigation away when AI is working or content has changed
  useEvent("beforeunload", (e) => {
    const hasChanges =
      html !== defaultHTML || css !== defaultCSS || js !== defaultJS;
    if (isAiWorking || hasChanges) {
      if (
        !window.confirm(
          "Are you sure you want to leave? Your changes will be lost."
        )
      ) {
        e.preventDefault();
      }
    }
  });

  useUpdateEffect(() => {
    if (currentTab === "chat") {
      // Reset editor width when switching to reasoning tab
      resetLayout();
      // re-add the event listener for resizing
      if (resizer.current) {
        resizer.current.addEventListener("mousedown", handleMouseDown);
      }
    } else {
      if (preview.current) {
        // Reset preview width when switching to preview tab
        preview.current.style.width = "100%";
      }
    }
  }, [currentTab]);

  useUpdateEffect(() => {
    if (css !== defaultCSS) {
      api.post("/files/update", {
        filePath: "style.css",
        content: css,
      });
    }
  }, [css]);

  useUpdateEffect(() => {
    if (js !== defaultJS) {
      api.post("/files/update", {
        filePath: "script.js",
        content: js,
      });
    }
  }, [js]);

  const handleEditorValidation = (markers: editor.IMarker[]) => {
    console.log("Editor validation markers:", markers);
  };

  return (
    <section className="h-[100dvh] bg-neutral-950 flex flex-col">
      <Header tab={currentTab} onNewTab={setCurrentTab}>
        <LoadProject
          onSuccess={(project: Project) => {
            router.push(`/projects/${project.space_id}`);
          }}
        />
        {selectedFile ? (
          <Button
            onClick={async () => {
              if (selectedFile) {
                await api.post("/files/update", {
                  filePath: selectedFile,
                  content: html,
                });
                toast.success("File saved successfully");
              } else {
                toast.error("No file selected to save.");
              }
            }}
          >
            Save
          </Button>
        ) : project?._id ? (
          <SaveButton html={html ?? ""} css={css ?? ""} js={js ?? ""} />
        ) : (
          <DeployButton html={html ?? ""} prompts={prompts} />
        )}
      </Header>
      <main
        className="bg-neutral-950 flex-1 max-lg:flex-col flex w-full max-lg:h-[calc(100%-82px)] relative"
      >
        {currentTab === "chat" && (
          <>
            <div
              ref={editor}
              className="bg-neutral-900 relative flex-1 overflow-hidden h-full flex flex-col gap-2 pb-3"
            >
              <CopyIcon
                className="size-4 absolute top-2 right-5 text-neutral-500 hover:text-neutral-300 z-2 cursor-pointer"
                onClick={() => {
                  copyToClipboard(html ?? "");
                  toast.success("Content copied to clipboard!");
                }}
              />
              <Editor
                language={editorLanguage} // Use the new state for language
                theme="vs-dark"
                className={classNames(
                  "h-full bg-neutral-900 transition-all duration-200 absolute left-0 top-0"
                )}
                options={{
                  colorDecorators: true,
                  fontLigatures: true,
                  theme: "vs-dark",
                  minimap: { enabled: false },
                  scrollbar: {
                    horizontal: "hidden",
                  },
                  wordWrap: "on",
                }}
                value={
                  editorLanguage === "html"
                    ? html ?? ""
                    : editorLanguage === "css"
                    ? css ?? ""
                    : js ?? ""
                }
                onChange={(value) => {
                  const newValue = value ?? "";
                  if (editorLanguage === "html") {
                    setHtml(newValue);
                    setPreviewHtml(newValue);
                  } else if (editorLanguage === "css") {
                    setCss(newValue);
                  } else if (editorLanguage === "javascript") {
                    setJs(newValue);
                  }
                }}
                onMount={(editor, monaco) => {
                  editorRef.current = editor;
                  monacoRef.current = monaco;
                }}
                onValidate={handleEditorValidation}
              />
              <AskAI
                html={html ?? ""}
                setHtml={(newHtml: string) => {
                  setHtml(newHtml);
                  if (selectedFile === "index.html") {
                    setPreviewHtml(newHtml);
                  }
                }}
                htmlHistory={htmlHistory}
                onSuccess={(
                  finalHtml: string,
                  finalCss: string,
                  finalJs: string,
                  p: string,
                  updatedLines?: number[][]
                ) => {
                  const currentHistory = [...htmlHistory];
                  currentHistory.unshift({
                    html: finalHtml,
                    createdAt: new Date(),
                    prompt: p,
                  });
                  setHtmlHistory(currentHistory);
                  setSelectedElement(null);

                  setHtml(finalHtml);
                  setCss(finalCss);
                  setJs(finalJs);
                  setSelectedFile("index.html");
                  setEditorLanguage("html");
                  setPreviewHtml(finalHtml);

                  // if xs or sm
                  if (window.innerWidth <= 1024) {
                    setCurrentTab("preview");
                  }
                  if (updatedLines && updatedLines?.length > 0) {
                    const decorations = updatedLines.map((line) => ({
                      range: new monacoRef.current.Range(
                        line[0],
                        1,
                        line[1],
                        1
                      ),
                      options: {
                        inlineClassName: "matched-line",
                      },
                    }));
                    setTimeout(() => {
                      editorRef?.current
                        ?.getModel()
                        ?.deltaDecorations([], decorations);

                      editorRef.current?.revealLine(updatedLines[0][0]);
                    }, 100);
                  }
                }}
                isAiWorking={isAiWorking}
                setisAiWorking={setIsAiWorking}
                onNewPrompt={(prompt: string) => {
                  setPrompts((prev) => [...prev, prompt]);
                }}
                onScrollToBottom={() => {
                  editorRef.current?.revealLine(
                    editorRef.current?.getModel()?.getLineCount() ?? 0
                  );
                }}
                isEditableModeEnabled={isEditableModeEnabled}
                setIsEditableModeEnabled={setIsEditableModeEnabled}
                selectedElement={selectedElement}
                setSelectedElement={setSelectedElement}
                setHtmlHistory={setHtmlHistory}
              />
            </div>
            <div
              ref={resizer}
              className="bg-neutral-800 hover:bg-sky-500 active:bg-sky-500 w-1.5 cursor-col-resize h-full max-lg:hidden"
            />
          </>
        )}
        <Preview
          html={previewHtml}
          css={css ?? ""}
          js={js ?? ""}
          isResizing={isResizing}
          isAiWorking={isAiWorking}
          ref={preview}
          device={device}
          currentTab={currentTab}
          isEditableModeEnabled={isEditableModeEnabled}
          iframeRef={iframeRef}
          onClickElement={(element) => {
            setIsEditableModeEnabled(false);
            setSelectedElement(element);
            setCurrentTab("chat");
          }}
        />
      </main>
      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onConfirm={() => {
          setHtml(defaultHTML);
          setCss(defaultCSS);
          setJs(defaultJS);
          editorRef.current?.revealLine(
            editorRef.current?.getModel()?.getLineCount() ?? 0
          );
        }}
      />
      <Footer
        onReset={() => {
          if (isAiWorking) {
            toast.warning("Please wait for the AI to finish working.");
            return;
          }
          setIsNewProjectModalOpen(true);
        }}
        htmlHistory={htmlHistory}
        setHtml={setHtml}
        iframeRef={iframeRef}
        device={device}
        setDevice={(newDevice) => {
          setDevice(newDevice);
          if (!editor.current || !preview.current) return;

          if (newDevice === "mobile") {
            const resizerWidth = resizer.current?.offsetWidth ?? 8;
            const availableWidth = window.innerWidth - resizerWidth;
            const editorWidth = (availableWidth / 4) * 3;
            const previewWidth = availableWidth - editorWidth;
            editor.current.style.width = `${editorWidth}px`;
            preview.current.style.width = `${previewWidth}px`;
          } else {
            resetLayout();
          }
        }}
      />
    </section>
  );
};
