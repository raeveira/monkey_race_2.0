"use client"
import type React from "react"
import {useRef, useState, useEffect} from "react"
import {Settings} from "@/components/Settings"
import {Button} from "@/components/ui/button"
import Link from "next/link"

export default function HomePage() {
    const audioRef = useRef<HTMLAudioElement>(null)
    const [volume, setVolume] = useState<number>(0.5)
    const [isMuted, setIsMuted] = useState<boolean>(false)
    const [showSettings, setShowSettings] = useState<boolean>(false)

    useEffect(() => {
        if (typeof window !== "undefined") {
            const localVolume = localStorage.getItem("volume")
            const localMuted = localStorage.getItem("isMuted")

            const initialVolume = localVolume && !isNaN(Number(localVolume))
                ? Math.min(Math.max(Number.parseFloat(localVolume), 0), 1)
                : 0.5;
            const initialMuted = localMuted === "true";

            setVolume(initialVolume)
            setIsMuted(initialMuted)

            if (audioRef.current) {
                audioRef.current.volume = initialVolume
                audioRef.current.muted = initialMuted

                audioRef.current.play()
            }
        }
    }, [])

    const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = Math.min(Math.max(Number(event.target.value), 0), 1);
        if (audioRef.current) {
            audioRef.current.volume = newVolume
            setVolume(newVolume)
            localStorage.setItem("volume", String(newVolume))
        }
    }

    const toggleMute = () => {
        if (audioRef.current) {
            audioRef.current.muted = !audioRef.current.muted
            setIsMuted(!isMuted)
            localStorage.setItem("isMuted", String(!isMuted))
        }
    }

    const toggleSettings = () => {
        setShowSettings(!showSettings)
    }

    return (
        <div
            className="flex flex-col items-center justify-center h-screen bg-[url(/images/home-background.gif)] bg-no-repeat bg-center bg-cover">
            <audio ref={audioRef} loop={true} preload="auto">
                <source src="/music/6144088763662336.wav" type="audio/wav"/>
            </audio>

            <div
                className="flex flex-col items-center justify-center p-6 rounded-lg bg-white/90 backdrop-blur-sm border-4 border-[#6b5c3e] shadow-[0_0_10px_rgba(0,0,0,0.5)] w-[350px] max-w-[90vw]">
                <h1 className="font-bold text-4xl mb-2 text-[#3e2a14] font-['Pixelify_Sans',_sans-serif] tracking-wide">
                    Monkey Race
                </h1>
                <p className="text-lg mb-6 text-[#5a4025] font-['Pixelify_Sans',_sans-serif]">
                    A math game about monkeys racing
                </p>

                <div className="flex flex-col gap-3 w-full">
                    <Link href="/singleplayer" className="w-full">
                        <Button
                            className="w-full bg-[#8bc34a] hover:bg-[#7cb342] text-white py-2 px-4 rounded-md font-bold transition-all transform hover:scale-105 shadow-md hover:cursor-pointer">
                            Singleplayer
                        </Button>
                    </Link>
                    <Link href="/multiplayer" className="w-full">
                        <Button className="w-full bg-[#ec407a] hover:bg-[#d81b60] text-white py-2 px-4 rounded-md font-bold transition-all transform hover:scale-105 shadow-md hover:cursor-pointer">
                            Multiplayer
                        </Button>
                    </Link>
                    <div className={"flex flex-row gap-3 w-full"}>
                        <Link href="/join-room" className="flex-1">
                            <Button className="w-full bg-[#42a5f5] hover:bg-[#1e88e5] text-white py-2 px-4 rounded-md font-bold transition-all transform hover:scale-105 shadow-md hover:cursor-pointer">
                                Join Room
                            </Button>
                        </Link>
                        <Link href="/create-room" className="flex-1">
                            <Button className="w-full bg-[#ff9800] hover:bg-[#f57c00] text-white py-2 px-4 rounded-md font-bold transition-all transform hover:scale-105 shadow-md hover:cursor-pointer">
                                Create Room
                            </Button>
                        </Link>
                    </div>
                    <Button
                        onClick={toggleSettings}
                        className="bg-[#7e57c2] hover:bg-[#5e35b1] text-white py-2 px-4 rounded-md font-bold transition-all transform hover:scale-105 shadow-md hover:cursor-pointer"
                    >
                        Settings
                    </Button>
                    <Button
                        className="bg-[#78909c] hover:bg-[#546e7a] text-white py-2 px-4 rounded-md font-bold transition-all transform hover:scale-105 shadow-md hover:cursor-pointer">
                        Logout
                    </Button>
                </div>
            </div>

            {showSettings && (
                <Settings
                    volume={volume}
                    isMuted={isMuted}
                    onVolumeChange={handleVolumeChange}
                    onToggleMute={toggleMute}
                    onClose={toggleSettings}
                />
            )}
        </div>
    )
}
