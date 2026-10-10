import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "SHB",
    short_name: "SHB",
    description: "SHB — your people, messages and moments.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#000000",
    theme_color: "#000000",
    categories: ["social", "communication"],
    icons: [
      {
        src: "/byte-icon-512.png.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/ic_stat_byte_96.png.png",
        sizes: "96x96",
        type: "image/png",
      },
    ],
  };
}
