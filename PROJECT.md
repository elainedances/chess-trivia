# Chess Trivia - Stream Game

A trivia game that auto-generates questions from any Chess.com profile. Designed for Twitch streamers to play with their chat.

## What It Does

1. Enter any Chess.com username + the person's first name
2. Select an occasion (Anniversary / Birthday / Just Chess)
3. The app fetches their Chess.com stats and generates 15 trivia questions
4. Viewers answer by typing `!a` `!b` `!c` or `!d` in Twitch chat
5. Points awarded based on speed (faster = more points)
6. Live leaderboard tracks scores throughout the game

### Question Types Generated

- Peak ratings (bullet, blitz, rapid)
- Current ratings
- Total games played
- Win counts
- Puzzle Rush best score
- Tactics rating
- Chess.com followers
- Year joined
- Country
- Streamer status

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Chat Integration:** Twitch IRC (WebSocket)
- **Data Source:** Chess.com Public API
- **Hosting:** Vercel

## What's Been Built

- [x] Setup page with username/name/occasion inputs
- [x] Chess.com API integration
- [x] Auto question generation from player stats
- [x] Game flow (ready → question → reveal → next → finished)
- [x] Twitch chat connection (anonymous read-only)
- [x] Answer parsing (!a, !b, !c, !d, a, b, c, d, 1, 2, 3, 4)
- [x] Points system (time-based scoring)
- [x] Live leaderboard with animations
- [x] Responsive design (mobile + desktop)
- [x] Clean dark UI (no emojis)
- [x] Occasion-based titles (Anniversary/Birthday/Chess)

## What's Left / Known Issues

### To Do

- [ ] Add sound effects (correct/wrong/timer)
- [ ] OBS browser source optimization (transparent background option)
- [ ] Custom question support (add your own questions)
- [ ] Save/export final leaderboard
- [ ] Support for Lichess profiles
- [ ] More question variety (opening stats, most played opponent, etc.)
- [ ] Configurable timer duration
- [ ] Streamer controls (pause, skip, end early)

### Known Issues

- Twitch chat connection is read-only (anonymous). Works for reading answers but can't send messages.
- Chess.com API rate limits may affect rapid refreshes
- Some stats may be missing if the player hasn't played certain formats
- Country detection relies on Chess.com's country codes

## How to Run Locally

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
# Clone or navigate to the project
cd chess-trivia

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open http://localhost:3000

### Build for Production

```bash
npm run build
npm run start
```

### Deploy to Vercel

```bash
vercel --prod
```

## Project Structure

```
chess-trivia/
├── src/
│   └── app/
│       ├── page.tsx           # Setup page
│       ├── layout.tsx         # Root layout
│       ├── globals.css        # Global styles
│       ├── game/
│       │   └── page.tsx       # Game page (questions + leaderboard)
│       └── api/
│           └── questions/
│               └── route.ts   # API: fetch Chess.com data, generate questions
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── PROJECT.md
```

## Live URL

https://chess-trivia-eight.vercel.app

---

*Built for Phoebe's stream anniversary*
