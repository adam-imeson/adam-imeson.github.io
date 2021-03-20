(self.webpackChunkadam_imeson_github_io=self.webpackChunkadam_imeson_github_io||[]).push([[47],{7198:function(e,t,r){"use strict";r.d(t,{Z:function(){return i}});var n=r(7294);function i(e){var t=e.children;return n.createElement("div",null,t)}},3867:function(e,t,r){"use strict";r.r(t),r.d(t,{default:function(){return a}});var n=r(7294),i=r(7198);function a(){return n.createElement(i.Z,null,n.createElement("head",null,n.createElement("title",null,"SSLskimmer")),n.createElement("body",null,n.createElement("div",null,n.createElement("h1",null,"SSLskimmer"),n.createElement("div",null,n.createElement("p",null,"In 2009, Moxie Marlinspike released an attack by the name of ",n.createElement("a",{href:"https://moxie.org/software/sslstrip/"},"SSLstrip"),". It allows man-in-the-middle attackers to strip the security from HTTPS server responses, forwarding naked HTTP to the victim.  If the victim does not notice that they are no longer using a secure connection they are likely to submit login details and other sensitive information to stripped pages.  The attacker reads the information before forwarding it to the server.  I find this attack to be intriguing because it lies at the intersection of three different weak points in internet security: TLS certificates, browser warnings, and user education."),n.createElement("p",null,"I gave a ",n.createElement("a",{href:"https://docs.google.com/presentation/d/1fENuA1fRX_w9yTrOpYyWOPsPKNkd423y9IxjGN0Wo0s/edit?usp=sharing"},"presentation")," on the most current methods of performing the attack, particularly Leonardo Nve Egea's ",n.createElement("a",{href:"https://github.com/byt3bl33d3r/sslstrip2"},"SSLstrip+"),". This version uses a spoofed DNS server to avoid failing to HTTP Strict Transport Security (HSTS) preloading by browsers, but does not defeat HTTP Public Key Pinning (HPKP)."),n.createElement("p",null,"While HPKP seems to be an effective countermeasure for the time being, its low adoption rate relative to HSTS leaves many connections open to attack.  There are also several browsers that have lagged behind the adoption curve for HSTS.  These connections are all vulnerable; however, they are protected via herd immunity.  Users of non-vulnerable browsers are likely to raise concerns when presented with obvious signs of MITM attacks such as the large error messages and warning screens that most browsers provide.  This results in a situation of herd immunity; the uninoculated users are protected from broad-spectrum attacks by the immune."),n.createElement("p",null,"I propose a method for circumventing this crowd-based defence.  Lee Brotherston has demonstrated the viability of ",n.createElement("a",{href:"https://github.com/LeeBrotherston/tls-fingerprinting"},"TLS fingerprinting,")," where we examine Client Hello messages to determine traits of the system that sent each message.  By checking the TLS version, available ciphersuites, and ordering of available ciphersuites against a prebuilt database of known Client Hello traits, we can determine which variety of browser sent the traffic we have intercepted.  Armed with this information it is possible to selectively attack only users who are known to be vulnerable while we fly under the radar of everyone who isn't, thereby resurrecting an attack previously considered to be obsolete."),n.createElement("p",null,"I've put together a ",n.createElement("a",{href:"https://github.com/adam-imeson/sslskimmer"},"git repo")," of relevant tools and instructions.  I was able to selectively target individual devices after gaining information on their TLS configurations.  Primary recommendation: enforce a canonical ordering of TLS ciphersuites in Client Hellos.  Secondary recommendation: avoid relying on herd immunity as a defence against attacks.")))))}}}]);
//# sourceMappingURL=component---src-pages-sslskimmer-js-9bcd19e60bd9e720a9bd.js.map