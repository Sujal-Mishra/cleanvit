import prisma from "@/lib/prisma"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import CleanerDashboardClient from "@/components/cleaner-dashboard-client"

export default async function CleanerDashboardPage() {
    const userId = cookies().get("userId")?.value
    const role = cookies().get("role")?.value

    if (!userId || role !== "CLEANER") {
        redirect("/cleaner/login")
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            cleanerProfile: true
        }
    })

    if (!user || !user.cleanerProfile) {
        redirect("/cleaner/login")
    }

    // 3-Hour Timeout Logic: Revert "IN_PROGRESS" to "PENDING" if > 3 hours
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    await prisma.request.updateMany({
        where: {
            status: "IN_PROGRESS",
            acceptedAt: {
                lt: threeHoursAgo
            }
        },
        data: {
            status: "PENDING",
            cleanerId: null,      // Unassign cleaner
            acceptedAt: null
        }
    });

    // Fetch pending requests for the assigned block
    const pendingRequests = await prisma.request.findMany({
        where: {
            status: "PENDING",
            group: {
                block: user.cleanerProfile.assignedBlock
            }
        },
        include: {
            group: true
        },
        orderBy: {
            createdAt: 'asc'
        }
    })

    // Fetch active jobs for this cleaner
    const activeJobs = await prisma.request.findMany({
        where: {
            cleanerId: user.cleanerProfile.id,
            status: "IN_PROGRESS"
        },
        include: {
            group: true
        }
    })

    return (
        <CleanerDashboardClient
            user={user}
            cleanerProfile={user.cleanerProfile}
            pendingRequests={pendingRequests}
            activeJobs={activeJobs}
        />
    )
}
