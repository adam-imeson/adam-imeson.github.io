import React from "react"
import Layout from "../components/layout"

export default function Home() {
  return (
  	<Layout>
    <head>
        <title>SSLskimmer</title>
      </head>
  		<body>
    <div>
        <h1>SSLskimmer</h1>
      <div>
        <p>In 2009, Moxie Marlinspike released an attack by the name of <a href="https://moxie.org/software/sslstrip/">SSLstrip</a>.
  It allows man-in-the-middle attackers to strip the security from HTTPS
 server responses, forwarding naked HTTP to the victim.  If the victim 
does not notice that they are no longer using a secure connection they 
are likely to submit login details and other sensitive information to 
stripped pages.  The attacker reads the information before forwarding it
 to the server.  I find this attack to be intriguing because it lies at 
the intersection of three different weak points in internet security: 
TLS certificates, browser warnings, and user education.</p>
        <p>I gave a <a href="https://docs.google.com/presentation/d/1fENuA1fRX_w9yTrOpYyWOPsPKNkd423y9IxjGN0Wo0s/edit?usp=sharing">presentation</a> on the most current methods of performing the attack, particularly Leonardo Nve Egea's <a href="https://github.com/byt3bl33d3r/sslstrip2">SSLstrip+</a>.
  This version uses a spoofed DNS server to avoid failing to HTTP Strict
 Transport Security (HSTS) preloading by browsers, but does not defeat 
HTTP Public Key Pinning (HPKP).</p>
        <p>While HPKP seems to be an effective countermeasure for the time 
being, its low adoption rate relative to HSTS leaves many connections 
open to attack.  There are also several browsers that have lagged behind
 the adoption curve for HSTS.  These connections are all vulnerable; 
however, they are protected via herd immunity.  Users of non-vulnerable 
browsers are likely to raise concerns when presented with obvious signs 
of MITM attacks such as the large error messages and warning screens 
that most browsers provide.  This results in a situation of herd 
immunity; the uninoculated users are protected from broad-spectrum 
attacks by the immune.</p>
        <p>I propose a method for circumventing this crowd-based defence.  Lee Brotherston has demonstrated the viability of <a href="https://github.com/LeeBrotherston/tls-fingerprinting">TLS fingerprinting,</a>
 where we examine Client Hello messages to determine traits of the 
system that sent each message.  By checking the TLS version, available 
ciphersuites, and ordering of available ciphersuites against a prebuilt 
database of known Client Hello traits, we can determine which variety of
 browser sent the traffic we have intercepted.  Armed with this 
information it is possible to selectively attack only users who are 
known to be vulnerable while we fly under the radar of everyone who 
isn't, thereby resurrecting an attack previously considered to be 
obsolete.</p>
        <p>I've put together a <a href="https://github.com/adam-imeson/sslskimmer">git repo</a>
 of relevant tools and instructions.  I was able to selectively target 
individual devices after gaining information on their TLS 
configurations.  Primary recommendation: enforce a canonical ordering of
 TLS ciphersuites in Client Hellos.  Secondary recommendation: avoid 
relying on herd immunity as a defence against attacks.</p>
      </div>
    </div>
</body>
  	</Layout>
  );
}
