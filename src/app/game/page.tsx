'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface Question {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
}

interface PlayerScore {
  username: string;
  score: number;
  streak: number;
  lastAnswerTime: number;
}

type GameState = 'loading' | 'ready' | 'countdown' | 'question-preview' | 'question' | 'reveal' | 'finished';
type Occasion = 'anniversary' | 'birthday' | 'chess';

// Timing constants
const COUNTDOWN_TIME = 10; // 10s before first question
const QUESTION_PREVIEW_TIME = 5; // 5s showing question without options
const ANSWER_TIME = 15; // 15s to answer after options appear
const REVEAL_TIME = 10; // 10s between questions

// Points: Q1=500 max, increases by 100 each question, Q15=1900 max
const BASE_MAX_POINTS = 500;
const POINTS_INCREMENT = 100;
const MIN_POINTS = 100;
const STREAK_BONUS = 100;

function GameContent() {
  const searchParams = useSearchParams();
  const username = searchParams.get('username') || '';
  const name = searchParams.get('name') || username;
  const occasion = (searchParams.get('occasion') || 'chess') as Occasion;
  const twitchChannel = searchParams.get('twitch') || '';

  const [gameState, setGameState] = useState<GameState>('loading');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(COUNTDOWN_TIME);
  const [scores, setScores] = useState<Map<string, PlayerScore>>(new Map());
  const [answeredThisRound, setAnsweredThisRound] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const questionStartTimeRef = useRef<number>(0);

  const currentQuestion = questions[currentQuestionIndex];

  // Calculate max points for current question
  const getMaxPoints = (questionIndex: number) => {
    return BASE_MAX_POINTS + (questionIndex * POINTS_INCREMENT);
  };

  const getTitle = () => {
    switch (occasion) {
      case 'anniversary':
        return `${name}'s Stream Anniversary`;
      case 'birthday':
        return `${name}'s Birthday`;
      case 'chess':
      default:
        return `${name}'s Chess.com Trivia`;
    }
  };

  const getSubtitle = () => {
    switch (occasion) {
      case 'anniversary':
        return 'Chess.com Anniversary Trivia';
      case 'birthday':
        return 'Chess.com Birthday Trivia';
      case 'chess':
      default:
        return 'Chess.com Trivia Challenge';
    }
  };

  // Fetch questions
  useEffect(() => {
    if (!username) return;

    const fetchQuestions = async () => {
      try {
        const res = await fetch(`/api/questions?username=${username}&name=${name}`);
        if (!res.ok) throw new Error('Failed to fetch questions');
        const data = await res.json();
        setQuestions(data.questions);
        setGameState('ready');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load questions');
      }
    };

    fetchQuestions();
  }, [username, name]);

  // Connect to Twitch IRC
  useEffect(() => {
    if (!twitchChannel || gameState === 'loading') return;

    const ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
      ws.send('NICK justinfan' + Math.floor(Math.random() * 99999));
      ws.send(`JOIN #${twitchChannel}`);
    };

    ws.onmessage = (event) => {
      const message = event.data;
      
      if (message.startsWith('PING')) {
        ws.send('PONG :tmi.twitch.tv');
        return;
      }

      if (message.includes('End of /NAMES list')) {
        setConnected(true);
      }

      if (message.includes('PRIVMSG')) {
        const usernameMatch = message.match(/:(\w+)!\w+@\w+\.tmi\.twitch\.tv PRIVMSG/);
        const msgMatch = message.match(/PRIVMSG #\w+ :(.+)/);
        
        if (usernameMatch && msgMatch) {
          const chatUsername = usernameMatch[1].toLowerCase();
          const chatMessage = msgMatch[1].trim().toLowerCase();
          
          handleChatMessage(chatUsername, chatMessage);
        }
      }
    };

    ws.onerror = () => setConnected(false);
    ws.onclose = () => setConnected(false);

    return () => ws.close();
  }, [twitchChannel, gameState]);

  const handleChatMessage = useCallback((chatUsername: string, message: string) => {
    // Only accept answers during question phase with options showing
    if (gameState !== 'question' || !showOptions) return;
    if (!currentQuestion) return;
    if (answeredThisRound.has(chatUsername)) return;

    // ONLY accept !a, !b, !c, !d
    const answerMap: Record<string, number> = {
      '!a': 0,
      '!b': 1,
      '!c': 2,
      '!d': 3,
    };

    const answerIndex = answerMap[message];
    if (answerIndex === undefined || answerIndex >= currentQuestion.options.length) return;

    const isCorrect = answerIndex === currentQuestion.correctIndex;
    const timeTaken = (Date.now() - questionStartTimeRef.current) / 1000;
    const timeRatio = Math.max(0, (ANSWER_TIME - timeTaken) / ANSWER_TIME);
    
    // Calculate points: escalating base + time bonus + streak bonus
    const maxPoints = getMaxPoints(currentQuestionIndex);
    let basePoints = isCorrect 
      ? Math.round(MIN_POINTS + (maxPoints - MIN_POINTS) * timeRatio)
      : 0;

    setScores(prev => {
      const newScores = new Map(prev);
      const existing = newScores.get(chatUsername) || { username: chatUsername, score: 0, streak: 0, lastAnswerTime: 0 };
      
      // Calculate streak
      let newStreak = isCorrect ? existing.streak + 1 : 0;
      
      // Add streak bonus if correct and on a streak (2+ in a row)
      const streakPoints = isCorrect && newStreak >= 2 ? STREAK_BONUS : 0;
      
      newScores.set(chatUsername, {
        ...existing,
        score: existing.score + basePoints + streakPoints,
        streak: newStreak,
        lastAnswerTime: Date.now(),
      });
      return newScores;
    });

    setAnsweredThisRound(prev => new Set(prev).add(chatUsername));
  }, [gameState, showOptions, currentQuestion, answeredThisRound, currentQuestionIndex]);

  // Countdown timer (before first question)
  useEffect(() => {
    if (gameState !== 'countdown') return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameState('question-preview');
          setShowOptions(false);
          return QUESTION_PREVIEW_TIME;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState]);

  // Question preview timer (showing question without options)
  useEffect(() => {
    if (gameState !== 'question-preview') return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameState('question');
          setShowOptions(true);
          questionStartTimeRef.current = Date.now();
          return ANSWER_TIME;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState]);

  // Answer timer
  useEffect(() => {
    if (gameState !== 'question') return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Reset streaks for players who didn't answer this round
          setScores(prevScores => {
            const newScores = new Map(prevScores);
            newScores.forEach((player, username) => {
              if (!answeredThisRound.has(username) && player.streak > 0) {
                newScores.set(username, { ...player, streak: 0 });
              }
            });
            return newScores;
          });
          setGameState('reveal');
          return REVEAL_TIME;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, answeredThisRound]);

  // Reveal timer (between questions)
  useEffect(() => {
    if (gameState !== 'reveal') return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (currentQuestionIndex >= questions.length - 1) {
            setGameState('finished');
          } else {
            setCurrentQuestionIndex(i => i + 1);
            setAnsweredThisRound(new Set());
            setShowOptions(false);
            setGameState('question-preview');
            return QUESTION_PREVIEW_TIME;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, currentQuestionIndex, questions.length]);

  const startGame = () => {
    setGameState('countdown');
    setTimeLeft(COUNTDOWN_TIME);
  };

  const restartGame = () => {
    setCurrentQuestionIndex(0);
    setScores(new Map());
    setAnsweredThisRound(new Set());
    setShowOptions(false);
    setGameState('ready');
  };

  const leaderboard = Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">{error}</div>
          <a href="/" className="text-pink-400 hover:underline">Go back</a>
        </div>
      </main>
    );
  }

  // Leaderboard Component - Now full width
  const LeaderboardPanel = ({ className = '' }: { className?: string }) => (
    <div className={`bg-purple-950/60 backdrop-blur border border-purple-500/30 rounded-2xl p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">🏆 Leaderboard</h3>
        {gameState === 'question' && answeredThisRound.size > 0 && (
          <span className="text-xs text-pink-300 bg-pink-500/20 px-2 py-1 rounded-full border border-pink-500/30">
            {answeredThisRound.size} answered
          </span>
        )}
      </div>
      
      {leaderboard.length === 0 ? (
        <div className="text-center py-6">
          <div className="text-purple-400 text-3xl mb-2">♟</div>
          <p className="text-purple-300 text-sm">Waiting for players...</p>
          <p className="text-purple-400/60 text-xs mt-1">Type !a !b !c or !d in chat</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {leaderboard.map((player, index) => (
            <div 
              key={player.username}
              className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                index === 0 
                  ? 'bg-gradient-to-r from-yellow-500/20 to-pink-500/20 border border-yellow-400/40' 
                  : 'bg-purple-900/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold ${
                  index === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white' : 
                  index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-800' :
                  index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700 text-white' :
                  'bg-purple-800 text-purple-300'
                }`}>
                  {index + 1}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium truncate max-w-[100px]">
                    {player.username}
                  </span>
                  {player.streak >= 2 && (
                    <span className="text-xs bg-orange-500/30 text-orange-300 px-1.5 py-0.5 rounded border border-orange-500/40">
                      🔥{player.streak}
                    </span>
                  )}
                </div>
              </div>
              <span className={`font-bold ${index === 0 ? 'text-yellow-400' : 'text-purple-200'}`}>
                {player.score.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <main className="min-h-screen p-4 md:p-6">
      {/* Header */}
      <header className="text-center mb-6 animate-fade-in">
        <div className="inline-block mb-2 px-3 py-1 bg-green-500/20 border border-green-500/40 rounded-full">
          <span className="text-green-400 text-xs font-medium">♟ Chess.com Trivia</span>
        </div>
        <h1 className="text-2xl md:text-5xl font-bold bg-gradient-to-r from-pink-400 via-yellow-300 to-cyan-400 bg-clip-text text-transparent mb-2 drop-shadow-lg">{getTitle()}</h1>
        <p className="text-purple-300 text-sm md:text-lg">{getSubtitle()} 🎉</p>
        
        <div className="mt-3 flex items-center justify-center gap-2 text-xs md:text-sm">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
          <span className="text-purple-300/70">
            {connected ? `Connected to ${twitchChannel}` : 'Connecting...'}
          </span>
        </div>
      </header>

      {/* Main Layout */}
      <div className="max-w-3xl mx-auto">
        {/* Loading State */}
        {gameState === 'loading' && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-pink-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-purple-300">Loading Chess.com data...</p>
            </div>
          </div>
        )}

        {/* Ready State - Instructions */}
        {gameState === 'ready' && (
          <div className="py-8 animate-fade-in">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🎊</div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-pink-400 bg-clip-text text-transparent mb-2">How to Play</h2>
              <p className="text-purple-300">
                {questions.length} questions about {name}&apos;s Chess.com stats
              </p>
            </div>

            {/* Instructions Cards */}
            <div className="space-y-4 mb-8">
              {/* Voting */}
              <div className="bg-purple-950/60 border border-purple-500/30 rounded-2xl p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">💬</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">How to Answer</h3>
                    <p className="text-purple-300 text-sm mb-3">
                      Type your answer in Twitch chat:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1.5 bg-pink-500/20 border border-pink-500/40 rounded-lg text-pink-300 font-mono text-sm font-bold">!a</span>
                      <span className="px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/40 rounded-lg text-yellow-300 font-mono text-sm font-bold">!b</span>
                      <span className="px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/40 rounded-lg text-cyan-300 font-mono text-sm font-bold">!c</span>
                      <span className="px-3 py-1.5 bg-orange-500/20 border border-orange-500/40 rounded-lg text-orange-300 font-mono text-sm font-bold">!d</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Points */}
              <div className="bg-purple-950/60 border border-purple-500/30 rounded-2xl p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">⚡</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Points System</h3>
                    <p className="text-purple-300 text-sm mb-2">
                      Points increase each question! Later questions are worth more.
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-sm mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-purple-200">Q1:</span>
                        <span className="text-cyan-400 font-semibold">500 pts max</span>
                      </div>
                      <span className="text-purple-500">→</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-purple-200">Q15:</span>
                        <span className="text-pink-400 font-semibold">1900 pts max</span>
                      </div>
                    </div>
                    <p className="text-orange-300 text-sm">
                      🔥 +100 bonus for each correct answer in a row! (Miss or wrong = streak resets)
                    </p>
                  </div>
                </div>
              </div>

              {/* Timing */}
              <div className="bg-purple-950/60 border border-purple-500/30 rounded-2xl p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">⏱</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Timing</h3>
                    <ul className="text-purple-300 text-sm space-y-1">
                      <li>• Question appears first for <span className="text-yellow-300 font-semibold">5 seconds</span></li>
                      <li>• Then options appear — <span className="text-yellow-300 font-semibold">{ANSWER_TIME} seconds</span> to answer</li>
                      <li>• Answer fast for more points!</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Start Button */}
            <div className="text-center">
              <button
                onClick={startGame}
                className="px-10 py-4 bg-gradient-to-r from-pink-500 via-orange-400 to-yellow-400 text-white font-bold rounded-xl hover:from-pink-600 hover:via-orange-500 hover:to-yellow-500 transition-all text-lg shadow-lg shadow-pink-500/30 transform hover:scale-105"
              >
                🎮 Start Game
              </button>
              <p className="mt-4 text-xs text-purple-400/60">
                Make sure chat is connected before starting
              </p>
            </div>
          </div>
        )}

        {/* Countdown State */}
        {gameState === 'countdown' && (
          <div className="flex items-center justify-center py-20 animate-fade-in">
            <div className="text-center">
              <p className="text-purple-300 text-xl mb-6">Get Ready!</p>
              <div className="text-9xl font-bold bg-gradient-to-r from-pink-400 via-yellow-300 to-cyan-400 bg-clip-text text-transparent animate-pulse">
                {timeLeft}
              </div>
              <p className="text-purple-400 mt-6">First question coming up...</p>
            </div>
          </div>
        )}

        {/* Question States */}
        {(gameState === 'question-preview' || gameState === 'question' || gameState === 'reveal') && currentQuestion && (
          <div className="space-y-4 animate-fade-in">
            {/* Header with question info */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-purple-300 text-sm">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </span>
                {gameState === 'question' && (
                  <span className="text-xs bg-purple-800/50 text-purple-300 px-2 py-1 rounded">
                    Max: {getMaxPoints(currentQuestionIndex)} pts
                  </span>
                )}
              </div>
              {/* Simple counter for preview/reveal, timer for question */}
              {gameState === 'question-preview' && (
                <span className="text-cyan-300 text-sm">
                  👀 Options in {timeLeft}s
                </span>
              )}
              {gameState === 'reveal' && (
                <span className="text-green-400 text-sm">
                  Next in {timeLeft}s
                </span>
              )}
              {gameState === 'question' && (
                <span className={`text-xl font-bold ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-yellow-300'}`}>
                  ⏱ {timeLeft}s
                </span>
              )}
            </div>

            {/* Progress bar - ONLY during answer phase */}
            {gameState === 'question' && (
              <div className="h-2 bg-purple-900/50 rounded-full overflow-hidden border border-purple-500/30">
                <div 
                  className={`h-full transition-all duration-1000 linear rounded-full ${
                    timeLeft <= 5 ? 'bg-gradient-to-r from-red-500 to-orange-500' :
                    'bg-gradient-to-r from-pink-500 via-orange-400 to-yellow-400'
                  }`}
                  style={{ width: `${(timeLeft / ANSWER_TIME) * 100}%` }}
                />
              </div>
            )}

            {/* Question Card */}
            <div className="bg-purple-950/60 border border-purple-500/30 rounded-2xl p-6 md:p-8">
              <h2 className="text-xl md:text-2xl font-semibold text-white text-center">
                {currentQuestion.question}
              </h2>
              {gameState === 'question-preview' && (
                <p className="text-center text-purple-400 mt-4 animate-pulse">
                  Options appearing in {timeLeft}...
                </p>
              )}
            </div>

            {/* Options Grid - Only show after preview */}
            {showOptions && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentQuestion.options.map((option, index) => {
                  const letter = ['A', 'B', 'C', 'D'][index];
                  const isCorrect = index === currentQuestion.correctIndex;
                  const showResult = gameState === 'reveal';
                  const optionColors = [
                    { bg: 'bg-pink-500/10', border: 'border-pink-500/40', text: 'text-pink-300', badge: 'bg-pink-500' },
                    { bg: 'bg-yellow-500/10', border: 'border-yellow-500/40', text: 'text-yellow-300', badge: 'bg-yellow-500' },
                    { bg: 'bg-cyan-500/10', border: 'border-cyan-500/40', text: 'text-cyan-300', badge: 'bg-cyan-500' },
                    { bg: 'bg-orange-500/10', border: 'border-orange-500/40', text: 'text-orange-300', badge: 'bg-orange-500' },
                  ];
                  const colors = optionColors[index];
                  
                  return (
                    <div
                      key={index}
                      className={`p-4 md:p-5 rounded-xl border-2 transition-all ${
                        showResult
                          ? isCorrect
                            ? 'bg-green-500/20 border-green-400 text-green-300'
                            : 'bg-purple-950/30 border-purple-800/50 text-purple-400'
                          : `${colors.bg} ${colors.border} text-white`
                      }`}
                    >
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg mr-3 text-sm font-bold ${
                        showResult && isCorrect 
                          ? 'bg-green-500 text-white' 
                          : showResult
                          ? 'bg-purple-800 text-purple-400'
                          : `${colors.badge} text-white`
                      }`}>
                        {letter}
                      </span>
                      <span className="text-base md:text-lg">{option}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Answer Hint / Reveal */}
            <div className="text-center py-2">
              {gameState === 'question' && showOptions && (
                <p className="text-purple-400/80 text-sm">
                  Type <span className="text-pink-400 font-medium">!a</span>{' '}
                  <span className="text-yellow-400 font-medium">!b</span>{' '}
                  <span className="text-cyan-400 font-medium">!c</span> or{' '}
                  <span className="text-orange-400 font-medium">!d</span> in chat
                </p>
              )}
              {gameState === 'reveal' && (
                <p className="text-green-400 text-lg font-medium">
                  ✅ Answer: {['A', 'B', 'C', 'D'][currentQuestion.correctIndex]} - {currentQuestion.options[currentQuestion.correctIndex]}
                </p>
              )}
            </div>

            {/* Leaderboard - Below questions */}
            <LeaderboardPanel />
          </div>
        )}

        {/* Finished State */}
        {gameState === 'finished' && (
          <div className="space-y-6 animate-fade-in py-8">
            <div className="text-center">
              <div className="text-6xl mb-6">🎉</div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent mb-2">Game Over!</h2>
              <p className="text-purple-300 mb-6">Thanks for playing 🎊</p>
              
              {leaderboard.length > 0 && (
                <div className="mb-8 p-6 bg-gradient-to-r from-yellow-500/10 via-pink-500/10 to-cyan-500/10 border border-yellow-400/30 rounded-2xl inline-block">
                  <p className="text-sm text-purple-300 mb-2">👑 Winner</p>
                  <p className="text-3xl text-yellow-300 font-bold">{leaderboard[0].username}</p>
                  <p className="text-pink-400 text-xl">{leaderboard[0].score.toLocaleString()} points</p>
                  {leaderboard[0].streak >= 2 && (
                    <p className="text-orange-300 text-sm mt-1">🔥 Ended on a {leaderboard[0].streak} streak!</p>
                  )}
                </div>
              )}

              <div className="block">
                <button
                  onClick={restartGame}
                  className="px-8 py-4 bg-gradient-to-r from-pink-500 via-orange-400 to-yellow-400 text-white font-bold rounded-xl hover:from-pink-600 hover:via-orange-500 hover:to-yellow-500 transition-all transform hover:scale-105 shadow-lg shadow-pink-500/30"
                >
                  🎮 Play Again
                </button>
              </div>
            </div>

            {/* Final Leaderboard */}
            <LeaderboardPanel />
          </div>
        )}
      </div>
    </main>
  );
}

export default function GamePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-950 to-indigo-950">
        <div className="w-12 h-12 border-4 border-pink-400 border-t-transparent rounded-full animate-spin" />
      </main>
    }>
      <GameContent />
    </Suspense>
  );
}
