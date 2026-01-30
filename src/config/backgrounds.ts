import bg1 from "@/assets/dark-bg-variant-1.PNG";
import bg2 from "@/assets/dark-bg-variant-2.PNG";
import bg3 from "@/assets/dark-bg-variant-3.PNG";
import bg4 from "@/assets/dark-bg-variant-4.PNG";

export const backgrounds = [
  {
    id: "variant-1",
    name: "Midnight Gradient",
    src: bg1,
  },
  {
    id: "variant-2",
    name: "Deep Cosmos",
    src: bg2,
  },
  {
    id: "variant-3",
    name: "Aurora Borealis",
    src: bg3,
  },
  {
    id: "variant-4",
    name: "Nebula Dreams",
    src: bg4,
  },
] as const;

export type BackgroundId = (typeof backgrounds)[number]["id"];
