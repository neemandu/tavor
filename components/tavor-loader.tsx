"use client";

import { useEffect, useState } from "react";

export function TavorLoader() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("loader-shown")) return;
    setVisible(true);
    const t = setTimeout(() => {
      sessionStorage.setItem("loader-shown", "1");
      setVisible(false);
    }, 2300);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-[#0A0A0A] flex items-center justify-center overflow-hidden pointer-events-none">
      <div
        className="flex flex-col items-center gap-6"
        style={{ animation: "loader-exit 0.6s ease-in 1.6s both" }}
      >
        <div
          className="w-32 h-32 rounded-full"
          style={{
            background:
              "radial-gradient(circle at center, oklch(70% 0.22 40 / 0.9), oklch(65% 0.22 40))",
            animation:
              "orb-enter 0.4s ease-out both, breathe 0.4s ease-in-out 0.4s 1",
          }}
        />
        <span
          className="text-5xl font-black text-white"
          style={{ animation: "word-fade 0.4s ease-out 0.8s both" }}
        >
          תבור
        </span>
      </div>
    </div>
  );
}
