import { TiUserAdd } from "react-icons/ti";
import { Link } from "lucide-react";
import { FaXTwitter } from "react-icons/fa6";
import { useCopyToClipboard } from "react-use";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function InviteFriends() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, copyToClipboard] = useCopyToClipboard();

  return (
    <Dialog>
      <form>
        <DialogTrigger asChild>
          <Button
            size="iconXs"
            variant="outline"
            className="!border-neutral-600 !text-neutral-400 !hover:!border-neutral-500 hover:!text-neutral-300"
          >
            <TiUserAdd className="size-4" />
          </Button>
        </DialogTrigger>
        
      </form>
    </Dialog>
  );
}
