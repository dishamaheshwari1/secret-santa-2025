"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import confetti from "canvas-confetti"

// Participants data
const PARTICIPANTS = [
  // Girls
  { name: "Disha", pin: "1537" },
  { name: "Vinisha", pin: "8942" },
  { name: "Smitha", pin: "5304" },
  { name: "Aishwarya", pin: "9984" },
  { name: "Swasti", pin: "7634" },
  { name: "Anvita", pin: "1287" },
  { name: "Shriya", pin: "9843" },
  // Boys
  { name: "Anshul", pin: "2829" },
  { name: "Bhavya", pin: "3842" },
  { name: "Shreyas", pin: "4280" },
  { name: "Saketh", pin: "7356" },
  { name: "Ronit", pin: "2307" },
]

// Seeded random number generator (mulberry32)
function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Hash string to number for seeding
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

function generateMatches(password: string, participants: typeof PARTICIPANTS) {
  const seed = hashString(password)
  const rng = mulberry32(seed)

  const matches: Record<string, string> = {}
  const boys = ["Anshul", "Bhavya", "Shreyas", "Saketh", "Ronit"]
  const girls = ["Disha", "Vinisha", "Smitha", "Aishwarya", "Swasti", "Anvita", "Shriya"]

  matches["Saketh"] = "Shreyas"

  // Anshul must gift to a boy: Bhavya, Ronit, or Saketh (not Shreyas - Saketh takes him)
  // Someone must gift to Anshul, and that someone must be a boy: Bhavya, Ronit, or Shreyas (not Saketh - he's busy)

  const anshulCanGiftTo = ["Bhavya", "Ronit", "Saketh"] // Saketh IS allowed now
  const canGiftToAnshul = ["Bhavya", "Ronit", "Shreyas"] // Not Saketh

  const shuffleArray = <T,>(array: T[]): T[] => {
    const arr = [...array]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }

  // Assign Anshul's target
  const shuffledAnshulReceivers = shuffleArray(anshulCanGiftTo)
  const anshulGiftsTo = shuffledAnshulReceivers[0]
  matches["Anshul"] = anshulGiftsTo

  // Assign who gifts to Anshul (must avoid reciprocal)
  const shuffledAnshulGivers = shuffleArray(canGiftToAnshul.filter((b) => b !== anshulGiftsTo))
  const anshulReceivesFrom = shuffledAnshulGivers[0]
  matches[anshulReceivesFrom] = "Anshul"

  const alreadyAssignedGivers = Object.keys(matches)
  const alreadyAssignedReceivers = Object.values(matches)

  const remainingGivers = participants.map((p) => p.name).filter((name) => !alreadyAssignedGivers.includes(name))

  const remainingReceivers = participants.map((p) => p.name).filter((name) => !alreadyAssignedReceivers.includes(name))

  // Retry logic to ensure valid matching with no self-gifting and no reciprocal gifting
  let attempts = 0
  const maxAttempts = 1000

  while (remainingGivers.length > 0 && attempts < maxAttempts) {
    attempts++
    const tempMatches = { ...matches }
    const tempRemainingReceivers = shuffleArray([...remainingReceivers])
    const tempRemainingGivers = [...remainingGivers]
    let failed = false

    for (const giver of tempRemainingGivers) {
      let assigned = false

      for (let i = 0; i < tempRemainingReceivers.length; i++) {
        const receiver = tempRemainingReceivers[i]

        // Check constraints: no self-gifting, no reciprocal gifting
        const isSelf = receiver === giver
        const isReciprocal = tempMatches[receiver] === giver

        if (!isSelf && !isReciprocal) {
          tempMatches[giver] = receiver
          tempRemainingReceivers.splice(i, 1)
          assigned = true
          break
        }
      }

      if (!assigned) {
        failed = true
        break
      }
    }

    if (!failed) {
      // Success! Use these matches
      Object.assign(matches, tempMatches)
      break
    }
  }

  return matches
}

