import React, { useEffect, useRef, useState, useCallback } from "react"
import Layout from "../components/layout"

// Canvas
const CANVAS_W = 640
const CANVAS_H = 480

// Playing field bounds
const WALL = 20
const LEFT = 30
const TOP = 40
const RIGHT = 610
const BOTTOM = 440
const FIELD_W = RIGHT - LEFT
const FIELD_H = BOTTOM - TOP

// Physics
const BALL_R = 12
const POCKET_R = 20
const FRICTION = 0.985
const GRAVITY = 0.15
const RESTITUTION = 0.75
const BALL_RESTITUTION = 0.9
const MAX_SPEED = 15
const SETTLE_SPEED = 0.15
const SETTLE_FRAMES = 40
const PHYSICS_STEPS = 3
const MAX_DRAG = 140
const LAUNCH_SCALE = 0.09
const FLIP_EVERY = 3

// Pockets - 6 positions like a pool table
const POCKETS = [
  { x: LEFT, y: TOP },
  { x: (LEFT + RIGHT) / 2, y: TOP },
  { x: RIGHT, y: TOP },
  { x: LEFT, y: BOTTOM },
  { x: (LEFT + RIGHT) / 2, y: BOTTOM },
  { x: RIGHT, y: BOTTOM },
]

// Terrain blocks - bumpers in flat mode, platforms in edge mode
const TERRAIN = [
  { x: 160, y: 155, w: 90, h: 14 },
  { x: 390, y: 155, w: 90, h: 14 },
  { x: 255, y: 235, w: 130, h: 14 },
  { x: 160, y: 315, w: 90, h: 14 },
  { x: 390, y: 315, w: 90, h: 14 },
]

// --- Physics ---

function clampSpeed(vx, vy) {
  const s = Math.sqrt(vx * vx + vy * vy)
  if (s > MAX_SPEED) {
    const f = MAX_SPEED / s
    return { vx: vx * f, vy: vy * f }
  }
  return { vx, vy }
}

function ballBallCollision(a, b) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const minDist = BALL_R * 2
  if (dist >= minDist || dist < 0.001) return

  const nx = dx / dist
  const ny = dy / dist

  // Separate
  const overlap = (minDist - dist) / 2
  a.x -= nx * overlap
  a.y -= ny * overlap
  b.x += nx * overlap
  b.y += ny * overlap

  // Relative velocity along collision normal
  const dvx = a.vx - b.vx
  const dvy = a.vy - b.vy
  const dvn = dvx * nx + dvy * ny

  if (dvn <= 0) return // moving apart

  const impulse = dvn * (1 + BALL_RESTITUTION) / 2
  a.vx -= impulse * nx
  a.vy -= impulse * ny
  b.vx += impulse * nx
  b.vy += impulse * ny
}

function ballTerrainCollision(ball, rect) {
  // Closest point on rect to ball center
  const cx = Math.max(rect.x, Math.min(rect.x + rect.w, ball.x))
  const cy = Math.max(rect.y, Math.min(rect.y + rect.h, ball.y))
  const dx = ball.x - cx
  const dy = ball.y - cy
  const dist = Math.sqrt(dx * dx + dy * dy)

  if (dist >= BALL_R || dist < 0.001) return

  const nx = dx / dist
  const ny = dy / dist
  ball.x = cx + nx * BALL_R
  ball.y = cy + ny * BALL_R

  const vn = ball.vx * nx + ball.vy * ny
  if (vn < 0) {
    ball.vx -= (1 + RESTITUTION) * vn * nx
    ball.vy -= (1 + RESTITUTION) * vn * ny
  }
}

