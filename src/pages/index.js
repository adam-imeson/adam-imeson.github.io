import React from "react"
import { Link } from "gatsby"
import InternetJpg from "../assets/internet.jpg"
import Layout from "../components/layout"

const linkStyle = {
  display: "block",
  padding: "12px 16px",
  marginBottom: "8px",
  background: "#f5f5f5",
  borderRadius: "6px",
  textDecoration: "none",
  color: "#333",
}

export default function Home() {
  return (
    <Layout>
      <head>
        <title>Adam Imeson</title>
      </head>
      <div style={{ padding: "24px", maxWidth: "640px", fontFamily: "sans-serif" }}>
        <div style={{ marginBottom: "32px" }}>
          <img
            src={InternetJpg}
            alt=""
            style={{ width: "240px", height: "240px", borderRadius: "6px", objectFit: "cover" }}
          />
        </div>
        <nav>
          <a
            href="https://adamimeson.substack.com/"
            target="_blank"
            rel="noopener noreferrer"
            style={linkStyle}
          >
            <strong>adamimeson.substack.com</strong>
            <span style={{ marginLeft: "12px", color: "#777", fontSize: "14px" }}>
              human-generated words
            </span>
          </a>
          <h3 style={{ margin: "24px 0 8px", fontSize: "14px", color: "#999", textTransform: "uppercase", letterSpacing: "1px" }}>
            Vibes
            <span style={{ marginLeft: "8px", textTransform: "none", letterSpacing: "0", fontWeight: "normal" }}>
              ai-generated pages
            </span>
          </h3>
          <Link to="/tetris/" style={linkStyle}><strong>Tetris</strong></Link>
          <Link to="/asteroids/" style={linkStyle}><strong>Asteroids</strong></Link>
        </nav>
      </div>
    </Layout>
  )
}
