import { createServer } from "node:http"
import next from "next"
import { Server } from "socket.io"
import { v4 as uuidv4 } from "uuid"

const dev = process.env.NODE_ENV !== "production"
const turbo = process.env.NODE_ENV !== "production"
const hostname = "localhost"
const port = process.env.NODE_ENV === "production" ? 80 : 3000
const app = next({ dev, hostname, port, turbo })
const handler = app.getRequestHandler()

// Store active games
const games = {}

// Store player session info
const playerSessions = {}

// Constants
const MAX_HEIGHT = 2000 // Maximum climbing height

// Create a new game or get existing one for quick play
const getOrCreateGame = () => {
    // Find an existing game in lobby state that is NOT private
    const existingGame = Object.values(games).find(
        (game) => game.status === "lobby" && game.isPrivate === false && game.players.length < 10,
    )

    if (existingGame) {
        return existingGame
    }

    // Create a new public game
    const gameId = uuidv4().substring(0, 8)
    const newGame = {
        id: gameId,
        players: [],
        status: "lobby",
        isPrivate: false,
        maxPlayers: 10,
        topReachers: [], // Track players who reached the top in order
        gameStartTime: 0, // When the game started (for time-based bonuses)
    }

    games[gameId] = newGame
    return newGame
}

// Create a new private game
const createPrivateGame = (maxPlayers = 30) => {
    const gameId = uuidv4().substring(0, 8)
    const newGame = {
        id: gameId,
        players: [],
        status: "lobby",
        isPrivate: true,
        maxPlayers: maxPlayers,
        topReachers: [], // Track players who reached the top in order
        gameStartTime: 0, // When the game started (for time-based bonuses)
    }

    games[gameId] = newGame
    return newGame
}

// Clean up disconnected players
const cleanupDisconnectedPlayers = () => {
    console.log("Running cleanup of disconnected players...")

    // Check each game
    Object.values(games).forEach((game) => {
        let playersRemoved = false

        // Check each player in the game
        game.players = game.players.filter((player) => {
            // Keep player if they have an active socket connection
            const isConnected = playerSessions[player.id] && playerSessions[player.id].connected

            if (!isConnected) {
                console.log(`Removing disconnected player ${player.name} (${player.id}) from game ${game.id}`)
                playersRemoved = true
            }

            return isConnected
        })

        // If players were removed, update the game state
        if (playersRemoved && game.players.length > 0) {
            // If host left, assign new host
            if (!game.players.some((p) => p.isHost)) {
                game.players[0].isHost = true
                console.log(`New host assigned in game ${game.id}: ${game.players[0].name}`)
            }

            // Broadcast updated lobby state
            const io = global.io
            if (io) {
                io.to(game.id).emit("lobbyState", {
                    players: game.players,
                    gameId: game.id,
                    maxPlayers: game.maxPlayers,
                })
            }
        }

        // Remove empty games
        if (game.players.length === 0) {
            console.log(`Removing empty game ${game.id}`)
            delete games[game.id]
        }
    })
}

