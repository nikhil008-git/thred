import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Thred — shared memory for every agent",
  description:
    "One shared context stream for every agent that picks up the work.",
  openGraph: {
    title: "Thred — shared memory for every agent",
    description:
      "One shared context stream for every agent that picks up the work.",
    images: [{ url: "/share/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Thred — shared memory for every agent",
    description:
      "One shared context stream for every agent that picks up the work.",
    images: ["/share/opengraph-image"],
  },
};

export default function SharePage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f3f5f1] px-6 text-center text-[#20221f]">
      <div>
        <p className="text-sm uppercase tracking-[.2em] text-[#747b72]">
          thred
        </p>
        <h1 className="mt-3 text-4xl tracking-[-.06em]">
          Memory for the work in motion.
        </h1>
      </div>
    </main>
  );
}
