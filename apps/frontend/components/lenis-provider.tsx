"use client";

import Lenis from "lenis";
import { useEffect, type ReactNode } from "react";

export function LenisProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let lenis: Lenis | undefined;

    const start = () => {
      if (!reducedMotion.matches) {
        lenis = new Lenis({
          anchors: true,
          autoRaf: true,
          lerp: 0.09,
        });
      }
    };

    const handleMotionPreferenceChange = () => {
      lenis?.destroy();
      lenis = undefined;
      start();
    };

    start();
    reducedMotion.addEventListener("change", handleMotionPreferenceChange);

    return () => {
      reducedMotion.removeEventListener("change", handleMotionPreferenceChange);
      lenis?.destroy();
    };
  }, []);

  return children;
}
