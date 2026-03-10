import React, { useEffect, useRef, useState, useCallback } from "react"
import Layout from "../components/layout"

const W = 600
const H = 480
const SHIP_SIZE = 12
const TURN_SPEED = 0.07
const THRUST = 0.12
const FRICTION = 0.99
const BULLET_SPEED = 6
const BULLET_LIFE = 60
const MAX_BULLETS = 8
const ASTEROID_SPEED = 0.75
const INITIAL_ASTEROIDS = 4

function wrap(x, y) {
  return [((x % W) + W) % W, ((y % H) + H) % H]
}

function randomAsteroid(size, avoidX, avoidY) {
  let x, y
  do {
    x = Math.random() * W
    y = Math.random() * H
  } while (
    avoidX !== undefined &&
    Math.hypot(x - avoidX, y - avoidY) < 100
  )
  const angle = Math.random() * Math.PI * 2
  const speed = (ASTEROID_SPEED * (4 - size) + 0.5) * (0.5 + Math.random())
  // Generate irregular shape
  const verts = []
  const numVerts = 8 + Math.floor(Math.random() * 5)
  for (let i = 0; i < numVerts; i++) {
    const a = (i / numVerts) * Math.PI * 2
    const r = (0.7 + Math.random() * 0.3) * size * 15
    verts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r })
  }
  return {
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size, // 3=large, 2=medium, 1=small
    radius: size * 15,
    verts,
  }
}

function createShip() {
  return {
    x: W / 2, y: H / 2,
    vx: 0, vy: 0,
    angle: -Math.PI / 2,
    thrusting: false,
    invulnerable: 120,
  }
}

