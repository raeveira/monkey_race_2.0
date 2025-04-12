"use client"

import type { Player } from "@/app/(protected)/multiplayer/page"
import { Button } from "@/components/ui/button"
import { Check, Copy, Crown, UserCircle2 } from "lucide-react"
import { useState } from "react"

interface MultiplayerLobbyProps {
    players: Player[]
    currentPlayer: Player | null
    gameId: string
    countdown: number | null
    maxPlayers: number
    onToggleReady: () => void
    onStartGame: () => void
}

export function MultiplayerLobby({
                                     players,
                                     currentPlayer,
                                     gameId,
                                     countdown,
                                     maxPlayers = 10,
                                     onToggleReady,
                                     onStartGame,
                                 }: MultiplayerLobbyProps) {
    const [copied, setCopied] = useState(false)

    const readyPlayers = players.filter((p) => p.isReady).length
    const totalPlayers = players.length

    // At least 2 players needed and all players must be ready
    const canStart = readyPlayers >= 2 && readyPlayers === totalPlayers

    const copyGameId = () => {
        navigator.clipboard.writeText(gameId)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="bg-[#f5f2e3] border-4 border-[#5a6e4a] rounded-lg p-6 shadow-lg max-w-2xl w-full">
            <h1 className="text-3xl font-bold mb-2 text-[#3d2c12] font-pixel text-center">Monkey Race Lobby</h1>

            {/* Game ID */}
            <div className="flex items-center justify-center mb-4">
                <div className="bg-[#e8e4d0] border-2 border-[#5a6e4a] rounded-md px-3 py-2 flex items-center">
                    <span className="text-[#5a4025] mr-2">Game ID:</span>
                    <span className="font-mono font-bold">{gameId}</span>
                    <Button variant="ghost" size="sm" onClick={copyGameId} className="ml-2 h-8 w-8 p-0">
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                    </Button>
                </div>
            </div>

            {/* Player list */}
            <div className="mb-6 bg-[#e8e4d0] border-2 border-[#5a6e4a] rounded-md p-3">
                <h2 className="text-lg font-bold mb-2 text-[#3d2c12]">
                    Players ({totalPlayers}/{maxPlayers})
                </h2>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                    {players.map((player) => (
                        <div
                            key={player.id}
                            className={`flex justify-between items-center p-2 rounded-md ${
                                player.id === currentPlayer?.id
                                    ? "bg-[#c8e6c9] border border-[#81c784]"
                                    : "bg-[#d8d4c0] border border-[#5a6e4a]"
                            }`}
                        >
                            <div className="flex items-center">
                                {player.isHost && <Crown className="mr-2 h-4 w-4 text-[#ffc107]" />}
                                <UserCircle2 className="mr-2 h-5 w-5" />
                                <span>{player.name}</span>
                                {player.id === currentPlayer?.id && <span className="ml-2 text-xs">(You)</span>}
                            </div>
                            <div
                                className={`px-2 py-1 rounded-md text-xs font-medium ${
                                    player.isReady ? "bg-[#c8e6c9] text-[#2e7d32]" : "bg-[#ffcdd2] text-[#c62828]"
                                }`}
                            >
                                {player.isReady ? "Ready" : "Not Ready"}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Game status */}
            <div className="text-center mb-4">
                {countdown !== null ? (
                    <div className="text-2xl font-bold text-[#3d2c12]">Game starting in {countdown}...</div>
                ) : (
                    <div className="text-[#5a4025]">
                        {canStart
                            ? "All players are ready! The host can start the game."
                            : `Waiting for players to get ready (${readyPlayers}/${totalPlayers})`}
                    </div>
                )}
            </div>

            {/* Action buttons */}
            <div className="flex justify-center gap-4">
                <Button
                    onClick={onToggleReady}
                    disabled={countdown !== null}
                    className={`px-6 py-2 border-2 ${
                        currentPlayer?.isReady
                            ? "bg-[#ffcdd2] hover:bg-[#ef9a9a] text-[#c62828] border-[#e57373]"
                            : "bg-[#c8e6c9] hover:bg-[#a5d6a7] text-[#2e7d32] border-[#81c784]"
                    }`}
                >
                    {currentPlayer?.isReady ? "Cancel Ready" : "Ready Up"}
                </Button>

                {currentPlayer?.isHost && (
                    <Button
                        onClick={onStartGame}
                        disabled={!canStart || countdown !== null}
                        className="bg-[#8bba5f] hover:bg-[#7aa54e] text-[#3d2c12] border-2 border-[#5a6e4a] px-6 py-2"
                    >
                        Start Game
                    </Button>
                )}
            </div>
        </div>
    )
}
