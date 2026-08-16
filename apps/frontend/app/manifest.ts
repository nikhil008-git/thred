import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "thred",
    short_name: "thred",
    description: "Shared temporal memory for coding agents through MCP.",
    display: "standalone",
    background_color: "#fcfcfb",
    theme_color: "#171917",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
