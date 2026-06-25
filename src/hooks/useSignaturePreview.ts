/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import api from "@/api/axiosInstance"
import { useEffect, useState } from "react"

export const useSignaturePreview = () => {

    const [signaturePreviewUrl, setSignaturePreviewUrl] = useState<string | null>(null)
    const [filePath, setFilePath] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null);

    const changeFilePath = (file_path : string) => {
        setFilePath(file_path)
    }


    useEffect(() => {
        if (!filePath) return;

        let active = true;

        const controller = new AbortController();

        const fetchImage = async (_retry = true)=>{
            try {
                const response = await api.get(filePath, {
                responseType: "blob",
                signal: controller.signal
                })

                const objectUrl = URL.createObjectURL(response.data)
                if(active) setSignaturePreviewUrl(objectUrl)
            } catch (err: any) {
                if(active) setError(err.message || "Image fetch failed")
            }
        }

        fetchImage()

        return () => {
        active = false;
        controller.abort();
        if (signaturePreviewUrl) URL.revokeObjectURL(signaturePreviewUrl);
        };
    }, [filePath])

    return { signaturePreviewUrl, error, changeFilePath };
    


}