"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { studentSignup } from "@/lib/actions"
import Link from "next/link"
import { useFormStatus } from "react-dom"

function SubmitButton() {
    const { pending } = useFormStatus()
    return (
        <Button className="w-full" type="submit" disabled={pending}>
            {pending ? "Creating Account..." : "Sign Up"}
        </Button>
    )
}

export default function StudentSignupPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Student Registration</CardTitle>
                    <CardDescription>Enter your details to join your room group</CardDescription>
                </CardHeader>
                <form action={studentSignup}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">VIT Email</Label>
                            <Input id="email" name="email" type="email" placeholder="example@vitstudent.ac.in" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" name="password" type="password" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input id="name" name="name" placeholder="John Doe" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="regNo">Registration Number</Label>
                            <Input id="regNo" name="regNo" placeholder="21BCE1234" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="block">Block</Label>
                                <Input id="block" name="block" placeholder="Q" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="roomNo">Room No</Label>
                                <Input id="roomNo" name="roomNo" placeholder="101" required />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                        <SubmitButton />
                        <div className="text-sm text-center text-muted-foreground">
                            Already have an account? <Link href="/student/login" className="text-primary hover:underline">Login</Link>
                        </div>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
