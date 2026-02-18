"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { studentLogin } from "@/lib/actions"
import Link from "next/link"
import { useFormStatus } from "react-dom"

function SubmitButton() {
    const { pending } = useFormStatus()
    return (
        <Button className="w-full" type="submit" disabled={pending}>
            {pending ? "Logging in..." : "Login"}
        </Button>
    )
}

export default function StudentLoginPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Student Login</CardTitle>
                    <CardDescription>Welcome back to CleanVIT</CardDescription>
                </CardHeader>
                <form action={studentLogin}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">VIT Email</Label>
                            <Input id="email" name="email" type="email" placeholder="example@vitstudent.ac.in" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" name="password" type="password" required />
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                        <SubmitButton />
                        <div className="text-sm text-center text-muted-foreground">
                            Don't have an account? <Link href="/student/signup" className="text-primary hover:underline">Sign up</Link>
                        </div>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
