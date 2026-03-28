import React, { useEffect, useRef, useCallback, useState } from "react"

const GRAVITY = 0.1
const BALL_RADIUS = 30
const LAUNCH_SPEED = 10
const HIT_RADIUS = 150
const BOUNCE_DAMPING = 0.6
const FLOOR_PADDING = 60
const TRAIL_LENGTH = 12
const CLICK_COOLDOWN = 500 // ms
const MIN_COOLDOWN = 200 // ms

const COLORS = [
  { light: "#ff6666", dark: "#cc0000" }, // Red
  { light: "#ffa566", dark: "#cc6600" }, // Orange
  { light: "#ffff66", dark: "#cccc00" }, // Yellow
  { light: "#66ff66", dark: "#00cc00" }, // Green
  { light: "#66aaff", dark: "#0055cc" }, // Blue
  { light: "#aa66ff", dark: "#5500cc" }, // Indigo
  { light: "#ee66ff", dark: "#aa00cc" }, // Violet
]

// Audio context initialized on first interaction
let audioCtx = null
let muted = false
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  return audioCtx
}

function playClick() {
  if (muted) return
  const ctx = getAudioCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.frequency.setValueAtTime(800, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.08)
  gain.gain.setValueAtTime(0.15, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.1)
}

function playPat() {
  if (muted) return
  const ctx = getAudioCtx()
  const bufferSize = ctx.sampleRate * 0.06
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
  }
  const source = ctx.createBufferSource()
  source.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = "bandpass"
  filter.frequency.setValueAtTime(2000, ctx.currentTime)
  filter.Q.setValueAtTime(1, ctx.currentTime)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.15, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06)
  source.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)
  source.start(ctx.currentTime)
}

function playWhiff() {
  if (muted) return
  const ctx = getAudioCtx()
  const duration = 0.35
  const bufferSize = ctx.sampleRate * duration
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    const t = i / bufferSize
    // Fade in then fade out for a swooshy envelope
    const env = Math.sin(t * Math.PI)
    data[i] = (Math.random() * 2 - 1) * env
  }
  const source = ctx.createBufferSource()
  source.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = "bandpass"
  filter.frequency.setValueAtTime(800, ctx.currentTime)
  filter.frequency.exponentialRampToValueAtTime(2500, ctx.currentTime + duration * 0.4)
  filter.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + duration)
  filter.Q.setValueAtTime(0.5, ctx.currentTime)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.08, ctx.currentTime)
  gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + duration)
  source.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)
  source.start(ctx.currentTime)
}

function playError() {
  if (muted) return
  const ctx = getAudioCtx()
  const t = ctx.currentTime
  // Two short descending tones: "uh-uh"
  for (let i = 0; i < 2; i++) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = "square"
    const start = t + i * 0.12
    osc.frequency.setValueAtTime(300, start)
    osc.frequency.exponentialRampToValueAtTime(200, start + 0.08)
    gain.gain.setValueAtTime(0, t)
    gain.gain.setValueAtTime(0.08, start)
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.09)
    osc.start(start)
    osc.stop(start + 0.1)
  }
}

function createBall(x, y, colorIndex) {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    radius: BALL_RADIUS,
    color: colorIndex,
    trail: [],
    lastClickTime: 0,
    cooldownDuration: CLICK_COOLDOWN,
    verticalBounces: 0,
    clicksSinceCeiling: 0,
  }
}

function pointInTrail(mx, my, ball) {
  const trail = ball.trail
  if (trail.length < 2) return false
  for (let i = 0; i < trail.length - 1; i++) {
    const t = i / trail.length
    const width = ball.radius * (1 - t)
    const ax = trail[i].x, ay = trail[i].y
    const bx = trail[i + 1].x, by = trail[i + 1].y
    const dx = bx - ax, dy = by - ay
    const len = Math.hypot(dx, dy)
    if (len < 0.1) continue
    const param = Math.max(0, Math.min(1, ((mx - ax) * dx + (my - ay) * dy) / (len * len)))
    const px = ax + param * dx, py = ay + param * dy
    if (Math.hypot(mx - px, my - py) < width) return true
  }
  return false
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return { r, g, b }
}

