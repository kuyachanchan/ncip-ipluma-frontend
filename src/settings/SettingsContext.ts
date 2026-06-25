import type { Settings } from "@/types/interface";
import { createContext } from "react";


export const SettingsContext = createContext<Settings | undefined>(undefined);