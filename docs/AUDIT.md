# Codebase Audit — Multiplayer Tic-Tac-Toe

_Audit date: 2026-07-27. Audited commit: `7207120` "Adding Readme File and all the project files"._

This document is the record of the state the repository was in **before** the rebuild. It is blunt on purpose. The final section, _Lessons Learned — Rules For This Rebuild_, is the binding rulebook for all work that follows.

---

## Overview

### Stack

- **Language:** plain browser JavaScript (ES5-style `var`, no modules) + a Node.js WebSocket server.
- **Build tooling:** none. No bundler, no transpiler, no dev server. HTML loads three `<script>` tags directly.
- **Package manager / manifest:** **no `package.json` exists at all.** Only a `package-lock.json` is present, and it is **lockfile v1** (npm 5/6 era, ~2017–2020), describing a dependency tree for the `websocket` package. There is no way to `npm install` this project into a known-good state from its own manifest, because the manifest is missing.
- **Runtime dependency:** [`websocket`](https://www.npmjs.com/package/websocket) v1.0.34 (the `theturtle32/WebSocket-Node` library — **not** `ws`), pulled in transitively with `bufferutil`, `utf-8-validate`, `es5-ext`, `debug@2.6.9`, etc.
- **A bogus `http@0.0.1-security` package** is pinned in the lockfile — this is the npm placeholder squatting the `http` name, published to stop people accidentally depending on it. Its presence means someone ran `npm install http`, not realising `http` is a Node built-in.

### Structure

```
.
├── client.html         # markup, loads 3 scripts, wires onclick handlers inline
├── style.css           # ~115 lines of id-based CSS
├── index.js            # win/draw detection by reading DOM innerText; score; reset/restart
├── player_turn.js      # function1()..function9(): one hardcoded handler per cell
├── ClientScript.js     # attempt at a browser WebSocket client (broken)
├── Server.js           # attempt at a Node WebSocket server (broken, incomplete)
├── package-lock.json   # lockfile v1, NO package.json
├── README.md           # 4 lines, German
├── node_modules/       # COMMITTED TO GIT
└── doc/
    ├── Allgemein Tic Tac Toe Doku.docx
    └── ~$lgemein Tic Tac Toe Doku.docx   # Word lock/temp file, also committed
```

### Entry points

- **Local hot-seat game:** open `client.html` in a browser. `player_turn.js` + `index.js` provide a working-ish two-player-on-one-device game via inline `onclick="functionN(); userSelect();"` on each cell.
- **"Multiplayer" server:** `node Server.js` starts an HTTP+WebSocket listener on port `8080`. This path **does not function** (see Failures).

### How it currently runs

The only thing that actually runs is the local hot-seat game opened straight from the filesystem. The multiplayer half — the entire stated point of the project ("_Ein Tic-Tac-Toe-Spiel mit dem zwei Menschen gleichzeitig gegeneinander spielen können_") — is unfinished and throws at runtime.

---

## What Was Done Well

Being honest, there is very little to inherit, but a few things are not wrong:

- **The win-condition set is complete and correct.** `index.js:18-25` enumerates all 8 winning lines (3 rows, 3 columns, 2 diagonals) accurately. The logic is expressed terribly (see below), but the _data_ is right and was carried forward into the rebuild's shared game core.
- **A deliberate dark background exists.** `style.css:4` sets `background-color: #12181b`, and marks/text are white. There is the seed of a dark theme here, which matches the rebuild's dark-only requirement. This one colour is the only piece of the visual system worth preserving.
- **The right transport family was chosen in principle.** The project set out to use WebSockets (README + `Server.js`), which is the correct primitive for low-latency realtime. The rebuild keeps WebSockets — it just swaps the abandoned `websocket` library for `ws` and actually finishes the implementation.
- **Cursor/hover affordances on the board** (`style.css:54`, `#start:hover`, `#restart:hover`) show some attention to interactive feedback.

That is the complete list.

---

## What Was Done Badly

- **18 copy-pasted functions instead of one.** `player_turn.js` defines `function1()` through `function9()` (lines 16-193), each an almost byte-identical 18-line block differing only in the box id. The same nine boxes are then re-looked-up a second time in `index.js:5-13`. A single handler parameterised by cell index would replace all of it. This is the single largest structural failure in the code.
- **Game state lives in the DOM.** Win/draw detection reads `box.innerText` / `box.innerHTML` (`index.js:18-53`) as the source of truth. There is no board model. The DOM is being used as a database. This makes the rules impossible to reuse, test, or run on a server.
- **`innerHTML` vs `innerText` used interchangeably.** `player_turn.js` checks `box.innerHTML == ""` but writes `box.innerText`; `index.js` reads `box.innerText`. Mixing these is fragile and only works by accident for single characters.
- **Blocking `alert()` / `confirm()` for game flow.** `player_turn.js:23` pops `alert("Field is already marked.")` on every misclick; `index.js:58,69` gate replay through `confirm()`. Native modal dialogs freeze the page and are unusable on mobile / unstyleable.
- **`restart()` calls `location.reload()`** (`index.js:109`) — the "restart" feature is a full page reload, which also destroys the score it was supposedly preserving.
- **Absolute, brittle layout magic numbers.** `style.css:59` `margin-left: 55em` on `#restart`, `#punktestand-title { margin-top: -8% }`, `margin-left: 100px`. These are eyeballed offsets that break at any other viewport width. Nothing is responsive.
- **Everything keyed by DOM id, styled by id.** `#box1..#box9` selectors, id-based CSS throughout. No classes, no reusable components, no tokens.
- **Language soup.** Identifiers mix German and English: `punktestandX`, `punktestand-title`, `punktestand-text` sit next to `restart`, `start`, `player_turn`. The README is German, the code comments are English.
- **Globals everywhere.** `turn`, `punktestandX`, `punktestandO`, `box1..box9` are top-level `var` globals shared implicitly across three script files loaded in a specific order. `index.js` and `player_turn.js` both declare `var box1 = ...` — the second declaration silently clobbers the first.
- **Inline `onclick` handlers in markup** (`client.html:35-43`) couple behaviour to markup and depend on functions being global.
- **Dead/placeholder UI wired to nothing coherent.** `client.html` has `connect` / `Join` / `Create` buttons and a `<ul id="list">` for a lobby that the server never populates with anything real.

---

## Outright Failures & Wrong Decisions

These are not "could be cleaner" — these are broken or flatly wrong.

- **The multiplayer server does not work. It doesn't even parse a move.** `Server.js:27-33`: the `onMessage` handler's `switch` has a single `case 'create'` whose body is `const board =['', ]` — an unfinished array literal — and then the function `}` closes. There is no `case` for joining, no move handling, no win logic, nothing. The core feature is a stub.
- **`onMessage` is never registered.** `Server.js:6-16` accepts the connection (`req.accept`) but **never calls `conn.on('message', onMessage)`**. Even the stub handler that exists can never fire. The server can only ever send the initial `connected` + `gamesList` messages and then sits deaf.
- **The client references a `socket` that is out of scope.** `ClientScript.js:11-15` creates `var socket` **inside** the `connect` click listener. The `create` button handler at `ClientScript.js:43-48` then calls `socket.send(...)` against a `socket` that does not exist in that scope → `ReferenceError` the moment you click Create. The join handler is never wired at all.
- **`sendAvailGame()` sends fake data.** `Server.js:18-25` hardcodes `games = [1, 3, 4]` and broadcasts it as the "available games" list. It also **reassigns the top-level `games` object to an array** each call, so any real game bookkeeping would be destroyed. The lobby is a lie.
- **Client ids generated by summing random numbers.** `Server.js:8` `Math.round(Math.random()*10 + Math.random()*10 + Math.random()*10)`. This produces a small integer with a triangular distribution centred near 15 — collisions are almost guaranteed with more than a handful of clients, and it's used as the `clients{}` map key. Game ids (`Server.js:31`) have the same defect.
- **`node_modules/` is committed to version control.** The entire dependency tree — including compiled native `.node` binaries for darwin/linux/win32 (`bufferutil`, `utf-8-validate` prebuilds) — is checked into git. There is no `.gitignore`. This bloats the repo, leaks platform binaries, and makes diffs unreadable (the "add all project files" commit is mostly `node_modules`).
- **A Word lock file is committed.** `doc/~$lgemein Tic Tac Toe Doku.docx` is a Microsoft Word owner/lock temp file that only exists while the document is open. Committing it proves nothing was ever `.gitignore`d and no one looked at what they were adding.
- **`npm install http` was run.** The `http@0.0.1-security` entry in the lockfile means someone installed the security-placeholder package for a Node built-in. Harmless at runtime but a clear sign of not understanding the platform.
- **Missing asset referenced.** `client.html:13` links a favicon at `images/tictactoe.png`; there is no `images/` directory. 404 on every load.
- **External font on the critical path with no fallback strategy.** `client.html:9-11` blocks on Google Fonts (`Itim`) over the network for the entire look; offline or blocked, the whole typographic identity vanishes.

---

## Lessons Learned — Rules For This Rebuild

Binding. The rebuild must not reproduce any failure above.

1. **One source of truth for the rules, and it is not the DOM.** Board state is a plain data structure. Win/draw/turn logic is a pure module (`src/shared/game/`) with zero DOM access, imported unchanged by both client and server. Never read game state out of `innerText` again.
2. **No copy-paste where a parameter belongs.** There is exactly one move handler, parameterised by cell index. If a second near-identical function appears, that is a bug.
3. **The server is authoritative and actually implemented.** Every move is validated server-side against the shared rules; illegal and out-of-turn moves are rejected. No stubbed `switch` cases, no `case` that returns nothing. `message` handlers are registered on every connection.
4. **Real, unique identifiers.** Room codes and session tokens use a proper generator (crypto-backed / collision-resistant), never sums of `Math.random()`.
5. **A real build and a real manifest.** `package.json` exists, pins dependencies, and defines `dev` / `build` / `start`. TypeScript strict. Vite for the client. One command runs it.
6. **`.gitignore` first, before the first `node_modules` appears.** Never commit dependencies, build output, or editor/OS lock files. The repo contains source only.
7. **`ws`, not `websocket`.** Raw `ws` on Node 20+, `perMessageDeflate` disabled, JSON messages kept small and flat. No abandoned or ES5-era transport libraries.
8. **No blocking native dialogs for game flow.** No `alert`, no `confirm`, no `location.reload()` as a feature. State changes are rendered in the UI; restart/rematch mutate state, they don't reload the page.
9. **Responsive by construction, no eyeballed magic offsets.** Layout uses relative units, grid/flex, and a defined spacing scale from `docs/STYLEGUIDE.md`. No `margin-left: 55em`.
10. **One language in the code: English.** No more `punktestand` next to `restart`. Identifiers, comments, and UI copy are consistent English.
11. **No implicit global soup across script tags.** ES modules, explicit imports, scoped state, typed message contracts (discriminated unions) shared between client and server.
12. **Self-contained critical assets, graceful fallbacks.** Any web font has a system fallback stack; no required asset 404s. The app must render correctly with the network blocked after load.

### On what was inherited

Almost nothing was carried forward, and the reasons are the failures above: game state lived in the DOM, the multiplayer layer was a non-functional stub, there was no build system, no manifest, no module structure, and `node_modules` polluted the history. The two things preserved are (a) the set of 8 winning lines, re-expressed as data in the shared game core, and (b) the dark background hue `#12181b` as the seed of the dark-only palette documented in `docs/STYLEGUIDE.md`. Everything else is a clean rebuild against the rules above.