function ballWallCollision(ball) {
  // Check if near any pocket - skip wall bounce if so
  for (const p of POCKETS) {
    if (Math.hypot(ball.x - p.x, ball.y - p.y) < POCKET_R + BALL_R * 0.5) {
      return // let the pocket handle it
    }
  }

  if (ball.x - BALL_R < LEFT) {
    ball.x = LEFT + BALL_R
    ball.vx = Math.abs(ball.vx) * RESTITUTION
  }
  if (ball.x + BALL_R > RIGHT) {
    ball.x = RIGHT - BALL_R
    ball.vx = -Math.abs(ball.vx) * RESTITUTION
  }
  if (ball.y - BALL_R < TOP) {
    ball.y = TOP + BALL_R
    ball.vy = Math.abs(ball.vy) * RESTITUTION
  }
  if (ball.y + BALL_R > BOTTOM) {
    ball.y = BOTTOM - BALL_R
    ball.vy = -Math.abs(ball.vy) * RESTITUTION
  }
}

function checkPockets(ball) {
  for (const p of POCKETS) {
    if (Math.hypot(ball.x - p.x, ball.y - p.y) < POCKET_R) {
      return true
    }
  }
  return false
}

function updatePhysics(game) {
  const { balls, mode } = game

  for (let step = 0; step < PHYSICS_STEPS; step++) {
    for (const ball of balls) {
      if (!ball.alive) continue

      // Forces
      if (mode === "flat") {
        ball.vx *= FRICTION
        ball.vy *= FRICTION
      } else {
        ball.vy += GRAVITY / PHYSICS_STEPS
        ball.vx *= 0.998
      }

      // Clamp
      const c = clampSpeed(ball.vx, ball.vy)
      ball.vx = c.vx
      ball.vy = c.vy

      // Move
      ball.x += ball.vx / PHYSICS_STEPS
      ball.y += ball.vy / PHYSICS_STEPS

      // Terrain
      for (const t of TERRAIN) {
        ballTerrainCollision(ball, t)
      }

      // Walls
      ballWallCollision(ball)

      // Pockets
      if (checkPockets(ball)) {
        ball.alive = false
        ball.vx = 0
        ball.vy = 0
      }
    }

    // Ball-ball
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        if (!balls[i].alive || !balls[j].alive) continue
        ballBallCollision(balls[i], balls[j])
      }
    }
  }
}

function isSettled(balls) {
  for (const ball of balls) {
    if (!ball.alive) continue
    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy)
    if (speed > SETTLE_SPEED) return false
  }
  return true
}

function stopAll(balls) {
  for (const ball of balls) {
    if (!ball.alive) continue
    ball.vx = 0
    ball.vy = 0
  }
}

// --- Game ---

function createGame() {
  const cy = (TOP + BOTTOM) / 2
  return {
    balls: [
      { x: LEFT + 80, y: cy - 60, vx: 0, vy: 0, team: 0, alive: true },
      { x: LEFT + 80, y: cy, vx: 0, vy: 0, team: 0, alive: true },
      { x: LEFT + 80, y: cy + 60, vx: 0, vy: 0, team: 0, alive: true },
      { x: RIGHT - 80, y: cy - 60, vx: 0, vy: 0, team: 1, alive: true },
      { x: RIGHT - 80, y: cy, vx: 0, vy: 0, team: 1, alive: true },
      { x: RIGHT - 80, y: cy + 60, vx: 0, vy: 0, team: 1, alive: true },
    ],
    mode: "flat",
    phase: "aim", // aim | simulating | enemyThinking | gameover
    turn: 0,
    turnCount: 0,
    selectedBall: -1,
    dragStart: null,
    dragCurrent: null,
    settleCount: 0,
    postSettle: "checkFlip", // checkFlip | startEnemy | startPlayer
    winner: -1,
    pocketedThisTurn: [],
  }
}

function countAlive(balls, team) {
  return balls.filter((b) => b.alive && b.team === team).length
}

// --- AI ---

