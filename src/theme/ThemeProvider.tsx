import type { ReactNode } from "react";
import { ThemeContext } from "./ThemeContext";

interface ThemeProviderProps{
    children: ReactNode
}


export const ThemeProvider = ({ children }: ThemeProviderProps) => {
    const color = "red"

    return (
        <ThemeContext.Provider value={{ color }}>
            {children}
        </ThemeContext.Provider>
    )
}