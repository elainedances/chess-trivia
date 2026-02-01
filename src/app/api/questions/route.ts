import { NextResponse } from 'next/server';

interface ChessStats {
  chess_bullet?: {
    last: { rating: number };
    best?: { rating: number };
    record: { win: number; loss: number; draw: number };
  };
  chess_blitz?: {
    last: { rating: number };
    best?: { rating: number };
    record: { win: number; loss: number; draw: number };
  };
  chess_rapid?: {
    last: { rating: number };
    best?: { rating: number };
    record: { win: number; loss: number; draw: number };
  };
  chess_daily?: {
    last: { rating: number };
    best?: { rating: number };
    record: { win: number; loss: number; draw: number };
  };
  tactics?: {
    highest: { rating: number };
    lowest: { rating: number };
  };
  puzzle_rush?: {
    best: { score: number };
  };
  fide?: number;
}

interface ChessProfile {
  username: string;
  followers: number;
  country: string;
  joined: number;
  is_streamer: boolean;
  title?: string;
  league?: string;
  status?: string;
  location?: string;
}

interface Question {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
}

function generateWrongAnswers(correct: number, count: number = 3, variance?: number): number[] {
  const wrong: number[] = [];
  const v = variance || Math.max(Math.floor(correct * 0.3), 50);
  
  while (wrong.length < count) {
    const offset = Math.floor(Math.random() * v * 2) - v;
    const candidate = correct + offset;
    
    if (candidate !== correct && candidate > 0 && !wrong.includes(candidate)) {
      wrong.push(candidate);
    }
  }
  
  return wrong;
}

