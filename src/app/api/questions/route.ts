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

function generateWrongAnswers(correct: number, count: number = 3): number[] {
  const wrong: number[] = [];
  const variance = Math.max(Math.floor(correct * 0.3), 50);
  
  while (wrong.length < count) {
    const offset = Math.floor(Math.random() * variance * 2) - variance;
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

    // Question: Best bullet rating
    if (stats.chess_bullet?.best?.rating) {
      const correct = stats.chess_bullet.best.rating;
      const wrong = generateWrongAnswers(correct);
      const { options, correctIndex } = shuffleWithCorrect(correct.toString(), wrong.map(String));
      questions.push({
        id: questionId++,
        question: `What is ${name}'s highest bullet rating ever?`,
        options,
        correctIndex,
      });
    }

    // Question: Best blitz rating
    if (stats.chess_blitz?.best?.rating) {
      const correct = stats.chess_blitz.best.rating;
      const wrong = generateWrongAnswers(correct);
      const { options, correctIndex } = shuffleWithCorrect(correct.toString(), wrong.map(String));
      questions.push({
        id: questionId++,
        question: `What is ${name}'s peak blitz rating?`,
        options,
        correctIndex,
      });
    }

    // Question: Best rapid rating
    if (stats.chess_rapid?.best?.rating) {
      const correct = stats.chess_rapid.best.rating;
      const wrong = generateWrongAnswers(correct);
      const { options, correctIndex } = shuffleWithCorrect(correct.toString(), wrong.map(String));
      questions.push({
        id: questionId++,
        question: `What is ${name}'s highest rapid rating?`,
        options,
        correctIndex,
      });
    }

    // Question: Current bullet rating
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

    // Question: Current blitz rating
    if (stats.chess_blitz?.last?.rating) {
      const correct = stats.chess_blitz.last.rating;
      const wrong = generateWrongAnswers(correct);
      const { options, correctIndex } = shuffleWithCorrect(correct.toString(), wrong.map(String));
      questions.push({
        id: questionId++,
        question: `What is ${name}'s current blitz rating?`,
        options,
        correctIndex,
      });
    }

    // Question: Total blitz games
    if (stats.chess_blitz?.record) {
      const { win, loss, draw } = stats.chess_blitz.record;
      const total = win + loss + draw;
      const correct = total;
      const wrong = generateWrongAnswers(correct, 3);
      const { options, correctIndex } = shuffleWithCorrect(formatNumber(correct), wrong.map(formatNumber));
      questions.push({
        id: questionId++,
        question: `How many blitz games has ${name} played in total?`,
        options,
        correctIndex,
      });
    }

    // Question: Blitz wins
    if (stats.chess_blitz?.record?.win) {
      const correct = stats.chess_blitz.record.win;
      const wrong = generateWrongAnswers(correct, 3);
      const { options, correctIndex } = shuffleWithCorrect(formatNumber(correct), wrong.map(formatNumber));
      questions.push({
        id: questionId++,
        question: `How many blitz games has ${name} won?`,
        options,
        correctIndex,
      });
    }

    // Question: Bullet wins
    if (stats.chess_bullet?.record?.win) {
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

    // Question: Tactics highest
    if (stats.tactics?.highest?.rating) {
      const correct = stats.tactics.highest.rating;
      const wrong = generateWrongAnswers(correct);
      const { options, correctIndex } = shuffleWithCorrect(correct.toString(), wrong.map(String));
      questions.push({
        id: questionId++,
        question: `What is ${name}'s highest tactics rating?`,
        options,
        correctIndex,
      });
    }

    // Question: Puzzle Rush best
    if (stats.puzzle_rush?.best?.score) {
      const correct = stats.puzzle_rush.best.score;
      const wrong = generateWrongAnswers(correct, 3);
      const { options, correctIndex } = shuffleWithCorrect(correct.toString(), wrong.map(String));
      questions.push({
        id: questionId++,
        question: `What is ${name}'s best Puzzle Rush score?`,
        options,
        correctIndex,
      });
    }

    // Question: Followers
    if (profile.followers) {
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

    // Question: Year joined
    if (profile.joined) {
      const joinedYear = new Date(profile.joined * 1000).getFullYear();
      const wrongYears = [joinedYear - 1, joinedYear + 1, joinedYear - 2].filter(y => y > 2006 && y <= new Date().getFullYear());
      while (wrongYears.length < 3) {
        wrongYears.push(joinedYear + wrongYears.length + 1);
      }
      const { options, correctIndex } = shuffleWithCorrect(joinedYear.toString(), wrongYears.slice(0, 3).map(String));
      questions.push({
        id: questionId++,
        question: `What year did ${name} join Chess.com?`,
        options,
        correctIndex,
      });
    }

    // Question: Country
    if (profile.country) {
      const countryCode = profile.country.split('/').pop()?.toUpperCase() || '';
      const countryNames: Record<string, string> = {
        'US': 'United States', 'NL': 'Netherlands', 'AU': 'Australia', 'GB': 'United Kingdom',
        'DE': 'Germany', 'FR': 'France', 'NO': 'Norway', 'RU': 'Russia', 'IN': 'India',
        'CA': 'Canada', 'SE': 'Sweden', 'PL': 'Poland', 'ES': 'Spain', 'IT': 'Italy',
        'BR': 'Brazil', 'AR': 'Argentina', 'IR': 'Iran', 'AZ': 'Azerbaijan', 'AM': 'Armenia',
        'CN': 'China', 'JP': 'Japan', 'KR': 'South Korea', 'PH': 'Philippines', 'VN': 'Vietnam'
      };
      const correctCountry = countryNames[countryCode] || countryCode;
      const wrongCountries = Object.values(countryNames).filter(c => c !== correctCountry).slice(0, 10);
      const shuffledWrong = wrongCountries.sort(() => Math.random() - 0.5).slice(0, 3);
      const { options, correctIndex } = shuffleWithCorrect(correctCountry, shuffledWrong);
      questions.push({
        id: questionId++,
        question: `What country is ${name} from?`,
        options,
        correctIndex,
      });
    }

    // Question: Is streamer
    if (profile.is_streamer !== undefined) {
      const correct = profile.is_streamer ? 'Yes' : 'No';
      const wrong = profile.is_streamer ? 'No' : 'Yes';
      questions.push({
        id: questionId++,
        question: `Is ${name} a verified Chess.com streamer?`,
        options: [correct, wrong],
        correctIndex: 0,
      });
    }

    // Question: Total rapid games
    if (stats.chess_rapid?.record) {
      const { win, loss, draw } = stats.chess_rapid.record;
      const total = win + loss + draw;
      const correct = total;
      const wrong = generateWrongAnswers(correct, 3);
      const { options, correctIndex } = shuffleWithCorrect(formatNumber(correct), wrong.map(formatNumber));
      questions.push({
        id: questionId++,
        question: `How many rapid games has ${name} played?`,
        options,
        correctIndex,
      });
    }

    // Question: Blitz win rate
    if (stats.chess_blitz?.record) {
      const { win, loss, draw } = stats.chess_blitz.record;
      const total = win + loss + draw;
      if (total > 100) {
        const winRate = Math.round((win / total) * 100);
        const wrongRates = [winRate - 8, winRate + 7, winRate - 15].filter(r => r > 0 && r <= 100 && r !== winRate);
        while (wrongRates.length < 3) wrongRates.push(winRate + wrongRates.length + 10);
        const { options, correctIndex } = shuffleWithCorrect(`${winRate}%`, wrongRates.slice(0, 3).map(r => `${r}%`));
        questions.push({
          id: questionId++,
          question: `What is ${name}'s blitz win rate?`,
          options,
          correctIndex,
        });
      }
    }

    // Question: Bullet win rate
    if (stats.chess_bullet?.record) {
      const { win, loss, draw } = stats.chess_bullet.record;
      const total = win + loss + draw;
      if (total > 100) {
        const winRate = Math.round((win / total) * 100);
        const wrongRates = [winRate - 10, winRate + 8, winRate - 18].filter(r => r > 0 && r <= 100 && r !== winRate);
        while (wrongRates.length < 3) wrongRates.push(winRate + wrongRates.length + 12);
        const { options, correctIndex } = shuffleWithCorrect(`${winRate}%`, wrongRates.slice(0, 3).map(r => `${r}%`));
        questions.push({
          id: questionId++,
          question: `What is ${name}'s bullet win rate?`,
          options,
          correctIndex,
        });
      }
    }

    // Question: Blitz draw percentage
    if (stats.chess_blitz?.record) {
      const { win, loss, draw } = stats.chess_blitz.record;
      const total = win + loss + draw;
      if (total > 100 && draw > 0) {
        const drawRate = Math.round((draw / total) * 100);
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

    // Question: Total bullet games
    if (stats.chess_bullet?.record) {
      const { win, loss, draw } = stats.chess_bullet.record;
      const total = win + loss + draw;
      const wrong = generateWrongAnswers(total, 3);
      const { options, correctIndex } = shuffleWithCorrect(formatNumber(total), wrong.map(formatNumber));
      questions.push({
        id: questionId++,
        question: `How many bullet games has ${name} played in total?`,
        options,
        correctIndex,
      });
    }

    // Question: Blitz losses (fun!)
    if (stats.chess_blitz?.record?.loss && stats.chess_blitz.record.loss > 50) {
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

    // Question: Bullet losses
    if (stats.chess_bullet?.record?.loss && stats.chess_bullet.record.loss > 50) {
      const correct = stats.chess_bullet.record.loss;
      const wrong = generateWrongAnswers(correct, 3);
      const { options, correctIndex } = shuffleWithCorrect(formatNumber(correct), wrong.map(formatNumber));
      questions.push({
        id: questionId++,
        question: `How many bullet games has ${name} LOST?`,
        options,
        correctIndex,
      });
    }

    // Question: Blitz draws
    if (stats.chess_blitz?.record?.draw && stats.chess_blitz.record.draw > 20) {
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

    // Question: FIDE rating
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

    // Question: Lowest tactics rating (funny!)
    if (stats.tactics?.lowest?.rating && stats.tactics?.highest?.rating) {
      const correct = stats.tactics.lowest.rating;
      const wrong = generateWrongAnswers(correct);
      const { options, correctIndex } = shuffleWithCorrect(correct.toString(), wrong.map(String));
      questions.push({
        id: questionId++,
        question: `What was ${name}'s LOWEST tactics rating ever? 😅`,
        options,
        correctIndex,
      });
    }

    // Question: Title
    if (profile.title) {
      const titles = ['GM', 'IM', 'FM', 'NM', 'CM', 'WGM', 'WIM', 'WFM'];
      const wrongTitles = titles.filter(t => t !== profile.title).sort(() => Math.random() - 0.5).slice(0, 3);
      const { options, correctIndex } = shuffleWithCorrect(profile.title, wrongTitles);
      questions.push({
        id: questionId++,
        question: `What title does ${name} hold?`,
        options,
        correctIndex,
      });
    }

    // Question: League
    if (profile.league) {
      const leagues = ['Legend', 'Champion', 'Master', 'Expert', 'Elite', 'Challenger', 'Wood'];
      const wrongLeagues = leagues.filter(l => l !== profile.league).sort(() => Math.random() - 0.5).slice(0, 3);
      const { options, correctIndex } = shuffleWithCorrect(profile.league, wrongLeagues);
      questions.push({
        id: questionId++,
        question: `What Chess.com league is ${name} in?`,
        options,
        correctIndex,
      });
    }

    // Question: Rating difference (best vs current blitz)
    if (stats.chess_blitz?.best?.rating && stats.chess_blitz?.last?.rating) {
      const diff = stats.chess_blitz.best.rating - stats.chess_blitz.last.rating;
      if (diff > 10) {
        const wrongDiffs = [diff + 25, diff - 30, diff + 50].filter(d => d > 0 && d !== diff);
        while (wrongDiffs.length < 3) wrongDiffs.push(diff + wrongDiffs.length * 20);
        const { options, correctIndex } = shuffleWithCorrect(diff.toString(), wrongDiffs.slice(0, 3).map(String));
        questions.push({
          id: questionId++,
          question: `How many rating points below their peak is ${name}'s current blitz rating?`,
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
