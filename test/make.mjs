import { readFileSync, writeFileSync } from "node:fs";
let h = readFileSync("src/index.html","utf8").replaceAll("%BUILD%","0")
  .replace('href="styles.css?v=0"','href="/src/styles.css"')
  .replace('href="fonts.css?v=0"','href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"')
  .replace('<script type="module" src="app.js?v=0"></script>',
  `<script type="module">import {startApp} from "/src/app.js"; import {createMockData} from "/test/mock.js";
   const q=new URLSearchParams(location.search); startApp({data:createMockData({loggedIn:!q.has("out")}), env:{native:q.has("native"),build:3,repo:""}});</script>`);
writeFileSync("test/index.html", h);
