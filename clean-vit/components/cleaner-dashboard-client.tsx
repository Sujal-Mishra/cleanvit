"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { acceptRequest, completeRequest, logout } from "@/lib/actions"
import { useFormStatus } from "react-dom"
import { Check, Clock, MapPin, User, LogOut, Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner" // Assuming toast library or basic window alert fallback

function AcceptButton({ requestId }: { requestId: string }) {
    const { pending } = useFormStatus()
    return (
        <Button size="sm" disabled={pending} formAction={acceptRequest.bind(null, requestId)}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Accept"}
        </Button>
    )
}

function CompleteButton() {
    const { pending } = useFormStatus()
    return (
        <Button type="submit" disabled={pending} className="w-full bg-green-600 hover:bg-green-700">
            {pending ? "Verifying..." : "Verify & Complete"}
        </Button>
    )
}

interface RequestItem {
    id: string
    group: {
        block: string
        roomNo: string
    }
    createdAt: Date
    status: string
}

interface DashboardProps {
    user: any
    cleanerProfile: any
    pendingRequests: RequestItem[]
    activeJobs: RequestItem[]
}

export default function CleanerDashboardClient({ user, cleanerProfile, pendingRequests, activeJobs }: DashboardProps) {
    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900/50 p-6 md:p-12 space-y-8">
            <header className="flex justify-between items-center max-w-6xl mx-auto">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-green-700 dark:text-green-400">Cleaner Portal</h1>
                    <div className="flex items-center text-muted-foreground mt-1 gap-2">
                        <User className="h-4 w-4" />
                        <span>{user.name}</span>
                        <span className="mx-2">•</span>
                        <MapPin className="h-4 w-4" />
                        <span>Assigned Block: <strong>{cleanerProfile.assignedBlock}</strong></span>
                    </div>
                </div>
                <form action={logout}>
                    <Button variant="outline" size="sm">
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </Button>
                </form>
            </header>

            <main className="max-w-6xl mx-auto grid gap-6 md:grid-cols-2">
                {/* Active Jobs Section */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-semibold tracking-tight">Active Jobs</h2>
                    {activeJobs.length === 0 ? (
                        <Card className="bg-muted/20 border-dashed">
                            <CardContent className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                                <Check className="h-10 w-10 mb-4 opacity-20" />
                                <p>No active jobs. Accept a request to start.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {activeJobs.map((job) => (
                                <Card key={job.id} className="border-green-200 dark:border-green-900 shadow-md">
                                    <CardHeader className="bg-green-50 dark:bg-green-900/20 pb-4">
                                        <CardTitle className="text-lg flex justify-between">
                                            <span>Room {job.group.roomNo}</span>
                                            <span className="text-sm font-normal bg-green-100 text-green-800 px-2 py-1 rounded">In Progress</span>
                                        </CardTitle>
                                        <CardDescription>Started just now</CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-6">
                                        <form action={completeRequest} className="space-y-4">
                                            <input type="hidden" name="requestId" value={job.id} />
                                            <div className="space-y-2">
                                                <Label htmlFor={`secret-${job.id}`}>QR Code Secret</Label>
                                                <Input
                                                    id={`secret-${job.id}`}
                                                    name="secret"
                                                    placeholder="Ask student for code"
                                                    required
                                                />
                                            </div>
                                            <CompleteButton />
                                        </form>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </section>

                {/* Pending Requests Section */}
                <section className="space-y-6">
                    <h2 className="text-2xl font-semibold tracking-tight">Pending Requests ({pendingRequests.length})</h2>
                    <div className="space-y-4">
                        {pendingRequests.map((req) => (
                            <Card key={req.id} className="hover:border-primary/50 transition-colors">
                                <CardContent className="p-6 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <div className="font-semibold text-lg flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-muted-foreground" />
                                            Block {req.group.block} - Room {req.group.roomNo}
                                        </div>
                                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            Created {new Date(req.createdAt).toLocaleTimeString()}
                                        </div>
                                    </div>
                                    <form>
                                        <AcceptButton requestId={req.id} />
                                    </form>
                                </CardContent>
                            </Card>
                        ))}
                        {pendingRequests.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground bg-card rounded-lg border border-dashed">
                                No pending requests in your block.
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    )
}
