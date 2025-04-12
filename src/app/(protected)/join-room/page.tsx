"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { socket } from "@/socket"

// Form schema
const formSchema = z.object({
    gameId: z.string().min(1, "Game ID is required"),
    playerName: z.string().min(1, "Player name is required"),
})

type FormValues = z.infer<typeof formSchema>

export default function JoinRoomPage() {
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)
    const [isJoining, setIsJoining] = useState(false)

    // Get player name from localStorage if available
    const defaultPlayerName = typeof window !== "undefined" ? localStorage.getItem("playerName") || "" : ""

    // Define form
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            gameId: "",
            playerName: defaultPlayerName,
        },
    })

    const onSubmit = (data: FormValues) => {
        setError(null)
        setIsJoining(true)

        // Save player name to localStorage
        localStorage.setItem("playerName", data.playerName)

        // Connect socket if not connected
        if (!socket.connected) {
            socket.connect()
        }

        // Check if game exists and is joinable
        socket.emit("checkGame", { gameId: data.gameId })

        // Listen for response
        const handleCheckResponse = (response: { exists: boolean; joinable: boolean; message?: string }) => {
            if (response.exists && response.joinable) {
                // Navigate to multiplayer page with game ID
                router.push(`/multiplayer?gameId=${data.gameId}`)
            } else {
                setIsJoining(false)
                setError(response.message || "Unable to join game")
            }

            // Remove listener
            socket.off("checkGameResponse", handleCheckResponse)
        }

        socket.on("checkGameResponse", handleCheckResponse)
    }

    return (
        <div className="relative h-screen w-full overflow-hidden bg-[url(/images/forest-background.png)] bg-no-repeat bg-center bg-cover">
            {/* Back button */}
            <Link href="/home" className="absolute top-4 left-4 z-10">
                <Button variant="outline" className="bg-[#f5f2e3] border-2 border-[#5a6e4a] text-[#3d2c12] hover:bg-[#e8e4d0]">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Menu
                </Button>
            </Link>

            <div className="flex flex-col items-center justify-center h-full">
                <div className="bg-[#f5f2e3] border-4 border-[#5a6e4a] rounded-lg p-6 shadow-lg max-w-md w-full">
                    <h1 className="text-3xl font-bold mb-4 text-[#3d2c12] font-pixel text-center">Join Room</h1>

                    {error && (
                        <div className="bg-[#ffcdd2] border-2 border-[#e57373] text-[#c62828] p-3 rounded-md mb-4">{error}</div>
                    )}

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="gameId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[#3d2c12] font-medium">Game ID</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Enter the game ID"
                                                {...field}
                                                className="h-10 border-2 border-[#5a6e4a] rounded-md focus:outline-none focus:ring-2 focus:ring-[#8bba5f] bg-[#e8e4d0]"
                                            />
                                        </FormControl>
                                        <FormMessage className="text-[#c62828]" />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="playerName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-[#3d2c12] font-medium">Your Name</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Enter your name"
                                                {...field}
                                                className="h-10 border-2 border-[#5a6e4a] rounded-md focus:outline-none focus:ring-2 focus:ring-[#8bba5f] bg-[#e8e4d0]"
                                            />
                                        </FormControl>
                                        <FormMessage className="text-[#c62828]" />
                                    </FormItem>
                                )}
                            />

                            <Button
                                type="submit"
                                disabled={isJoining}
                                className="w-full bg-[#42a5f5] hover:bg-[#1e88e5] text-white py-2 px-4 rounded-md font-bold transition-all transform hover:scale-105 shadow-md hover:cursor-pointer"
                            >
                                {isJoining ? (
                                    <div className="flex items-center justify-center">
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                        Joining...
                                    </div>
                                ) : (
                                    "Join Game"
                                )}
                            </Button>
                        </form>
                    </Form>
                </div>
            </div>
        </div>
    )
}
