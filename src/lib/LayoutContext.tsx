import { createContext, useContext, useState, ReactNode } from "react";

export type LayoutState = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
};

type LayoutContextType = LayoutState & {
  setLayout: (state: LayoutState) => void;
};

export const LayoutContext = createContext<LayoutContextType | null>(null);

export function useLayout() {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error("useLayout must be used within LayoutProvider");
  return ctx;
}