export default function Asteroids() {
  const canvasRef = useRef(null)
  const gameRef = useRef(null)
  const keysRef = useRef({})
  const rafRef = useRef(null)
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [level, setLevel] = useState(1)
  const [message, setMessage] = useState("")
  const [started, setStarted] = useState(false)

  const startGame = useCallback(() => {
    const asteroids = []
    for (let i = 0; i < INITIAL_ASTEROIDS; i++) {
      asteroids.push(randomAsteroid(3, W / 2, H / 2))
    }
    gameRef.current = {
      ship: createShip(),
      asteroids,
      bullets: [],
      particles: [],
      score: 0,
      lives: 3,
      level: 1,
      gameOver: false,
      paused: false,
      respawnTimer: 0,
    }
    setScore(0)
    setLives(3)
    setLevel(1)
    setMessage("")
    setStarted(true)
  }, [])

  function spawnLevel(g) {
    g.level++
    setLevel(g.level)
    const count = INITIAL_ASTEROIDS + g.level - 1
    for (let i = 0; i < count; i++) {
      g.asteroids.push(randomAsteroid(3, g.ship.x, g.ship.y))
    }
  }

  function explode(x, y, count, particles) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2
      const s = 1 + Math.random() * 2
      particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 20 + Math.floor(Math.random() * 20),
      })
    }
  }

  const update = useCallback(() => {
    const g = gameRef.current
    if (!g || g.gameOver || g.paused) return

    const keys = keysRef.current
    const ship = g.ship

    // Ship controls
    if (ship) {
      if (keys["ArrowLeft"] || keys["a"]) ship.angle -= TURN_SPEED
      if (keys["ArrowRight"] || keys["d"]) ship.angle += TURN_SPEED
      if (keys["ArrowUp"] || keys["w"]) {
        ship.vx += Math.cos(ship.angle) * THRUST
        ship.vy += Math.sin(ship.angle) * THRUST
        ship.thrusting = true
      } else {
        ship.thrusting = false
      }

      ship.vx *= FRICTION
      ship.vy *= FRICTION
      ;[ship.x, ship.y] = wrap(ship.x + ship.vx, ship.y + ship.vy)

      if (ship.invulnerable > 0) ship.invulnerable--
    }

    // Bullets
    for (let i = g.bullets.length - 1; i >= 0; i--) {
      const b = g.bullets[i]
      b.x += b.vx
      b.y += b.vy
      ;[b.x, b.y] = wrap(b.x, b.y)
      b.life--
      if (b.life <= 0) g.bullets.splice(i, 1)
    }

    // Asteroids
    for (const a of g.asteroids) {
      ;[a.x, a.y] = wrap(a.x + a.vx, a.y + a.vy)
    }

    // Bullet-asteroid collisions
    for (let bi = g.bullets.length - 1; bi >= 0; bi--) {
      const b = g.bullets[bi]
      for (let ai = g.asteroids.length - 1; ai >= 0; ai--) {
        const a = g.asteroids[ai]
        if (Math.hypot(b.x - a.x, b.y - a.y) < a.radius) {
          g.bullets.splice(bi, 1)
          g.asteroids.splice(ai, 1)
          explode(a.x, a.y, a.size * 6, g.particles)

          const pts = [0, 100, 50, 20]
          g.score += pts[a.size]
          setScore(g.score)

          if (a.size > 1) {
            for (let j = 0; j < 2; j++) {
              g.asteroids.push(randomAsteroid(a.size - 1, undefined, undefined))
              const child = g.asteroids[g.asteroids.length - 1]
              child.x = a.x
              child.y = a.y
            }
          }
          break
        }
      }
    }

    // Ship-asteroid collision
    if (ship && ship.invulnerable <= 0) {
      for (let ai = g.asteroids.length - 1; ai >= 0; ai--) {
        const a = g.asteroids[ai]
        if (Math.hypot(ship.x - a.x, ship.y - a.y) < a.radius + SHIP_SIZE) {
          explode(ship.x, ship.y, 20, g.particles)
          g.lives--
          setLives(g.lives)
          if (g.lives <= 0) {
            g.ship = null
            g.gameOver = true
            setMessage("Game Over!")
          } else {
            g.ship = createShip()
            g.respawnTimer = 60
          }
          break
        }
      }
    }

    // Particles
    for (let i = g.particles.length - 1; i >= 0; i--) {
      const p = g.particles[i]
      p.x += p.vx
      p.y += p.vy
      p.life--
      if (p.life <= 0) g.particles.splice(i, 1)
    }

    // Next level
    if (g.asteroids.length === 0) {
      spawnLevel(g)
    }
  }, [])

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d")
    const g = gameRef.current
    if (!ctx || !g) return

    ctx.fillStyle = "#000"
    ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = "#fff"
    ctx.lineWidth = 1.5

    // Ship
    const ship = g.ship
    if (ship && !(ship.invulnerable > 0 && Math.floor(ship.invulnerable / 4) % 2)) {
      ctx.save()
      ctx.translate(ship.x, ship.y)
      ctx.rotate(ship.angle)
      ctx.beginPath()
      ctx.moveTo(SHIP_SIZE, 0)
      ctx.lineTo(-SHIP_SIZE * 0.8, -SHIP_SIZE * 0.7)
      ctx.lineTo(-SHIP_SIZE * 0.4, 0)
      ctx.lineTo(-SHIP_SIZE * 0.8, SHIP_SIZE * 0.7)
      ctx.closePath()
      ctx.strokeStyle = "#fff"
      ctx.stroke()

      // Thrust flame
      if (ship.thrusting) {
        ctx.beginPath()
        ctx.moveTo(-SHIP_SIZE * 0.5, -SHIP_SIZE * 0.3)
        ctx.lineTo(-SHIP_SIZE * (1 + Math.random() * 0.5), 0)
        ctx.lineTo(-SHIP_SIZE * 0.5, SHIP_SIZE * 0.3)
        ctx.strokeStyle = "#f80"
        ctx.stroke()
      }
      ctx.restore()
    }

    // Asteroids
    ctx.strokeStyle = "#aaa"
    for (const a of g.asteroids) {
      ctx.beginPath()
      ctx.moveTo(a.x + a.verts[0].x, a.y + a.verts[0].y)
      for (let i = 1; i < a.verts.length; i++) {
        ctx.lineTo(a.x + a.verts[i].x, a.y + a.verts[i].y)
      }
      ctx.closePath()
      ctx.stroke()
    }

    // Bullets
    ctx.fillStyle = "#fff"
    for (const b of g.bullets) {
      ctx.beginPath()
      ctx.arc(b.x, b.y, 2, 0, Math.PI * 2)
      ctx.fill()
    }

    // Particles
    for (const p of g.particles) {
      const alpha = p.life / 40
      ctx.fillStyle = `rgba(255,200,100,${alpha})`
      ctx.fillRect(p.x, p.y, 2, 2)
    }

    // Pause overlay
    if (g.paused) {
      ctx.fillStyle = "rgba(255,255,255,0.7)"
      ctx.font = "24px monospace"
      ctx.textAlign = "center"
      ctx.fillText("PAUSED", W / 2, H / 2)
    }
  }, [])

  // Game loop
  useEffect(() => {
    if (!started) return

    function loop() {
      update()
      draw()
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [started, update, draw])

  // Keyboard
  useEffect(() => {
    function handleDown(e) {
      const g = gameRef.current
      if (!g) return

      keysRef.current[e.key] = true

      if (e.key === "p" || e.key === "P") {
        g.paused = !g.paused
        setMessage(g.paused ? "Paused" : "")
      }

      if (e.key === " " && g.ship && !g.paused && !g.gameOver) {
        if (g.bullets.length < MAX_BULLETS) {
          g.bullets.push({
            x: g.ship.x + Math.cos(g.ship.angle) * SHIP_SIZE,
            y: g.ship.y + Math.sin(g.ship.angle) * SHIP_SIZE,
            vx: Math.cos(g.ship.angle) * BULLET_SPEED + g.ship.vx,
            vy: Math.sin(g.ship.angle) * BULLET_SPEED + g.ship.vy,
            life: BULLET_LIFE,
          })
        }
      }

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault()
      }
    }

    function handleUp(e) {
      keysRef.current[e.key] = false
    }

    document.addEventListener("keydown", handleDown)
    document.addEventListener("keyup", handleUp)
    return () => {
      document.removeEventListener("keydown", handleDown)
      document.removeEventListener("keyup", handleUp)
    }
  }, [])

  // Initial blank canvas
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d")
    if (ctx) {
      ctx.fillStyle = "#000"
      ctx.fillRect(0, 0, W, H)
    }
  }, [])

  return (
    <Layout>
      <head>
        <title>Asteroids</title>
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
            width={W}
            height={H}
            style={{ border: "2px solid #333", background: "#000" }}
          />
        </div>
        <div style={{ minWidth: "140px" }}>
          <div style={{ marginTop: "0" }}>
            <p style={{ margin: "4px 0" }}>
              <strong>Score:</strong> {score}
            </p>
            <p style={{ margin: "4px 0" }}>
              <strong>Lives:</strong> {lives}
            </p>
            <p style={{ margin: "4px 0" }}>
              <strong>Level:</strong> {level}
            </p>
          </div>
          <div style={{ marginTop: "20px", fontSize: "13px", lineHeight: 1.6 }}>
            <strong>Controls</strong>
            <br />
            &larr; &rarr; &nbsp; Rotate
            <br />
            &uarr; &nbsp; Thrust
            <br />
            Space &nbsp; Shoot
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
