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
  lastAnswerTime: number;
}

type GameState = 'loading' | 'ready' | 'question' | 'reveal' | 'finished';
type Occasion = 'anniversary' | 'birthday' | 'chess';

const QUESTION_TIME = 15; // seconds
const REVEAL_TIME = 4; // seconds
const MAX_POINTS = 1000;
const MIN_POINTS = 100;

function GameContent() {
  const searchParams = useSearchParams();
  const username = searchParams.get('username') || '';
  const name = searchParams.get('name') || username;
  const occasion = (searchParams.get('occasion') || 'chess') as Occasion;
  const twitchChannel = searchParams.get('twitch') || '';

  const [gameState, setGameState] = useState<GameState>('loading');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [scores, setScores] = useState<Map<string, PlayerScore>>(new Map());
  const [answeredThisRound, setAnsweredThisRound] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const questionStartTimeRef = useRef<number>(0);

  const currentQuestion = questions[currentQuestionIndex];

  const getTitle = () => {
    switch (occasion) {
      case 'anniversary':
        return `${name}'s Stream Anniversary`;
      case 'birthday':
        return `${name}'s Birthday`;
      case 'chess':
      default:
        return `${name}'s Chess Trivia`;
    }
  };

  const getSubtitle = () => {
    switch (occasion) {
      case 'anniversary':
        return 'Anniversary Trivia Challenge';
      case 'birthday':
        return 'Birthday Trivia Challenge';
      case 'chess':
      default:
        return 'Trivia Challenge';
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
    if (gameState !== 'question') return;
    if (!currentQuestion) return;
    if (answeredThisRound.has(chatUsername)) return;

    const answerMap: Record<string, number> = {
      '!a': 0, '!1': 0, 'a': 0, '1': 0,
      '!b': 1, '!2': 1, 'b': 1, '2': 1,
      '!c': 2, '!3': 2, 'c': 2, '3': 2,
      '!d': 3, '!4': 3, 'd': 3, '4': 3,
    };

    const answerIndex = answerMap[message];
    if (answerIndex === undefined || answerIndex >= currentQuestion.options.length) return;

    const timeTaken = (Date.now() - questionStartTimeRef.current) / 1000;
    const timeRatio = Math.max(0, (QUESTION_TIME - timeTaken) / QUESTION_TIME);
    const basePoints = answerIndex === currentQuestion.correctIndex 
      ? Math.round(MIN_POINTS + (MAX_POINTS - MIN_POINTS) * timeRatio)
      : 0;

    setScores(prev => {
      const newScores = new Map(prev);
      const existing = newScores.get(chatUsername) || { username: chatUsername, score: 0, lastAnswerTime: 0 };
      newScores.set(chatUsername, {
        ...existing,
        score: existing.score + basePoints,
        lastAnswerTime: Date.now(),
      });
      return newScores;
    });

    setAnsweredThisRound(prev => new Set(prev).add(chatUsername));
  }, [gameState, currentQuestion, answeredThisRound]);

  // Timer logic
  useEffect(() => {
    if (gameState !== 'question') return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameState('reveal');
          return REVEAL_TIME;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState]);

  // Reveal timer
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
            setTimeLeft(QUESTION_TIME);
            questionStartTimeRef.current = Date.now();
            setGameState('question');
          }
          return QUESTION_TIME;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, currentQuestionIndex, questions.length]);

  const startGame = () => {
    setGameState('question');
    setTimeLeft(QUESTION_TIME);
    questionStartTimeRef.current = Date.now();
  };

  const restartGame = () => {
    setCurrentQuestionIndex(0);
    setScores(new Map());
    setAnsweredThisRound(new Set());
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
          <a href="/" className="text-indigo-400 hover:underline">Go back</a>
        </div>
      </main>
    );
  }

  // Leaderboard Component
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
        <div className="text-center py-8">
          <div className="text-purple-400 text-4xl mb-2">♟</div>
          <p className="text-purple-300 text-sm">Waiting for players...</p>
          <p className="text-purple-400/60 text-xs mt-1">Type !a !b !c or !d in chat</p>
        </div>
      ) : (
        <div className="space-y-2">
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
                <span className="text-white font-medium truncate max-w-[140px]">
                  {player.username}
                </span>
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
      <div className="max-w-6xl mx-auto">
        {/* Loading State */}
        {gameState === 'loading' && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-pink-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-purple-300">Loading questions...</p>
            </div>
          </div>
        )}

        {/* Ready State - Instructions */}
        {gameState === 'ready' && (
          <div className="max-w-2xl mx-auto py-8 animate-fade-in">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🎊</div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-pink-400 bg-clip-text text-transparent mb-2">How to Play</h2>
              <p className="text-purple-300">
                {questions.length} questions about {name}
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
                      Type your answer in Twitch chat using these commands:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1.5 bg-pink-500/20 border border-pink-500/40 rounded-lg text-pink-300 font-mono text-sm">!a</span>
                      <span className="px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/40 rounded-lg text-yellow-300 font-mono text-sm">!b</span>
                      <span className="px-3 py-1.5 bg-cyan-500/20 border border-cyan-500/40 rounded-lg text-cyan-300 font-mono text-sm">!c</span>
                      <span className="px-3 py-1.5 bg-orange-500/20 border border-orange-500/40 rounded-lg text-orange-300 font-mono text-sm">!d</span>
                    </div>
                    <p className="text-purple-400/70 text-xs mt-2">
                      You can also just type: a, b, c, d or 1, 2, 3, 4
                    </p>
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
                      Speed matters! The faster you answer correctly, the more points you get.
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-400"></span>
                        <span className="text-purple-200">Fast answer:</span>
                        <span className="text-green-400 font-semibold">1000 pts</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                        <span className="text-purple-200">Slow answer:</span>
                        <span className="text-yellow-400 font-semibold">100 pts</span>
                      </div>
                    </div>
                    <p className="text-purple-400/70 text-xs mt-2">
                      Wrong answers = 0 points. Only your first answer counts!
                    </p>
                  </div>
                </div>
              </div>

              {/* Timer */}
              <div className="bg-purple-950/60 border border-purple-500/30 rounded-2xl p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">⏱</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Time Limit</h3>
                    <p className="text-purple-300 text-sm">
                      You have <span className="text-yellow-300 font-semibold">{QUESTION_TIME} seconds</span> per question. 
                      After time runs out, the correct answer is revealed for {REVEAL_TIME} seconds before the next question.
                    </p>
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

        {/* Question State - Two Column Layout */}
        {(gameState === 'question' || gameState === 'reveal') && currentQuestion && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            {/* Question Area - Takes 2 columns on large screens */}
            <div className="lg:col-span-2 space-y-4">
              {/* Progress Bar */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-purple-300 text-sm">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </span>
                <span className={`text-xl font-bold ${timeLeft <= 5 && gameState === 'question' ? 'text-red-400 animate-pulse' : 'text-yellow-300'}`}>
                  ⏱ {timeLeft}s
                </span>
              </div>

              <div className="h-2 bg-purple-900/50 rounded-full overflow-hidden border border-purple-500/30">
                <div 
                  className={`h-full transition-all duration-1000 linear rounded-full ${
                    gameState === 'reveal' ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-pink-500 via-orange-400 to-yellow-400'
                  }`}
                  style={{ 
                    width: `${(timeLeft / (gameState === 'reveal' ? REVEAL_TIME : QUESTION_TIME)) * 100}%` 
                  }}
                />
              </div>

              {/* Question Card */}
              <div className="bg-purple-950/60 border border-purple-500/30 rounded-2xl p-6 md:p-8">
                <h2 className="text-xl md:text-2xl font-semibold text-white text-center">
                  {currentQuestion.question}
                </h2>
              </div>

              {/* Options Grid */}
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

              {/* Answer Hint / Reveal */}
              <div className="text-center py-2">
                {gameState === 'question' && (
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
            </div>

            {/* Leaderboard - Always visible */}
            <div className="lg:col-span-1">
              <LeaderboardPanel className="sticky top-4" />
            </div>
          </div>
        )}

        {/* Finished State */}
        {gameState === 'finished' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            <div className="lg:col-span-2 flex items-center justify-center py-12">
              <div className="text-center">
                <div className="text-6xl mb-6">🎉</div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent mb-2">Game Over!</h2>
                <p className="text-purple-300 mb-8">Thanks for playing 🎊</p>
                
                {leaderboard.length > 0 && (
                  <div className="mb-8 p-6 bg-gradient-to-r from-yellow-500/10 via-pink-500/10 to-cyan-500/10 border border-yellow-400/30 rounded-2xl">
                    <p className="text-sm text-purple-300 mb-2">👑 Winner</p>
                    <p className="text-2xl text-yellow-300 font-bold">{leaderboard[0].username}</p>
                    <p className="text-pink-400 text-lg">{leaderboard[0].score.toLocaleString()} points</p>
                  </div>
                )}

                <button
                  onClick={restartGame}
                  className="px-8 py-4 bg-gradient-to-r from-pink-500 via-orange-400 to-yellow-400 text-white font-bold rounded-xl hover:from-pink-600 hover:via-orange-500 hover:to-yellow-500 transition-all transform hover:scale-105 shadow-lg shadow-pink-500/30"
                >
                  🎮 Play Again
                </button>
              </div>
            </div>

            {/* Final Leaderboard */}
            <div className="lg:col-span-1">
              <LeaderboardPanel />
            </div>
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
