import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SHB",
    short_name: "SHB",
    description: "SHB social hub",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [{ src: "/byte-icon-512.png.png", sizes: "512x512", type: "image/png" }],
  };
}