function aiShoot(game) {
  const myBalls = game.balls.filter((b) => b.alive && b.team === 1)
  const theirBalls = game.balls.filter((b) => b.alive && b.team === 0)
  if (myBalls.length === 0 || theirBalls.length === 0) return

  let bestScore = -Infinity
  let bestShot = null

  for (const mine of myBalls) {
    for (const theirs of theirBalls) {
      // Find nearest pocket to target
      let nearestPocketDist = Infinity
      let nearestPocket = null
      for (const p of POCKETS) {
        const d = Math.hypot(theirs.x - p.x, theirs.y - p.y)
        if (d < nearestPocketDist) {
          nearestPocketDist = d
          nearestPocket = p
        }
      }

      const dist = Math.hypot(mine.x - theirs.x, mine.y - theirs.y)
      // Score: prefer close shots toward pockets
      const score = 1000 / (dist + 50) + 500 / (nearestPocketDist + 50)

      if (score > bestScore) {
        bestScore = score
        // Aim to hit target ball toward pocket
        const toPocketX = nearestPocket.x - theirs.x
        const toPocketY = nearestPocket.y - theirs.y
        const toPocketLen = Math.hypot(toPocketX, toPocketY) || 1

        // We want to hit the target from the opposite side of the pocket
        const hitX = theirs.x - (toPocketX / toPocketLen) * BALL_R * 2
        const hitY = theirs.y - (toPocketY / toPocketLen) * BALL_R * 2

        const aimDx = hitX - mine.x
        const aimDy = hitY - mine.y
        const aimLen = Math.hypot(aimDx, aimDy) || 1
        const power = Math.min(aimLen * 0.02, 1) * MAX_SPEED * 0.7

        bestShot = {
          ball: mine,
          vx: (aimDx / aimLen) * power,
          vy: (aimDy / aimLen) * power,
        }
      }
    }
  }

  if (bestShot) {
    bestShot.ball.vx = bestShot.vx
    bestShot.ball.vy = bestShot.vy
    if (game.mode === "edge") {
      // Add upward component to counteract gravity somewhat
      bestShot.ball.vy -= 2
    }
  }
}

// --- Drawing ---

function drawTableFlat(ctx) {
  // Felt
  ctx.fillStyle = "#1a5c2a"
  ctx.fillRect(LEFT, TOP, FIELD_W, FIELD_H)

  // Rails
  ctx.fillStyle = "#5a3a1a"
  ctx.fillRect(LEFT - WALL, TOP - WALL, FIELD_W + WALL * 2, WALL) // top
  ctx.fillRect(LEFT - WALL, BOTTOM, FIELD_W + WALL * 2, WALL) // bottom
  ctx.fillRect(LEFT - WALL, TOP, WALL, FIELD_H) // left
  ctx.fillRect(RIGHT, TOP, WALL, FIELD_H) // right

  // Rail inner edge
  ctx.strokeStyle = "#3a2a0a"
  ctx.lineWidth = 2
  ctx.strokeRect(LEFT, TOP, FIELD_W, FIELD_H)

  // Terrain bumpers
  for (const t of TERRAIN) {
    ctx.fillStyle = "#2a7a3a"
    ctx.fillRect(t.x, t.y, t.w, t.h)
    ctx.strokeStyle = "#1a6a2a"
    ctx.lineWidth = 1
    ctx.strokeRect(t.x, t.y, t.w, t.h)
    // Highlight
    ctx.fillStyle = "rgba(255,255,255,0.1)"
    ctx.fillRect(t.x, t.y, t.w, 3)
  }

  // Pockets
  for (const p of POCKETS) {
    ctx.beginPath()
    ctx.arc(p.x, p.y, POCKET_R, 0, Math.PI * 2)
    ctx.fillStyle = "#111"
    ctx.fill()
    ctx.strokeStyle = "#0a0a0a"
    ctx.lineWidth = 2
    ctx.stroke()
  }
}

