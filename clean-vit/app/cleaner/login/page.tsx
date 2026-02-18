"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { cleanerLogin } from "@/lib/actions"
import { useFormStatus } from "react-dom"

function SubmitButton() {
    const { pending } = useFormStatus()
    return (
        <Button className="w-full" type="submit" disabled={pending}>
            {pending ? "Logging in..." : "Login"}
        </Button>
    )
}

export default function CleanerLoginPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
            <Card className="w-full max-w-md border-green-200 dark:border-green-900">
                <CardHeader>
                    <CardTitle className="text-green-700 dark:text-green-400">Cleaner Portal</CardTitle>
                    <CardDescription>Login to view your assigned tasks</CardDescription>
                </CardHeader>
                <form action={cleanerLogin}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" name="email" type="email" placeholder="cleaner@facility.vit" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" name="password" type="password" required />
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
