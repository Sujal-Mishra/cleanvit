"use server"

import { z } from "zod"
import prisma from "@/lib/prisma"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { createHash } from "crypto"

function hashPassword(password: string): string {
    return createHash("sha256").update(password).digest("hex")
}

// Student Actions
export async function studentSignup(formData: FormData) {
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const name = formData.get("name") as string
    const regNo = formData.get("regNo") as string
    const block = formData.get("block") as string
    const roomNo = formData.get("roomNo") as string

    if (!email.endsWith("@vitstudent.ac.in")) {
        return { error: "Must use VIT Student email (@vitstudent.ac.in)" }
    }

    try {
        const existingUser = await prisma.user.findUnique({ where: { email } })
        if (existingUser) return { error: "User already exists" }

        const hashedPassword = hashPassword(password)

        await prisma.$transaction(async (tx) => {
            let group = await tx.roomGroup.findUnique({
                where: {
                    block_roomNo: {
                        block,
                        roomNo
                    }
                }
            })

            if (!group) {
                group = await tx.roomGroup.create({
                    data: {
                        block,
                        roomNo
                    }
                })
            }

            const user = await tx.user.create({
                data: {
                    email,
                    passwordHash: hashedPassword,
                    name,
                    role: "STUDENT",
                }
            })

            await tx.studentProfile.create({
                data: {
                    userId: user.id,
                    regNo,
                    block,
                    roomNo,
                    groupId: group.id
                }
            })
        })

    } catch (e) {
        console.error(e)
        return { error: "Failed to create account" }
    }

    redirect("/student/login")
}

export async function studentLogin(formData: FormData) {
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    const user = await prisma.user.findUnique({
        where: { email },
        include: { studentProfile: true }
    })

    if (!user || user.role !== "STUDENT" || hashPassword(password) !== user.passwordHash) {
        return { error: "Invalid credentials" }
    }

    cookies().set("userId", user.id)
    cookies().set("role", "STUDENT")

    redirect("/student/dashboard")
}

export async function createCleaningRequest(groupId: string) {
    try {
        await prisma.request.create({
            data: {
                groupId,
                status: "PENDING"
            }
        })
        return { success: true }
    } catch (e) {
        return { error: "Failed to create request" }
    }
}

// Cleaner Actions
export async function cleanerLogin(formData: FormData) {
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    const user = await prisma.user.findUnique({
        where: { email },
        include: { cleanerProfile: true }
    })

    if (!user || user.role !== "CLEANER" || hashPassword(password) !== user.passwordHash) {
        return { error: "Invalid credentials" }
    }

    cookies().set("userId", user.id)
    cookies().set("role", "CLEANER")

    redirect("/cleaner/dashboard")
}

export async function acceptRequest(requestId: string) {
    const cleanerId = cookies().get("userId")?.value
    // Ideally verify session/role here too

    const cleanerProfile = await prisma.cleanerProfile.findUnique({
        where: { userId: cleanerId }
    })

    if (!cleanerProfile) return { error: "Cleaner profile not found" }

    try {
        await prisma.request.update({
            where: { id: requestId },
            data: {
                status: "IN_PROGRESS",
                cleanerId: cleanerProfile.id,
                acceptedAt: new Date()
            }
        })
        return { success: true }
    } catch (e) {
        return { error: "Failed to accept request" }
    }
}

export async function completeRequest(formData: FormData) {
    const requestId = formData.get("requestId") as string
    const secret = formData.get("secret") as string

    try {
        const request = await prisma.request.findUnique({
            where: { id: requestId }
        })

        if (!request) return { error: "Request not found" }

        if (request.qrCodeSecret !== secret) {
            return { error: "Invalid QR Code Secret" }
        }

        await prisma.request.update({
            where: { id: requestId },
            data: {
                status: "COMPLETED",
                completedAt: new Date()
            }
        })
        return { success: true } // In a real app, maybe revalidatePath or redirect
    } catch (e) {
        return { error: "Failed to complete request" }
    }
}

// Admin Actions
export async function adminLogin(formData: FormData) {
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    // Hardcoded admin for prototype or check DB
    // For now, let's assume a DB user with role ADMIN exists
    const user = await prisma.user.findUnique({
        where: { email }
    })

    if (!user || user.role !== "ADMIN" || hashPassword(password) !== user.passwordHash) {
        return { error: "Invalid credentials" }
    }

    cookies().set("userId", user.id)
    cookies().set("role", "ADMIN")

    redirect("/admin/dashboard")
}

export async function registerCleaner(formData: FormData) {
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const name = formData.get("name") as string
    const assignedBlock = formData.get("assignedBlock") as string

    try {
        const hashedPassword = hashPassword(password)

        await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email,
                    passwordHash: hashedPassword,
                    name,
                    role: "CLEANER"
                }
            })

            await tx.cleanerProfile.create({
                data: {
                    userId: user.id,
                    assignedBlock
                }
            })
        })
    } catch (e) {
        return { error: "Failed to register cleaner" }
    }

    // revalidatePath("/admin/dashboard") // dynamic import or just let it refresh
}

export async function logout() {
    cookies().delete("userId")
    cookies().delete("role")
    redirect("/")
}
