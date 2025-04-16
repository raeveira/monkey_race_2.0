"use client"
import type {Player} from "@/app/(protected)/multiplayer/page"
import {useForm} from "react-hook-form"
import {zodResolver} from "@hookform/resolvers/zod"
import * as z from "zod"
import {Form, FormControl, FormField, FormItem} from "@/components/ui/form"
import {Input} from "@/components/ui/input"
import {useEffect, useRef, useState} from "react"
import type {socket as socketIoType} from "@/socket"

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
const MONKEY_CLIMB_SPEED = 100 // How much the monkey moves up on correct answer
const MONKEY_FALL_SPEED = 50 // How much the monkey moves down on incorrect answer
const MAX_HEIGHT = 2000 // Maximum climbing height in pixels
const VIEWPORT_RANGE = 200 // How far up/down players can see
const BONUS_TIME_LIMIT = 30 // Time limit in seconds to get bonus points for reaching the top

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
    const [reachedTop, setReachedTop] = useState(false) // Track if player reached the top
    const [topReachers, setTopReachers] = useState<string[]>([]) // Track players who reached the top in order
    const [bonusAwarded, setBonusAwarded] = useState(false) // Track if bonus points were awarded
    const [notifications, setNotifications] = useState<string[]>([]) // Notifications for bonus points
    const [gameOver, setGameOver] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

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
                    setGameOver(true) // Set game over state when timer reaches zero
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(gameTimer)
    }, [])

    // Check if current player has reached the top
    useEffect(() => {
        if (currentPlayer && currentPlayer.position >= MAX_HEIGHT && !reachedTop) {
            setReachedTop(true)

            // Check if player reached top within time limit
            const withinTimeLimit = 60 - timeLeft <= BONUS_TIME_LIMIT
            setBonusAwarded(withinTimeLimit)

            // Notify server that player reached the top
            if (socket) {
                socket.emit("playerReachedTop", {
                    playerId: currentPlayer.id,
                    playerName: currentPlayer.name,
                    timeLeft: timeLeft,
                    withinTimeLimit: withinTimeLimit,
                })
            }
        }
    }, [currentPlayer, reachedTop, socket, timeLeft])

    // Listen for top reachers updates
    useEffect(() => {
        if (!socket) return

        const handleTopReachers = (data: {
            reachers: string[]
            newReacher: string
            position: number
            bonusAwarded: boolean
        }) => {
            setTopReachers(data.reachers)

            // Show notification for new top reacher
            if (data.newReacher && data.position <= 3) {
                let bonus = 0
                if (data.bonusAwarded) {
                    switch (data.position) {
                        case 1:
                            bonus = 100
                            break
                        case 2:
                            bonus = 50
                            break
                        case 3:
                            bonus = 25
                            break
                    }
                }

                const notification = data.bonusAwarded
                    ? `${data.newReacher} reached the top within time limit! (+${bonus} bonus points)`
                    : `${data.newReacher} reached the top!`

                setNotifications((prev) => [...prev, notification])

                // Remove notification after 5 seconds
                setTimeout(() => {
                    setNotifications((prev) => prev.filter((n) => n !== notification))
                }, 5000)
            }
        }

        socket.on("topReachersUpdate", handleTopReachers)

        return () => {
            socket.off("topReachersUpdate", handleTopReachers)
        }
    }, [socket])

    // Update background offset when current player's position changes
    useEffect(() => {
        if (currentPlayer) {
            updateBackgroundPosition(currentPlayer.position)
        }
    }, [currentPlayer?.position, currentPlayer])

    // Focus input field after rendering
    useEffect(() => {
        if (inputRef.current && !feedback) {
            inputRef.current.focus()
        }
    }, [feedback, currentQuestionIndex])

    // Helper function to update background position
    const updateBackgroundPosition = (position: number) => {
        // Calculate percentage of max height (0-100%)
        const heightPercentage = (position / MAX_HEIGHT) * 100

        // If we're at the very top, show the top of the background
        if (position >= MAX_HEIGHT) {
            setBackgroundOffset(0) // Background showing the top (0%)
            return
        }

        // For positions below max height, use the three-phase system
        // First 30% of climb: background stays near bottom
        if (heightPercentage < 30) {
            setBackgroundOffset(100 - heightPercentage)
        }
        // Middle 40% of climb: background scrolls
        else if (heightPercentage < 70) {
            // Scroll background from 70% to 30%
            const scrollPercentage = 100 - ((heightPercentage - 30) / 40) * 40 - 30
            setBackgroundOffset(scrollPercentage)
        }
        // Last 30% of climb: background shows top
        else {
            // Background at top (0-30%)
            const remainingPercentage = (heightPercentage - 70) / 30
            setBackgroundOffset(30 - remainingPercentage * 30)
        }
    }

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
            score: isCorrect ? 10 : -Math.floor(Math.random() * 5) - 1, // Random penalty for wrong answers
            climbAmount: isCorrect ? MONKEY_CLIMB_SPEED : -Math.floor(Math.random() * MONKEY_FALL_SPEED) - 1,
            reachedMax: currentPlayer.position >= MAX_HEIGHT,
        })

        // Clear feedback after a delay
        setTimeout(() => {
            setFeedback(null)
            // Move to next question
            setCurrentQuestionIndex((prev) => prev + 1)
            // Reset form
            form.reset({ answer: "" })
            // Focus input
            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus()
                }
            }, 100)
        }, 1000)
    }

    // Calculate monkey position on screen based on absolute position
    const getMonkeyScreenPosition = (position: number) => {
        // If at max height, position at the top but not offscreen
        if (position >= MAX_HEIGHT) {
            return 70 // Keep well below the top edge to prevent going offscreen
        }

        // Calculate percentage of max height (0-100%)
        const heightPercentage = (position / MAX_HEIGHT) * 100

        // First 30% of climb: monkey climbs up screen
        if (heightPercentage < 30) {
            return (heightPercentage / 30) * 50
        }
        // Middle 40% of climb: monkey stays in place
        else if (heightPercentage < 70) {
            return 50 // Fixed position at 50% height (lower than before)
        }
        // Last 30% of climb: monkey climbs to top of screen
        else {
            // Calculate position from 50% to 70% (not 100% to prevent going offscreen)
            const remainingPercentage = (heightPercentage - 70) / 30
            return 50 + remainingPercentage * 20 // Max is 70% instead of 85%
        }
    }

    // Calculate which players are visible in the viewport
    const getVisiblePlayers = () => {
        if (!currentPlayer) return players

        // Current player's position
        const currentPosition = currentPlayer.position

        // Make visibility bidirectional - a player is visible if either:
        // 1. They are within viewport range of the current player, OR
        // 2. The current player is within viewport range of them
        return players.filter((player) => {
            const distance = Math.abs(player.position - currentPosition)
            return distance <= VIEWPORT_RANGE * 1.5 // Increase viewport range by 50%
        })
    }

    // Get visible players
    const visiblePlayers = getVisiblePlayers()

    // Calculate height climbed for display
    const heightClimbed = currentPlayer ? Math.floor(currentPlayer.position / 10) : 0

    // Check if current player has reached max height
    const hasReachedMax = currentPlayer && currentPlayer.position >= MAX_HEIGHT

    // Get player's position in the top reachers list
    const getPlayerRank = () => {
        if (!currentPlayer) return null
        const rank = topReachers.indexOf(currentPlayer.id) + 1
        return rank > 0 ? rank : null
    }

    // Get bonus points based on rank
    const getBonusPoints = () => {
        const rank = getPlayerRank()
        if (!rank || !bonusAwarded) return 0

        switch (rank) {
            case 1:
                return 100
            case 2:
                return 50
            case 3:
                return 25
            default:
                return 0
        }
    }

    // Get player's rank by score
    const getPlayerScoreRank = () => {
        if (!currentPlayer) return null

        // Sort players by score in descending order
        const sortedPlayers = [...players].sort((a, b) => b.score - a.score)

        // Find current player's position in the sorted array
        return sortedPlayers.findIndex((player) => player.id === currentPlayer.id) + 1
    }

    // Get message based on player's rank
    const getPlayerRankMessage = () => {
        if (!currentPlayer) return null

        const rank = getPlayerScoreRank()
        if (!rank) return null

        // Get total number of players
        const totalPlayers = players.length

        // Generate message based on rank
        if (rank === 1) {
            return "Congratulations! You finished in 1st place! 🏆"
        } else if (rank === 2) {
            return "Great job! You finished in 2nd place! 🥈"
        } else if (rank === 3) {
            return "Well done! You finished in 3rd place! 🥉"
        } else if (rank <= Math.ceil(totalPlayers / 2)) {
            return `Good effort! You finished in ${rank}${getRankSuffix(rank)} place.`
        } else {
            return `You finished in ${rank}${getRankSuffix(rank)} place. Better luck next time!`
        }
    }

    // Helper function to get rank suffix (st, nd, rd, th)
    const getRankSuffix = (rank: number) => {
        if (rank % 100 >= 11 && rank % 100 <= 13) {
            return "th"
        }

        switch (rank % 10) {
            case 1:
                return "st"
            case 2:
                return "nd"
            case 3:
                return "rd"
            default:
                return "th"
        }
    }

    // Get message about bonus points
    const getBonusMessage = () => {
        if (!currentPlayer) return null

        if (hasReachedMax) {
            if (bonusAwarded) {
                const bonusPoints = getBonusPoints()
                if (bonusPoints > 0) {
                    return `You reached the top within ${BONUS_TIME_LIMIT} seconds and earned ${bonusPoints} bonus points!`
                }
                return `You reached the top within the time limit!`
            } else {
                return `You reached the top, but didn't get the time bonus. Try to climb faster next time!`
            }
        } else {
            return `You didn't reach the top. Keep practicing to climb higher next time!`
        }
    }

    return (
        <div className="flex flex-col items-center w-full max-w-4xl px-4">
            {/* Timer, score and height */}
            <div className="bg-[#f5f2e3] border-4 border-[#5a6e4a] rounded-lg p-3 mb-4 w-full flex justify-between">
                <div className="text-[#3d2c12] font-bold">Time: {timeLeft}s</div>
                <div className="text-[#3d2c12] font-bold">
                    Height: {heightClimbed}m {hasReachedMax && "(Max!)"}
                </div>
                <div className="text-[#3d2c12] font-bold">Score: {currentPlayer?.score || 0}</div>
            </div>

            {/* Game Over Screen */}
            {gameOver ? (
                <div className="bg-[#f5f2e3] border-4 border-[#5a6e4a] rounded-lg p-6 shadow-lg text-center w-full mb-6">
                    <h2 className="text-3xl font-bold mb-4 text-[#3d2c12] font-pixel">Game Over!</h2>

                    {/* Player's rank message */}
                    <div className="mb-6 p-4 bg-[#c8e6c9] border-2 border-[#81c784] rounded-md">
                        <p className="text-xl font-bold text-[#2e7d32]">{getPlayerRankMessage()}</p>
                        <p className="mt-2 text-[#2e7d32]">{getBonusMessage()}</p>
                    </div>

                    <div className="mb-6">
                        <h3 className="text-xl font-bold mb-2 text-[#3d2c12]">Final Results:</h3>
                        {players
                            .sort((a, b) => b.score - a.score)
                            .map((player, index) => (
                                <div
                                    key={player.id}
                                    className={`flex justify-between items-center p-3 my-2 rounded-md border-2 ${
                                        player.id === currentPlayer?.id ? "bg-[#c8e6c9] border-[#81c784]" : "bg-[#e8e4d0] border-[#5a6e4a]"
                                    }`}
                                >
                                    <div className="flex items-center">
                                        <span className="text-xl font-bold mr-3">{index + 1}.</span>
                                        <span className="font-medium">{player.name}</span>
                                        {index < 3 && <span className="ml-2">{index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}</span>}
                                    </div>
                                    <div className="flex items-center">
                                        <span className="font-bold">{player.score} pts</span>
                                        {topReachers.indexOf(player.id) !== -1 && (
                                            <span className="ml-2 text-xs bg-[#fff9c4] text-[#fbc02d] px-2 py-1 rounded-full">
                        Reached Top
                      </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                    </div>

                    <button
                        onClick={() => {
                            if (socket) {
                                socket.emit("returnToLobby")
                            }
                        }}
                        className="bg-[#8bba5f] hover:bg-[#7aa54e] text-[#3d2c12] border-2 border-[#5a6e4a] font-medium px-6 py-2 rounded-md"
                    >
                        Return to Lobby
                    </button>
                </div>
            ) : (
                <>
                    {/* Notifications */}
                    {notifications.length > 0 && (
                        <div className="bg-[#f5f2e3] border-4 border-[#5a6e4a] rounded-lg p-3 mb-4 w-full">
                            {notifications.map((notification, index) => (
                                <div key={index} className="text-[#3d2c12] font-bold text-center">
                                    {notification}
                                </div>
                            ))}
                        </div>
                    )}

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

                            {/* Finish line at the top */}
                            <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-r from-yellow-300 via-yellow-500 to-yellow-300 z-15 flex items-center justify-center">
                                <span className="text-xs font-bold text-black">FINISH!</span>
                            </div>

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

                                // Check if this player is in the top 3 by score
                                const sortedPlayers = [...players].sort((a, b) => b.score - a.score)
                                const scoreRank = sortedPlayers.findIndex((p) => p.id === player.id)
                                const showMedal = scoreRank >= 0 && scoreRank < 3

                                return (
                                    <div
                                        key={player.id}
                                        className="absolute left-1/2 transform -translate-x-1/2 z-20"
                                        style={{
                                            bottom: `${relativePosition}%`,
                                            transition: "bottom 0.5s ease-out",
                                            maxHeight: "calc(100% - 40px)", // Ensure monkey stays at least 40px from the top
                                            paddingBottom: "10px", // Add padding to keep monkey fully visible
                                        }}
                                    >
                                        {/* Monkey emoji with player name */}
                                        <div className="flex flex-col items-center">
                      <span role="img" aria-label="monkey" className="text-3xl">
                        🐒
                      </span>
                                            <div
                                                className={`text-xs font-bold px-2 py-1 rounded-full ${
                                                    player.id === currentPlayer?.id
                                                        ? "bg-[#c8e6c9] text-[#2e7d32]"
                                                        : "bg-[#e8e4d0] text-[#3d2c12]"
                                                }`}
                                            >
                                                {player.name} ({player.score})
                                                {showMedal && (
                                                    <span className="ml-1">{scoreRank === 0 ? "🥇" : scoreRank === 1 ? "🥈" : "🥉"}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Question and answer form */}
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
                            {feedback === "correct"
                                ? "Correct!"
                                : feedback === "incorrect"
                                    ? "Incorrect!"
                                    : currentQuestion.question}
                        </h2>
                        <h3 className="text-xl font-bold text-[#3d2c12] font-pixel">
                            {hasReachedMax && "You reached the top! Keep answering for points!"}
                        </h3>
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
                                                ref={inputRef}
                                                autoFocus={true}
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
                </>
            )}
        </div>
    )
}