function drawTableEdge(ctx) {
  // Sky
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
  grad.addColorStop(0, "#2a3a6a")
  grad.addColorStop(1, "#6a9aca")
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  // Walls
  ctx.fillStyle = "#5a4a3a"
  ctx.fillRect(LEFT - WALL, TOP - WALL, WALL, FIELD_H + WALL * 2) // left
  ctx.fillRect(RIGHT, TOP - WALL, WALL, FIELD_H + WALL * 2) // right
  ctx.fillRect(LEFT, TOP - WALL, FIELD_W, WALL) // top
  ctx.fillRect(LEFT, BOTTOM, FIELD_W, WALL) // bottom

  // Field bg (transparent-ish)
  ctx.fillStyle = "rgba(100, 160, 200, 0.15)"
  ctx.fillRect(LEFT, TOP, FIELD_W, FIELD_H)

  // Terrain platforms
  for (const t of TERRAIN) {
    ctx.fillStyle = "#6a5a4a"
    ctx.fillRect(t.x, t.y, t.w, t.h)
    ctx.fillStyle = "#8a7a6a"
    ctx.fillRect(t.x, t.y, t.w, 3)
    ctx.strokeStyle = "rgba(0,0,0,0.3)"
    ctx.lineWidth = 1
    ctx.strokeRect(t.x, t.y, t.w, t.h)
  }

  // Pockets
  for (const p of POCKETS) {
    ctx.beginPath()
    ctx.arc(p.x, p.y, POCKET_R, 0, Math.PI * 2)
    ctx.fillStyle = "rgba(0,0,0,0.7)"
    ctx.fill()
    ctx.strokeStyle = "#333"
    ctx.lineWidth = 2
    ctx.stroke()
  }
}

function drawBall(ctx, ball) {
  if (!ball.alive) return
  const baseColor = ball.team === 0 ? "#3377ee" : "#ee3333"
  const lightColor = ball.team === 0 ? "#66aaff" : "#ff6666"

  // Shadow
  ctx.beginPath()
  ctx.ellipse(ball.x + 2, ball.y + 3, BALL_R * 0.9, BALL_R * 0.4, 0, 0, Math.PI * 2)
  ctx.fillStyle = "rgba(0,0,0,0.2)"
  ctx.fill()

  // Ball
  ctx.beginPath()
  ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2)
  const grad = ctx.createRadialGradient(
    ball.x - 3, ball.y - 3, 2,
    ball.x, ball.y, BALL_R
  )
  grad.addColorStop(0, lightColor)
  grad.addColorStop(1, baseColor)
  ctx.fillStyle = grad
  ctx.fill()
  ctx.strokeStyle = "rgba(0,0,0,0.3)"
  ctx.lineWidth = 1.5
  ctx.stroke()
}

function drawAim(ctx, ball, dragX, dragY) {
  const dx = ball.x - dragX
  const dy = ball.y - dragY
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist < 5) return

  // Rubber band
  ctx.beginPath()
  ctx.moveTo(dragX, dragY)
  ctx.lineTo(ball.x, ball.y)
  ctx.strokeStyle = "rgba(255,255,255,0.4)"
  ctx.lineWidth = 2
  ctx.setLineDash([6, 4])
  ctx.stroke()
  ctx.setLineDash([])

  // Launch arrow
  const power = Math.min(dist, MAX_DRAG)
  const nx = dx / dist
  const ny = dy / dist
  const arrowLen = power * 0.4
  const endX = ball.x + nx * arrowLen
  const endY = ball.y + ny * arrowLen

  ctx.beginPath()
  ctx.moveTo(ball.x, ball.y)
  ctx.lineTo(endX, endY)
  ctx.strokeStyle = "rgba(255,255,0,0.7)"
  ctx.lineWidth = 3
  ctx.stroke()

  // Arrowhead
  const angle = Math.atan2(ny, nx)
  ctx.beginPath()
  ctx.moveTo(endX, endY)
  ctx.lineTo(
    endX - 10 * Math.cos(angle - 0.4),
    endY - 10 * Math.sin(angle - 0.4)
  )
  ctx.lineTo(
    endX - 10 * Math.cos(angle + 0.4),
    endY - 10 * Math.sin(angle + 0.4)
  )
  ctx.closePath()
  ctx.fillStyle = "rgba(255,255,0,0.7)"
  ctx.fill()

  // Power indicator
  const pct = Math.round((power / MAX_DRAG) * 100)
  ctx.font = "bold 12px sans-serif"
  ctx.textAlign = "center"
  ctx.fillStyle = "rgba(255,255,255,0.7)"
  ctx.fillText(`${pct}%`, ball.x, ball.y - BALL_R - 8)
}

