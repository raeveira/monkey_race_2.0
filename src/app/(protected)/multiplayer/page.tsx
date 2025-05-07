"use client"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { socket as socketIo } from "@/socket"
import { MultiplayerLobby } from "@/components/multiplayer-lobby"
import { MultiplayerGame } from "@/components/multiplayer-game"
import { Chat } from "@/components/chat"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"

// Player type definition
export type Player = {
    id: string
    name: string
    isHost: boolean
    isReady: boolean
    score: number
    position: number
}

// Game state type
type GameStateData = {
    players: Player[]
    gameId: string
    maxPlayers: number
}

// Form schema for name input
const nameFormSchema = z.object({
    playerName: z.string().min(1, "Player name is required"),
})

type NameFormValues = z.infer<typeof nameFormSchema>

export default function MultiplayerPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [socket, setSocket] = useState<typeof socketIo | null>(null)
    const [gameState, setGameState] = useState<"connecting" | "name" | "lobby" | "playing" | "results">("connecting")
    const [players, setPlayers] = useState<Player[]>([])
    const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)
    const [gameId, setGameId] = useState<string>("")
    const [maxPlayers, setMaxPlayers] = useState<number>(10)
    const [countdown, setCountdown] = useState<number | null>(null)
    const [showChat, setShowChat] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [hasJoined, setHasJoined] = useState(false)

    // Get game ID from URL if available (for private games)
    const privateGameId = searchParams.get("gameId")

    // Get player name from localStorage if available
    const defaultPlayerName = typeof window !== "undefined" ? localStorage.getItem("playerName") || "" : ""

    // Define form for name input
    const nameForm = useForm<NameFormValues>({
        resolver: zodResolver(nameFormSchema),
        defaultValues: {
            playerName: defaultPlayerName,
        },
    })

    // Connect to socket
    useEffect(() => {
        // Connect socket
        socketIo.connect()
        setSocket(socketIo)

        // If we have a player name, go straight to name input
        // Otherwise, show the name input form
        if (defaultPlayerName) {
            setGameState("name")
        } else {
            setGameState("name")
        }

        // Setup ping interval to keep connection alive
        const pingInterval = setInterval(() => {
            if (socketIo.connected) {
                socketIo.emit("ping")
            }
        }, 25000) // Ping every 25 seconds

        return () => {
            clearInterval(pingInterval)
            // Don't disconnect here - we'll handle this with beforeunload
        }
    }, [defaultPlayerName])

    // Auto-join game if we have a name and game ID
    useEffect(() => {
        if (socket && defaultPlayerName && privateGameId && !hasJoined) {
            // Skip the name input screen and join the specific game directly
            socket.emit("joinSpecificGame", { gameId: privateGameId, name: defaultPlayerName })
            setHasJoined(true)
        }
    }, [socket, defaultPlayerName, privateGameId, hasJoined])

    // Handle page unload/navigation
    useEffect(() => {
        const handleBeforeUnload = () => {
            // Explicitly leave the game when navigating away
            if (socket && gameId) {
                socket.emit("leaveGame", { gameId })
            }
        }

        window.addEventListener("beforeunload", handleBeforeUnload)

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload)
            // Also leave the game when component unmounts
            if (socket && gameId) {
                socket.emit("leaveGame", { gameId })
            }
        }
    }, [socket, gameId])

    // Socket event listeners
    useEffect(() => {
        if (!socket) return

        // Lobby events
        socket.on("lobbyState", (data: GameStateData) => {
            setPlayers(data.players)
            setGameId(data.gameId)
            setMaxPlayers(data.maxPlayers)

            // Find current player
            const player = data.players.find((p) => p.id === socket.id)
            if (player) {
                setCurrentPlayer(player)
            }

            setGameState("lobby")
        })

        socket.on("gameStarting", (countdown: number) => {
            setCountdown(countdown)
        })

        socket.on("gameStart", () => {
            setGameState("playing")
            setCountdown(null)
        })

        socket.on("playerUpdate", (updatedPlayers: Player[]) => {
            setPlayers(updatedPlayers)

            // Update current player
            const player = updatedPlayers.find((p) => p.id === socket.id)
            if (player) {
                setCurrentPlayer(player)
            }
        })

        socket.on("gameOver", (finalPlayers: Player[]) => {
            setPlayers(finalPlayers)
            setGameState("results")
        })

        socket.on("error", (message: string) => {
            setError(message)
        })

        return () => {
            socket.off("lobbyState")
            socket.off("gameStarting")
            socket.off("gameStart")
            socket.off("playerUpdate")
            socket.off("gameOver")
            socket.off("error")
        }
    }, [socket])

    // Submit player name and join lobby
    const onNameSubmit = (data: NameFormValues) => {
        if (!socket) return

        // Save player name to localStorage
        localStorage.setItem("playerName", data.playerName)

        // If we have a private game ID, join that specific game
        if (privateGameId) {
            socket.emit("joinSpecificGame", { gameId: privateGameId, name: data.playerName })
        } else {
            // Otherwise join the public lobby
            socket.emit("joinLobby", { name: data.playerName })
        }

        setHasJoined(true)
    }

    // Toggle ready status
    const toggleReady = () => {
        if (!socket || !currentPlayer) return
        socket.emit("toggleReady", { playerId: currentPlayer.id })
    }

    // Start game (host only)
    const startGame = () => {
        if (!socket || !currentPlayer?.isHost) return
        socket.emit("startGame", { gameId })
    }

    // Return to lobby after game
    const returnToLobby = () => {
        if (!socket) return
        socket.emit("returnToLobby")
        setGameState("lobby")
    }

    // Toggle chat visibility
    const toggleChat = () => {
        setShowChat(!showChat)
    }

    // Leave game and return to home
    const leaveGame = () => {
        if (socket && gameId) {
            socket.emit("leaveGame", { gameId })
            router.push("/home")
        } else {
            router.push("/home")
        }
    }

    // Loading state
    if (gameState === "connecting") {
        return (
            <div className="flex items-center justify-center h-screen bg-[url(/images/forest-background.png)] bg-no-repeat bg-center bg-cover">
                <div className="bg-[#f5f2e3] border-4 border-[#5a6e4a] rounded-lg p-8 shadow-lg text-center">
                    <h1 className="text-2xl font-bold mb-4 text-[#3d2c12] font-pixel">Connecting to server...</h1>
                    <div className="w-16 h-16 border-4 border-[#8bba5f] border-t-transparent rounded-full animate-spin mx-auto"></div>
                </div>
            </div>
        )
    }

    // Name input state
    if (gameState === "name") {
        return (
            <div className="flex items-center justify-center h-screen bg-[url(/images/forest-background.png)] bg-no-repeat bg-center bg-cover">
                <div className="bg-[#f5f2e3] border-4 border-[#5a6e4a] rounded-lg p-6 shadow-lg max-w-md w-full">
                    <h1 className="text-3xl font-bold mb-4 text-[#3d2c12] font-pixel text-center">Enter Your Name</h1>

                    {privateGameId && (
                        <div className="bg-[#e8e4d0] border-2 border-[#5a6e4a] p-3 rounded-md mb-4 text-center">
                            <p className="text-[#3d2c12]">Joining private game</p>
                        </div>
                    )}

                    {error && (
                        <div className="bg-[#ffcdd2] border-2 border-[#e57373] text-[#c62828] p-3 rounded-md mb-4">{error}</div>
                    )}

                    <Form {...nameForm}>
                        <form onSubmit={nameForm.handleSubmit(onNameSubmit)} className="space-y-4">
                            <FormField
                                control={nameForm.control}
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

                            <div className="flex gap-3">
                                <Link href="/home" className="flex-1">
                                    <Button
                                        type="button"
                                        className="w-full bg-[#78909c] hover:bg-[#546e7a] text-white py-2 px-4 rounded-md font-bold"
                                    >
                                        Back
                                    </Button>
                                </Link>
                                <Button
                                    type="submit"
                                    className="flex-1 bg-[#8bba5f] hover:bg-[#7aa54e] text-white py-2 px-4 rounded-md font-bold"
                                >
                                    Join Game
                                </Button>
                            </div>
                        </form>
                    </Form>
                </div>
            </div>
        )
    }

    return (
        <div className="relative h-screen w-full overflow-hidden bg-[url(/images/forest-background.png)] bg-no-repeat bg-center bg-cover">
            {/* Back button */}
            <Button
                onClick={leaveGame}
                className="absolute top-4 left-4 z-10 bg-[#f5f2e3] border-2 border-[#5a6e4a] text-[#3d2c12] hover:bg-[#e8e4d0]"
            >
                <ArrowLeft className="mr-2 h-4 w-4" /> Leave Game
            </Button>

            {/* Chat toggle button */}
            <Button
                onClick={toggleChat}
                className="absolute top-4 right-4 z-10 bg-[#f5f2e3] border-2 border-[#5a6e4a] text-[#3d2c12] hover:bg-[#e8e4d0]"
            >
                {showChat ? "Hide Chat" : "Show Chat"}
            </Button>

            {/* Game container */}
            <div className="flex flex-col items-center justify-center h-full">
                {gameState === "lobby" && (
                    <MultiplayerLobby
                        players={players}
                        currentPlayer={currentPlayer}
                        gameId={gameId}
                        countdown={countdown}
                        maxPlayers={maxPlayers}
                        onToggleReady={toggleReady}
                        onStartGame={startGame}
                    />
                )}

                {gameState === "playing" && <MultiplayerGame players={players} currentPlayer={currentPlayer} socket={socket} />}

                {gameState === "results" && (
                    <div className="bg-[#f5f2e3] border-4 border-[#5a6e4a] rounded-lg p-6 shadow-lg text-center max-w-2xl w-full">
                        <h1 className="text-3xl font-bold mb-4 text-[#3d2c12] font-pixel">Game Results</h1>

                        <div className="mb-6">
                            {players
                                .sort((a, b) => b.score - a.score)
                                .map((player, index) => (
                                    <div
                                        key={player.id}
                                        className={`flex justify-between items-center p-3 my-2 rounded-md border-2 ${
                                            player.id === currentPlayer?.id
                                                ? "bg-[#c8e6c9] border-[#81c784]"
                                                : "bg-[#e8e4d0] border-[#5a6e4a]"
                                        }`}
                                    >
                                        <div className="flex items-center">
                                            <span className="text-xl font-bold mr-3">{index + 1}.</span>
                                            <span className="font-medium">{player.name}</span>
                                        </div>
                                        <span className="font-bold">{player.score} pts</span>
                                    </div>
                                ))}
                        </div>

                        <Button
                            onClick={returnToLobby}
                            className="bg-[#8bba5f] hover:bg-[#7aa54e] text-[#3d2c12] border-2 border-[#5a6e4a] font-medium px-6 py-2"
                        >
                            Return to Lobby
                        </Button>
                    </div>
                )}
            </div>

            {/* Chat component */}
            {showChat && <Chat lobbyId={gameId} />}
        </div>
    )
}
