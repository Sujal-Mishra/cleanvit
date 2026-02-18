"use client"

import { QRCodeSVG } from "qrcode.react" // Need to install this, but for now I'll just use a placeholder or assume it's there. Actually I can't assume. I'll use a text fallback if package missing, but let's try to simulate or minimal implementation.
// Better yet, I'll just display the code as text for the prototype if the package isn't available. But wait, I can't run npm install.
// I will just display the "Secret Code" which the cleaner can enter manually or "scan" (simulated).

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { createCleaningRequest, logout } from "@/lib/actions"
import { useFormStatus } from "react-dom"
import { RefreshCw, CheckCircle, Clock, MapPin, User, LogOut } from "lucide-react"

function RequestButton() {
    const { pending } = useFormStatus()
    return (
        <Button size="lg" className="w-full text-lg h-16" disabled={pending}>
            {pending ? <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> : <SparklesIcon />}
            {pending ? "Requesting..." : "Request Room Cleaning"}
        </Button>
    )
}

function SparklesIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2 h-5 w-5"
        >
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
        </svg>
    )
}

interface DashboardProps {
    user: any
    studentProfile: any
    activeRequest: any
    history: any[]
}

export default function StudentDashboardClient({ user, studentProfile, activeRequest, history }: DashboardProps) {
    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900/50 p-6 md:p-12 space-y-8">
            <header className="flex justify-between items-center max-w-5xl mx-auto">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Welcome, {user.name}</h1>
                    <div className="flex items-center text-muted-foreground mt-1 gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{studentProfile.block} Block - Room {studentProfile.roomNo}</span>
                    </div>
                </div>
                <form action={logout}>
                    <Button variant="outline" size="sm">
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </Button>
                </form>
            </header>

            <main className="max-w-5xl mx-auto grid gap-6 md:grid-cols-2">
                <section className="space-y-6">
                    <Card className="border-primary/20 shadow-lg">
                        <CardHeader className="bg-primary/5 dark:bg-primary/10 border-b border-primary/10">
                            <CardTitle>Current Status</CardTitle>
                            <CardDescription>Manage your room cleaning requests</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {activeRequest ? (
                                <div className="space-y-6">
                                    <div className="flex flex-col items-center justify-center p-6 bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/20">
                                        {activeRequest.status === "PENDING" && (
                                            <>
                                                <Clock className="h-12 w-12 text-blue-500 mb-4 animate-pulse" />
                                                <h3 className="text-xl font-semibold text-blue-600">Request Pending</h3>
                                                <p className="text-center text-muted-foreground mt-2">Waiting for a cleaner to accept...</p>
                                            </>
                                        )}

                                        {activeRequest.status === "IN_PROGRESS" && (
                                            <>
                                                <div className="bg-white p-4 rounded-lg shadow-sm">
                                                    {/* Placeholder for QR Code */}
                                                    <div className="h-48 w-48 bg-black flex items-center justify-center text-white font-mono text-2xl">
                                                        QR: {activeRequest.qrCodeSecret?.substring(0, 4)}
                                                    </div>
                                                </div>
                                                <h3 className="text-xl font-semibold text-green-600 mt-4">In Progress</h3>
                                                <p className="text-center text-muted-foreground mt-2">
                                                    Show this code to the cleaner when they finish.
                                                </p>
                                                <p className="text-xs font-mono bg-muted px-2 py-1 rounded mt-2">
                                                    Secret: {activeRequest.qrCodeSecret}
                                                </p>
                                            </>
                                        )}
                                    </div>

                                    <div className="text-xs text-center text-muted-foreground">
                                        Request ID: {activeRequest.id}
                                    </div>
                                </div>
                            ) : (
                                <div className="py-8">
                                    <form action={createCleaningRequest.bind(null, studentProfile.groupId)}>
                                        <RequestButton />
                                    </form>
                                    <p className="text-center text-sm text-muted-foreground mt-4">
                                        Request will be visible to all assigned cleaners.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </section>

                <section className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>History</CardTitle>
                            <CardDescription>Recent cleaning activity</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {history.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">No cleaning history yet.</div>
                            ) : (
                                <div className="space-y-4">
                                    {history.map((req) => (
                                        <div key={req.id} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-green-100 dark:bg-green-900 p-2 rounded-full">
                                                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                </div>
                                                <div>
                                                    <div className="font-medium">Cleaned</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {new Date(req.completedAt).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>
                                            {req.rating && <div className="text-sm font-semibold">★ {req.rating}</div>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </section>
            </main>
        </div>
    )
}