function drawHUD(ctx, game) {
  // Mode label
  const modeLabel = game.mode === "flat" ? "POOL TABLE" : "PINBALL"
  const modeColor = game.mode === "flat" ? "#6fBf6f" : "#6fAfCf"
  ctx.fillStyle = "rgba(0,0,0,0.5)"
  ctx.fillRect(8, 6, 100, 24)
  ctx.font = "bold 13px sans-serif"
  ctx.textAlign = "left"
  ctx.textBaseline = "top"
  ctx.fillStyle = modeColor
  ctx.fillText(modeLabel, 14, 11)

  // Turn label
  const turnLabel =
    game.phase === "gameover"
      ? "GAME OVER"
      : game.turn === 0
      ? "YOUR TURN"
      : "ENEMY TURN"
  const turnColor =
    game.phase === "gameover"
      ? "#ffcc00"
      : game.turn === 0
      ? "#88bbff"
      : "#ff8888"
  ctx.fillStyle = "rgba(0,0,0,0.5)"
  ctx.fillRect(CANVAS_W - 108, 6, 100, 24)
  ctx.textAlign = "right"
  ctx.fillStyle = turnColor
  ctx.fillText(turnLabel, CANVAS_W - 14, 11)

  // Ball counts
  const p = countAlive(game.balls, 0)
  const e = countAlive(game.balls, 1)
  ctx.textAlign = "center"
  ctx.fillStyle = "rgba(0,0,0,0.5)"
  ctx.fillRect(CANVAS_W / 2 - 60, 6, 120, 24)
  ctx.fillStyle = "#88bbff"
  ctx.textAlign = "left"
  ctx.fillText(`You: ${p}`, CANVAS_W / 2 - 52, 11)
  ctx.fillStyle = "#ff8888"
  ctx.textAlign = "right"
  ctx.fillText(`Foe: ${e}`, CANVAS_W / 2 + 52, 11)

  // Flip countdown
  const turnsUntilFlip = FLIP_EVERY - (game.turnCount % FLIP_EVERY)
  ctx.textAlign = "center"
  ctx.fillStyle = "rgba(0,0,0,0.5)"
  ctx.fillRect(CANVAS_W / 2 - 40, CANVAS_H - 24, 80, 20)
  ctx.fillStyle = "#aaa"
  ctx.font = "11px sans-serif"
  ctx.fillText(`Flip in ${turnsUntilFlip}`, CANVAS_W / 2, CANVAS_H - 17)
}

function drawMessage(ctx, text) {
  ctx.font = "bold 32px sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  const tw = ctx.measureText(text).width
  ctx.fillStyle = "rgba(0,0,0,0.6)"
  ctx.fillRect(CANVAS_W / 2 - tw / 2 - 20, CANVAS_H / 2 - 24, tw + 40, 48)
  ctx.fillStyle = "#fff"
  ctx.fillText(text, CANVAS_W / 2, CANVAS_H / 2)
}

// --- Component ---

