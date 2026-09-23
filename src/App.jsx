import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from './supabaseClient';

export default function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [view, setView] = useState('login');
  const [games, setGames] = useState([]);
  const [finishedGames, setFinishedGames] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myTips, setMyTips] = useState({});
  const [tips, setTips] = useState({});
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultFilter, setResultFilter] = useState('7');
  const cardsRef = useRef([]);
  const finishedCardsRef = useRef([]);

  // Scroll-Reveal
  const setupObserver = useCallback((refs) => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, index) => {
          if (entry.isIntersecting) {
            setTimeout(() => entry.target.classList.add('revealed'), index * 50);
          }
        });
      },
      { threshold: 0.1 }
    );
    refs.forEach((card) => { if (card) observer.observe(card); });
    return observer;
  }, []);

  useEffect(() => {
    if (view === 'tips') {
      const obs = setupObserver(cardsRef.current);
      return () => obs.disconnect();
    }
  }, [games, view, setupObserver]);

  useEffect(() => {
    if (view === 'results') {
      const obs = setupObserver(finishedCardsRef.current);
      return () => obs.disconnect();
    }
  }, [finishedGames, view, setupObserver]);

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setView('tips');
        loadData(session.user.id);
      }
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setView('tips');
        loadData(session.user.id);
      }
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  // Daten laden
  async function loadData(userId) {
    setLoading(true);
    try {
      const now = new Date();
      const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Nächste 7 Tage Spiele
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select('*')
        .eq('is_cancelled', false)
        .gte('start_time', now.toISOString())
        .lte('start_time', in7Days.toISOString())
        .order('start_time', { ascending: true });

      if (gamesError) console.error('Fehler beim Laden der Spiele:', gamesError);
      setGames(gamesData || []);

      // Fertige Spiele laden
      await loadFinishedGames('7');

      // Leaderboard
      const { data: lbData } = await supabase.from('leaderboard').select('*');
      setLeaderboard(lbData || []);

      // Eigene Tipps laden
      if (userId) {
        const { data: tipsData } = await supabase
          .from('predictions')
          .select('*')
          .eq('user_id', userId);

        if (tipsData) {
          const tipsMap = {};
          tipsData.forEach(t => {
            tipsMap[t.game_id] = t;
          });
          setMyTips(tipsMap);

          // Tipps in die Input-Felder laden
          const tipsState = {};
          tipsData.forEach(t => {
            tipsState[t.game_id + 'h'] = t.predicted_home_score?.toString() || '';
            tipsState[t.game_id + 'a'] = t.predicted_away_score?.toString() || '';
          });
          setTips(tipsState);
        }
      }
    } catch (err) {
      console.error('Allgemeiner Fehler:', err);
    }
    setLoading(false);
  }

  // Fertige Spiele mit Zeitspanne laden
  async function loadFinishedGames(days) {
    setResultFilter(days);
    let query = supabase
      .from('games')
      .select('*')
      .eq('is_cancelled', false)
      .not('home_score', 'is', null)
      .order('start_time', { ascending: false });

    if (days !== 'all') {
      const since = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);
      query = query.gte('start_time', since.toISOString());
    }

    const { data } = await query;
    setFinishedGames(data || []);
  }

  // Login
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

  // Logout
  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    setView('login');
    setEmail('');
    setPassword('');
    setMyTips({});
    setTips({});
  }

  // Tipp abgeben
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
      loadData(user.id);
    }
  }

  // Tipp löschen
  async function deleteTip(gameId) {
    if (!confirm('Tipp wirklich löschen?')) return;

    const { error } = await supabase
      .from('predictions')
      .delete()
      .eq('user_id', user.id)
      .eq('game_id', gameId);

    if (error) alert('Fehler: ' + error.message);
    else {
      const newTips = { ...tips };
      delete newTips[gameId + 'h'];
      delete newTips[gameId + 'a'];
      setTips(newTips);

      const newMyTips = { ...myTips };
      delete newMyTips[gameId];
      setMyTips(newMyTips);

      alert('Tipp gelöscht!');
    }
  }

  // Prüfen ob Spiel schon gestartet hat
  function isGameStarted(startTime) {
    return new Date(startTime) <= new Date();
  }

  // Altersgruppe CSS-Klasse
  function getAgeGroupClass(ageGroup) {
    if (!ageGroup) return 'border-age-herren';
    if (ageGroup.includes('U10') || ageGroup.includes('U12')) return 'border-age-u10';
    if (ageGroup.includes('U14') || ageGroup.includes('U16')) return 'border-age-u14';
    if (ageGroup.includes('U18')) return 'border-age-u18';
    return 'border-age-herren';
  }

  // Ergebnis-Badge
  function getResultBadge(homeScore, awayScore) {
    if (homeScore > awayScore) return <span className="badge-win text-xs px-2 py-1 rounded-button font-mono font-bold">SIEG</span>;
    if (homeScore < awayScore) return <span className="badge-loss text-xs px-2 py-1 rounded-button font-mono font-bold">NIEDERLAGE</span>;
    return <span className="badge-draw text-xs px-2 py-1 rounded-button font-mono font-bold">UNENTSCHIEDEN</span>;
  }

  // Punkte berechnen für einen Tipp
  function getTipPoints(tip, game) {
    if (!tip || game.home_score === null) return null;
    if (tip.predicted_home_score === game.home_score && tip.predicted_away_score === game.away_score) return 3;
    const tipHome = tip.predicted_home_score > tip.predicted_away_score;
    const tipAway = tip.predicted_home_score < tip.predicted_away_score;
    const tipDraw = tip.predicted_home_score === tip.predicted_away_score;
    const gameHome = game.home_score > game.away_score;
    const gameAway = game.home_score < game.away_score;
    const gameDraw = game.home_score === game.away_score;
    if ((tipHome && gameHome) || (tipAway && gameAway) || (tipDraw && gameDraw)) return 1;
    return 0;
  }

  // --- LOGIN ---
  if (!user) {
    return (
      <div className="min-h-screen bg-tvn-beige flex items-center justify-center p-4">
        <div className="card-gradient p-8 rounded-card shadow-card-hover max-w-md w-full">
          <h1 className="text-3xl font-heading font-bold text-center mb-2 text-tvn-gold">🏀 TVN Tipp-Spiel</h1>
          <p className="text-center mb-6 text-gray-300 font-body">
            {isRegistering ? 'Erstelle einen neuen Account' : 'Melde dich mit deinem Account an'}
          </p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="email" placeholder="E-Mail-Adresse" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-tvn-navy border border-tvn-beige-border rounded-input text-white placeholder-gray-400 focus:ring-2 focus:ring-tvn-gold outline-none font-body" required />
            <input type="password" placeholder="Passwort (mind. 6 Zeichen)" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-tvn-navy border border-tvn-beige-border rounded-input text-white placeholder-gray-400 focus:ring-2 focus:ring-tvn-gold outline-none font-body" required minLength={6} />
            <button type="submit" className="btn-ripple w-full bg-tvn-gold text-tvn-navy p-3 rounded-button font-heading font-semibold hover:bg-tvn-favorite transition">
              {isRegistering ? 'Registrieren' : 'Anmelden'}
            </button>
          </form>
          <button onClick={() => { setIsRegistering(!isRegistering); setMsg(''); }}
            className="w-full mt-4 text-tvn-gold hover:text-tvn-favorite text-sm font-medium font-body transition">
            {isRegistering ? 'Zurück zum Login' : 'Noch keinen Account? Hier registrieren'}
          </button>
          {msg && <p className="mt-4 text-sm text-center text-tvn-gold font-medium font-body">{msg}</p>}
        </div>
      </div>
    );
  }

  // --- EINGELOGGT ---
  return (
    <div className="min-h-screen bg-tvn-beige">
      {/* Header */}
      <header className="card-gradient text-white p-4 shadow-card sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-heading font-bold text-tvn-gold">🏀 TVN Tipps</h1>
          <div className="flex gap-2">
            <button onClick={() => setView('tips')}
              className={`btn-ripple px-4 py-2 rounded-button text-sm font-heading font-semibold transition ${view === 'tips' ? 'bg-tvn-gold text-tvn-navy' : 'bg-tvn-navy hover:bg-tvn-navy-dark text-white'}`}>
              Spiele
            </button>
            <button onClick={() => setView('results')}
              className={`btn-ripple px-4 py-2 rounded-button text-sm font-heading font-semibold transition ${view === 'results' ? 'bg-tvn-gold text-tvn-navy' : 'bg-tvn-navy hover:bg-tvn-navy-dark text-white'}`}>
              Ergebnisse
            </button>
            <button onClick={() => setView('leaderboard')}
              className={`btn-ripple px-4 py-2 rounded-button text-sm font-heading font-semibold transition ${view === 'leaderboard' ? 'bg-tvn-gold text-tvn-navy' : 'bg-tvn-navy hover:bg-tvn-navy-dark text-white'}`}>
              Tabelle
            </button>
            <button onClick={handleLogout}
              className="btn-ripple bg-red-600 hover:bg-red-700 px-4 py-2 rounded-button text-sm font-heading font-semibold transition">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6">

        {/* ===== SPIELE (Nächste 7 Tage) ===== */}
        {view === 'tips' && (
          <div>
            <h2 className="text-2xl font-heading font-bold text-tvn-text mb-2">Kommende Spiele</h2>
            <p className="text-sm text-tvn-muted mb-6 font-body">Spiele der nächsten 7 Tage</p>

            {loading && (
              <div className="text-center py-12 text-tvn-muted font-body">
                <div className="text-4xl mb-4">🏀</div>
                Lade Spiele...
              </div>
            )}

            {!loading && games.length === 0 && (
              <div className="text-center py-12 text-tvn-muted bg-white rounded-card shadow-card font-body">
                Keine Spiele in den nächsten 7 Tagen.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {games.map((game, index) => {
                const homeDisplay = game.age_group ? `${game.age_group} ${game.home_team}` : game.home_team;
                const awayDisplay = game.age_group ? `${game.age_group} ${game.away_team}` : game.away_team;
                const started = isGameStarted(game.start_time);
                const hasTip = myTips[game.id];

                return (
                  <div key={game.id} ref={el => cardsRef.current[index] = el}
                    className={`card-reveal card-hover card-gradient rounded-card shadow-card overflow-hidden ${getAgeGroupClass(game.age_group)}`}>
                    <div className="p-5">
                      <div className="text-xs font-mono font-semibold text-tvn-gold mb-2 uppercase tracking-wide">
                        {game.competition || 'Liga'}
                      </div>
                      <div className="text-xs text-gray-400 mb-4 font-body">
                        <div className="flex items-center gap-2 mb-1">
                          <span>📅</span>
                          <span>{new Date(game.start_time).toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} Uhr</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>📍</span>
                          <span>{game.location}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-lg font-heading font-bold mb-4 text-white">
                        <span className="text-right flex-1">{homeDisplay}</span>
                        <span className="text-tvn-gold px-3 text-sm font-normal">vs</span>
                        <span className="text-left flex-1">{awayDisplay}</span>
                      </div>

                      {started ? (
                        <div className="bg-tvn-navy-dark p-3 rounded-input border border-tvn-beige-border text-center">
                          <span className="text-gray-400 font-body text-sm">⏰ Spiel läuft / beendet – Tippen nicht mehr möglich</span>
                          {hasTip && (
                            <div className="mt-2 text-tvn-gold font-mono font-bold">
                              Dein Tipp: {hasTip.predicted_home_score} : {hasTip.predicted_away_score}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2 bg-tvn-navy-dark p-3 rounded-input border border-tvn-beige-border">
                            <input type="number" min="0" placeholder="Heim"
                              className="w-16 p-2 bg-tvn-navy border border-tvn-beige-border rounded-button text-center font-mono font-bold text-white focus:ring-2 focus:ring-tvn-gold outline-none"
                              value={tips[game.id + 'h'] || ''}
                              onChange={(e) => setTips({ ...tips, [game.id + 'h']: e.target.value })} />
                            <span className="font-bold text-tvn-gold">:</span>
                            <input type="number" min="0" placeholder="Gast"
                              className="w-16 p-2 bg-tvn-navy border border-tvn-beige-border rounded-button text-center font-mono font-bold text-white focus:ring-2 focus:ring-tvn-gold outline-none"
                              value={tips[game.id + 'a'] || ''}
                              onChange={(e) => setTips({ ...tips, [game.id + 'a']: e.target.value })} />
                            <button className="btn-ripple ml-auto bg-tvn-gold text-tvn-navy px-4 py-2 rounded-button font-heading font-semibold hover:bg-tvn-favorite transition"
                              onClick={() => submitTip(game.id, tips[game.id + 'h'], tips[game.id + 'a'])}>
                              {hasTip ? 'Ändern' : 'Tippen'}
                            </button>
                          </div>
                          {hasTip && (
                            <button onClick={() => deleteTip(game.id)}
                              className="mt-2 w-full text-xs text-red-400 hover:text-red-300 font-body transition">
                              🗑️ Tipp löschen
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== ERGEBNISSE ===== */}
        {view === 'results' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
              <h2 className="text-2xl font-heading font-bold text-tvn-text">Ergebnisse</h2>
              <div className="flex gap-2">
                {[
                  { label: '7 Tage', value: '7' },
                  { label: '30 Tage', value: '30' },
                  { label: '90 Tage', value: '90' },
                  { label: 'Alle', value: 'all' }
                ].map(f => (
                  <button key={f.value} onClick={() => loadFinishedGames(f.value)}
                    className={`btn-ripple px-3 py-1.5 rounded-button text-xs font-heading font-semibold transition ${resultFilter === f.value ? 'bg-tvn-gold text-tvn-navy' : 'bg-white text-tvn-text border border-tvn-beige-border hover:bg-tvn-beige'}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {finishedGames.length === 0 && (
              <div className="text-center py-12 text-tvn-muted bg-white rounded-card shadow-card font-body">
                Keine Ergebnisse in diesem Zeitraum.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {finishedGames.map((game, index) => {
                const homeDisplay = game.age_group ? `${game.age_group} ${game.home_team}` : game.home_team;
                const awayDisplay = game.age_group ? `${game.age_group} ${game.away_team}` : game.away_team;
                const tip = myTips[game.id];
                const points = getTipPoints(tip, game);

                return (
                  <div key={game.id} ref={el => finishedCardsRef.current[index] = el}
                    className={`card-reveal card-hover card-gradient rounded-card shadow-card overflow-hidden ${getAgeGroupClass(game.age_group)}`}>
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-xs font-mono font-semibold text-tvn-gold uppercase tracking-wide">
                          {game.competition || 'Liga'}
                        </div>
                        {getResultBadge(game.home_score, game.away_score)}
                      </div>
                      <div className="text-xs text-gray-400 mb-4 font-body">
                        📅 {new Date(game.start_time).toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} Uhr
                      </div>
                      <div className="flex justify-between items-center mb-2 text-white">
                        <span className="text-right flex-1 font-heading font-bold">{homeDisplay}</span>
                        <span className="text-tvn-gold font-mono font-bold text-xl px-3">{game.home_score} : {game.away_score}</span>
                        <span className="text-left flex-1 font-heading font-bold">{awayDisplay}</span>
                      </div>

                      {tip && (
                        <div className="mt-3 bg-tvn-navy-dark p-3 rounded-input border border-tvn-beige-border">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400 text-xs font-body">Dein Tipp:</span>
                            <span className="text-white font-mono font-bold">{tip.predicted_home_score} : {tip.predicted_away_score}</span>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-gray-400 text-xs font-body">Punkte:</span>
                            <span className={`font-mono font-bold ${points === 3 ? 'text-green-400' : points === 1 ? 'text-yellow-400' : 'text-red-400'}`}>
                              {points === 3 ? '🎯 3 Punkte' : points === 1 ? '👍 1 Punkt' : '❌ 0 Punkte'}
                            </span>
                          </div>
                        </div>
                      )}
                      {!tip && (
                        <div className="mt-3 text-center text-gray-500 text-xs font-body">Kein Tipp abgegeben</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== LEADERBOARD ===== */}
        {view === 'leaderboard' && (
          <div className="card-gradient rounded-card shadow-card overflow-hidden">
            <h2 className="text-2xl font-heading font-bold p-6 border-b border-tvn-beige-border text-tvn-gold">🏆 Punktetabelle</h2>
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
                  <tr key={row.username} className={`border-t border-tvn-beige-border ${row.username === user.email.split('@')[0] ? 'bg-tvn-navy font-bold' : 'hover:bg-tvn-navy-dark'}`}>
                    <td className="p-4 text-tvn-gold font-mono">{index + 1}.</td>
                    <td className="p-4">
                      {row.username}
                      {row.username === user.email.split('@')[0] && (
                        <span className="ml-2 text-xs bg-tvn-gold text-tvn-navy px-2 py-1 rounded-button font-semibold">Du</span>
                      )}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-tvn-gold">{row.total_points}</td>
                  </tr>
                ))}
                {leaderboard.length === 0 && (
                  <tr><td colSpan="3" className="p-8 text-center text-gray-400 font-body">Noch keine gewerteten Spiele.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
