import { useEffect, useState, useRef } from 'react';
import { supabase } from './supabaseClient';

export default function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [view, setView] = useState('login');
  const [games, setGames] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [tips, setTips] = useState({});
  const [msg, setMsg] = useState('');
  const [favorites, setFavorites] = useState([]);
  const cardsRef = useRef([]);

  // Favoriten aus LocalStorage laden
  useEffect(() => {
    const saved = localStorage.getItem('tvn-favorites');
    if (saved) setFavorites(JSON.parse(saved));
  }, []);

  // Favoriten speichern
  useEffect(() => {
    localStorage.setItem('tvn-favorites', JSON.stringify(favorites));
  }, [favorites]);

  // Scroll-Reveal Animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, index) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              entry.target.classList.add('revealed');
            }, index * 50);
          }
        });
      },
      { threshold: 0.1 }
    );

    cardsRef.current.forEach((card) => {
      if (card) observer.observe(card);
    });

    return () => observer.disconnect();
  }, [games]);

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
    setMsg('');
    
    if (isRegistering) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setMsg('Fehler: ' + error.message);
      else setMsg('Registrierung erfolgreich! Du kannst dich jetzt einloggen.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg('Fehler: ' + error.message);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    setView('login');
    setEmail('');
    setPassword('');
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
      alert('Tipp gespeichert! 🏀');
      setTips({ ...tips, [gameId + 'h']: '', [gameId + 'a']: '' });
    }
  }

  function toggleFavorite(gameId) {
    setFavorites(prev => 
      prev.includes(gameId) 
        ? prev.filter(id => id !== gameId)
        : [...prev, gameId]
    );
  }

  function getAgeGroupClass(ageGroup) {
    if (!ageGroup) return 'border-age-herren';
    if (ageGroup.includes('U10') || ageGroup.includes('U12')) return 'border-age-u10';
    if (ageGroup.includes('U14') || ageGroup.includes('U16')) return 'border-age-u14';
    if (ageGroup.includes('U18')) return 'border-age-u18';
    return 'border-age-herren';
  }

  // --- ANSICHT: LOGIN / REGISTRIERUNG ---
  if (!user) {
    return (
      <div className="min-h-screen bg-tvn-beige flex items-center justify-center p-4">
        <div className="card-gradient p-8 rounded-card shadow-card-hover max-w-md w-full">
          <h1 className="text-3xl font-heading font-bold text-center mb-2 text-tvn-gold">
            🏀 TVN Tipp-Spiel
          </h1>
          <p className="text-center mb-6 text-gray-300 font-body">
            {isRegistering ? 'Erstelle einen neuen Account' : 'Melde dich mit deinem Account an'}
          </p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              placeholder="E-Mail-Adresse"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-tvn-navy border border-tvn-beige-border rounded-input text-white placeholder-gray-400 focus:ring-2 focus:ring-tvn-gold outline-none font-body"
              required
            />
            <input
              type="password"
              placeholder="Passwort (mind. 6 Zeichen)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-tvn-navy border border-tvn-beige-border rounded-input text-white placeholder-gray-400 focus:ring-2 focus:ring-tvn-gold outline-none font-body"
              required
              minLength={6}
            />
            <button 
              type="submit" 
              className="btn-ripple w-full bg-tvn-gold text-tvn-navy p-3 rounded-button font-heading font-semibold hover:bg-tvn-favorite transition"
            >
              {isRegistering ? 'Registrieren' : 'Anmelden'}
            </button>
          </form>
          <button
            onClick={() => {
              setIsRegistering(!isRegistering);
              setMsg('');
            }}
            className="w-full mt-4 text-tvn-gold hover:text-tvn-favorite text-sm font-medium font-body transition"
          >
            {isRegistering ? 'Zurück zum Login' : 'Noch keinen Account? Hier registrieren'}
          </button>
          {msg && <p className="mt-4 text-sm text-center text-tvn-gold font-medium font-body">{msg}</p>}
        </div>
      </div>
    );
  }

  // --- ANSICHT: EINGELOGGT ---
  const sortedGames = [...games].sort((a, b) => {
    if (favorites.includes(a.id) && !favorites.includes(b.id)) return -1;
    if (!favorites.includes(a.id) && favorites.includes(b.id)) return 1;
    return 0;
  });

  return (
    <div className="min-h-screen bg-tvn-beige">
      {/* Header */}
      <header className="card-gradient text-white p-4 shadow-card sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-heading font-bold text-tvn-gold">🏀 TVN Tipps</h1>
          <div className="flex gap-2">
            <button 
              onClick={() => setView('tips')} 
              className={`btn-ripple px-4 py-2 rounded-button text-sm font-heading font-semibold transition ${
                view === 'tips' ? 'bg-tvn-gold text-tvn-navy' : 'bg-tvn-navy hover:bg-tvn-navy-dark text-white'
              }`}
            >
              Spiele
            </button>
            <button 
              onClick={() => setView('leaderboard')} 
              className={`btn-ripple px-4 py-2 rounded-button text-sm font-heading font-semibold transition ${
                view === 'leaderboard' ? 'bg-tvn-gold text-tvn-navy' : 'bg-tvn-navy hover:bg-tvn-navy-dark text-white'
              }`}
            >
              Tabelle
            </button>
            <button 
              onClick={handleLogout} 
              className="btn-ripple bg-red-600 hover:bg-red-700 px-4 py-2 rounded-button text-sm font-heading font-semibold transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6">
        {view === 'tips' && (
          <div>
            <h2 className="text-2xl font-heading font-bold text-tvn-text mb-6">Kommende Spiele</h2>
            {sortedGames.length === 0 && (
              <div className="text-center py-12 text-tvn-muted bg-white rounded-card shadow-card font-body">
                Keine anstehenden Spiele gefunden.
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedGames.map((game, index) => {
                const homeDisplay = game.age_group ? `${game.age_group} ${game.home_team}` : game.home_team;
                const awayDisplay = game.age_group ? `${game.age_group} ${game.away_team}` : game.away_team;
                const isFavorite = favorites.includes(game.id);
                
                return (
                  <div 
                    key={game.id} 
                    ref={el => cardsRef.current[index] = el}
                    className={`card-reveal card-hover card-gradient rounded-card shadow-card overflow-hidden relative ${
                      isFavorite ? 'card-favorite' : ''
                    } ${getAgeGroupClass(game.age_group)}`}
                  >
                    {/* Favorite Button */}
                    <button
                      onClick={() => toggleFavorite(game.id)}
                      className={`absolute top-3 right-3 z-10 w-10 h-10 rounded-full flex items-center justify-center transition ${
                        isFavorite ? 'bg-tvn-favorite text-tvn-navy' : 'bg-tvn-navy text-gray-400 hover:text-tvn-favorite'
                      }`}
                    >
                      <span className={isFavorite ? 'bounce-heart' : ''}>❤️</span>
                    </button>

                    {/* Card Content */}
                    <div className="p-5">
                      {/* Competition Badge */}
                      <div className="text-xs font-mono font-semibold text-tvn-gold mb-2 uppercase tracking-wide">
                        {game.competition || 'Liga'}
                      </div>

                      {/* Date & Location */}
                      <div className="text-xs text-gray-400 mb-4 font-body">
                        <div className="flex items-center gap-2 mb-1">
                          <span>📅</span>
                          <span>{new Date(game.start_time).toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit' })} Uhr</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>📍</span>
                          <span>{game.location}</span>
                        </div>
                      </div>

                      {/* Teams */}
                      <div className="flex justify-between items-center text-lg font-heading font-bold mb-4 text-white">
                        <span className="text-right flex-1">{homeDisplay}</span>
                        <span className="text-tvn-gold px-3 text-sm font-normal">vs</span>
                        <span className="text-left flex-1">{awayDisplay}</span>
                      </div>

                      {/* Tip Input */}
                      <div className="flex items-center gap-2 bg-tvn-navy-dark p-3 rounded-input border border-tvn-beige-border">
                        <input 
                          type="number" 
                          min="0" 
                          placeholder="Heim" 
                          className="w-16 p-2 bg-tvn-navy border border-tvn-beige-border rounded-button text-center font-mono font-bold text-white focus:ring-2 focus:ring-tvn-gold outline-none"
                          value={tips[game.id + 'h'] || ''}
                          onChange={(e) => setTips({...tips, [game.id + 'h']: e.target.value})}
                        />
                        <span className="font-bold text-tvn-gold">:</span>
                        <input 
                          type="number" 
                          min="0" 
                          placeholder="Gast" 
                          className="w-16 p-2 bg-tvn-navy border border-tvn-beige-border rounded-button text-center font-mono font-bold text-white focus:ring-2 focus:ring-tvn-gold outline-none"
                          value={tips[game.id + 'a'] || ''}
                          onChange={(e) => setTips({...tips, [game.id + 'a']: e.target.value})}
                        />
                        <button 
                          className="btn-ripple ml-auto bg-tvn-gold text-tvn-navy px-4 py-2 rounded-button font-heading font-semibold hover:bg-tvn-favorite transition"
                          onClick={() => submitTip(game.id, tips[game.id + 'h'], tips[game.id + 'a'])}
                        >
                          Tippen
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === 'leaderboard' && (
          <div className="card-gradient rounded-card shadow-card overflow-hidden">
            <h2 className="text-2xl font-heading font-bold p-6 border-b border-tvn-beige-border text-tvn-gold">
              🏆 Punktetabelle
            </h2>
            <table className="w-full text-left">
              <thead className="bg-tvn-navy-dark text-gray-400 text-sm font-mono">
                <tr>
                  <th className="p-4">Platz</th>
                  <th className="p-4">Name</th>
                  <th className="p-4 text-right">Punkte</th>
                </tr>
              </thead>
              <tbody className="text-white font-body">
                {leaderboard.map((row, index) => (
                  <tr 
                    key={row.username} 
                    className={`border-t border-tvn-beige-border ${
                      row.username === user.email.split('@')[0] ? 'bg-tvn-navy font-bold' : 'hover:bg-tvn-navy-dark'
                    }`}
                  >
                    <td className="p-4 text-tvn-gold font-mono">{index + 1}.</td>
                    <td className="p-4">
                      {row.username} 
                      {row.username === user.email.split('@')[0] && (
                        <span className="ml-2 text-xs bg-tvn-gold text-tvn-navy px-2 py-1 rounded-button font-semibold">
                          Du
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-tvn-gold">{row.total_points}</td>
                  </tr>
                ))}
                {leaderboard.length === 0 && (
                  <tr>
                    <td colSpan="3" className="p-8 text-center text-gray-400 font-body">
                      Noch keine gewerteten Spiele. Punkte werden nach Spielschluss vergeben.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
