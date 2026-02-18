import prisma from "@/lib/prisma"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import StudentDashboardClient from "@/components/student-dashboard-client"

export default async function StudentDashboardPage() {
    const userId = cookies().get("userId")?.value
    const role = cookies().get("role")?.value

    if (!userId || role !== "STUDENT") {
        redirect("/student/login")
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            studentProfile: true
        }
    })

    if (!user || !user.studentProfile) {
        redirect("/student/login") // Handle edge case
    }

    // Fetch active request
    const activeRequest = await prisma.request.findFirst({
        where: {
            groupId: user.studentProfile.groupId,
            status: { in: ["PENDING", "IN_PROGRESS"] }
        }
    })

    // Fetch history
    const history = await prisma.request.findMany({
        where: {
            groupId: user.studentProfile.groupId,
            status: "COMPLETED"
        },
        orderBy: {
            completedAt: 'desc'
        },
        take: 5
    })

    return (
        <StudentDashboardClient
            user={user}
            studentProfile={user.studentProfile}
            activeRequest={activeRequest}
            history={history}
        />
    )
}
