"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { adminLogin } from "@/lib/actions"
import { useFormStatus } from "react-dom"
import { ShieldCheck } from "lucide-react"

function SubmitButton() {
    const { pending } = useFormStatus()
    return (
        <Button className="w-full" type="submit" disabled={pending}>
            {pending ? "Logging in..." : "Login"}
        </Button>
    )
}

export default function AdminLoginPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
            <Card className="w-full max-w-md border-gray-700 bg-gray-800 text-gray-100">
                <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <ShieldCheck className="h-6 w-6 text-indigo-400" />
                        <span className="font-bold text-lg">CleanVIT Admin</span>
                    </div>
                    <CardTitle>Administrative Access</CardTitle>
                    <CardDescription className="text-gray-400">Restricted area. Authorized personnel only.</CardDescription>
                </CardHeader>
                <form action={adminLogin}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" name="email" type="email" placeholder="admin@cleanvit.com" className="bg-gray-700 border-gray-600 text-gray-100" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" name="password" type="password" className="bg-gray-700 border-gray-600 text-gray-100" required />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <SubmitButton />
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
