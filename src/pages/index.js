import React from "react"
import InternetJpg from "../assets/internet.jpg"
import Layout from "../components/layout"

export default function Home() {
  return (
  	<Layout>
  		<head>
  			<title>mfw cloud</title>
  		</head>
  		<div>
  			<img src={InternetJpg} alt="" />
  		</div>
  	</Layout>
  );
}
