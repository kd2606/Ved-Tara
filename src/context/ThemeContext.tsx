"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Persona = "ved" | "tara";

interface ThemeContextType {
  activePersona: Persona;
  setActivePersona: (persona: Persona) => void;
  togglePersona: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [activePersona, setActivePersona] = useState<Persona>("ved");

  useEffect(() => {
    // Apply the active persona as a data attribute to the document element
    // so we can use CSS variables easily in global CSS
    document.documentElement.setAttribute("data-theme", activePersona);
  }, [activePersona]);

  const togglePersona = () => {
    setActivePersona((prev) => (prev === "ved" ? "tara" : "ved"));
  };

  return (
    <ThemeContext.Provider value={{ activePersona, setActivePersona, togglePersona }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