export default function SecretSantaApp() {
  const [step, setStep] = useState<"login" | "reveal">("login")
  const [selectedName, setSelectedName] = useState("")
  const [pin, setPin] = useState("")
  const [groupPassword, setGroupPassword] = useState("")
  const [error, setError] = useState("")
  const [match, setMatch] = useState("")
  const [boxOpened, setBoxOpened] = useState(false)
  const [activeGame, setActiveGame] = useState<"tictactoe" | "memory" | "giftgrab" | null>(null)

  const handleLogin = () => {
    setError("")

    // Validate inputs
    if (!selectedName || !pin || !groupPassword) {
      setError("Please fill in all fields")
      return
    }

    const participant = PARTICIPANTS.find((p) => p.name === selectedName)
    if (!participant) {
      setError("Invalid name")
      return
    }

    if (participant.pin !== pin) {
      setError("Incorrect PIN")
      return
    }

    // Generate matches and find user's match
    const matches = generateMatches(groupPassword, PARTICIPANTS)
    const userMatch = matches[selectedName]

    if (userMatch) {
      setMatch(userMatch)
      setStep("reveal")
    } else {
      setError("Error generating match")
    }
  }

  const handleBoxClick = () => {
    if (!boxOpened) {
      setBoxOpened(true)
      setTimeout(() => {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#FFD700", "#FF0000", "#00FF00", "#FFFFFF"],
        })
      }, 500)
    }
  }

  return (
    <div className="min-h-screen overflow-hidden relative font-sans">
      <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap" rel="stylesheet" />

      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/images/background.jpg')",
          backgroundSize: "cover",
        }}
      />

      <div className="fixed inset-0 bg-black/20" />

      <div className="fixed bottom-0 left-0 right-0 z-40 bg-black/60 backdrop-blur-md border-t border-white/20 p-4">
        <div className="max-w-4xl mx-auto flex justify-center gap-3 sm:gap-4 flex-wrap">
          <button
            onClick={() => setActiveGame("tictactoe")}
            className="bg-green-600/80 hover:bg-green-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg border border-white/30 transition-all shadow-lg backdrop-blur-sm text-xs sm:text-sm"
            style={{ fontFamily: "'Press Start 2P', cursive" }}
          >
            Tic-Tac-Toe
          </button>
          <button
            onClick={() => setActiveGame("memory")}
            className="bg-blue-600/80 hover:bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg border border-white/30 transition-all shadow-lg backdrop-blur-sm text-xs sm:text-sm"
            style={{ fontFamily: "'Press Start 2P', cursive" }}
          >
            Memory
          </button>
          <button
            onClick={() => setActiveGame("giftgrab")}
            className="bg-purple-600/80 hover:bg-purple-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg border border-white/30 transition-all shadow-lg backdrop-blur-sm text-xs sm:text-sm"
            style={{ fontFamily: "'Press Start 2P', cursive" }}
          >
            Gift Grab
          </button>
        </div>
      </div>

      <div
        className="relative z-30 flex items-center justify-center p-4 sm:p-6 md:p-8"
        style={{ minHeight: "calc(100vh - 5rem)" }}
      >
        <AnimatePresence mode="wait">
          {step === "login" && (
            <motion.div
              key="login"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative max-w-md w-full"
            >
              <div
                className="bg-black/70 backdrop-blur-md p-6 sm:p-8 rounded-xl border border-white/20"
                style={{
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                }}
              >
                <h1
                  className="text-xl sm:text-2xl md:text-3xl text-white mb-6 text-center leading-relaxed"
                  style={{
                    fontFamily: "'Press Start 2P', cursive",
                    textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
                  }}
                >
                  Secret Santa
                </h1>

                <div className="space-y-4">
                  <div>
                    <label
                      className="block text-white mb-2 text-sm font-bold"
                      style={{ fontFamily: "'VT323', monospace", fontSize: "1.2rem" }}
                    >
                      Your Name:
                    </label>
                    <select
                      value={selectedName}
                      onChange={(e) => setSelectedName(e.target.value)}
                      className="w-full bg-white/10 text-white border border-white/30 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 backdrop-blur-sm"
                      style={{ fontFamily: "'VT323', monospace", fontSize: "1.2rem" }}
                    >
                      <option value="" className="bg-gray-900">
                        Select...
                      </option>
                      {PARTICIPANTS.map((p) => (
                        <option key={p.name} value={p.name} className="bg-gray-900">
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      className="block text-white mb-2 text-sm font-bold"
                      style={{ fontFamily: "'VT323', monospace", fontSize: "1.2rem" }}
                    >
                      Your PIN:
                    </label>
                    <input
                      type="password"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      className="w-full bg-white/10 text-white border border-white/30 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 backdrop-blur-sm placeholder-white/50"
                      style={{ fontFamily: "'VT323', monospace", fontSize: "1.2rem" }}
                      placeholder="****"
                    />
                  </div>

                  <div>
                    <label
                      className="block text-white mb-2 text-sm font-bold"
                      style={{ fontFamily: "'VT323', monospace", fontSize: "1.2rem" }}
                    >
                      Group Password:
                    </label>
                    <input
                      type="password"
                      value={groupPassword}
                      onChange={(e) => setGroupPassword(e.target.value)}
                      className="w-full bg-white/10 text-white border border-white/30 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 backdrop-blur-sm placeholder-white/50"
                      style={{ fontFamily: "'VT323', monospace", fontSize: "1.2rem" }}
                      placeholder="Enter group password"
                    />
                  </div>

                  {error && (
                    <div
                      className="text-red-300 text-sm bg-red-900/50 backdrop-blur-sm p-3 rounded-lg border border-red-500/50"
                      style={{ fontFamily: "'VT323', monospace", fontSize: "1.1rem" }}
                    >
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleLogin}
                    className="w-full bg-white/20 hover:bg-white/30 text-white py-3 px-4 rounded-lg border border-white/30 transition-all shadow-lg backdrop-blur-sm"
                    style={{ fontFamily: "'Press Start 2P', cursive", fontSize: "0.8rem" }}
                  >
                    ENTER
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === "reveal" && (
            <motion.div
              key="reveal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center"
            >
              <AnimatePresence>
                {!boxOpened && (
                  <motion.button
                    onClick={handleBoxClick}
                    className="relative cursor-pointer focus:outline-none group"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ y: 0 }}
                    animate={{ y: [-10, 0, -10] }}
                    transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                  >
                    <div className="relative w-32 h-32 md:w-40 md:h-40">
                      {/* Gift box body */}
                      <div
                        className="absolute inset-x-4 bottom-0 h-24 md:h-28 bg-red-600"
                        style={{
                          boxShadow:
                            "0 8px 24px rgba(0,0,0,0.6), inset -4px -4px 0 rgba(0,0,0,0.3), inset 4px 4px 0 rgba(255,255,255,0.2)",
                        }}
                      />
                      {/* Vertical ribbon */}
                      <div
                        className="absolute left-1/2 -translate-x-1/2 w-6 md:w-8 bottom-0 h-24 md:h-28 bg-yellow-400"
                        style={{
                          boxShadow: "inset -2px 0 0 rgba(0,0,0,0.3), inset 2px 0 0 rgba(255,255,255,0.3)",
                        }}
                      />
                      {/* Gift box lid */}
                      <div
                        className="absolute inset-x-2 top-0 h-8 md:h-10 bg-red-700"
                        style={{
                          boxShadow:
                            "0 4px 12px rgba(0,0,0,0.5), inset -4px -4px 0 rgba(0,0,0,0.3), inset 4px 4px 0 rgba(255,255,255,0.2)",
                        }}
                      />
                      {/* Horizontal ribbon on lid */}
                      <div
                        className="absolute left-2 right-2 top-3 md:top-4 h-4 md:h-5 bg-yellow-400"
                        style={{
                          boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.3), inset 0 2px 0 rgba(255,255,255,0.3)",
                        }}
                      />
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3 md:-translate-y-4">
                        <div className="flex gap-1 items-end">
                          {/* Left triangle */}
                          <div
                            className="w-0 h-0"
                            style={{
                              borderLeft: "16px solid transparent",
                              borderRight: "16px solid #fcd34d",
                              borderBottom: "20px solid #fcd34d",
                              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))",
                            }}
                          />
                          {/* Right triangle */}
                          <div
                            className="w-0 h-0"
                            style={{
                              borderLeft: "16px solid #fcd34d",
                              borderRight: "16px solid transparent",
                              borderBottom: "20px solid #fcd34d",
                              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <motion.div
                      className="absolute inset-0 bg-yellow-200 opacity-0 group-hover:opacity-20 rounded-lg"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
                    />
                    <p
                      className="text-white text-center mt-6 drop-shadow-lg"
                      style={{ fontFamily: "'VT323', monospace", fontSize: "1.3rem" }}
                    >
                      Click to reveal!
                    </p>
                  </motion.button>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {boxOpened && (
                  <motion.div
                    initial={{ scale: 0, y: 100, rotate: -180 }}
                    animate={{ scale: 1, y: 0, rotate: 0 }}
                    transition={{ type: "spring", damping: 10, stiffness: 100 }}
                    className="relative p-8 md:p-12 rounded-xl border border-white/20 bg-black/60 backdrop-blur-md"
                    style={{
                      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                    }}
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-center"
                    >
                      <p
                        className="text-white/90 mb-4"
                        style={{ fontFamily: "'VT323', monospace", fontSize: "1.5rem" }}
                      >
                        Your Secret Santa Target:
                      </p>
                      <p
                        className="text-4xl md:text-5xl text-white mb-6"
                        style={{
                          fontFamily: "'Press Start 2P', cursive",
                          lineHeight: "1.6",
                          textShadow: "0 0 20px rgba(255,215,0,0.8), 2px 2px 4px rgba(0,0,0,0.8)",
                        }}
                      >
                        {match}
                      </p>
                      <p className="text-white/80" style={{ fontFamily: "'VT323', monospace", fontSize: "1.3rem" }}>
                        Keep it secret!
                      </p>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {activeGame && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setActiveGame(null)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              className="bg-black/90 backdrop-blur-md p-6 sm:p-8 rounded-xl border border-white/30 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.8)" }}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg sm:text-xl text-white" style={{ fontFamily: "'Press Start 2P', cursive" }}>
                  {activeGame === "tictactoe" && "Tic-Tac-Toe"}
                  {activeGame === "memory" && "Memory Match"}
                  {activeGame === "giftgrab" && "Gift Grab"}
                </h2>
                <button
                  onClick={() => setActiveGame(null)}
                  className="text-white/70 hover:text-white text-2xl leading-none"
                >
                  ×
                </button>
              </div>
              {activeGame === "tictactoe" && <TicTacToe />}
              {activeGame === "memory" && <MemoryGame />}
              {activeGame === "giftgrab" && <GiftGrab />}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TicTacToe() {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null))
  const [isPlayerTurn, setIsPlayerTurn] = useState(true)
  const [mode, setMode] = useState<"1player" | "2player">("1player")
  const [winner, setWinner] = useState<string | null>(null)

  const checkWinner = (squares: (string | null)[]) => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ]
    for (const [a, b, c] of lines) {
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a]
      }
    }
    return null
  }

  const handleClick = (index: number) => {
    if (board[index] || winner) return

    const newBoard = [...board]
    newBoard[index] = "🎄"
    setBoard(newBoard)

    const gameWinner = checkWinner(newBoard)
    if (gameWinner) {
      setWinner(gameWinner)
      return
    }

    if (mode === "1player" && !newBoard.includes(null)) {
      setWinner("draw")
      return
    }

    if (mode === "1player") {
      setIsPlayerTurn(false)
      setTimeout(() => {
        const availableSpots = newBoard
          .map((val, idx) => (val === null ? idx : null))
          .filter((val) => val !== null) as number[]
        if (availableSpots.length > 0) {
          const randomSpot = availableSpots[Math.floor(Math.random() * availableSpots.length)]
          const aiBoard = [...newBoard]
          aiBoard[randomSpot] = "⛄"
          setBoard(aiBoard)
          const aiWinner = checkWinner(aiBoard)
          if (aiWinner) {
            setWinner(aiWinner)
          } else if (!aiBoard.includes(null)) {
            setWinner("draw")
          }
        }
        setIsPlayerTurn(true)
      }, 500)
    } else {
      setIsPlayerTurn(!isPlayerTurn)
    }
  }

  const resetGame = () => {
    setBoard(Array(9).fill(null))
    setWinner(null)
    setIsPlayerTurn(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-center gap-4">
        <button
          onClick={() => {
            setMode("1player")
            resetGame()
          }}
          className={`px-4 py-2 rounded-lg border transition-all ${
            mode === "1player" ? "bg-white/30 border-white/50 text-white" : "bg-white/10 border-white/20 text-white/70"
          }`}
          style={{ fontFamily: "'VT323', monospace", fontSize: "1.2rem" }}
        >
          1 Player
        </button>
        <button
          onClick={() => {
            setMode("2player")
            resetGame()
          }}
          className={`px-4 py-2 rounded-lg border transition-all ${
            mode === "2player" ? "bg-white/30 border-white/50 text-white" : "bg-white/10 border-white/20 text-white/70"
          }`}
          style={{ fontFamily: "'VT323', monospace", fontSize: "1.2rem" }}
        >
          2 Players
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
        {board.map((cell, index) => (
          <button
            key={index}
            onClick={() => handleClick(index)}
            className="aspect-square bg-white/10 hover:bg-white/20 border border-white/30 rounded-lg flex items-center justify-center text-4xl transition-all disabled:cursor-not-allowed"
            disabled={!isPlayerTurn && mode === "1player"}
          >
            {cell}
          </button>
        ))}
      </div>

      {winner && (
        <div className="text-center">
          <p className="text-white text-xl mb-4" style={{ fontFamily: "'VT323', monospace" }}>
            {winner === "draw" ? "It's a Draw!" : `${winner} Wins!`}
          </p>
          <button
            onClick={resetGame}
            className="bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-lg border border-white/30"
            style={{ fontFamily: "'VT323', monospace", fontSize: "1.2rem" }}
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  )
}

function MemoryGame() {
  const emojis = ["🎅", "🎁", "🦌", "❄️", "⛄", "🎄", "🔔", "⭐"]
  const [cards, setCards] = useState(() => {
    const doubled = [...emojis, ...emojis]
    return doubled
      .sort(() => Math.random() - 0.5)
      .map((emoji, index) => ({ id: index, emoji, flipped: false, matched: false }))
  })
  const [flippedIndices, setFlippedIndices] = useState<number[]>([])
  const [moves, setMoves] = useState(0)

  const handleCardClick = (index: number) => {
    if (flippedIndices.length === 2 || cards[index].flipped || cards[index].matched) return

    const newCards = [...cards]
    newCards[index].flipped = true
    setCards(newCards)

    const newFlipped = [...flippedIndices, index]
    setFlippedIndices(newFlipped)

    if (newFlipped.length === 2) {
      setMoves(moves + 1)
      const [first, second] = newFlipped
      if (cards[first].emoji === cards[second].emoji) {
        setTimeout(() => {
          const matchedCards = [...cards]
          matchedCards[first].matched = true
          matchedCards[second].matched = true
          setCards(matchedCards)
          setFlippedIndices([])
        }, 500)
      } else {
        setTimeout(() => {
          const resetCards = [...cards]
          resetCards[first].flipped = false
          resetCards[second].flipped = false
          setCards(resetCards)
          setFlippedIndices([])
        }, 1000)
      }
    }
  }

  const resetGame = () => {
    const doubled = [...emojis, ...emojis]
    setCards(
      doubled
        .sort(() => Math.random() - 0.5)
        .map((emoji, index) => ({ id: index, emoji, flipped: false, matched: false })),
    )
    setFlippedIndices([])
    setMoves(0)
  }

  const allMatched = cards.every((card) => card.matched)

  return (
    <div className="space-y-4">
      <div className="text-center text-white" style={{ fontFamily: "'VT323', monospace", fontSize: "1.3rem" }}>
        Moves: {moves}
      </div>

      <div className="grid grid-cols-4 gap-2 max-w-md mx-auto">
        {cards.map((card, index) => (
          <button
            key={card.id}
            onClick={() => handleCardClick(index)}
            className={`aspect-square rounded-lg flex items-center justify-center text-3xl transition-all ${
              card.flipped || card.matched
                ? "bg-white/30 border-white/50"
                : "bg-white/10 hover:bg-white/20 border-white/30"
            } border`}
          >
            {card.flipped || card.matched ? card.emoji : "?"}
          </button>
        ))}
      </div>

      {allMatched && (
        <div className="text-center">
          <p className="text-white text-xl mb-4" style={{ fontFamily: "'VT323', monospace" }}>
            You Won in {moves} moves!
          </p>
          <button
            onClick={resetGame}
            className="bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-lg border border-white/30"
            style={{ fontFamily: "'VT323', monospace", fontSize: "1.2rem" }}
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  )
}

function GiftGrab() {
  const [grid, setGrid] = useState<boolean[]>(Array(9).fill(false))
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [gameActive, setGameActive] = useState(false)

  const startGame = () => {
    setScore(0)
    setGameActive(true)
    setGrid(Array(9).fill(false))
  }

  const handleClick = (index: number) => {
    if (!gameActive || !grid[index]) return
    setScore(score + 1)
    if (score + 1 > highScore) {
      setHighScore(score + 1)
    }
    const newGrid = [...grid]
    newGrid[index] = false
    setGrid(newGrid)
  }

  useEffect(() => {
    if (!gameActive) return

    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * 9)
      setGrid((prev) => {
        const newGrid = Array(9).fill(false)
        newGrid[randomIndex] = true
        return newGrid
      })
    }, 800)

    return () => clearInterval(interval)
  }, [gameActive])

  return (
    <div className="space-y-4">
      <div className="flex justify-between text-white" style={{ fontFamily: "'VT323', monospace", fontSize: "1.3rem" }}>
        <div>Score: {score}</div>
        <div>High Score: {highScore}</div>
      </div>

      <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
        {grid.map((hasGift, index) => (
          <button
            key={index}
            onClick={() => handleClick(index)}
            className="aspect-square bg-gray-800/80 hover:bg-gray-700/80 border border-white/30 rounded-lg flex items-center justify-center text-4xl transition-all"
          >
            {hasGift && "🎁"}
          </button>
        ))}
      </div>

      <div className="text-center">
        <button
          onClick={startGame}
          className="bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-lg border border-white/30"
          style={{ fontFamily: "'VT323', monospace", fontSize: "1.2rem" }}
        >
          {gameActive ? "Restart" : "Start Game"}
        </button>
      </div>
    </div>
  )
}
