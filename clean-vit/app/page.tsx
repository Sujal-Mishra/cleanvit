import Link from "next/link";
import { ArrowRight, Sparkles, User, UserCog } from "lucide-react";

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-br from-background to-secondary/50">
            <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex absolute top-10 px-10">
                <div className="flex items-center gap-2 font-bold text-xl tracking-tighter text-primary">
                    <Sparkles className="h-6 w-6" />
                    CleanVIT
                </div>
                <div className="bg-white/50 dark:bg-black/50 backdrop-blur-sm rounded-full px-4 py-1 text-xs font-semibold border border-primary/20">
                    VIT Vellore
                </div>
            </div>

            <div className="relative flex flex-col items-center place-items-center gap-8 py-20">
                <div className="text-center space-y-4 max-w-2xl">
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent pb-2">
                        Clean Rooms, <br />
                        Better Living.
                    </h1>
                    <p className="text-lg text-muted-foreground">
                        The official cleaning management portal for VIT Hostels.
                        Select your role to get started.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl mt-10">
                    <Link
                        href="/student/login"
                        className="group relative flex flex-col items-start gap-4 rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/50"
                    >
                        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                            <User className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-semibold text-xl group-hover:text-primary transition-colors">Student Portal</h3>
                            <p className="text-sm text-muted-foreground">Log in to request cleaning, view history, and manage your room group.</p>
                        </div>
                        <div className="absolute top-6 right-6 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                            <ArrowRight className="h-5 w-5 text-primary" />
                        </div>
                    </Link>

                    <Link
                        href="/cleaner/login"
                        className="group relative flex flex-col items-start gap-4 rounded-xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/50"
                    >
                        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400">
                            <UserCog className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-semibold text-xl group-hover:text-primary transition-colors">Cleaner Portal</h3>
                            <p className="text-sm text-muted-foreground">View assigned blocks, accept requests, and mark jobs as completed.</p>
                        </div>
                        <div className="absolute top-6 right-6 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                            <ArrowRight className="h-5 w-5 text-primary" />
                        </div>
                    </Link>
                </div>

                <div className="mt-12 text-sm text-muted-foreground flex items-center gap-1">
                    Are you an Admin? <Link href="/admin/login" className="font-medium text-primary hover:underline">Login here</Link>
                </div>
            </div>
        </main>
    );
}