function lerpColor(hex, factor) {
  // factor 0 = fully darkened, 1 = original color
  // Darkened version is 30% brightness of original
  const { r, g, b } = hexToRgb(hex)
  const minBright = 0.3
  const bright = minBright + (1 - minBright) * factor
  return `rgb(${Math.round(r * bright)},${Math.round(g * bright)},${Math.round(b * bright)})`
}

function ballColorFactor(ball, now) {
  const elapsed = now - ball.lastClickTime
  if (elapsed >= ball.cooldownDuration) return 1
  // During cooldown: lerp from 0 to 0.5, then snap to 1
  const t = elapsed / ball.cooldownDuration
  return t * 0.5
}

export default function Juggling() {
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const rafRef = useRef(null)
  const sizeRef = useRef({ w: 800, h: 600 })
  const [ballCount, setBallCount] = useState(1)
  const ballCountRef = useRef(1)
  const scoreRef = useRef({ current: 0, high: 0 })
  const [displayScore, setDisplayScore] = useState(0)
  const [displayHigh, setDisplayHigh] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [shareStatus, setShareStatus] = useState("")
  const firstClickRef = useRef(0) // timestamp of first successful click
  const highScoreBallsRef = useRef([0]) // ball colors when high score was set

  const updateScoreDisplay = useCallback(() => {
    const s = scoreRef.current
    const multiplied = s.current * ballCountRef.current
    setDisplayScore(multiplied)
    if (multiplied > s.high) {
      s.high = multiplied
      setDisplayHigh(multiplied)
      if (gameRef.current) {
        highScoreBallsRef.current = gameRef.current.balls.map(b => b.color)
      }
    }
  }, [])

  const resetScore = useCallback(() => {
    scoreRef.current.current = 0
    setDisplayScore(0)
  }, [])

  const addScore = useCallback((pts) => {
    scoreRef.current.current += pts
    updateScoreDisplay()
  }, [updateScoreDisplay])

  const resize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const w = window.innerWidth
    const h = window.innerHeight
    canvas.width = w
    canvas.height = h
    sizeRef.current = { w, h }
  }, [])

  const initBalls = useCallback((count) => {
    const { w, h } = sizeRef.current
    const spacing = w / (count + 1)
    const indices = [0, 1, 2, 3, 4, 5, 6]
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[indices[i], indices[j]] = [indices[j], indices[i]]
    }
    const balls = []
    for (let i = 0; i < count; i++) {
      balls.push(createBall(spacing * (i + 1), h * 0.4, indices[i]))
    }
    return balls
  }, [])

  const initGame = useCallback(() => {
    gameRef.current = {
      balls: initBalls(ballCountRef.current),
    }
  }, [initBalls])

  const handleCountChange = useCallback((newCount) => {
    setBallCount(newCount)
    ballCountRef.current = newCount
    resetScore()
    if (gameRef.current) {
      gameRef.current.balls = initBalls(newCount)
    }
  }, [initBalls, resetScore])

  const handleClick = useCallback((e) => {
    const g = gameRef.current
    if (!g) return

    const now = performance.now()
    const rect = canvasRef.current.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    let closest = null
    let closestDist = Infinity
    let directHit = false
    let cooldownHit = false
    for (const ball of g.balls) {
      const onCooldown = now - ball.lastClickTime < ball.cooldownDuration
      const dist = Math.hypot(ball.x - mx, ball.y - my)
      const onBall = dist < ball.radius
      const onTrail = !onBall && pointInTrail(mx, my, ball)
      const inRange = onBall || onTrail || dist < HIT_RADIUS

      if (onCooldown) {
        if (inRange) cooldownHit = true
        continue
      }

      if (onBall || onTrail) {
        if (dist < closestDist) {
          closest = ball
          closestDist = dist
          directHit = true
        }
      } else if (!directHit && dist < closestDist) {
        closest = ball
        closestDist = dist
      }
    }

    if (!closest || (!directHit && closestDist >= HIT_RADIUS)) {
      if (cooldownHit) {
        playError()
      } else if (!closest) {
        playWhiff()
      } else {
        playWhiff()
      }
      return
    }

    if (!firstClickRef.current) firstClickRef.current = now

    if (directHit) {
      closest.vx = 0
      closest.vy = -LAUNCH_SPEED
      closest.lastClickTime = now
      closest.cooldownDuration = CLICK_COOLDOWN
      closest.clicksSinceCeiling++
      if (closest.clicksSinceCeiling >= 3) closest.verticalBounces = 0
      addScore(2)
      playClick()
    } else if (closestDist < HIT_RADIUS) {
      const strengthRatio = 1 - (closestDist - closest.radius) / (HIT_RADIUS - closest.radius)
      const strength = LAUNCH_SPEED * strengthRatio
      const dx = closest.x - mx
      const dy = closest.y - my
      const nx = dx / closestDist
      const ny = dy / closestDist
      closest.vx = nx * strength
      closest.vy = ny * strength
      closest.lastClickTime = now
      closest.cooldownDuration = MIN_COOLDOWN + (CLICK_COOLDOWN - MIN_COOLDOWN) * strengthRatio
      closest.clicksSinceCeiling++
      if (closest.clicksSinceCeiling >= 3) closest.verticalBounces = 0
      addScore(1)
      playPat()
    }
  }, [addScore])

  const update = useCallback(() => {
    const g = gameRef.current
    if (!g) return

    const { w, h } = sizeRef.current

    for (const ball of g.balls) {
      const floor = h - FLOOR_PADDING - ball.radius

      const speed = Math.hypot(ball.vx, ball.vy)
      if (speed > 0.5) {
        ball.trail.unshift({ x: ball.x, y: ball.y })
        if (ball.trail.length > TRAIL_LENGTH) ball.trail.length = TRAIL_LENGTH
      } else {
        if (ball.trail.length > 0) ball.trail.pop()
      }

      ball.vy += GRAVITY
      ball.x += ball.vx
      ball.y += ball.vy

      if (ball.y > floor) {
        ball.y = floor
        ball.vy = -ball.vy * BOUNCE_DAMPING
        ball.vx *= 0.95
        if (Math.abs(ball.vy) < 1) ball.vy = 0
        ball.verticalBounces = 0
        resetScore()
      }

      if (ball.y < ball.radius) {
        ball.y = ball.radius
        if (ball.vx === 0) {
          // Exactly vertical bounce
          ball.verticalBounces++
          ball.clicksSinceCeiling = 0
          const extra = Math.max(0, ball.verticalBounces - 3)
          const maxDeg = Math.min(70, extra * 10)
          if (maxDeg > 0) {
            const speed = Math.abs(ball.vy) * BOUNCE_DAMPING
            const deflection = (Math.random() * 2 - 1) * maxDeg * Math.PI / 180
            ball.vx = Math.sin(deflection) * speed
            ball.vy = Math.cos(deflection) * speed
          } else {
            ball.vy = Math.abs(ball.vy) * BOUNCE_DAMPING
          }
        } else {
          ball.verticalBounces = 0
          ball.vy = Math.abs(ball.vy) * BOUNCE_DAMPING
        }
        addScore(1)
      }

      if (ball.x < ball.radius) {
        ball.x = ball.radius
        ball.vx = Math.abs(ball.vx) * BOUNCE_DAMPING
        ball.verticalBounces = 0
        addScore(3)
      }
      if (ball.x > w - ball.radius) {
        ball.x = w - ball.radius
        ball.vx = -Math.abs(ball.vx) * BOUNCE_DAMPING
        ball.verticalBounces = 0
        addScore(3)
      }
    }
  }, [resetScore, addScore])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const g = gameRef.current
    if (!canvas || !g) return
    const ctx = canvas.getContext("2d")
    const { w, h } = sizeRef.current
    const now = performance.now()

    ctx.fillStyle = "#111"
    ctx.fillRect(0, 0, w, h)

    // Floor
    const floorY = h - FLOOR_PADDING
    ctx.fillStyle = "#1a1a1a"
    ctx.fillRect(0, floorY, w, FLOOR_PADDING)
    ctx.strokeStyle = "#333"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, floorY)
    ctx.lineTo(w, floorY)
    ctx.stroke()

    for (const ball of g.balls) {
      const c = COLORS[ball.color]
      const floor = h - FLOOR_PADDING - ball.radius
      const cf = ballColorFactor(ball, now)

      // Trail
      if (ball.trail.length > 1) {
        for (let i = 0; i < ball.trail.length - 1; i++) {
          const t0 = i / ball.trail.length
          const t1 = (i + 1) / ball.trail.length
          const w0 = ball.radius * (1 - t0)
          const w1 = ball.radius * (1 - t1)
          const p0 = ball.trail[i]
          const p1 = ball.trail[i + 1]
          const dx = p1.x - p0.x
          const dy = p1.y - p0.y
          const len = Math.hypot(dx, dy)
          if (len < 0.1) continue
          const nx = -dy / len
          const ny = dx / len

          const alpha = 0.35 * (1 - t0)
          const { r, g: gr, b } = hexToRgb(c.dark)
          const minB = 0.3
          const bright = minB + (1 - minB) * cf
          ctx.fillStyle = `rgba(${Math.round(r * bright)},${Math.round(gr * bright)},${Math.round(b * bright)},${alpha})`
          ctx.beginPath()
          ctx.moveTo(p0.x + nx * w0, p0.y + ny * w0)
          ctx.lineTo(p1.x + nx * w1, p1.y + ny * w1)
          ctx.lineTo(p1.x - nx * w1, p1.y - ny * w1)
          ctx.lineTo(p0.x - nx * w0, p0.y - ny * w0)
          ctx.closePath()
          ctx.fill()
        }
      }

      // Shadow
      const shadowScale = Math.max(0.2, 1 - (floor - ball.y) / h)
      ctx.fillStyle = `rgba(255,255,255,${0.08 * shadowScale})`
      ctx.beginPath()
      ctx.ellipse(ball.x, floor + ball.radius, ball.radius * shadowScale, ball.radius * 0.3 * shadowScale, 0, 0, Math.PI * 2)
      ctx.fill()

      // Ball
      const gradient = ctx.createRadialGradient(
        ball.x - ball.radius * 0.3, ball.y - ball.radius * 0.3, ball.radius * 0.1,
        ball.x, ball.y, ball.radius
      )
      gradient.addColorStop(0, lerpColor(c.light, cf))
      gradient.addColorStop(1, lerpColor(c.dark, cf))
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2)
      ctx.fill()

      // Highlight
      ctx.fillStyle = `rgba(255,255,255,${0.3 * cf})`
      ctx.beginPath()
      ctx.arc(ball.x - ball.radius * 0.25, ball.y - ball.radius * 0.25, ball.radius * 0.35, 0, Math.PI * 2)
      ctx.fill()
    }

    // Help text
    const FADE_DURATION = 1500
    const fc = firstClickRef.current
    let alpha = 0.35
    if (fc) {
      const elapsed = now - fc
      if (elapsed > FADE_DURATION) alpha = 0
      else alpha = 0.35 * (1 - elapsed / FADE_DURATION)
    }
    if (alpha > 0) {
      ctx.textAlign = "center"
      ctx.fillStyle = `rgba(255,255,255,${alpha})`
      const lines = [
        "Click on a ball to pop it straight up.",
        "Click near a ball to push it away.",
        "Don't let any ball hit the ground!",
        "",
        "Direct hit: 2 pts \u00b7 Near hit: 1 pt \u00b7 Ceiling: 1 pt \u00b7 Wall: 3 pts",
        "Score is multiplied by the number of balls.",
      ]
      const fontSize = Math.max(14, Math.min(20, w / 50))
      ctx.font = `${fontSize}px monospace`
      const startY = h * 0.55
      const lineHeight = fontSize * 1.6
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], w / 2, startY + i * lineHeight)
      }
    }
  }, [])

  // Game loop
  useEffect(() => {
    resize()
    initGame()

    function loop() {
      update()
      draw()
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    window.addEventListener("resize", resize)
    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener("resize", resize)
    }
  }, [resize, initGame, update, draw])

  return (
    <>
      <head>
        <title>Juggling</title>
      </head>
      <canvas
        ref={canvasRef}
        onMouseDown={handleClick}
        style={{
          display: "block",
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          cursor: "pointer",
          background: "#111",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: 16,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          gap: 24,
          zIndex: 10,
          fontFamily: "monospace",
          color: "#fff",
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          {[1, 2, 3, 4, 5, 6, 7].map(n => (
            <button
              key={n}
              onMouseDown={(e) => { e.stopPropagation(); handleCountChange(n) }}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                border: n === ballCount ? "2px solid #fff" : "2px solid #555",
                background: n === ballCount ? "#444" : "#222",
                color: "#fff",
                fontSize: 16,
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 18 }}>
          <span style={{ color: "#aaa" }}>Score: </span>
          <span style={{ fontWeight: "bold" }}>{displayScore}</span>
          <span style={{ color: "#555", marginLeft: 16 }}>Best: </span>
          <span style={{ color: "#888" }}>{displayHigh}</span>
          <button
            onMouseDown={(e) => {
              e.stopPropagation()
              const g = gameRef.current
              if (!g || !displayHigh) return

              const ballColors = highScoreBallsRef.current
              const pad = 16
              const ballR = 14
              const ballSpacing = 34
              const imgW = 320
              const imgH = 100

              const offscreen = document.createElement("canvas")
              offscreen.width = imgW
              offscreen.height = imgH
              const octx = offscreen.getContext("2d")

              // Background
              octx.fillStyle = "#111"
              octx.fillRect(0, 0, imgW, imgH)
              octx.strokeStyle = "#333"
              octx.lineWidth = 2
              octx.strokeRect(0, 0, imgW, imgH)

              // Title
              octx.fillStyle = "#aaa"
              octx.font = "bold 14px monospace"
              octx.textAlign = "left"
              octx.fillText("Juggling", pad, 24)

              // Balls
              const ballsStartX = pad + ballR
              const ballsY = 50
              for (let i = 0; i < ballColors.length; i++) {
                const c = COLORS[ballColors[i]]
                const bx = ballsStartX + i * ballSpacing
                const grad = octx.createRadialGradient(bx - 4, ballsY - 4, 2, bx, ballsY, ballR)
                grad.addColorStop(0, c.light)
                grad.addColorStop(1, c.dark)
                octx.fillStyle = grad
                octx.beginPath()
                octx.arc(bx, ballsY, ballR, 0, Math.PI * 2)
                octx.fill()
              }

              // Score
              octx.textAlign = "right"
              octx.fillStyle = "#aaa"
              octx.font = "13px monospace"
              octx.fillText("Best:", imgW - pad, 20)
              octx.fillStyle = "#fff"
              octx.font = "bold 24px monospace"
              octx.fillText(String(displayHigh), imgW - pad, 50)

              // URL
              octx.textAlign = "center"
              octx.fillStyle = "#555"
              octx.font = "11px monospace"
              octx.fillText("adam-imeson.github.io/juggling", imgW / 2, imgH - 10)

              offscreen.toBlob((blob) => {
                if (!blob) return
                navigator.clipboard.write([
                  new ClipboardItem({ "image/png": blob })
                ]).then(() => {
                  setShareStatus("Copied!")
                  setTimeout(() => setShareStatus(""), 2000)
                }).catch(() => {
                  setShareStatus("Failed")
                  setTimeout(() => setShareStatus(""), 2000)
                })
              }, "image/png")
            }}
            style={{
              marginLeft: 16,
              padding: "4px 12px",
              background: "#222",
              border: "2px solid #555",
              borderRadius: 6,
              color: "#aaa",
              fontSize: 13,
              fontFamily: "monospace",
              cursor: "pointer",
            }}
          >
            {shareStatus || "Share"}
          </button>
        </div>
      </div>
      <button
        onMouseDown={(e) => {
          e.stopPropagation()
          const next = !isMuted
          muted = next
          setIsMuted(next)
        }}
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 10,
          width: 36,
          height: 36,
          borderRadius: "50%",
          border: "2px solid #555",
          background: "#222",
          color: "#fff",
          fontSize: 18,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? "\u2022" : "\u266A"}
      </button>
    </>
  )
}
