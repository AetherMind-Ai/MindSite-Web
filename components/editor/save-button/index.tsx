import { useState } from "react";
import { toast } from "sonner";
import { MdSave } from "react-icons/md";
import JSZip from "jszip";
import { saveAs } from "file-saver";

import Loading from "@/components/loading";
import { Button } from "@/components/ui/button";

export function SaveButton({
  html,
  css,
  js,
}: {
  html: string;
  css: string;
  js: string;
}) {
  const [loading, setLoading] = useState(false);

  const saveProject = async () => {
    setLoading(true);

    try {
      const zip = new JSZip();
      const folder = zip.folder("MindSite-Project");
      if (folder) {
        folder.file("index.html", html);
        folder.file("style.css", css);
        folder.file("script.js", js);
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "MindSite-Project.zip");
      toast.success("Project saved successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="default"
        className="max-lg:hidden !px-4 relative"
        onClick={saveProject}
      >
        <MdSave className="size-4" />
        Save your Project{" "}
        {loading && <Loading className="ml-2 size-4 animate-spin" />}
      </Button>
      <Button
        variant="default"
        size="sm"
        className="lg:hidden relative"
        onClick={saveProject}
      >
        Save {loading && <Loading className="ml-2 size-4 animate-spin" />}
      </Button>
    </>
  );
}
