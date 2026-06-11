"use client";

import { useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/theme/use-theme";

export function ThemeToggle() {
  const { theme, toggleTheme, syncTheme } = useTheme();

  useEffect(() => {
    syncTheme();
  }, [syncTheme]);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="grid size-10 place-items-center rounded-2xl bg-muted text-ink-muted transition hover:bg-primary hover:text-white"
      aria-label={theme === "dark" ? "تفعيل الوضع المضيء" : "تفعيل الوضع المظلم"}
      title={theme === "dark" ? "الوضع المضيء" : "الوضع المظلم"}
    >
      {theme === "dark" ? (
        <Sun className="size-[18px]" />
      ) : (
        <Moon className="size-[18px]" />
      )}
    </button>
  );
}