function shuffleWithCorrect(correct: string, wrong: string[]): { options: string[]; correctIndex: number } {
  const allOptions = [correct, ...wrong];
  const shuffled = allOptions.sort(() => Math.random() - 0.5);
  return {
    options: shuffled,
    correctIndex: shuffled.indexOf(correct),
  };
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return num.toString();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');
  const name = searchParams.get('name') || username;

  if (!username) {
    return NextResponse.json({ error: 'Username required' }, { status: 400 });
  }

  try {
    // Fetch profile and stats
    const [profileRes, statsRes] = await Promise.all([
      fetch(`https://api.chess.com/pub/player/${username}`),
      fetch(`https://api.chess.com/pub/player/${username}/stats`),
    ]);

    if (!profileRes.ok || !statsRes.ok) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    const profile: ChessProfile = await profileRes.json();
    const stats: ChessStats = await statsRes.json();

    const questions: Question[] = [];
    let questionId = 1;

    // === RATING QUESTIONS ===

    // Best bullet rating
    if (stats.chess_bullet?.best?.rating) {
      const correct = stats.chess_bullet.best.rating;
      const wrong = generateWrongAnswers(correct);
      const { options, correctIndex } = shuffleWithCorrect(correct.toString(), wrong.map(String));
      questions.push({
        id: questionId++,
        question: `What is ${name}'s all-time highest bullet rating on Chess.com?`,
        options,
        correctIndex,
      });
    }

    // Best blitz rating
    if (stats.chess_blitz?.best?.rating) {
      const correct = stats.chess_blitz.best.rating;
      const wrong = generateWrongAnswers(correct);
      const { options, correctIndex } = shuffleWithCorrect(correct.toString(), wrong.map(String));
      questions.push({
        id: questionId++,
        question: `What is ${name}'s peak blitz rating on Chess.com?`,
        options,
        correctIndex,
      });
    }

    // Best rapid rating
    if (stats.chess_rapid?.best?.rating) {
      const correct = stats.chess_rapid.best.rating;
      const wrong = generateWrongAnswers(correct);
      const { options, correctIndex } = shuffleWithCorrect(correct.toString(), wrong.map(String));
      questions.push({
        id: questionId++,
        question: `What is ${name}'s highest rapid rating ever achieved?`,
        options,
        correctIndex,
      });
    }

    // Current bullet rating
    if (stats.chess_bullet?.last?.rating) {
      const correct = stats.chess_bullet.last.rating;
      const wrong = generateWrongAnswers(correct);
      const { options, correctIndex } = shuffleWithCorrect(correct.toString(), wrong.map(String));
      questions.push({
        id: questionId++,
        question: `What is ${name}'s current bullet rating?`,
        options,
        correctIndex,
      });
    }

    // Current blitz rating
    if (stats.chess_blitz?.last?.rating) {
      const correct = stats.chess_blitz.last.rating;
      const wrong = generateWrongAnswers(correct);
      const { options, correctIndex } = shuffleWithCorrect(correct.toString(), wrong.map(String));
      questions.push({
        id: questionId++,
        question: `What is ${name}'s current blitz rating on Chess.com?`,
        options,
        correctIndex,
      });
    }

    // Current rapid rating
    if (stats.chess_rapid?.last?.rating) {
      const correct = stats.chess_rapid.last.rating;
      const wrong = generateWrongAnswers(correct);
      const { options, correctIndex } = shuffleWithCorrect(correct.toString(), wrong.map(String));
      questions.push({
        id: questionId++,
        question: `What is ${name}'s current rapid rating?`,
        options,
        correctIndex,
      });
    }

    // === GAMES PLAYED QUESTIONS ===

    // Total blitz games
    if (stats.chess_blitz?.record) {
      const { win, loss, draw } = stats.chess_blitz.record;
      const total = win + loss + draw;
      if (total > 100) {
        const wrong = generateWrongAnswers(total, 3);
        const { options, correctIndex } = shuffleWithCorrect(formatNumber(total), wrong.map(formatNumber));
        questions.push({
          id: questionId++,
          question: `How many blitz games has ${name} played on Chess.com?`,
          options,
          correctIndex,
        });
      }
    }

    // Total bullet games
    if (stats.chess_bullet?.record) {
      const { win, loss, draw } = stats.chess_bullet.record;
      const total = win + loss + draw;
      if (total > 100) {
        const wrong = generateWrongAnswers(total, 3);
        const { options, correctIndex } = shuffleWithCorrect(formatNumber(total), wrong.map(formatNumber));
        questions.push({
          id: questionId++,
          question: `How many bullet games has ${name} played in total?`,
          options,
          correctIndex,
        });
      }
    }

    // Total rapid games
    if (stats.chess_rapid?.record) {
      const { win, loss, draw } = stats.chess_rapid.record;
      const total = win + loss + draw;
      if (total > 50) {
        const wrong = generateWrongAnswers(total, 3);
        const { options, correctIndex } = shuffleWithCorrect(formatNumber(total), wrong.map(formatNumber));
        questions.push({
          id: questionId++,
          question: `How many rapid games has ${name} played?`,
          options,
          correctIndex,
        });
      }
    }

    // === WINS/LOSSES QUESTIONS ===

    // Blitz wins
    if (stats.chess_blitz?.record?.win && stats.chess_blitz.record.win > 50) {
      const correct = stats.chess_blitz.record.win;
      const wrong = generateWrongAnswers(correct, 3);
      const { options, correctIndex } = shuffleWithCorrect(formatNumber(correct), wrong.map(formatNumber));
      questions.push({
        id: questionId++,
        question: `How many blitz victories does ${name} have?`,
        options,
        correctIndex,
      });
    }

    // Bullet wins
    if (stats.chess_bullet?.record?.win && stats.chess_bullet.record.win > 50) {
      const correct = stats.chess_bullet.record.win;
      const wrong = generateWrongAnswers(correct, 3);
      const { options, correctIndex } = shuffleWithCorrect(formatNumber(correct), wrong.map(formatNumber));
      questions.push({
        id: questionId++,
        question: `How many bullet games has ${name} won?`,
        options,
        correctIndex,
      });
    }

    // Blitz losses (fun!)
    if (stats.chess_blitz?.record?.loss && stats.chess_blitz.record.loss > 100) {
      const correct = stats.chess_blitz.record.loss;
      const wrong = generateWrongAnswers(correct, 3);
      const { options, correctIndex } = shuffleWithCorrect(formatNumber(correct), wrong.map(formatNumber));
      questions.push({
        id: questionId++,
        question: `How many blitz games has ${name} LOST? 😬`,
        options,
        correctIndex,
      });
    }

    // Bullet losses
    if (stats.chess_bullet?.record?.loss && stats.chess_bullet.record.loss > 100) {
      const correct = stats.chess_bullet.record.loss;
      const wrong = generateWrongAnswers(correct, 3);
      const { options, correctIndex } = shuffleWithCorrect(formatNumber(correct), wrong.map(formatNumber));
      questions.push({
        id: questionId++,
        question: `How many bullet games has ${name} lost?`,
        options,
        correctIndex,
      });
    }

    // Blitz draws
    if (stats.chess_blitz?.record?.draw && stats.chess_blitz.record.draw > 50) {
      const correct = stats.chess_blitz.record.draw;
      const wrong = generateWrongAnswers(correct, 3);
      const { options, correctIndex } = shuffleWithCorrect(formatNumber(correct), wrong.map(formatNumber));
      questions.push({
        id: questionId++,
        question: `How many blitz games has ${name} drawn?`,
        options,
        correctIndex,
      });
    }

    // === WIN RATE QUESTIONS ===

    // Blitz win rate
    if (stats.chess_blitz?.record) {
      const { win, loss, draw } = stats.chess_blitz.record;
      const total = win + loss + draw;
      if (total > 200) {
        const winRate = Math.round((win / total) * 100);
        const wrongRates = [winRate - 8, winRate + 7, winRate - 15].filter(r => r > 0 && r <= 100 && r !== winRate);
        while (wrongRates.length < 3) wrongRates.push(Math.min(99, winRate + wrongRates.length + 10));
        const { options, correctIndex } = shuffleWithCorrect(`${winRate}%`, wrongRates.slice(0, 3).map(r => `${r}%`));
        questions.push({
          id: questionId++,
          question: `What is ${name}'s blitz win percentage on Chess.com?`,
          options,
          correctIndex,
        });
      }
    }

    // Bullet win rate
    if (stats.chess_bullet?.record) {
      const { win, loss, draw } = stats.chess_bullet.record;
      const total = win + loss + draw;
      if (total > 200) {
        const winRate = Math.round((win / total) * 100);
        const wrongRates = [winRate - 10, winRate + 8, winRate - 18].filter(r => r > 0 && r <= 100 && r !== winRate);
        while (wrongRates.length < 3) wrongRates.push(Math.min(99, winRate + wrongRates.length + 12));
        const { options, correctIndex } = shuffleWithCorrect(`${winRate}%`, wrongRates.slice(0, 3).map(r => `${r}%`));
        questions.push({
          id: questionId++,
          question: `What is ${name}'s bullet win rate?`,
          options,
          correctIndex,
        });
      }
    }

    // Blitz draw percentage
    if (stats.chess_blitz?.record) {
      const { win, loss, draw } = stats.chess_blitz.record;
      const total = win + loss + draw;
      if (total > 200 && draw > 20) {
        const drawRate = Math.round((draw / total) * 100);
        if (drawRate > 0) {
          const wrongRates = [drawRate + 5, drawRate - 3, drawRate + 10].filter(r => r >= 0 && r <= 100 && r !== drawRate);
          while (wrongRates.length < 3) wrongRates.push(Math.max(1, drawRate + wrongRates.length * 2));
          const { options, correctIndex } = shuffleWithCorrect(`${drawRate}%`, wrongRates.slice(0, 3).map(r => `${r}%`));
          questions.push({
            id: questionId++,
            question: `What percentage of ${name}'s blitz games end in a draw?`,
            options,
            correctIndex,
          });
        }
      }
    }

    // === PUZZLES & TACTICS ===

    // Tactics highest
    if (stats.tactics?.highest?.rating) {
      const correct = stats.tactics.highest.rating;
      const wrong = generateWrongAnswers(correct);
      const { options, correctIndex } = shuffleWithCorrect(correct.toString(), wrong.map(String));
      questions.push({
        id: questionId++,
        question: `What is ${name}'s highest tactics rating on Chess.com?`,
        options,
        correctIndex,
      });
    }

    // Tactics lowest (funny!)
    if (stats.tactics?.lowest?.rating && stats.tactics?.highest?.rating) {
      const correct = stats.tactics.lowest.rating;
      if (stats.tactics.highest.rating - correct > 200) {
        const wrong = generateWrongAnswers(correct);
        const { options, correctIndex } = shuffleWithCorrect(correct.toString(), wrong.map(String));
        questions.push({
          id: questionId++,
          question: `What was ${name}'s LOWEST tactics rating ever? 😅`,
          options,
          correctIndex,
        });
      }
    }

    // Puzzle Rush best (survival mode score)
    if (stats.puzzle_rush?.best?.score && stats.puzzle_rush.best.score > 5) {
      const correct = stats.puzzle_rush.best.score;
      const wrong = generateWrongAnswers(correct, 3, Math.max(10, Math.floor(correct * 0.3)));
      const { options, correctIndex } = shuffleWithCorrect(correct.toString(), wrong.map(String));
      questions.push({
        id: questionId++,
        question: `What is ${name}'s best Puzzle Rush Survival score? (puzzles solved)`,
        options,
        correctIndex,
      });
    }

    // === PROFILE QUESTIONS ===

    // Followers
    if (profile.followers && profile.followers > 10) {
      const correct = profile.followers;
      const wrong = generateWrongAnswers(correct, 3);
      const { options, correctIndex } = shuffleWithCorrect(formatNumber(correct), wrong.map(formatNumber));
      questions.push({
        id: questionId++,
        question: `How many followers does ${name} have on Chess.com?`,
        options,
        correctIndex,
      });
    }

    // Year joined
    if (profile.joined) {
      const joinedYear = new Date(profile.joined * 1000).getFullYear();
      const currentYear = new Date().getFullYear();
      const wrongYears = [joinedYear - 1, joinedYear + 1, joinedYear - 2, joinedYear + 2]
        .filter(y => y >= 2007 && y <= currentYear && y !== joinedYear);
      const { options, correctIndex } = shuffleWithCorrect(joinedYear.toString(), wrongYears.slice(0, 3).map(String));
      questions.push({
        id: questionId++,
        question: `What year did ${name} create their Chess.com account?`,
        options,
        correctIndex,
      });
    }

    // Country
    if (profile.country) {
      const countryCode = profile.country.split('/').pop()?.toUpperCase() || '';
      const countryNames: Record<string, string> = {
        'US': 'United States', 'NL': 'Netherlands', 'AU': 'Australia', 'GB': 'United Kingdom',
        'DE': 'Germany', 'FR': 'France', 'NO': 'Norway', 'RU': 'Russia', 'IN': 'India',
        'CA': 'Canada', 'SE': 'Sweden', 'PL': 'Poland', 'ES': 'Spain', 'IT': 'Italy',
        'BR': 'Brazil', 'AR': 'Argentina', 'IR': 'Iran', 'AZ': 'Azerbaijan', 'AM': 'Armenia',
        'CN': 'China', 'JP': 'Japan', 'KR': 'South Korea', 'PH': 'Philippines', 'VN': 'Vietnam',
        'UA': 'Ukraine', 'CZ': 'Czech Republic', 'HU': 'Hungary', 'RO': 'Romania', 'GR': 'Greece',
        'TR': 'Turkey', 'IL': 'Israel', 'EG': 'Egypt', 'ZA': 'South Africa', 'MX': 'Mexico',
        'CO': 'Colombia', 'PE': 'Peru', 'CL': 'Chile', 'VE': 'Venezuela', 'ID': 'Indonesia',
        'MY': 'Malaysia', 'SG': 'Singapore', 'TH': 'Thailand', 'NZ': 'New Zealand', 'AT': 'Austria',
        'BE': 'Belgium', 'CH': 'Switzerland', 'DK': 'Denmark', 'FI': 'Finland', 'IE': 'Ireland',
        'PT': 'Portugal', 'RS': 'Serbia', 'HR': 'Croatia', 'SI': 'Slovenia', 'SK': 'Slovakia',
        'BG': 'Bulgaria', 'LT': 'Lithuania', 'LV': 'Latvia', 'EE': 'Estonia', 'BY': 'Belarus',
        'GE': 'Georgia', 'UZ': 'Uzbekistan', 'KZ': 'Kazakhstan', 'PK': 'Pakistan', 'BD': 'Bangladesh'
      };
      const correctCountry = countryNames[countryCode] || countryCode;
      if (correctCountry && correctCountry.length > 1) {
        const wrongCountries = Object.values(countryNames).filter(c => c !== correctCountry);
        const shuffledWrong = wrongCountries.sort(() => Math.random() - 0.5).slice(0, 3);
        const { options, correctIndex } = shuffleWithCorrect(correctCountry, shuffledWrong);
        questions.push({
          id: questionId++,
          question: `What country is ${name} from according to their Chess.com profile?`,
          options,
          correctIndex,
        });
      }
    }

    // Title
    if (profile.title) {
      const titles = ['GM', 'IM', 'FM', 'NM', 'CM', 'WGM', 'WIM', 'WFM', 'WCM', 'WNM'];
      const wrongTitles = titles.filter(t => t !== profile.title).sort(() => Math.random() - 0.5).slice(0, 3);
      const { options, correctIndex } = shuffleWithCorrect(profile.title, wrongTitles);
      questions.push({
        id: questionId++,
        question: `What official title does ${name} hold? 🏆`,
        options,
        correctIndex,
      });
    }

    // League
    if (profile.league) {
      const leagues = ['Legend', 'Champion', 'Master', 'Expert', 'Elite', 'Challenger', 'Crystal', 'Stone', 'Wood'];
      const wrongLeagues = leagues.filter(l => l.toLowerCase() !== profile.league?.toLowerCase()).sort(() => Math.random() - 0.5).slice(0, 3);
      const { options, correctIndex } = shuffleWithCorrect(profile.league, wrongLeagues);
      questions.push({
        id: questionId++,
        question: `What Chess.com league is ${name} currently in?`,
        options,
        correctIndex,
      });
    }

    // === COMPARISON / CALCULATION QUESTIONS ===

    // Rating difference (best vs current blitz)
    if (stats.chess_blitz?.best?.rating && stats.chess_blitz?.last?.rating) {
      const diff = stats.chess_blitz.best.rating - stats.chess_blitz.last.rating;
      if (diff > 20) {
        const wrongDiffs = [diff + 25, diff - 30, diff + 50].filter(d => d > 0 && d !== diff);
        while (wrongDiffs.length < 3) wrongDiffs.push(diff + (wrongDiffs.length + 1) * 20);
        const { options, correctIndex } = shuffleWithCorrect(diff.toString(), wrongDiffs.slice(0, 3).map(String));
        questions.push({
          id: questionId++,
          question: `How many rating points below their peak is ${name}'s current blitz rating?`,
          options,
          correctIndex,
        });
      }
    }

    // Rating difference (best vs current bullet)
    if (stats.chess_bullet?.best?.rating && stats.chess_bullet?.last?.rating) {
      const diff = stats.chess_bullet.best.rating - stats.chess_bullet.last.rating;
      if (diff > 20) {
        const wrongDiffs = [diff + 30, diff - 25, diff + 60].filter(d => d > 0 && d !== diff);
        while (wrongDiffs.length < 3) wrongDiffs.push(diff + (wrongDiffs.length + 1) * 25);
        const { options, correctIndex } = shuffleWithCorrect(diff.toString(), wrongDiffs.slice(0, 3).map(String));
        questions.push({
          id: questionId++,
          question: `How many points below peak is ${name}'s current bullet rating?`,
          options,
          correctIndex,
        });
      }
    }

    // Combined wins (bullet + blitz)
    if (stats.chess_bullet?.record?.win && stats.chess_blitz?.record?.win) {
      const combined = stats.chess_bullet.record.win + stats.chess_blitz.record.win;
      if (combined > 500) {
        const wrong = generateWrongAnswers(combined, 3);
        const { options, correctIndex } = shuffleWithCorrect(formatNumber(combined), wrong.map(formatNumber));
        questions.push({
          id: questionId++,
          question: `How many combined bullet + blitz wins does ${name} have?`,
          options,
          correctIndex,
        });
      }
    }

    // Years on Chess.com
    if (profile.joined) {
      const joinedYear = new Date(profile.joined * 1000).getFullYear();
      const yearsActive = new Date().getFullYear() - joinedYear;
      if (yearsActive >= 2) {
        const wrongYears = [yearsActive - 1, yearsActive + 1, yearsActive + 2].filter(y => y > 0 && y !== yearsActive);
        while (wrongYears.length < 3) wrongYears.push(yearsActive + wrongYears.length + 2);
        const { options, correctIndex } = shuffleWithCorrect(yearsActive.toString(), wrongYears.slice(0, 3).map(String));
        questions.push({
          id: questionId++,
          question: `How many years has ${name} been on Chess.com?`,
          options,
          correctIndex,
        });
      }
    }

    // Blitz vs Bullet rating comparison
    if (stats.chess_blitz?.last?.rating && stats.chess_bullet?.last?.rating) {
      const blitz = stats.chess_blitz.last.rating;
      const bullet = stats.chess_bullet.last.rating;
      const diff = Math.abs(blitz - bullet);
      if (diff > 30) {
        const higher = blitz > bullet ? 'Blitz' : 'Bullet';
        const wrongOptions = ['Blitz', 'Bullet', 'Same rating'].filter(o => o !== higher);
        const { options, correctIndex } = shuffleWithCorrect(higher, wrongOptions.slice(0, 3));
        questions.push({
          id: questionId++,
          question: `Which rating is higher for ${name}: Blitz or Bullet?`,
          options,
          correctIndex,
        });
      }
    }

    // Rating gap between blitz and bullet
    if (stats.chess_blitz?.last?.rating && stats.chess_bullet?.last?.rating) {
      const diff = Math.abs(stats.chess_blitz.last.rating - stats.chess_bullet.last.rating);
      if (diff > 30) {
        const wrongDiffs = [diff + 40, diff - 30, diff + 80].filter(d => d > 0 && d !== diff);
        while (wrongDiffs.length < 3) wrongDiffs.push(diff + (wrongDiffs.length + 1) * 30);
        const { options, correctIndex } = shuffleWithCorrect(diff.toString(), wrongDiffs.slice(0, 3).map(String));
        questions.push({
          id: questionId++,
          question: `What is the rating gap between ${name}'s blitz and bullet ratings?`,
          options,
          correctIndex,
        });
      }
    }

    // FIDE rating
    if (stats.fide) {
      const correct = stats.fide;
      const wrong = generateWrongAnswers(correct);
      const { options, correctIndex } = shuffleWithCorrect(correct.toString(), wrong.map(String));
      questions.push({
        id: questionId++,
        question: `What is ${name}'s FIDE rating? 🏆`,
        options,
        correctIndex,
      });
    }

    // Account age in months (more specific than years)
    if (profile.joined) {
      const joinedDate = new Date(profile.joined * 1000);
      const now = new Date();
      const months = (now.getFullYear() - joinedDate.getFullYear()) * 12 + (now.getMonth() - joinedDate.getMonth());
      if (months > 24 && months < 200) {
        const wrongMonths = [months - 15, months + 20, months - 30].filter(m => m > 0 && m !== months);
        while (wrongMonths.length < 3) wrongMonths.push(months + (wrongMonths.length + 1) * 15);
        const { options, correctIndex } = shuffleWithCorrect(months.toString(), wrongMonths.slice(0, 3).map(String));
        questions.push({
          id: questionId++,
          question: `How many months has ${name} been a Chess.com member?`,
          options,
          correctIndex,
        });
      }
    }

    // Shuffle and limit to 15 questions
    const shuffledQuestions = questions.sort(() => Math.random() - 0.5).slice(0, 15);
    
    // Re-number questions
    shuffledQuestions.forEach((q, i) => {
      q.id = i + 1;
    });

    return NextResponse.json({
      username: profile.username,
      questions: shuffledQuestions,
      totalQuestions: shuffledQuestions.length,
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json({ error: 'Failed to fetch player data' }, { status: 500 });
  }
}
