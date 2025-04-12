"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Copy, Check } from "lucide-react"
import Link from "next/link"
import { socket } from "@/socket"
import { Slider } from "@/components/ui/slider"

// Form schema
const formSchema = z.object({
    playerName: z.string().min(1, "Player name is required"),
    maxPlayers: z.number().min(2).max(50),
})

type FormValues = z.infer<typeof formSchema>

export default function CreateRoomPage() {
    const router = useRouter()
    const [error, setError] = useState<string | null>(null)
    const [isCreating, setIsCreating] = useState(false)
    const [gameId, setGameId] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)

    // Get player name from localStorage if available
    const defaultPlayerName = typeof window !== "undefined" ? localStorage.getItem("playerName") || "" : ""

    // Define form
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            playerName: defaultPlayerName,
            maxPlayers: 30,
        },
    })

    useEffect(() => {
        // Listen for game creation response
        const handleCreateResponse = (response: { success: boolean; gameId?: string; message?: string }) => {
            setIsCreating(false)

            if (response.success && response.gameId) {
                setGameId(response.gameId)
            } else if (response.message) {
                setError(response.message)
            }
        }

        socket.on("createGameResponse", handleCreateResponse)

        return () => {
            socket.off("createGameResponse", handleCreateResponse)
        }
    }, [])

    const onSubmit = (data: FormValues) => {
        setError(null)
        setIsCreating(true)

        // Save player name to localStorage
        localStorage.setItem("playerName", data.playerName)

        // Connect socket if not connected
        if (!socket.connected) {
            socket.connect()
        }

        // Create new game with the specified max players
        socket.emit("createGame", {
            name: data.playerName,
            maxPlayers: data.maxPlayers,
        })
    }

    const copyGameId = () => {
        if (gameId) {
            navigator.clipboard.writeText(gameId)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const goToLobby = () => {
        // Navigate to multiplayer page with the game ID as a query parameter
        router.push(`/multiplayer?gameId=${gameId}`)
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
                    <h1 className="text-3xl font-bold mb-4 text-[#3d2c12] font-pixel text-center">Create Room</h1>

                    {error && (
                        <div className="bg-[#ffcdd2] border-2 border-[#e57373] text-[#c62828] p-3 rounded-md mb-4">{error}</div>
                    )}

                    {gameId ? (
                        <div className="space-y-4">
                            <div className="bg-[#c8e6c9] border-2 border-[#81c784] text-[#2e7d32] p-3 rounded-md mb-4">
                                Game created successfully!
                            </div>

                            <div className="bg-[#e8e4d0] border-2 border-[#5a6e4a] rounded-md p-3">
                                <p className="text-[#3d2c12] mb-2 font-medium">Game ID:</p>
                                <div className="flex items-center justify-between bg-white p-2 rounded border border-[#5a6e4a]">
                                    <span className="font-mono font-bold">{gameId}</span>
                                    <Button variant="ghost" size="sm" onClick={copyGameId} className="h-8 w-8 p-0">
                                        {copied ? <Check size={16} /> : <Copy size={16} />}
                                    </Button>
                                </div>
                                <p className="text-[#5a4025] text-sm mt-2">Share this ID with friends so they can join your game.</p>
                            </div>

                            <Button
                                onClick={goToLobby}
                                className="w-full bg-[#8bba5f] hover:bg-[#7aa54e] text-white py-2 px-4 rounded-md font-bold transition-all transform hover:scale-105 shadow-md hover:cursor-pointer"
                            >
                                Go to Lobby
                            </Button>
                        </div>
                    ) : (
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

                                <FormField
                                    control={form.control}
                                    name="maxPlayers"
                                    render={({ field: { value, onChange } }) => (
                                        <FormItem>
                                            <FormLabel className="text-[#3d2c12] font-medium">Max Players: {value}</FormLabel>
                                            <FormControl>
                                                <Slider
                                                    min={2}
                                                    max={50}
                                                    step={1}
                                                    value={[value]}
                                                    onValueChange={(vals) => onChange(vals[0])}
                                                    className="py-4"
                                                />
                                            </FormControl>
                                            <FormMessage className="text-[#c62828]" />
                                        </FormItem>
                                    )}
                                />

                                <Button
                                    type="submit"
                                    disabled={isCreating}
                                    className="w-full bg-[#ff9800] hover:bg-[#f57c00] text-white py-2 px-4 rounded-md font-bold transition-all transform hover:scale-105 shadow-md hover:cursor-pointer"
                                >
                                    {isCreating ? (
                                        <div className="flex items-center justify-center">
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                            Creating...
                                        </div>
                                    ) : (
                                        "Create Game"
                                    )}
                                </Button>
                            </form>
                        </Form>
                    )}
                </div>
            </div>
        </div>
    )
}
