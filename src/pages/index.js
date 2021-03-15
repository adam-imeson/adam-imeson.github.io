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
  			<img class="center-fit" src={InternetJpg} alt="" />
  		</div>
  	</Layout>
  );
}
