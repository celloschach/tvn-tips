import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export default function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [view, setView] = useState('login');
  const [games, setGames] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [tips, setTips] = useState({});
  const [msg, setMsg] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setView('tips');
        loadData();
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setView('tips');
        loadData();
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  async function loadData() {
    const { data: gamesData } = await supabase
      .from('games')
      .select('*')
      .eq('is_cancelled', false)
      .order('start_time', { ascending: true });
    setGames(gamesData || []);

    const { data: lbData } = await supabase.from('leaderboard').select('*');
    setLeaderboard(lbData || []);
  }

  async function handleLogin(e) {
    e.preventDefault();
    setMsg('Magic Link wird gesendet... Bitte prüfe dein E-Mail-Postfach.');
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) setMsg('Fehler: ' + error.message);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    setView('login');
  }

  async function submitTip(gameId, homeScore, awayScore) {
    if (!homeScore || !awayScore) return alert('Bitte beide Ergebnisse eingeben.');
    
    const { error } = await supabase.from('predictions').upsert({
      user_id: user.id,
      game_id: gameId,
      predicted_home_score: parseInt(homeScore),
      predicted_away_score: parseInt(awayScore)
    });

    if (error) alert('Fehler: ' + error.message);
    else {
      alert('Tipp gespeichert!');
      setTips({ ...tips, [gameId + 'h']: '', [gameId + 'a']: '' });
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold text-center mb-2">🏀 TVN Tipp-Spiel</h1>
          <p className="text-gray-600 text-center mb-6">Melde dich mit deiner E-Mail an.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              placeholder="deine.email@beispiel.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
            <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold hover:bg-blue-700">
              Magic Link senden
            </button>
          </form>
          {msg && <p className="mt-4 text-sm text-center text-blue-600">{msg}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-700 text-white p-4 shadow-md">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">🏀 TVN Tipp-Spiel</h1>
          <div className="flex gap-3">
            <button onClick={() => setView('tips')} className={`px-3 py-1 rounded ${view === 'tips' ? 'bg-blue-900' : 'bg-blue-600'}`}>Tipps</button>
            <button onClick={() => setView('leaderboard')} className={`px-3 py-1 rounded ${view === 'leaderboard' ? 'bg-blue-900' : 'bg-blue-600'}`}>Tabelle</button>
            <button onClick={handleLogout} className="bg-red-500 px-3 py-1 rounded text-sm">Logout</button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4">
        {view === 'tips' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-700">Kommende Spiele</h2>
            {games.length === 0 && <p className="text-gray-500">Keine Spiele gefunden.</p>}
            {games.map(game => (
              <div key={game.id} className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
                <div className="text-xs text-gray-500 mb-2">
                  {new Date(game.start_time).toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit' })} | {game.location}
                </div>
                <div className="flex justify-between items-center text-lg font-bold mb-4">
                  <span className="text-right flex-1">{game.home_team}</span>
                  <span className="text-gray-400 px-2">vs</span>
                  <span className="text-left flex-1">{game.away_team}</span>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 p-3 rounded">
                  <input 
                    type="number" min="0" placeholder="Heim" 
                    className="w-16 p-2 border rounded text-center font-bold"
                    value={tips[game.id + 'h'] || ''}
                    onChange={(e) => setTips({...tips, [game.id + 'h']: e.target.value})}
                  />
                  <span className="font-bold text-gray-400">:</span>
                  <input 
                    type="number" min="0" placeholder="Gast" 
                    className="w-16 p-2 border rounded text-center font-bold"
                    value={tips[game.id + 'a'] || ''}
                    onChange={(e) => setTips({...tips, [game.id + 'a']: e.target.value})}
                  />
                  <button 
                    className="ml-auto bg-green-600 text-white px-4 py-2 rounded font-semibold hover:bg-green-700"
                    onClick={() => submitTip(game.id, tips[game.id + 'h'], tips[game.id + 'a'])}
                  >
                    Abgeben
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'leaderboard' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <h2 className="text-lg font-semibold p-4 border-b bg-gray-50">🏆 Punktetabelle</h2>
            <table className="w-full text-left">
              <thead className="bg-gray-100 text-gray-600 text-sm">
                <tr>
                  <th className="p-3">Platz</th>
                  <th className="p-3">Name</th>
                  <th className="p-3 text-right">Punkte</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row, index) => (
                  <tr key={row.username} className={`border-t ${row.username === user.email.split('@')[0] ? 'bg-blue-50 font-bold' : ''}`}>
                    <td className="p-3">{index + 1}.</td>
                    <td className="p-3">{row.username} {row.username === user.email.split('@')[0] && '(Du)'}</td>
                    <td className="p-3 text-right">{row.total_points}</td>
                  </tr>
                ))}
                {leaderboard.length === 0 && (
                  <tr><td colSpan="3" className="p-4 text-center text-gray-500">Noch keine gewerteten Spiele.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
