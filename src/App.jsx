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
  const [myFinishedGames, setMyFinishedGames] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myTips, setMyTips] = useState({});
  const [tips, setTips] = useState({});
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultFilter, setResultFilter] = useState('7');
  const [resultTab, setResultTab] = useState('all');
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [showPointsInfo, setShowPointsInfo] = useState(false);
  const cardsRef = useRef([]);
  const finishedCardsRef = useRef([]);

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  function showConfirm(message, onConfirm) {
    setConfirmModal({ message, onConfirm });
  }

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
  }, [finishedGames, myFinishedGames, view, setupObserver]);

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

  async function loadData(userId) {
    setLoading(true);
    try {
      const now = new Date();
      const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select('*')
        .eq('is_cancelled', false)
        .gte('start_time', now.toISOString())
        .lte('start_time', in7Days.toISOString())
        .order('start_time', { ascending: true });

      if (gamesError) console.error('Fehler beim Laden der Spiele:', gamesError);
      setGames(gamesData || []);

      await loadFinishedGames('7');

      const { data: lbData } = await supabase.from('leaderboard').select('*');
      setLeaderboard(lbData || []);

      if (userId) {
        const { data: tipsData } = await supabase
          .from('predictions')
          .select('*')
          .eq('user_id', userId);

        if (tipsData) {
          const tipsMap = {};
          tipsData.forEach(t => { tipsMap[t.game_id] = t; });
          setMyTips(tipsMap);

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

    // Meine Tipps filtern
    const myGames = data.filter(game => myTips[game.id]);
    setMyFinishedGames(myGames);
  }

  async function handleLogin(e) {
    e.preventDefault();
    setMsg('');
    if (isRegistering) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setMsg('Fehler: ' + error.message);
      else showToast('Registrierung erfolgreich! Du kannst dich jetzt einloggen.', 'success');
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
    setMyTips({});
    setTips({});
  }

  // FIX: Upsert mit onConflict
  async function submitTip(gameId, homeScore, awayScore) {
    if (!homeScore || !awayScore) {
      showToast('Bitte beide Ergebnisse eingeben.', 'error');
      return;
    }

    try {
      const { error } = await supabase.from('predictions').upsert({
        user_id: user.id,
        game_id: gameId,
        predicted_home_score: parseInt(homeScore),
        predicted_away_score: parseInt(awayScore)
      }, { onConflict: 'user_id,game_id' });

      if (error) {
        showToast('Fehler: ' + error.message, 'error');
      } else {
        showToast('Tipp gespeichert! 🏀', 'success');
        loadData(user.id);
      }
    } catch (err) {
      showToast('Fehler beim Speichern.', 'error');
    }
  }

  async function deleteTip(gameId) {
    showConfirm('Tipp wirklich löschen?', async () => {
      try {
        const { error } = await supabase
          .from('predictions')
          .delete()
          .eq('user_id', user.id)
          .eq('game_id', gameId);

        if (error) {
          showToast('Fehler: ' + error.message, 'error');
        } else {
          const newTips = { ...tips };
          delete newTips[gameId + 'h'];
          delete newTips[gameId + 'a'];
          setTips(newTips);

          const newMyTips = { ...myTips };
          delete newMyTips[gameId];
          setMyTips(newMyTips);

          showToast('Tipp gelöscht!', 'success');
        }
      } catch (err) {
        showToast('Fehler beim Löschen.', 'error');
      }
      setConfirmModal(null);
    });
  }

  function isGameStarted(startTime) {
    return new Date(startTime) <= new Date();
  }

  function getResultBadge(game) {
    const homeLower = game.home_team.toLowerCase();
    const awayLower = game.away_team.toLowerCase();
    
    const isTVNHome = homeLower.includes('neunkirchen') || homeLower.includes('tvn');
    const isTVNAway = awayLower.includes('neunkirchen') || awayLower.includes('tvn');

    let tvnWon = false;
    let tvnLost = false;

    if (isTVNHome) {
      tvnWon = game.home_score > game.away_score;
      tvnLost = game.home_score < game.away_score;
    } else if (isTVNAway) {
      tvnWon = game.away_score > game.home_score;
      tvnLost = game.away_score < game.home_score;
    } else {
      tvnWon = game.home_score > game.away_score;
      tvnLost = game.home_score < game.away_score;
    }

    if (game.home_score === game.away_score) {
      return <span className="badge-draw text-xs px-2 py-1 rounded-button font-mono font-bold">UNENTSCHIEDEN</span>;
    }
    if (tvnWon) return <span className="badge-win text-xs px-2 py-1 rounded-button font-mono font-bold">SIEG</span>;
    if (tvnLost) return <span className="badge-loss text-xs px-2 py-1 rounded-button font-mono font-bold">NIEDERLAGE</span>;
    return null;
  }

  function getTipPoints(tip, game) {
    if (!tip || game.home_score === null) return null;
    
    // 5 Punkte: Exaktes Ergebnis
    if (tip.predicted_home_score === game.home_score && tip.predicted_away_score === game.away_score) return 5;
    
    // 3 Punkte: Innerhalb von 10 Punkten Differenz
    const tipDiff = tip.predicted_home_score - tip.predicted_away_score;
    const gameDiff = game.home_score - game.away_score;
    if (Math.abs(tipDiff - gameDiff) <= 10) return 3;
    
    // 1 Punkt: Richtige Tendenz
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
      {toast && (
        <div className={`toast ${toast.type === 'success' ? 'toast-success' : toast.type === 'error' ? 'toast-error' : 'toast-info'}`}>
          <div className="px-6 py-4 rounded-card shadow-card-hover font-body font-semibold">
            {toast.message}
          </div>
        </div>
      )}

      {confirmModal && (
        <div className="modal-overlay" onClick={() => setConfirmModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-heading font-bold text-tvn-text mb-4">Bestätigung</h3>
            <p className="text-tvn-muted font-body mb-6">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal(null)}
                className="flex-1 btn-ripple bg-gray-200 text-tvn-text px-4 py-3 rounded-button font-heading font-semibold hover:bg-gray-300 transition">
                Abbrechen
              </button>
              <button onClick={confirmModal.onConfirm}
                className="flex-1 btn-ripple bg-red-600 text-white px-4 py-3 rounded-button font-heading font-semibold hover:bg-red-700 transition">
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {showPointsInfo && (
        <div className="modal-overlay" onClick={() => setShowPointsInfo(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-heading font-bold text-tvn-text mb-4">🏆 Punkte-System</h3>
            <div className="space-y-3 font-body text-tvn-muted">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🎯</span>
                <div>
                  <div className="font-bold text-tvn-text">5 Punkte</div>
                  <div className="text-sm">Exaktes Ergebnis getippt</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">👍</span>
                <div>
                  <div className="font-bold text-tvn-text">3 Punkte</div>
                  <div className="text-sm">Ergebnis innerhalb von 10 Punkten Differenz</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">✓</span>
                <div>
                  <div className="font-bold text-tvn-text">1 Punkt</div>
                  <div className="text-sm">Richtige Tendenz (Sieg/Niederlage/Unentschieden)</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">❌</span>
                <div>
                  <div className="font-bold text-tvn-text">0 Punkte</div>
                  <div className="text-sm">Falsch getippt</div>
                </div>
              </div>
            </div>
            <button onClick={() => setShowPointsInfo(false)}
              className="mt-6 w-full btn-ripple bg-tvn-gold text-tvn-navy px-4 py-3 rounded-button font-heading font-semibold hover:bg-tvn-favorite transition">
              Verstanden
            </button>
          </div>
        </div>
      )}

      {/* Modernerer Header */}
      <header className="bg-gradient-to-r from-tvn-navy via-tvn-navy-dark to-tvn-navy text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-heading font-bold text-tvn-gold flex items-center gap-2">
              <span className="text-3xl">🏀</span>
              <span>TVN Tipps</span>
            </h1>
            <div className="flex gap-2">
              <button onClick={() => setView('tips')}
                className={`btn-ripple px-4 py-2 rounded-button text-sm font-heading font-semibold transition ${view === 'tips' ? 'bg-tvn-gold text-tvn-navy' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
                Spiele
              </button>
              <button onClick={() => setView('results')}
                className={`btn-ripple px-4 py-2 rounded-button text-sm font-heading font-semibold transition ${view === 'results' ? 'bg-tvn-gold text-tvn-navy' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
                Ergebnisse
              </button>
              <button onClick={() => setView('leaderboard')}
                className={`btn-ripple px-4 py-2 rounded-button text-sm font-heading font-semibold transition ${view === 'leaderboard' ? 'bg-tvn-gold text-tvn-navy' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
                Tabelle
              </button>
              <button onClick={handleLogout}
                className="btn-ripple bg-red-600/80 hover:bg-red-600 px-4 py-2 rounded-button text-sm font-heading font-semibold transition">
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6">

        {/* ===== SPIELE ===== */}
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
                    className="card-reveal card-hover card-gradient rounded-card shadow-card overflow-hidden flex flex-col">
                    <div className="p-5 flex flex-col flex-grow">
                      <div className="text-xs font-mono font-semibold text-tvn-gold mb-2 uppercase tracking-wide">
                        {game.competition || 'Liga'}
                      </div>
                      <div className="text-xs text-gray-400 mb-4 font-body">
                        <div className="flex items-center gap-2">
                          <span>📅</span>
                          <span>{new Date(game.start_time).toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} Uhr</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-lg font-heading font-bold mb-4 text-white flex-grow">
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
                            <input type="number" min="0" placeholder="H"
                              className="w-16 p-2 bg-tvn-navy border border-tvn-beige-border rounded-button text-center font-mono font-bold text-white focus:ring-2 focus:ring-tvn-gold outline-none"
                              value={tips[game.id + 'h'] || ''}
                              onChange={(e) => setTips({ ...tips, [game.id + 'h']: e.target.value })} />
                            <span className="font-bold text-tvn-gold">:</span>
                            <input type="number" min="0" placeholder="G"
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
                <button onClick={() => setResultTab('all')}
                  className={`btn-ripple px-3 py-1.5 rounded-button text-xs font-heading font-semibold transition ${resultTab === 'all' ? 'bg-tvn-gold text-tvn-navy' : 'bg-white text-tvn-text border border-tvn-beige-border hover:bg-tvn-beige'}`}>
                  Alle
                </button>
                <button onClick={() => setResultTab('my')}
                  className={`btn-ripple px-3 py-1.5 rounded-button text-xs font-heading font-semibold transition ${resultTab === 'my' ? 'bg-tvn-gold text-tvn-navy' : 'bg-white text-tvn-text border border-tvn-beige-border hover:bg-tvn-beige'}`}>
                  Meine Tipps
                </button>
              </div>
            </div>

            <div className="flex gap-2 mb-6">
              {[
                { label: '7 Tage', value: '7' },
                { label: '30 Tage', value: '30' },
                { label: '90 Tage', value: '90' },
                { label: 'Alle', value: 'all' }
              ].map(f => (
                <button key={f.value} onClick={() => loadFinishedGames(f.value)}
                  className={`btn-ripple px-3 py-1.5 rounded-button text-xs font-heading font-semibold transition ${resultFilter === f.value ? 'bg-tvn-navy text-white' : 'bg-white text-tvn-text border border-tvn-beige-border hover:bg-tvn-beige'}`}>
                  {f.label}
                </button>
              ))}
            </div>

            {(resultTab === 'all' ? finishedGames : myFinishedGames).length === 0 && (
              <div className="text-center py-12 text-tvn-muted bg-white rounded-card shadow-card font-body">
                {resultTab === 'all' ? 'Keine Ergebnisse in diesem Zeitraum.' : 'Du hast in diesem Zeitraum keine Tipps abgegeben.'}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(resultTab === 'all' ? finishedGames : myFinishedGames).map((game, index) => {
                const homeDisplay = game.age_group ? `${game.age_group} ${game.home_team}` : game.home_team;
                const awayDisplay = game.age_group ? `${game.age_group} ${game.away_team}` : game.away_team;
                const tip = myTips[game.id];
                const points = getTipPoints(tip, game);

                return (
                  <div key={game.id} ref={el => finishedCardsRef.current[index] = el}
                    className="card-reveal card-hover card-gradient rounded-card shadow-card overflow-hidden flex flex-col">
                    <div className="p-5 flex flex-col flex-grow">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-xs font-mono font-semibold text-tvn-gold uppercase tracking-wide">
                          {game.competition || 'Liga'}
                        </div>
                        {getResultBadge(game)}
                      </div>
                      <div className="text-xs text-gray-400 mb-4 font-body">
                        📅 {new Date(game.start_time).toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} Uhr
                      </div>
                      <div className="flex justify-between items-center mb-2 text-white flex-grow">
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
                            <span className={`font-mono font-bold ${points === 5 ? 'text-green-400' : points === 3 ? 'text-yellow-400' : points === 1 ? 'text-blue-400' : 'text-red-400'}`}>
                              {points === 5 ? '🎯 5 Punkte' : points === 3 ? '👍 3 Punkte' : points === 1 ? '✓ 1 Punkt' : '❌ 0 Punkte'}
                            </span>
                          </div>
                        </div>
                      )}
                      {!tip && resultTab === 'all' && (
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
            <div className="p-6 border-b border-tvn-beige-border flex justify-between items-center">
              <h2 className="text-2xl font-heading font-bold text-tvn-gold">🏆 Punktetabelle</h2>
              <button onClick={() => setShowPointsInfo(true)}
                className="btn-ripple bg-tvn-gold/20 hover:bg-tvn-gold/30 text-tvn-gold px-4 py-2 rounded-button text-sm font-heading font-semibold transition">
                ℹ️ Punkte-System
              </button>
            </div>
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
