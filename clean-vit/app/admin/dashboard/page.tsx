import prisma from "@/lib/prisma"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import AdminDashboardClient from "@/components/admin-dashboard-client"

export default async function AdminDashboardPage() {
    const userId = cookies().get("userId")?.value
    const role = cookies().get("role")?.value

    if (!userId || role !== "ADMIN") {
        redirect("/admin/login")
    }

    // Fetch stats
    const totalRequests = await prisma.request.count()
    const pendingRequests = await prisma.request.count({ where: { status: "PENDING" } })
    const completedRequests = await prisma.request.count({ where: { status: "COMPLETED" } })
    const activeCleaners = await prisma.cleanerProfile.count()

    const stats = {
        totalRequests,
        pendingRequests,
        completedRequests,
        activeCleaners
    }

    return <AdminDashboardClient stats={stats} />
}
