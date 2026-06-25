import { SettingsContext } from "@/settings/SettingsContext";
import type { Settings } from "@/types/interface";
import { useContext } from "react";


export const useSettings = (): Settings => {
    const context = useContext(SettingsContext)

    if (!context) {
        throw new Error("useAuth must be used within an SettingsProvider");
    }
    return context;

    
}