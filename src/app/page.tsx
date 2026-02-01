'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Occasion = 'anniversary' | 'birthday' | 'chess';

export default function SetupPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [occasion, setOccasion] = useState<Occasion>('anniversary');
  const [twitchChannel, setTwitchChannel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const occasions: { id: Occasion; label: string; subtitle: string; emoji: string }[] = [
    { id: 'anniversary', label: 'Stream Anniversary', subtitle: 'Celebrating another year of streaming', emoji: '🎊' },
    { id: 'birthday', label: 'Birthday', subtitle: 'A special birthday celebration', emoji: '🎂' },
    { id: 'chess', label: 'Chess Trivia', subtitle: 'Just for fun', emoji: '♟️' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate Chess.com username
      const res = await fetch(`https://api.chess.com/pub/player/${username.toLowerCase()}`);
      if (!res.ok) {
        throw new Error('Chess.com username not found');
      }

      // Navigate to game page with params
      const params = new URLSearchParams({
        username: username.toLowerCase(),
        name: firstName,
        occasion,
        twitch: twitchChannel.toLowerCase().replace('@', ''),
      });
      
      router.push(`/game?${params.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-500 via-orange-400 to-yellow-400 mb-4 shadow-lg shadow-pink-500/30">
            <span className="text-4xl">🎉</span>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-400 via-yellow-300 to-cyan-400 bg-clip-text text-transparent mb-2">Chess.com Trivia</h1>
          <p className="text-purple-300">Generate a celebration trivia game from Chess.com stats!</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Chess.com Username */}
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-2">
              Chess.com Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. hikaru"
              required
              className="w-full px-4 py-3 bg-purple-950/60 border border-purple-500/40 rounded-xl text-white placeholder-purple-400/50 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-colors"
            />
          </div>

          {/* First Name */}
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-2">
              First Name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="e.g. Hikaru"
              required
              className="w-full px-4 py-3 bg-purple-950/60 border border-purple-500/40 rounded-xl text-white placeholder-purple-400/50 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-colors"
            />
            <p className="mt-1.5 text-xs text-purple-400/70">Used for the game title</p>
          </div>

          {/* Twitch Channel */}
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-2">
              Twitch Channel
            </label>
            <input
              type="text"
              value={twitchChannel}
              onChange={(e) => setTwitchChannel(e.target.value)}
              placeholder="e.g. gmhikaru"
              required
              className="w-full px-4 py-3 bg-purple-950/60 border border-purple-500/40 rounded-xl text-white placeholder-purple-400/50 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-colors"
            />
            <p className="mt-1.5 text-xs text-purple-400/70">Viewers will answer in this chat</p>
          </div>

          {/* Occasion Selector */}
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-3">
              Occasion
            </label>
            <div className="space-y-2">
              {occasions.map((occ) => (
                <button
                  key={occ.id}
                  type="button"
                  onClick={() => setOccasion(occ.id)}
                  className={`w-full p-4 rounded-xl border text-left transition-all ${
                    occasion === occ.id
                      ? 'bg-gradient-to-r from-pink-500/20 to-yellow-500/20 border-pink-500 ring-1 ring-pink-500'
                      : 'bg-purple-950/60 border-purple-500/40 hover:border-purple-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{occ.emoji}</span>
                    <div>
                      <div className="font-medium text-white">{occ.label}</div>
                      <div className="text-sm text-purple-300">{occ.subtitle}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-pink-500 via-orange-400 to-yellow-400 text-white font-bold rounded-xl hover:from-pink-600 hover:via-orange-500 hover:to-yellow-500 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-purple-950 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] shadow-lg shadow-pink-500/30"
          >
            {loading ? (
              <span className="inline-flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading...
              </span>
            ) : (
              '🎮 Generate Trivia Game'
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-purple-500/60">
          Data from Chess.com Public API
        </p>
      </div>
    </main>
  );
}