app.prepare().then(() => {
    const httpServer = createServer(handler)

    const io = new Server(httpServer)

    // Store io instance globally for cleanup function
    global.io = io

    // Run cleanup every 30 seconds
    setInterval(cleanupDisconnectedPlayers, 30000)

    io.on("connection", (socket) => {
        console.log("Socket connected: ", socket.id)

        // Track player session
        playerSessions[socket.id] = {
            connected: true,
            lastPing: Date.now(),
        }

        // Handle ping to keep connection alive
        socket.on("ping", () => {
            if (playerSessions[socket.id]) {
                playerSessions[socket.id].lastPing = Date.now()
            }
        })

        // Chat functionality
        socket.on("clientMessage", ({message, lobbyId}) => {
            console.log(`Message received in lobby ${lobbyId}: ${message}`);
            io.to(lobbyId).emit("message", message);
        })

        // Check if a game exists and is joinable
        socket.on("checkGame", ({ gameId }) => {
            const game = games[gameId]

            if (!game) {
                socket.emit("checkGameResponse", {
                    exists: false,
                    joinable: false,
                    message: "Game not found",
                })
                return
            }

            if (game.status !== "lobby") {
                socket.emit("checkGameResponse", {
                    exists: true,
                    joinable: false,
                    message: "Game is already in progress",
                })
                return
            }

            if (game.players.length >= game.maxPlayers) {
                socket.emit("checkGameResponse", {
                    exists: true,
                    joinable: false,
                    message: `Game is full (${game.players.length}/${game.maxPlayers})`,
                })
                return
            }

            socket.emit("checkGameResponse", {
                exists: true,
                joinable: true,
            })
        })

        // Create a new private game
        socket.on("createGame", ({ name, maxPlayers }) => {
            // Default to 30 players if not specified or invalid
            const playerLimit = maxPlayers && !isNaN(maxPlayers) ? Number.parseInt(maxPlayers) : 30

            console.log(`Creating private game with max ${playerLimit} players`)

            const game = createPrivateGame(playerLimit)

            // Create player
            const player = {
                id: socket.id,
                name,
                isHost: true, // Creator is always host
                isReady: false,
                score: 0,
                position: 0,
            }

            // Add player to game
            game.players.push(player)

            // Join game room
            socket.join(game.id)

            console.log(`Player ${name} (${socket.id}) created private game ${game.id} with max ${playerLimit} players`)

            // Send response to client
            socket.emit("createGameResponse", { success: true, gameId: game.id })

            // Broadcast updated lobby state
            io.to(game.id).emit("lobbyState", {
                players: game.players,
                gameId: game.id,
                maxPlayers: game.maxPlayers,
            })
        })

        // Join a specific game by ID
        socket.on("joinSpecificGame", ({ gameId, name }) => {
            const game = games[gameId]

            // Check if game exists
            if (!game) {
                console.log(`Game ${gameId} not found`)
                socket.emit("joinGameResponse", { success: false, message: "Game not found" })
                socket.emit("error", "Game not found")
                return
            }

            // Check if game is in lobby state
            if (game.status !== "lobby") {
                console.log(`Game ${gameId} is already in progress`)
                socket.emit("joinGameResponse", { success: false, message: "Game is already in progress" })
                socket.emit("error", "Game is already in progress")
                return
            }

            // Check if game is full
            if (game.players.length >= game.maxPlayers) {
                console.log(`Game ${gameId} is full (${game.players.length}/${game.maxPlayers})`)
                socket.emit("joinGameResponse", {
                    success: false,
                    message: `Game is full (${game.players.length}/${game.maxPlayers})`,
                })
                socket.emit("error", `Game is full (${game.players.length}/${game.maxPlayers})`)
                return
            }

            // Check if player is already in this game
            const existingPlayer = game.players.find((p) => p.id === socket.id)
            if (existingPlayer) {
                console.log(`Player ${socket.id} is already in game ${gameId}`)

                // Just update the socket room and send the current state
                socket.join(game.id)

                socket.emit("lobbyState", {
                    players: game.players,
                    gameId: game.id,
                    maxPlayers: game.maxPlayers,
                })

                return
            }

            // Create player
            const player = {
                id: socket.id,
                name,
                isHost: false,
                isReady: false,
                score: 0,
                position: 0,
            }

            // Add player to game
            game.players.push(player)

            // Join game room
            socket.join(game.id)

            console.log(`Player ${name} (${socket.id}) joined game ${game.id}`)

            // Send success response
            socket.emit("joinGameResponse", { success: true })

            // Broadcast updated lobby state
            io.to(game.id).emit("lobbyState", {
                players: game.players,
                gameId: game.id,
                maxPlayers: game.maxPlayers,
            })
        })

        // Join lobby (quick play)
        socket.on("joinLobby", ({ name }) => {
            const game = getOrCreateGame()

            // Check if player is already in this game
            const existingPlayer = game.players.find((p) => p.id === socket.id)
            if (existingPlayer) {
                console.log(`Player ${socket.id} is already in game ${game.id}`)

                // Just update the socket room and send the current state
                socket.join(game.id)

                socket.emit("lobbyState", {
                    players: game.players,
                    gameId: game.id,
                    maxPlayers: game.maxPlayers,
                })

                return
            }

            // Create player
            const player = {
                id: socket.id,
                name,
                isHost: game.players.length === 0, // First player is host
                isReady: false,
                score: 0,
                position: 0,
            }

            // Add player to game
            game.players.push(player)

            // Join game room
            socket.join(game.id)

            console.log(`Player ${name} (${socket.id}) joined game ${game.id} (quick play)`)

            // Broadcast updated lobby state
            io.to(game.id).emit("lobbyState", {
                players: game.players,
                gameId: game.id,
                maxPlayers: game.maxPlayers,
            })
        })

        // Explicitly leave a game
        socket.on("leaveGame", ({ gameId }) => {
            const game = games[gameId]

            if (!game) return

            // Get player name before removing
            const player = game.players.find((p) => p.id === socket.id)
            if (!player) return

            console.log(`Player ${player.name} (${socket.id}) explicitly left game ${gameId}`)

            // Remove player from game
            game.players = game.players.filter((p) => p.id !== socket.id)

            // Leave socket room
            socket.leave(gameId)

            // If no players left, remove game
            if (game.players.length === 0) {
                console.log(`Game ${gameId} removed (no players left)`)
                delete games[gameId]
                return
            }

            // If host left, assign new host
            if (!game.players.some((p) => p.isHost)) {
                game.players[0].isHost = true
                console.log(`New host assigned in game ${gameId}: ${game.players[0].name}`)
            }

            // Broadcast updated lobby state
            io.to(gameId).emit("lobbyState", {
                players: game.players,
                gameId: gameId,
                maxPlayers: game.maxPlayers,
            })
        })

        // Toggle ready status
        socket.on("toggleReady", ({ playerId }) => {
            // Find player's game
            const game = Object.values(games).find((g) => g.players.some((p) => p.id === playerId))

            if (!game) return

            // Update player ready status
            const player = game.players.find((p) => p.id === playerId)
            if (player) {
                player.isReady = !player.isReady

                console.log(`Player ${player.name} (${player.id}) is ${player.isReady ? "ready" : "not ready"}`)

                // Broadcast updated players
                io.to(game.id).emit("lobbyState", {
                    players: game.players,
                    gameId: game.id,
                    maxPlayers: game.maxPlayers,
                })
            }
        })

        // Start game
        socket.on("startGame", ({ gameId }) => {
            const game = games[gameId]

            if (!game) return

            // Check if enough players are ready
            const readyPlayers = game.players.filter((p) => p.isReady).length
            if (readyPlayers < 2 || readyPlayers !== game.players.length) return

            console.log(`Starting game ${gameId} with ${game.players.length} players`)

            // Record game start time for bonus calculations
            game.gameStartTime = Date.now()

            // Start countdown
            let countdown = 3
            const countdownInterval = setInterval(() => {
                io.to(game.id).emit("gameStarting", countdown)

                countdown--

                if (countdown < 0) {
                    clearInterval(countdownInterval)

                    // Start the game
                    game.status = "playing"
                    io.to(game.id).emit("gameStart")
                }
            }, 1000)
        })

        // Submit answer
        socket.on("submitAnswer", ({ playerId, isCorrect, score, climbAmount, reachedMax }) => {
            // Find player's game
            const game = Object.values(games).find((g) => g.players.some((p) => p.id === playerId))

            if (!game) return

            // Update player score and position
            const player = game.players.find((p) => p.id === playerId)
            if (player) {
                if (isCorrect) {
                    // Add score
                    player.score += score

                    // Only increase position if not at max height
                    if (!reachedMax && player.position < MAX_HEIGHT) {
                        player.position += climbAmount // Move up by specified amount
                        // Cap at max height
                        if (player.position > MAX_HEIGHT) {
                            player.position = MAX_HEIGHT
                        }
                    }

                    console.log(`Player ${player.name} answered correctly. Score: ${player.score}, Position: ${player.position}`)
                } else {
                    // Decrease score (but not below 0)
                    player.score = Math.max(0, player.score + score)

                    // Only decrease position if not at max height
                    if (!reachedMax) {
                        player.position = Math.max(0, player.position + climbAmount) // Move down but not below 0
                    }
                    console.log(`Player ${player.name} answered incorrectly. Position: ${player.position}`)
                }

                // Broadcast updated players
                io.to(game.id).emit("playerUpdate", game.players)
            }
        })

        // Player reached the top
        socket.on("playerReachedTop", ({ playerId, playerName, withinTimeLimit }) => {
            // Find player's game
            const game = Object.values(games).find((g) => g.players.some((p) => p.id === playerId))

            if (!game) return

            // Check if player is already in the top reachers list
            if (game.topReachers.includes(playerId)) return

            // Add player to top reachers list
            game.topReachers.push(playerId)

            console.log(`Player ${playerName} reached the top! Position: ${game.topReachers.length}`)

            // Award bonus points based on position
            const player = game.players.find((p) => p.id === playerId)
            if (player) {
                let bonusPoints = 0

                // Only award bonus points if player reached top within time limit
                if (withinTimeLimit) {
                    // Award bonus points based on position (1st, 2nd, 3rd)
                    switch (game.topReachers.length) {
                        case 1:
                            bonusPoints = 100
                            break
                        case 2:
                            bonusPoints = 50
                            break
                        case 3:
                            bonusPoints = 25
                            break
                        default:
                            bonusPoints = 0
                    }

                    // Add bonus points to player's score
                    if (bonusPoints > 0) {
                        player.score += bonusPoints
                        console.log(`Awarded ${bonusPoints} bonus points to ${playerName} for reaching top within time limit`)
                    }
                } else {
                    console.log(`${playerName} reached top but exceeded time limit for bonus`)
                }

                // Broadcast updated players
                io.to(game.id).emit("playerUpdate", game.players)

                // Notify all players about the new top reacher
                io.to(game.id).emit("topReachersUpdate", {
                    reachers: game.topReachers,
                    newReacher: playerName,
                    position: game.topReachers.length,
                    bonusAwarded: withinTimeLimit,
                })
            }
        })

        // Return to lobby
        socket.on("returnToLobby", () => {
            // Find player's game
            const game = Object.values(games).find((g) => g.players.some((p) => p.id === socket.id))

            if (!game) return

            // Reset game
            game.status = "lobby"
            game.topReachers = []
            game.gameStartTime = 0

            game.players.forEach((p) => {
                p.score = 0
                p.position = 0
                p.isReady = false
            })

            console.log(`Game ${game.id} returned to lobby`)

            // Broadcast updated lobby state
            io.to(game.id).emit("lobbyState", {
                players: game.players,
                gameId: game.id,
                maxPlayers: game.maxPlayers,
            })
        })

        // Disconnect
        socket.on("disconnect", () => {
            console.log("Socket disconnected: ", socket.id)

            // Update player session
            if (playerSessions[socket.id]) {
                playerSessions[socket.id].connected = false
            }

            // We don't immediately remove the player from games
            // This will be handled by the cleanup function
            // This allows players to reconnect if they refresh the page
        })

        socket.on("error", (error) => {
            console.error("Socket error: ", error)
        })
    })

    httpServer
        .once("error", (err) => {
            console.error(err)
            process.exit(1)
        })
        .listen(port, () => {
            console.log(`> Ready on http://${hostname}:${port}`)
        })
})
