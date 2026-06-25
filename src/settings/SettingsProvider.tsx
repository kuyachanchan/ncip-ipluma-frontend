import { useState, type ReactNode } from "react";
import { SettingsContext } from "./SettingsContext";


interface SettingsProviderProps{
    children: ReactNode
}

export const SettingsProvider = ({ children }: SettingsProviderProps) => {
    const [isFullScreen, setIsFullScreen] = useState(false)


    const handleFullScreen = () => {
        setIsFullScreen(prev => !prev)
    }


    return (
        <SettingsContext.Provider value={{ isFullScreen , handleFullScreen}}>
            { children }
        </SettingsContext.Provider>
    )
}