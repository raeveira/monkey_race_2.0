"use client"
import { useState, useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

// Define test questions
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
const BONUS_TIME_LIMIT = 40 // Time limit in seconds to get bonus points for reaching the top

export default function SingleplayerPage() {
    const [score, setScore] = useState(0)
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [absolutePosition, setAbsolutePosition] = useState(0) // Total distance climbed
    const [monkeyPosition, setMonkeyPosition] = useState(0) // Position on screen (0-100%)
    const [backgroundOffset, setBackgroundOffset] = useState(0) // Background scroll position
    const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null)
    const [gameStarted, setGameStarted] = useState(false)
    const [countdown, setCountdown] = useState(3)
    const [timeLeft, setTimeLeft] = useState(60) // 60 seconds game
    const [gameOver, setGameOver] = useState(false)
    const [reachedTop, setReachedTop] = useState(false) // New state to track if player reached the top
    const backgroundRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // Add state for tracking bonus points
    const [bonusAwarded, setBonusAwarded] = useState(false)
    const [bonusPoints, setBonusPoints] = useState(0)
    const [bonusMessage, setBonusMessage] = useState("")

    // Define form
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            answer: "",
        },
    })

    // Start countdown when game starts
    useEffect(() => {
        if (gameStarted && countdown > 0) {
            const timer = setTimeout(() => {
                setCountdown(countdown - 1)
            }, 1000)
            return () => clearTimeout(timer)
        }

        if (countdown === 0 && !gameOver) {
            // Start the game timer
            const gameTimer = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(gameTimer)
                        setGameOver(true)
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)

            return () => clearInterval(gameTimer)
        }
    }, [gameStarted, countdown, gameOver])

    // Get current question
    const currentQuestion = testQuestions[currentQuestionIndex % testQuestions.length]

    // Handle form submission
    const onSubmit = (data: FormValues) => {
        const userAnswer = Number(data.answer)
        const isCorrect = userAnswer === currentQuestion.answer

        // Show feedback
        setFeedback(isCorrect ? "correct" : "incorrect")

        // Update score and position
        if (isCorrect) {
            setScore((prev) => prev + 10)

            // Check if already at max height
            if (absolutePosition >= MAX_HEIGHT) {
                // If at max height, just update score but don't climb further
            } else {
                // Increase absolute position (total distance climbed)
                const newAbsolutePosition = Math.min(absolutePosition + MONKEY_CLIMB_SPEED, MAX_HEIGHT)
                setAbsolutePosition(newAbsolutePosition)

                // Check if we just reached the top
                if (newAbsolutePosition >= MAX_HEIGHT && !reachedTop) {
                    setReachedTop(true)

                    // Check if player reached top within time limit
                    const timeElapsed = 60 - timeLeft
                    if (timeElapsed <= BONUS_TIME_LIMIT) {
                        setBonusAwarded(true)
                        setBonusPoints(100)
                        setScore((prev) => prev + 100) // Add bonus points immediately
                        setBonusMessage(`You reached the top within ${BONUS_TIME_LIMIT} seconds! (+100 bonus points)`)
                    } else {
                        setBonusMessage("You reached the top! Keep answering for more points.")
                    }
                }

                // Calculate background position based on height
                updateBackgroundAndMonkeyPosition(newAbsolutePosition)
            }
        } else {
            // If incorrect, decrease score and move monkey down
            setScore((prev) => Math.max(0, prev - Math.floor(Math.random() * 5) - 1))
            // Decrease absolute position but don't go below 0
            const newAbsolutePosition = Math.max(0, absolutePosition - Math.floor(Math.random() * MONKEY_FALL_SPEED) - 1)
            setAbsolutePosition(newAbsolutePosition)

            // Update background and monkey position
            updateBackgroundAndMonkeyPosition(newAbsolutePosition)
        }

        // Clear feedback after a delay
        setTimeout(() => {
            setFeedback(null)
            // Move to next question
            setCurrentQuestionIndex((prev) => prev + 1)
            // Reset form
            form.reset({ answer: "" })
            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus()
                }
            }, 100)
        }, 1000)
    }

    // Helper function to update background and monkey position
    const updateBackgroundAndMonkeyPosition = (position: number) => {
        // Calculate percentage of max height (0-100%)
        const heightPercentage = (position / MAX_HEIGHT) * 100

        // If we're at the very top, show the top of the background
        if (position >= MAX_HEIGHT) {
            setMonkeyPosition(70) // Monkey at 70% height to prevent going offscreen
            setBackgroundOffset(0) // Background showing the top (0%)
            return
        }

        // For positions below max height, use the three-phase system
        // First 30% of climb: monkey moves up screen
        if (heightPercentage < 30) {
            setMonkeyPosition((heightPercentage / 30) * 50)
            setBackgroundOffset(100 - heightPercentage)
        }
        // Middle 40% of climb: monkey stays in place, background scrolls
        else if (heightPercentage < 70) {
            setMonkeyPosition(50) // Keep monkey at 50% height (lower than before)
            // Scroll background from 70% to 30%
            const scrollPercentage = 100 - ((heightPercentage - 30) / 40) * 40 - 30
            setBackgroundOffset(scrollPercentage)
        }
        // Last 30% of climb: monkey moves to top, background shows top
        else {
            // Calculate position from 50% to 70% (not 100% to prevent going offscreen)
            const remainingPercentage = (heightPercentage - 70) / 30
            setMonkeyPosition(50 + remainingPercentage * 20) // Max is 70% instead of 85%
            // Background at top (0-30%)
            setBackgroundOffset(30 - remainingPercentage * 30)
        }
    }

    // Start the game
    const startGame = () => {
        setGameStarted(true)
    }

    // Restart the game
    const restartGame = () => {
        setScore(0)
        setCurrentQuestionIndex(0)
        setAbsolutePosition(0)
        setMonkeyPosition(0)
        setBackgroundOffset(100) // Start with background at bottom (100%)
        setFeedback(null)
        setGameStarted(true)
        setCountdown(3)
        setTimeLeft(60)
        setGameOver(false)
        setReachedTop(false)
        setBonusAwarded(false)
        setBonusPoints(0)
        setBonusMessage("")
        form.reset({ answer: "" })
    }

    // Calculate height climbed for display
    const heightClimbed = Math.floor(absolutePosition / 10)

    // Initialize background position on first render
    useEffect(() => {
        setBackgroundOffset(100) // Start with background at bottom (100%)
    }, [])

    return (
        <div className="relative h-screen w-full overflow-hidden bg-[url(/images/forest-background.png)] bg-cover bg-center">
            {/* Back button */}
            <Link href="/home" className="absolute top-4 left-4 z-10">
                <Button variant="outline" className="bg-[#f5f2e3] border-2 border-[#5a6e4a] text-[#3d2c12] hover:bg-[#e8e4d0]">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Menu
                </Button>
            </Link>

            {/* Game container */}
            <div className="flex flex-col items-center justify-center h-full">
                {!gameStarted ? (
                    <div className="bg-[#f5f2e3] border-4 border-[#5a6e4a] rounded-lg p-6 shadow-lg text-center">
                        <h1 className="text-3xl font-bold mb-4 text-[#3d2c12] font-pixel">Monkey Math Climb</h1>
                        <p className="mb-6 text-[#5a4025]">
                            Answer math questions correctly to climb up the vine!
                            <br />
                            Wrong answers will make you slide down.
                        </p>
                        <Button
                            onClick={startGame}
                            className="bg-[#8bba5f] hover:bg-[#7aa54e] text-[#3d2c12] border-2 border-[#5a6e4a] font-medium px-6 py-3 text-lg"
                        >
                            Start Game
                        </Button>
                    </div>
                ) : countdown > 0 ? (
                    <div className="bg-[#f5f2e3] border-4 border-[#5a6e4a] rounded-lg p-10 shadow-lg text-center">
                        <h1 className="text-6xl font-bold text-[#3d2c12] font-pixel">{countdown}</h1>
                    </div>
                ) : gameOver ? (
                    <div className="bg-[#f5f2e3] border-4 border-[#5a6e4a] rounded-lg p-6 shadow-lg text-center">
                        <h1 className="text-3xl font-bold mb-2 text-[#3d2c12] font-pixel">Game Over!</h1>
                        <p className="text-xl mb-4 text-[#5a4025]">Your final score: {score}</p>
                        <p className="text-lg mb-4 text-[#5a4025]">
                            Height climbed: {heightClimbed} meters
                            {reachedTop && " (Maximum height reached!)"}
                        </p>
                        {reachedTop && (
                            <p className="text-lg mb-4 text-[#5a4025]">
                                {bonusAwarded
                                    ? `You reached the top within ${BONUS_TIME_LIMIT} seconds! (+${bonusPoints} bonus points)`
                                    : `You reached the top, but took too long for the time bonus.`}
                            </p>
                        )}
                        <Button
                            onClick={restartGame}
                            className="bg-[#8bba5f] hover:bg-[#7aa54e] text-[#3d2c12] border-2 border-[#5a6e4a] font-medium px-6 py-2"
                        >
                            Play Again
                        </Button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center w-full max-w-4xl px-4">
                        {/* Timer, score and height */}
                        <div className="bg-[#f5f2e3] border-4 border-[#5a6e4a] rounded-lg p-3 mb-4 w-full flex justify-between">
                            <div className="text-[#3d2c12] font-bold">Score: {score}</div>
                            <div className="text-[#3d2c12] font-bold">
                                Height: {heightClimbed}m {reachedTop && "(Max!)"}
                            </div>
                            <div className="text-[#3d2c12] font-bold">Time: {timeLeft}s</div>
                        </div>

                        {/* Bonus message */}
                        {bonusMessage && (
                            <div className="bg-[#c8e6c9] border-2 border-[#81c784] text-[#2e7d32] p-3 rounded-md mb-4 w-full text-center">
                                {bonusMessage}
                            </div>
                        )}

                        {/* Climbing track */}
                        <div className="bg-[#f5f2e3] border-4 border-[#5a6e4a] rounded-lg p-4 mb-6 w-full">
                            <h2 className="text-xl font-bold mb-3 text-[#3d2c12] font-pixel text-center">Monkey Climb</h2>

                            <div
                                className="relative h-[300px] overflow-hidden border-2 border-[#5a6e4a] rounded-md"
                                ref={backgroundRef}
                            >
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

                                {/* Monkey */}
                                <div
                                    className="absolute left-1/2 transform -translate-x-1/2 z-20"
                                    style={{
                                        bottom: `${monkeyPosition}%`,
                                        transition: "bottom 0.5s ease-out",
                                        maxHeight: "calc(100% - 40px)", // Ensure monkey stays at least 40px from the top
                                        paddingBottom: "10px", // Add padding to keep monkey fully visible
                                    }}
                                >
                                    {/* Monkey emoji */}
                                    <div className="flex flex-col items-center">
                    <span role="img" aria-label="monkey" className="text-3xl">
                      🐒
                    </span>
                                        <div className="text-xs font-bold px-2 py-1 rounded-full bg-[#c8e6c9] text-[#2e7d32]">
                                            You ({score})
                                        </div>
                                    </div>
                                </div>
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
                                    {feedback === "correct"
                                        ? "Correct!"
                                        : feedback === "incorrect"
                                            ? "Incorrect!"
                                            : currentQuestion.question}
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
                                                        disabled={!!feedback}
                                                        autoComplete="off"
                                                        ref={inputRef}
                                                        autoFocus={true}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <Button
                                        type="submit"
                                        className="w-full h-12 text-lg bg-[#8bba5f] hover:bg-[#7aa54e] text-[#3d2c12] border-2 border-[#5a6e4a] font-medium"
                                        disabled={!!feedback}
                                    >
                                        Submit Answer
                                    </Button>
                                </form>
                            </Form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
