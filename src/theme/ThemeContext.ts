import type { Theme } from "@/types/interface";
import { createContext } from "react";

export const ThemeContext = createContext<Theme | undefined>(undefined);