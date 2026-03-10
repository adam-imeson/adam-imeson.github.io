import React, { useEffect, useRef, useCallback, useState } from "react"
import Layout from "../components/layout"

const COLS = 10
const ROWS = 20
const BLOCK = 24

const COLORS = [
  null, "#00f0f0", "#f0f000", "#a000f0",
  "#00f000", "#f00000", "#0000f0", "#f0a000",
]

// I, O, T, S, Z, J, L
const PIECES = [
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  [[2,2],[2,2]],
  [[0,3,0],[3,3,3],[0,0,0]],
  [[0,4,4],[4,4,0],[0,0,0]],
  [[5,5,0],[0,5,5],[0,0,0]],
  [[6,0,0],[6,6,6],[0,0,0]],
  [[0,0,7],[7,7,7],[0,0,0]],
]

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0))
}

function rotate(matrix) {
  const N = matrix.length
  const r = Array.from({ length: N }, () => new Array(N).fill(0))
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++)
      r[x][N - 1 - y] = matrix[y][x]
  return r
}

function randomPiece() {
  const i = Math.floor(Math.random() * PIECES.length)
  return PIECES[i].map(row => [...row])
}

export default function Tetris() {
  const canvasRef = useRef(null)
  const nextCanvasRef = useRef(null)
  const gameRef = useRef(null)
  const [score, setScore] = useState(0)
  const [lines, setLines] = useState(0)
  const [level, setLevel] = useState(1)
  const [message, setMessage] = useState("")
  const [started, setStarted] = useState(false)

  const draw = useCallback(() => {
    const g = gameRef.current
    if (!g) return
    const ctx = canvasRef.current?.getContext("2d")
    if (!ctx) return

    ctx.fillStyle = "#111"
    ctx.fillRect(0, 0, COLS * BLOCK, ROWS * BLOCK)

    // Board
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++)
        if (g.board[y][x]) {
          ctx.fillStyle = COLORS[g.board[y][x]]
          ctx.fillRect(x * BLOCK, y * BLOCK, BLOCK - 1, BLOCK - 1)
        }

    // Ghost piece
    if (g.current && !g.gameOver) {
      let ghostY = g.pos.y
      while (!collides(g.current, { x: g.pos.x, y: ghostY + 1 }, g.board))
        ghostY++
      for (let y = 0; y < g.current.length; y++)
        for (let x = 0; x < g.current[y].length; x++)
          if (g.current[y][x] && ghostY + y >= 0) {
            ctx.fillStyle = "rgba(255,255,255,0.12)"
            ctx.fillRect(
              (g.pos.x + x) * BLOCK,
              (ghostY + y) * BLOCK,
              BLOCK - 1,
              BLOCK - 1
            )
          }
    }

    // Current piece
    if (g.current)
      for (let y = 0; y < g.current.length; y++)
        for (let x = 0; x < g.current[y].length; x++)
          if (g.current[y][x] && g.pos.y + y >= 0) {
            ctx.fillStyle = COLORS[g.current[y][x]]
            ctx.fillRect(
              (g.pos.x + x) * BLOCK,
              (g.pos.y + y) * BLOCK,
              BLOCK - 1,
              BLOCK - 1
            )
          }

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.04)"
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath(); ctx.moveTo(x * BLOCK, 0)
      ctx.lineTo(x * BLOCK, ROWS * BLOCK); ctx.stroke()
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * BLOCK)
      ctx.lineTo(COLS * BLOCK, y * BLOCK); ctx.stroke()
    }
  }, [])

  const drawNext = useCallback(() => {
    const g = gameRef.current
    const ctx = nextCanvasRef.current?.getContext("2d")
    if (!ctx) return
    ctx.fillStyle = "#111"
    ctx.fillRect(0, 0, 100, 100)
    if (!g?.nextPiece) return
    const size = 20
    const ox = Math.floor((100 - g.nextPiece[0].length * size) / 2)
    const oy = Math.floor((100 - g.nextPiece.length * size) / 2)
    for (let y = 0; y < g.nextPiece.length; y++)
      for (let x = 0; x < g.nextPiece[y].length; x++)
        if (g.nextPiece[y][x]) {
          ctx.fillStyle = COLORS[g.nextPiece[y][x]]
          ctx.fillRect(ox + x * size, oy + y * size, size - 1, size - 1)
        }
  }, [])

  function collides(piece, p, board) {
    for (let y = 0; y < piece.length; y++)
      for (let x = 0; x < piece[y].length; x++)
        if (
          piece[y][x] &&
          (p.x + x < 0 ||
            p.x + x >= COLS ||
            p.y + y >= ROWS ||
            (p.y + y >= 0 && board[p.y + y][p.x + x]))
        )
          return true
    return false
  }

  function merge(piece, p, board) {
    for (let y = 0; y < piece.length; y++)
      for (let x = 0; x < piece[y].length; x++)
        if (piece[y][x] && p.y + y >= 0)
          board[p.y + y][p.x + x] = piece[y][x]
  }

  function clearLines(g) {
    let cleared = 0
    for (let y = ROWS - 1; y >= 0; y--) {
      if (g.board[y].every(c => c !== 0)) {
        g.board.splice(y, 1)
        g.board.unshift(new Array(COLS).fill(0))
        cleared++
        y++
      }
    }
    if (cleared > 0) {
      const pts = [0, 100, 300, 500, 800]
      g.score += (pts[cleared] || 800) * g.level
      g.lines += cleared
      g.level = Math.floor(g.lines / 10) + 1
      g.dropInterval = Math.max(50, 1000 - (g.level - 1) * 80)
      setScore(g.score)
      setLines(g.lines)
      setLevel(g.level)
    }
  }

  function spawn(g) {
    g.current = g.nextPiece || randomPiece()
    g.nextPiece = randomPiece()
    g.pos = {
      x: Math.floor((COLS - g.current[0].length) / 2),
      y: -1,
    }
    if (collides(g.current, g.pos, g.board)) {
      g.gameOver = true
      clearInterval(g.timer)
      setMessage("Game Over!")
    }
  }

  function drop(g, drawFn, drawNextFn) {
    if (!collides(g.current, { x: g.pos.x, y: g.pos.y + 1 }, g.board)) {
      g.pos.y++
    } else {
      merge(g.current, g.pos, g.board)
      clearLines(g)
      spawn(g)
      drawNextFn()
    }
    drawFn()

    // Update timer if level changed
    if (g.level !== g.lastLevel) {
      g.lastLevel = g.level
      clearInterval(g.timer)
      g.timer = setInterval(() => {
        if (!g.paused && !g.gameOver) drop(g, drawFn, drawNextFn)
      }, g.dropInterval)
    }
  }

  const startGame = useCallback(() => {
    if (gameRef.current?.timer) clearInterval(gameRef.current.timer)

    const g = {
      board: createBoard(),
      current: null,
      nextPiece: null,
      pos: { x: 0, y: 0 },
      score: 0,
      lines: 0,
      level: 1,
      lastLevel: 1,
      gameOver: false,
      paused: false,
      dropInterval: 1000,
      timer: null,
    }
    gameRef.current = g

    setScore(0)
    setLines(0)
    setLevel(1)
    setMessage("")
    setStarted(true)

    spawn(g)
    draw()
    drawNext()

    g.timer = setInterval(() => {
      if (!g.paused && !g.gameOver) drop(g, draw, drawNext)
    }, g.dropInterval)
  }, [draw, drawNext])

  useEffect(() => {
    // Draw empty board on mount
    const ctx = canvasRef.current?.getContext("2d")
    if (ctx) {
      ctx.fillStyle = "#111"
      ctx.fillRect(0, 0, COLS * BLOCK, ROWS * BLOCK)
    }
    const nctx = nextCanvasRef.current?.getContext("2d")
    if (nctx) {
      nctx.fillStyle = "#111"
      nctx.fillRect(0, 0, 100, 100)
    }

    return () => {
      if (gameRef.current?.timer) clearInterval(gameRef.current.timer)
    }
  }, [])

  useEffect(() => {
    function handleKey(e) {
      const g = gameRef.current
      if (!g || g.gameOver || !g.current) return

      if (e.key === "p" || e.key === "P") {
        g.paused = !g.paused
        setMessage(g.paused ? "Paused" : "")
        return
      }
      if (g.paused) return

      switch (e.key) {
        case "ArrowLeft":
          if (!collides(g.current, { x: g.pos.x - 1, y: g.pos.y }, g.board)) {
            g.pos.x--
            draw()
          }
          e.preventDefault()
          break
        case "ArrowRight":
          if (!collides(g.current, { x: g.pos.x + 1, y: g.pos.y }, g.board)) {
            g.pos.x++
            draw()
          }
          e.preventDefault()
          break
        case "ArrowDown":
          drop(g, draw, drawNext)
          g.score += 1
          setScore(g.score)
          e.preventDefault()
          break
        case "ArrowUp": {
          const rotated = rotate(g.current)
          for (const kick of [0, -1, 1, -2, 2]) {
            if (!collides(rotated, { x: g.pos.x + kick, y: g.pos.y }, g.board)) {
              g.current = rotated
              g.pos.x += kick
              draw()
              break
            }
          }
          e.preventDefault()
          break
        }
        case " ":
          while (!collides(g.current, { x: g.pos.x, y: g.pos.y + 1 }, g.board)) {
            g.pos.y++
            g.score += 2
          }
          merge(g.current, g.pos, g.board)
          clearLines(g)
          spawn(g)
          setScore(g.score)
          drawNext()
          draw()
          e.preventDefault()
          break
        default:
          break
      }
    }

    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [draw, drawNext])

  return (
    <Layout>
      <head>
        <title>Tetris</title>
      </head>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "24px",
          flexWrap: "wrap",
          marginTop: "40px",
          fontFamily: "monospace",
        }}
      >
        <div>
          <canvas
            ref={canvasRef}
            width={COLS * BLOCK}
            height={ROWS * BLOCK}
            style={{ border: "2px solid #333", background: "#111" }}
          />
        </div>
        <div style={{ minWidth: "140px" }}>
          <h3 style={{ margin: "0 0 8px" }}>Next</h3>
          <canvas
            ref={nextCanvasRef}
            width={100}
            height={100}
            style={{ border: "2px solid #333", background: "#111" }}
          />
          <div style={{ marginTop: "20px" }}>
            <p style={{ margin: "4px 0" }}>
              <strong>Score:</strong> {score}
            </p>
            <p style={{ margin: "4px 0" }}>
              <strong>Lines:</strong> {lines}
            </p>
            <p style={{ margin: "4px 0" }}>
              <strong>Level:</strong> {level}
            </p>
          </div>
          <div style={{ marginTop: "20px", fontSize: "13px", lineHeight: 1.6 }}>
            <strong>Controls</strong>
            <br />
            &larr; &rarr; &nbsp; Move
            <br />
            &uarr; &nbsp; Rotate
            <br />
            &darr; &nbsp; Soft drop
            <br />
            Space &nbsp; Hard drop
            <br />
            P &nbsp; Pause
          </div>
          <button
            onClick={startGame}
            style={{
              marginTop: "16px",
              padding: "8px 20px",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            {started ? "Restart" : "Start"}
          </button>
          {message && (
            <p style={{ marginTop: "8px", fontWeight: "bold", color: "#c00" }}>
              {message}
            </p>
          )}
        </div>
      </div>
    </Layout>
  )
}
