import { useState } from "react";
import { Menu, X } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from "./ui/drawer";
import Sidebar from "./sidebar";

export default function MobileSidebar() {
  const [open, setOpen] = useState(false);
  return (
    <Drawer open={open} onOpenChange={setOpen} swipeDirection="left">
      <DrawerTrigger
        className="flex size-11 shrink-0 items-center justify-center rounded-lg text-foreground hover:bg-muted"
        aria-label="Ouvrir le menu de navigation"
      >
        <Menu className="size-5" />
      </DrawerTrigger>
      <DrawerContent className="h-dvh! w-[min(20rem,calc(100vw-2rem))]!">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2">
          <DrawerTitle>Menu de navigation</DrawerTitle>
          <DrawerClose
            className="flex size-11 items-center justify-center rounded-lg hover:bg-muted"
            aria-label="Fermer le menu"
          >
            <X className="size-5" />
          </DrawerClose>
        </div>
        <DrawerDescription className="sr-only">
          Accédez aux pages de votre espace Teranga Work.
        </DrawerDescription>
        <Sidebar mobile onNavigate={() => setOpen(false)} />
      </DrawerContent>
    </Drawer>
  );
}
