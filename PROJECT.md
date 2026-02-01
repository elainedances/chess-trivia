# Chess.com Trivia - Stream Game

A trivia game that auto-generates questions from any Chess.com profile. Designed for Twitch streamers to play with their chat.

## What It Does

1. Enter any Chess.com username + the person's first name
2. Select an occasion (Anniversary / Birthday / Just Chess)
3. The app fetches their Chess.com stats and generates 15 trivia questions
4. 10 second countdown before game starts
5. Each question: 5s preview (question only) → 15s to answer (options visible)
6. Viewers answer by typing `!a` `!b` `!c` or `!d` in Twitch chat
7. Points awarded based on speed + question number + streak bonus
8. Live leaderboard tracks scores below the question

### Question Types Generated

- Peak/current ratings (bullet, blitz, rapid)
- Total games played (by format)
- Wins, losses, draws counts
- Win rates and draw percentages
- Puzzle Rush best score
- Tactics rating (highest and lowest!)
- Chess.com followers
- Year joined / years active
- Country
- FIDE rating (if available)
- Title (GM, IM, FM, etc.)
- League ranking
- Rating gaps and comparisons

### Points System

- **Escalating base points:** Q1 = 500 max → Q15 = 1900 max (+100 per question)
- **Speed bonus:** Faster answers = more points
- **Streak bonus:** +100 for each consecutive correct answer (2+ in a row)
- Streaks shown with 🔥 next to player name in leaderboard

### Timing

- **Pre-game:** 10 second countdown
- **Question preview:** 5 seconds (question only, no options)
- **Answer phase:** 15 seconds (options visible)
- **Between questions:** 10 seconds

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Fonts:** Fredoka (headings), Inter (body)
- **Chat Integration:** Twitch IRC (WebSocket)
- **Data Source:** Chess.com Public API
- **Hosting:** Vercel

## What's Been Built

- [x] Setup page with username/name/occasion inputs
- [x] Chess.com API integration
- [x] Auto question generation from player stats (25+ question types)
- [x] Game flow (ready → countdown → preview → question → reveal → finished)
- [x] Twitch chat connection (anonymous read-only)
- [x] Answer parsing (!a, !b, !c, !d only)
- [x] Escalating points system
- [x] Streak bonus tracking
- [x] Live leaderboard below questions
- [x] Responsive design (mobile + desktop)
- [x] Festive UI with celebration colors
- [x] Occasion-based titles (Anniversary/Birthday/Chess)

## What's Left / Known Issues

### To Do

- [ ] Add sound effects (correct/wrong/timer)
- [ ] OBS browser source optimization (transparent background option)
- [ ] Custom question support (add your own questions)
- [ ] Save/export final leaderboard
- [ ] Support for Lichess profiles
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
│       ├── layout.tsx         # Root layout (fonts)
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

## GitHub

https://github.com/elainedances/chess-trivia

---

*Built for stream celebrations*
