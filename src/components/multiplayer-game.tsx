"use client"
import type { Player } from "@/app/(protected)/multiplayer/page"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useEffect, useState } from "react"
import type { socket as socketIoType } from "@/socket"

// Test questions (same as singleplayer)
const testQuestions = [
    { question: "5 + 7", answer: 12 },
    { question: "8 - 3", answer: 5 },
    { question: "4 × 6", answer: 24 },
    { question: "20 ÷ 4", answer: 5 },
    { question: "9 + 8", answer: 17 },
    { question: "15 - 7", answer: 8 },
    { question: "3 × 9", answer: 27 },
    { question: "32 ÷ 8", answer: 4 },
    { question: "11 + 12", answer: 23 },
    { question: "18 - 9", answer: 9 },
]

// Form schema
const formSchema = z.object({
    answer: z.string().refine((val) => !isNaN(Number(val)), {
        message: "Answer must be a number",
    }),
})

type FormValues = z.infer<typeof formSchema>

// Constants for climbing mechanics
const SECTION_HEIGHT = 1000 // Height of each background section
const VIEWPORT_RANGE = 200 // How far up/down players can see

interface MultiplayerGameProps {
    players: Player[]
    currentPlayer: Player | null
    socket: typeof socketIoType | null
}

export function MultiplayerGame({ players, currentPlayer, socket }: MultiplayerGameProps) {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null)
    const [timeLeft, setTimeLeft] = useState(60) // 60 seconds game
    const [backgroundOffset, setBackgroundOffset] = useState(100) // Start at 100% (bottom)

    // Define form
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            answer: "",
        },
    })

    // Game timer
    useEffect(() => {
        const gameTimer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(gameTimer)
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(gameTimer)
    }, [])

    // Update background offset when current player's position changes
    useEffect(() => {
        if (currentPlayer) {
            // Calculate which section of the background we're in
            const currentPosition = currentPlayer.position
            const currentSection = Math.floor(currentPosition / SECTION_HEIGHT)

            // Calculate position within the current section
            const positionInSection = currentPosition % SECTION_HEIGHT

            // Update background offset based on position in section (inverted for correct direction)
            if (positionInSection < SECTION_HEIGHT * 0.3) {
                // First 30% of section: background stays at section start
                setBackgroundOffset(100 - currentSection * 100)
            } else if (positionInSection < SECTION_HEIGHT * 0.7) {
                // Middle 40% of section: background scrolls
                const scrollPercentage = ((positionInSection - SECTION_HEIGHT * 0.3) / (SECTION_HEIGHT * 0.4)) * 100
                setBackgroundOffset(100 - (currentSection * 100 + scrollPercentage))
            } else {
                // Last 30% of section: background at next section
                setBackgroundOffset(100 - (currentSection + 1) * 100)
            }
        }
    }, [currentPlayer?.position, currentPlayer])

    // Get current question
    const currentQuestion = testQuestions[currentQuestionIndex % testQuestions.length]

    // Handle form submission
    const onSubmit = (data: FormValues) => {
        if (!socket || !currentPlayer) return

        const userAnswer = Number(data.answer)
        const isCorrect = userAnswer === currentQuestion.answer

        // Show feedback
        setFeedback(isCorrect ? "correct" : "incorrect")

        // Send answer to server
        socket.emit("submitAnswer", {
            playerId: currentPlayer.id,
            isCorrect,
            score: isCorrect ? 10 : 0,
        })

        // Clear feedback after a delay
        setTimeout(() => {
            setFeedback(null)
            // Move to next question
            setCurrentQuestionIndex((prev) => prev + 1)
            // Reset form
            form.reset({ answer: "" })
        }, 1000)
    }

    // Calculate monkey position on screen based on absolute position
    const getMonkeyScreenPosition = (position: number) => {
        // Calculate position within the current section
        const positionInSection = position % SECTION_HEIGHT

        // First 30% of section: monkey climbs up screen
        if (positionInSection < SECTION_HEIGHT * 0.3) {
            return (positionInSection / (SECTION_HEIGHT * 0.3)) * 70
        }
        // Middle 40% of section: monkey stays in place
        else if (positionInSection < SECTION_HEIGHT * 0.7) {
            return 70 // Fixed position at 70% height
        }
        // Last 30% of section: monkey climbs to top of screen
        else {
            // Calculate position from 70% to 100%
            const remainingPercentage = (positionInSection - SECTION_HEIGHT * 0.7) / (SECTION_HEIGHT * 0.3)
            return 70 + remainingPercentage * 30
        }
    }

    // Calculate which players are visible in the viewport
    const getVisiblePlayers = () => {
        if (!currentPlayer) return players

        // Current player's position
        const currentPosition = currentPlayer.position

        // Filter players that are within the viewport range
        return players.filter((player) => Math.abs(player.position - currentPosition) <= VIEWPORT_RANGE)
    }

    // Get visible players
    const visiblePlayers = getVisiblePlayers()

    // Calculate height climbed for display
    const heightClimbed = currentPlayer ? Math.floor(currentPlayer.position / 10) : 0

    return (
        <div className="flex flex-col items-center w-full max-w-4xl px-4">
            {/* Timer, score and height */}
            <div className="bg-[#f5f2e3] border-4 border-[#5a6e4a] rounded-lg p-3 mb-4 w-full flex justify-between">
                <div className="text-[#3d2c12] font-bold">Time: {timeLeft}s</div>
                <div className="text-[#3d2c12] font-bold">Height: {heightClimbed}m</div>
                <div className="text-[#3d2c12] font-bold">Score: {currentPlayer?.score || 0}</div>
            </div>

            {/* Vertical climbing track */}
            <div className="bg-[#f5f2e3] border-4 border-[#5a6e4a] rounded-lg p-4 mb-6 w-full">
                <h2 className="text-xl font-bold mb-3 text-[#3d2c12] font-pixel text-center">Monkey Climb</h2>

                <div className="relative h-[300px] overflow-hidden border-2 border-[#5a6e4a] rounded-md">
                    {/* Background image that scrolls */}
                    <div
                        className="absolute inset-0 w-full h-[600px]"
                        style={{
                            background: "url(/images/earth-to-space-background.png)",
                            backgroundSize: "cover",
                            backgroundPosition: `center ${backgroundOffset}%`,
                            transition: "background-position 0.5s ease-out",
                        }}
                    />

                    {/* Vine */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-2 bg-[#8d6e63] transform -translate-x-1/2 z-10"></div>

                    {/* Monkeys - only show those in viewport */}
                    {visiblePlayers.map((player) => {
                        // Calculate monkey's position on screen
                        const screenPosition = getMonkeyScreenPosition(player.position)

                        // Calculate relative position to current player for visibility
                        const relativePosition = currentPlayer
                            ? screenPosition + ((player.position - currentPlayer.position) / VIEWPORT_RANGE) * 30
                            : screenPosition

                        // Only render if in viewport (0-100%)
                        if (relativePosition < 0 || relativePosition > 100) return null

                        return (
                            <div
                                key={player.id}
                                className="absolute left-1/2 transform -translate-x-1/2 z-20"
                                style={{
                                    bottom: `${relativePosition}%`,
                                    transition: "bottom 0.5s ease-out",
                                }}
                            >
                                {/* Monkey emoji with player name */}
                                <div className="flex flex-col items-center">
                  <span role="img" aria-label="monkey" className="text-3xl">
                    🐒
                  </span>
                                    <div
                                        className={`text-xs font-bold px-2 py-1 rounded-full ${
                                            player.id === currentPlayer?.id ? "bg-[#c8e6c9] text-[#2e7d32]" : "bg-[#e8e4d0] text-[#3d2c12]"
                                        }`}
                                    >
                                        {player.name} ({player.score})
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Question and answer form */}
            <div className="bg-[#f5f2e3] border-4 border-[#5a6e4a] rounded-lg p-4 w-full">
                <div
                    className={`text-center mb-4 p-4 rounded-md ${
                        feedback === "correct"
                            ? "bg-[#c8e6c9] border-2 border-[#81c784]"
                            : feedback === "incorrect"
                                ? "bg-[#ffcdd2] border-2 border-[#e57373]"
                                : "bg-[#e8e4d0] border-2 border-[#5a6e4a]"
                    }`}
                >
                    <h2 className="text-2xl font-bold text-[#3d2c12] font-pixel">
                        {feedback === "correct" ? "Correct!" : feedback === "incorrect" ? "Incorrect!" : currentQuestion.question}
                    </h2>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="answer"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Input
                                            placeholder="Enter your answer..."
                                            {...field}
                                            className="h-12 text-lg border-2 border-[#5a6e4a] rounded-md focus:outline-none focus:ring-2 focus:ring-[#8bba5f] bg-[#e8e4d0]"
                                            disabled={!!feedback || timeLeft === 0}
                                            autoComplete="off"
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <button
                            type="submit"
                            disabled={!!feedback || timeLeft === 0}
                            className="w-full h-12 text-lg bg-[#8bba5f] hover:bg-[#7aa54e] text-[#3d2c12] border-2 border-[#5a6e4a] font-medium rounded-md disabled:opacity-50"
                        >
                            Submit Answer
                        </button>
                    </form>
                </Form>
            </div>
        </div>
    )
}