export default function FlipBoard() {
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const rafRef = useRef(null)
  const [started, setStarted] = useState(false)
  const [statusText, setStatusText] = useState("")

  const getMousePos = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = CANVAS_W / rect.width
    const scaleY = CANVAS_H / rect.height
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    }
  }, [])

  const findBallAt = useCallback((sx, sy, game) => {
    for (let i = 0; i < game.balls.length; i++) {
      const b = game.balls[i]
      if (!b.alive) continue
      if (Math.hypot(sx - b.x, sy - b.y) < BALL_R + 8) return i
    }
    return -1
  }, [])

  const handleMouseDown = useCallback(
    (e) => {
      e.preventDefault()
      const game = gameRef.current
      if (!game || game.phase !== "aim" || game.turn !== 0) return
      const pos = getMousePos(e)
      const idx = findBallAt(pos.x, pos.y, game)
      if (idx >= 0 && game.balls[idx].team === 0 && game.balls[idx].alive) {
        game.selectedBall = idx
        game.dragStart = pos
        game.dragCurrent = pos
      }
    },
    [getMousePos, findBallAt]
  )

  const handleMouseMove = useCallback(
    (e) => {
      e.preventDefault()
      const game = gameRef.current
      if (!game || game.selectedBall < 0) return
      game.dragCurrent = getMousePos(e)
    },
    [getMousePos]
  )

  const handleMouseUp = useCallback(
    (e) => {
      e.preventDefault()
      const game = gameRef.current
      if (!game || game.selectedBall < 0) return

      const pos = e.type === "touchend" ? game.dragCurrent : getMousePos(e)
      const ball = game.balls[game.selectedBall]
      const dx = ball.x - pos.x
      const dy = ball.y - pos.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < 15) {
        // Too short, cancel
        game.selectedBall = -1
        game.dragStart = null
        game.dragCurrent = null
        return
      }

      const power = Math.min(dist, MAX_DRAG) * LAUNCH_SCALE
      ball.vx = (dx / dist) * power * MAX_SPEED
      ball.vy = (dy / dist) * power * MAX_SPEED

      game.phase = "simulating"
      game.postSettle = "checkFlip"
      game.settleCount = 0
      game.selectedBall = -1
      game.dragStart = null
      game.dragCurrent = null
      setStatusText("Balls in motion...")
    },
    [getMousePos]
  )

  const startGame = useCallback(() => {
    gameRef.current = createGame()
    setStarted(true)
    setStatusText("Click one of your blue balls and drag to aim!")
  }, [])

  // Game loop
  useEffect(() => {
    if (!started) return
    const canvas = canvasRef.current
    if (!canvas) return

    function gameLoop() {
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      const game = gameRef.current
      if (!game) return

      // --- Update ---
      if (game.phase === "simulating") {
        updatePhysics(game)

        if (isSettled(game.balls)) {
          game.settleCount++
        } else {
          game.settleCount = 0
        }

        if (game.settleCount >= SETTLE_FRAMES) {
          stopAll(game.balls)
          game.settleCount = 0

          // Check win/lose
          const p = countAlive(game.balls, 0)
          const e = countAlive(game.balls, 1)
          if (p === 0) {
            game.phase = "gameover"
            game.winner = 1
            setStatusText("Defeat! All your balls were pocketed.")
          } else if (e === 0) {
            game.phase = "gameover"
            game.winner = 0
            setStatusText("Victory! All enemy balls pocketed!")
          } else if (game.postSettle === "checkFlip") {
            game.turnCount++
            if (game.turnCount % FLIP_EVERY === 0) {
              game.mode = game.mode === "flat" ? "edge" : "flat"
              game.postSettle = "startEnemy"
              game.settleCount = 0
              // Let physics settle in new mode
              setStatusText(
                game.mode === "flat"
                  ? "Board flipped to POOL TABLE!"
                  : "Board flipped to PINBALL!"
              )
            } else {
              game.phase = "enemyThinking"
              game._enemyDelay = 0
              setStatusText("Enemy is thinking...")
            }
          } else if (game.postSettle === "startEnemy") {
            game.phase = "enemyThinking"
            game._enemyDelay = 0
            setStatusText("Enemy is thinking...")
          } else if (game.postSettle === "startPlayer") {
            game.turn = 0
            game.phase = "aim"
            setStatusText("Your turn! Click a blue ball and drag to aim.")
          }
        }
      }

      if (game.phase === "enemyThinking") {
        game._enemyDelay = (game._enemyDelay || 0) + 1
        if (game._enemyDelay >= 40) {
          game.turn = 1
          aiShoot(game)
          game.phase = "simulating"
          game.postSettle = "startPlayer"
          game.settleCount = 0
          setStatusText("Enemy shoots!")
        }
      }

      // --- Draw ---
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

      if (game.mode === "flat") {
        drawTableFlat(ctx)
      } else {
        drawTableEdge(ctx)
      }

      // Balls
      for (const ball of game.balls) {
        drawBall(ctx, ball)
      }

      // Aim indicator
      if (
        game.selectedBall >= 0 &&
        game.dragCurrent &&
        game.balls[game.selectedBall].alive
      ) {
        const ball = game.balls[game.selectedBall]
        drawAim(ctx, ball, game.dragCurrent.x, game.dragCurrent.y)

        // Highlight selected ball
        ctx.beginPath()
        ctx.arc(ball.x, ball.y, BALL_R + 4, 0, Math.PI * 2)
        ctx.strokeStyle = "rgba(255,255,0,0.6)"
        ctx.lineWidth = 2
        ctx.stroke()
      }

      drawHUD(ctx, game)

      // Game over overlay
      if (game.phase === "gameover") {
        drawMessage(ctx, game.winner === 0 ? "VICTORY!" : "DEFEAT!")
      }

      rafRef.current = requestAnimationFrame(gameLoop)
    }

    rafRef.current = requestAnimationFrame(gameLoop)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [started])

  // Event listeners
  useEffect(() => {
    if (!started) return
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.addEventListener("mousedown", handleMouseDown)
    canvas.addEventListener("mousemove", handleMouseMove)
    canvas.addEventListener("mouseup", handleMouseUp)
    canvas.addEventListener("touchstart", handleMouseDown, { passive: false })
    canvas.addEventListener("touchmove", handleMouseMove, { passive: false })
    canvas.addEventListener("touchend", handleMouseUp, { passive: false })

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown)
      canvas.removeEventListener("mousemove", handleMouseMove)
      canvas.removeEventListener("mouseup", handleMouseUp)
      canvas.removeEventListener("touchstart", handleMouseDown)
      canvas.removeEventListener("touchmove", handleMouseMove)
      canvas.removeEventListener("touchend", handleMouseUp)
    }
  }, [started, handleMouseDown, handleMouseMove, handleMouseUp])

  return (
    <Layout>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "16px",
          fontFamily: "sans-serif",
          background: "#1a1a2e",
          minHeight: "100vh",
          color: "#ccc",
        }}
      >
        <h1
          style={{
            margin: "0 0 8px",
            fontSize: "24px",
            color: "#eee",
            letterSpacing: "2px",
          }}
        >
          FLIPBOARD
        </h1>
        {!started ? (
          <div style={{ textAlign: "center", marginTop: "40px" }}>
            <p
              style={{
                maxWidth: "500px",
                lineHeight: "1.6",
                marginBottom: "24px",
              }}
            >
              A turn-based game where the board flips between{" "}
              <strong style={{ color: "#6fBf6f" }}>pool table</strong> mode
              and <strong style={{ color: "#6fAfCf" }}>pinball</strong> mode.
              Knock your opponent's balls into the pockets to win!
            </p>
            <p
              style={{
                maxWidth: "500px",
                lineHeight: "1.6",
                marginBottom: "24px",
              }}
            >
              Click one of your{" "}
              <strong style={{ color: "#3377ee" }}>blue</strong> balls, drag
              backwards like a slingshot, and release to launch. Be careful
              not to pocket your own!
            </p>
            <button
              onClick={startGame}
              style={{
                padding: "12px 32px",
                fontSize: "18px",
                background: "#3377ee",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              Start Game
            </button>
          </div>
        ) : (
          <>
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              style={{
                border: "2px solid #333",
                borderRadius: "4px",
                maxWidth: "100%",
                cursor:
                  gameRef.current?.selectedBall >= 0 ? "grabbing" : "pointer",
                touchAction: "none",
              }}
            />
            <div
              style={{
                marginTop: "8px",
                fontSize: "14px",
                color: "#999",
                textAlign: "center",
                maxWidth: "500px",
              }}
            >
              {statusText}
            </div>
            {gameRef.current?.phase === "gameover" && (
              <button
                onClick={startGame}
                style={{
                  marginTop: "16px",
                  padding: "10px 24px",
                  fontSize: "16px",
                  background: "#3377ee",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Play Again
              </button>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
