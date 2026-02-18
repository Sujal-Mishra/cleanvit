"use client" // Needed for keyframes? No, but typically used in components

import { Loader2 } from "lucide-react"

export function LoadingSpinner() {
    return (
        <div className="flex h-full w-full items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
}
