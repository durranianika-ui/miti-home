"use client";

import type React from "react";
import { ThemeProvider as BrandThemeProvider } from "@/lib/theme-context";

type ThemeProviderProps = {
  children: React.ReactNode;
} & Record<string, unknown>;

export function ThemeProvider({ children }: ThemeProviderProps) {
  return <BrandThemeProvider>{children}</BrandThemeProvider>;
}
