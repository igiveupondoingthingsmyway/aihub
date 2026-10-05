import {
  AudioLines, Code, ImageIcon, ListChecks, MessagesSquare, PenLine, Telescope, Video,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "@/lib/types";

export const categories: { name: Category; icon: LucideIcon }[] = [
  { name: "AI Chat", icon: MessagesSquare },
  { name: "Image Generation", icon: ImageIcon },
  { name: "Video", icon: Video },
  { name: "Coding", icon: Code },
  { name: "Writing", icon: PenLine },
  { name: "Research", icon: Telescope },
  { name: "Audio", icon: AudioLines },
  { name: "Productivity", icon: ListChecks },
];
