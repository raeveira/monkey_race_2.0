"use client"
import {useState, useEffect, useRef} from "react"
import {useForm} from "react-hook-form"
import {zodResolver} from "@hookform/resolvers/zod"
import * as z from "zod"
import {Button} from "@/components/ui/button"
import {Form, FormControl, FormField, FormItem} from "@/components/ui/form"
import {Input} from "@/components/ui/input"
import {ArrowLeft} from "lucide-react"
import Link from "next/link"

// Define test questions
const testQuestions = [
    {question: "5 + 7", answer: 12},
    {question: "8 - 3", answer: 5},
    {question: "4 × 6", answer: 24},
    {question: "20 ÷ 4", answer: 5},
    {question: "9 + 8", answer: 17},
    {question: "15 - 7", answer: 8},
    {question: "3 × 9", answer: 27},
    {question: "32 ÷ 8", answer: 4},
    {question: "11 + 12", answer: 23},
    {question: "18 - 9", answer: 9},
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
const MONKEY_CLIMB_SPEED = 100 // How much the monkey moves up on correct answer
const MONKEY_FALL_SPEED = 5 // How much the monkey moves down on incorrect answer

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
    const backgroundRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

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
            setScore(score + 10)

            // Increase absolute position (total distance climbed)
            const newAbsolutePosition = absolutePosition + MONKEY_CLIMB_SPEED
            setAbsolutePosition(newAbsolutePosition)

            // Calculate which section of the background we're in
            const currentSection = Math.floor(newAbsolutePosition / SECTION_HEIGHT)

            // Calculate position within the current section
            const positionInSection = newAbsolutePosition % SECTION_HEIGHT

            // First 30% of section: monkey climbs up screen
            if (positionInSection < SECTION_HEIGHT * 0.3) {
                setMonkeyPosition((positionInSection / (SECTION_HEIGHT * 0.3)) * 70)
                // Background stays at the bottom of current section
                setBackgroundOffset(100 - currentSection * 100)
            }
            // Middle 40% of section: background scrolls, monkey stays in place
            else if (positionInSection < SECTION_HEIGHT * 0.7) {
                setMonkeyPosition(70) // Keep monkey at 70% height
                // Scroll background from 100% to 0% (inverted to create upward movement)
                const scrollPercentage = ((positionInSection - SECTION_HEIGHT * 0.3) / (SECTION_HEIGHT * 0.4)) * 100
                setBackgroundOffset(100 - (currentSection * 100 + scrollPercentage))
            }
            // Last 30% of section: monkey climbs to top of screen
            else {
                // Calculate position from 70% to 100%
                const remainingPercentage = (positionInSection - SECTION_HEIGHT * 0.7) / (SECTION_HEIGHT * 0.3)
                setMonkeyPosition(70 + remainingPercentage * 30)
                // Background at top of current section (bottom of next section)
                setBackgroundOffset(100 - (currentSection + 1) * 100)
            }
        } else {
            // Decrease score
            setScore(prev => Math.max(0, prev - Math.floor(Math.random() * 5) - 1))

            // Decrease absolute position but don't go below 0
            const newAbsolutePosition = Math.max(0, absolutePosition - MONKEY_FALL_SPEED)
            setAbsolutePosition(newAbsolutePosition)

            // Calculate which section of the background we're in
            const currentSection = Math.floor(newAbsolutePosition / SECTION_HEIGHT)

            // Calculate position within the current section
            const positionInSection = newAbsolutePosition % SECTION_HEIGHT

            // Apply the same logic as above but for falling
            if (positionInSection < SECTION_HEIGHT * 0.3) {
                setMonkeyPosition((positionInSection / (SECTION_HEIGHT * 0.3)) * 70)
                setBackgroundOffset(100 - currentSection * 100)
            } else if (positionInSection < SECTION_HEIGHT * 0.7) {
                setMonkeyPosition(70)
                const scrollPercentage = ((positionInSection - SECTION_HEIGHT * 0.3) / (SECTION_HEIGHT * 0.4)) * 100
                setBackgroundOffset(100 - (currentSection * 100 + scrollPercentage))
            } else {
                const remainingPercentage = (positionInSection - SECTION_HEIGHT * 0.7) / (SECTION_HEIGHT * 0.3)
                setMonkeyPosition(70 + remainingPercentage * 30)
                setBackgroundOffset(100 - (currentSection + 1) * 100)
            }
        }

        // Clear feedback after a delay
        setTimeout(() => {
            setFeedback(null)
            // Move to next question
            setCurrentQuestionIndex((prev) => prev + 1)
            // Reset form
            form.reset({answer: ""})
            setTimeout(() => {
                if (inputRef.current) {
                    console.log("Focusing input on restart")
                    inputRef.current.focus()
                }
            }, 100)
        }, 1000)
    }

    // Start the game
    const startGame = () => {
        setGameStarted(true)
    }

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus()
        }
    }, [gameStarted])

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
        form.reset({answer: ""})
    }

    // Calculate height climbed for display
    const heightClimbed = Math.floor(absolutePosition / 10)

    // Initialize background position on first render
    useEffect(() => {
        setBackgroundOffset(100) // Start with background at bottom (100%)
    }, [])

    return (
        <div
            className="relative h-screen w-full overflow-hidden bg-[url(/images/forest-background.png)] bg-cover bg-center">
            {/* Back button */}
            <Link href="/home" className="absolute top-4 left-4 z-10">
                <Button variant="outline"
                        className="bg-[#f5f2e3] border-2 border-[#5a6e4a] text-[#3d2c12] hover:bg-[#e8e4d0]">
                    <ArrowLeft className="mr-2 h-4 w-4"/> Back to Menu
                </Button>
            </Link>

            {/* Game container */}
            <div className="flex flex-col items-center justify-center h-full">
                {!gameStarted ? (
                    <div className="bg-[#f5f2e3] border-4 border-[#5a6e4a] rounded-lg p-6 shadow-lg text-center">
                        <h1 className="text-3xl font-bold mb-4 text-[#3d2c12] font-pixel">Monkey Math Climb</h1>
                        <p className="mb-6 text-[#5a4025]">
                            Answer math questions correctly to climb up the vine!
                            <br/>
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
                        <p className="text-lg mb-4 text-[#5a4025]">Height climbed: {heightClimbed} meters</p>
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
                        <div
                            className="bg-[#f5f2e3] border-4 border-[#5a6e4a] rounded-lg p-3 mb-4 w-full flex justify-between">
                            <div className="text-[#3d2c12] font-bold">Score: {score}</div>
                            <div className="text-[#3d2c12] font-bold">Height: {heightClimbed}m</div>
                            <div className="text-[#3d2c12] font-bold">Time: {timeLeft}s</div>
                        </div>

                        {/* Climbing track */}
                        <div className="bg-[#f5f2e3] border-4 border-[#5a6e4a] rounded-lg p-4 mb-6 w-full">
                            <h2 className="text-xl font-bold mb-3 text-[#3d2c12] font-pixel text-center">Monkey
                                Climb</h2>

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
                                <div
                                    className="absolute left-1/2 top-0 bottom-0 w-2 bg-[#8d6e63] transform -translate-x-1/2 z-10"></div>

                                {/* Monkey */}
                                <div
                                    className="absolute left-1/2 transform -translate-x-1/2 z-20"
                                    style={{
                                        bottom: `${monkeyPosition}%`,
                                        transition: "bottom 0.5s ease-out",
                                    }}
                                >
                                    {/* Monkey emoji */}
                                    <div className="flex flex-col items-center">
                    <span role="img" aria-label="monkey" className="text-3xl">
                      🐒
                    </span>
                                        <div
                                            className="text-xs font-bold px-2 py-1 rounded-full bg-[#c8e6c9] text-[#2e7d32]">
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
                                        render={({field}) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Enter your answer..."
                                                        {...field}
                                                        className="h-12 text-lg border-2 border-[#5a6e4a] rounded-md focus:outline-none focus:ring-2 focus:ring-[#8bba5f] bg-[#e8e4d0]"
                                                        disabled={!!feedback}
                                                        autoComplete="off"
                                                        ref={inputRef}
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
