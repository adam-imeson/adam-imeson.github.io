import React from "react"
import InternetJpg from "../assets/internet.jpg"

export default function Home() {
  return (
	<head>
	    <style>
	        {
	            margin: 0
	            padding: 0
	        }
	        .imgbox {
	            display: grid;
	            height: 100%;
	        }
	        .center-fit {
	            max-width: 100%;
	            max-height: 100vh;
	            margin: auto;
	        }
	    </style>
	</head>
  	<div>
  		<h1>adam learns front end</h1>
  		<div class="imgbox">
  			<img class="center-fit" src={InternetJpg} alt="mfw cloud" />
  		</div>
  	</div>
  );
}
