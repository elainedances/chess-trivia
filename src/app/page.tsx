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

  const occasions: { id: Occasion; label: string; subtitle: string }[] = [
    { id: 'anniversary', label: 'Stream Anniversary', subtitle: 'Celebrating another year of streaming' },
    { id: 'birthday', label: 'Birthday', subtitle: 'A special birthday celebration' },
    { id: 'chess', label: 'Chess Trivia', subtitle: 'Just for fun' },
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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Chess Trivia</h1>
          <p className="text-neutral-400">Generate a trivia game from any Chess.com profile</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Chess.com Username */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Chess.com Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. hikaru"
              required
              className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>

          {/* First Name */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              First Name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="e.g. Hikaru"
              required
              className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
            <p className="mt-1.5 text-xs text-neutral-500">Used for the game title</p>
          </div>

          {/* Twitch Channel */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Twitch Channel
            </label>
            <input
              type="text"
              value={twitchChannel}
              onChange={(e) => setTwitchChannel(e.target.value)}
              placeholder="e.g. gmhikaru"
              required
              className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
            <p className="mt-1.5 text-xs text-neutral-500">Viewers will answer in this chat</p>
          </div>

          {/* Occasion Selector */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-3">
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
                      ? 'bg-indigo-500/10 border-indigo-500 ring-1 ring-indigo-500'
                      : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="font-medium text-white">{occ.label}</div>
                  <div className="text-sm text-neutral-400">{occ.subtitle}</div>
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
            className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-neutral-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
              'Generate Trivia Game'
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-neutral-600">
          Data from Chess.com Public API
        </p>
      </div>
    </main>
  );
}
