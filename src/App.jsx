import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { Turnstile } from '@marsidev/react-turnstile';

const BLOCKED_WORDS = [
  'arsch', 'arschloch', 'scheisse', 'scheiße', 'fick', 'ficken', 'ficker',
  'hure', 'hurensohn', 'wichser', 'wixer', 'spast', 'spasti', 'mongo',
  'behindert', 'idiot', 'depp', 'trottel', 'vollidiot', 'miststück',
  'drecksau', 'sau', 'schwein', 'drecksack', 'penner', 'nutte', 'flittchen',
  'schlampe', 'fotze', 'muschi', 'schwanz', 'dödel', 'sack', 'eier', 'titten',
  'bumsen', 'vögeln', 'kotzen', 'pisse', 'kacke', 'kacken', 'scheissen', 'furz',
  'nazi', 'hitler', 'faschist', 'terrorist',
  'ass', 'asshole', 'bastard', 'bitch', 'bloody', 'bollocks', 'bullshit',
  'cock', 'cunt', 'damn', 'dick', 'douche', 'dumbass', 'fag', 'fuck', 'fucking',
  'fucker', 'fucked', 'goddamn', 'hell', 'jackass', 'jerk', 'motherfucker',
  'nigger', 'nigga', 'piss', 'prick', 'pussy', 'retard', 'shit', 'shitty',
  'slut', 'twat', 'wanker', 'whore', 'penis', 'vagina', 'porn', 'sex', 'nude',
  'kill', 'murder', 'suicide', 'die', 'death', 'dead',
  'blyat', 'blya', 'suka', 'suki', 'pizda', 'pizdec', 'хуй', 'хуя',
  'hui', 'huya', 'ebat', 'ebal', 'yebat', 'yebal', 'govno', 'govnoed',
  'mudak', 'mudaki', 'zalupa', 'blin', 'dermo', 'svinja', 'svinya',
  'блять', 'бля', 'сука', 'пизда', 'пиздец', 'ебать', 'ебал', 'говно',
  'мудак', 'залупа', 'свинья',
  'siktir', 'sikerim', 'sik', 'siki', 'sikik', 'orospu', 'orospu cocugu',
  'cocugu', 'piç', 'pic', 'yarrak', 'göt', 'got', 'amcik', 'amcık',
  'pezevenk', 'şerefsiz', 'serefsiz', 'haysiyetsiz', 'alçak', 'alcak',
  'gerizekalı', 'gerizekali', 'geri zekalı', 'mal', 'dangalak',
  'kevaşe', 'kevase', 'fahişe', 'fahise',
  'puta', 'mierda', 'culo', 'cabron', 'maricon', 'pendejo',
  'merde', 'connard', 'salaud', 'pute', 'bordel', 'encule',
  'cazzo', 'merda', 'stronzo', 'vaffanculo', 'porco',
  'kurwa', 'pierdolic', 'jebac', 'chuj', 'dupa',
  'admin', 'administrator', 'moderator', 'mod', 'system', 'root',
  'official', 'offiziell', 'tvn', 'verein', 'staff', 'support',
  'help', 'hilfe', 'bot', 'robot', 'null', 'undefined', 'test',
  'testuser', 'asdf', 'qwertz', '1234', '12345', '123456',
  'password', 'passwort', 'login', 'user', 'username',
  'xxx', 'porn', 'sex', 'nackt', 'nude', 'hacker', 'cracker',
  'virus', 'malware', 'trojan', 'scam', 'phishing',
  'allah', 'jesus', 'gott', 'god', 'satan', 'devil', 'teufel',
  'drogen', 'drugs', 'weed', 'gras', 'kokain', 'cocaine', 'heroin',
  'meth', 'crack', 'pille', 'pill',
];

function isNameAllowed(name) {
  if (!name || name.trim().length < 2) return { ok: false, msg: 'Name muss mindestens 2 Zeichen haben.' };
  if (name.trim().length > 20) return { ok: false, msg: 'Name darf maximal 20 Zeichen haben.' };
  const lower = name.toLowerCase().trim();
  for (const word of BLOCKED_WORDS) {
    if (lower === word || lower.includes(word)) return { ok: false, msg: 'Dieser Name ist nicht erlaubt.' };
  }
  return { ok: true, msg: '' };
}

function getDisplayTime(t) { return new Date(new Date(t).getTime() - 2*60*60*1000); }

const BADGE_DEFS = {
  perfect_shooter: { icon: '🎯', name: 'Perfekter Schuss', desc: '5 exakte Tipps' },
  century: { icon: '💯', name: 'Centurion', desc: '100 Punkte erreicht' },
};

export default function App() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [regUsername, setRegUsername] = useState('');
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
  const [showPointsInfo, setShowPointsInfo] = useState(false);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupLeaderboard, setGroupLeaderboard] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupIsPublic, setNewGroupIsPublic] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [confirmModal, setConfirmModal] = useState(null);
  const confirmResolveRef = useRef(null);
  const cardsRef = useRef([]);
  const finishedCardsRef = useRef([]);
  const [darkMode, setDarkMode] = useState(() => {
    try { const s = localStorage.getItem('tvn-dark-mode'); return s !== null ? JSON.parse(s) : true; } catch { return true; }
  });
  const [badges, setBadges] = useState([]);
  const [weeklyChampion, setWeeklyChampion] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(null);
  const [gamesOnDate, setGamesOnDate] = useState([]);
  const [showResendButton, setShowResendButton] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [honeypotValue, setHoneypotValue] = useState('');
  const [formStartTime, setFormStartTime] = useState(null);
  const [turnstileToken, setTurnstileToken] = useState('');
  
  // TABELLEN STATES
  const [leagueMappings, setLeagueMappings] = useState({});
  const [showTableModal, setShowTableModal] = useState(null);

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  function askConfirm(message) {
    return new Promise(resolve => {
      confirmResolveRef.current = resolve;
      setConfirmModal({ message });
    });
  }

  function handleConfirmYes() {
    setConfirmModal(null);
    if (confirmResolveRef.current) { confirmResolveRef.current(true); confirmResolveRef.current = null; }
  }

  function handleConfirmNo() {
    setConfirmModal(null);
    if (confirmResolveRef.current) { confirmResolveRef.current(false); confirmResolveRef.current = null; }
  }

  async function requestNotificationPermission() {
    try {
      if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission();
    } catch (e) { /* ignore */ }
  }

  const setupObserver = useCallback(refs => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach((e, i) => { if (e.isIntersecting) setTimeout(() => e.target.classList.add('revealed'), i*50); });
    }, { threshold: 0.1 });
    refs.forEach(c => { if (c) obs.observe(c); });
    return obs;
  }, []);

    useEffect(() => {
    if (isRegistering && !formStartTime) {
      setFormStartTime(Date.now());
    }
  }, [isRegistering, formStartTime]);

  useEffect(() => {
    if (view === 'tips') { const o = setupObserver(cardsRef.current); return () => o.disconnect(); }
  }, [games, view, setupObserver]);

  useEffect(() => {
    if (view === 'results') { const o = setupObserver(finishedCardsRef.current); return () => o.disconnect(); }
  }, [finishedGames, myFinishedGames, resultTab, view, setupObserver]);

  useEffect(() => {
    try { localStorage.setItem('tvn-dark-mode', JSON.stringify(darkMode)); } catch (e) { /* ignore */ }
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  async function loadUsername(uid) {
    try {
      const { data, error } = await supabase.from('profiles').select('username').eq('id', uid).single();
      if (error || !data) {
        await supabase.auth.signOut();
        setUser(null); setUsername(''); setView('login');
        setEmail(''); setPassword(''); setMyTips({}); setTips({}); setGroups([]); setBadges([]);
        return false;
      }
      setUsername(data.username);
      return true;
    } catch (e) { return false; }
  }

  async function loadBadges(uid) {
    try {
      const { data } = await supabase.from('badges').select('*').eq('user_id', uid);
      setBadges((data || []).filter(b => BADGE_DEFS[b.badge_type]));
    } catch (e) { /* ignore */ }
  }

  async function loadWeeklyChampion() {
    try {
      const { data } = await supabase.from('weekly_champion').select('*');
      setWeeklyChampion(data?.[0] || null);
    } catch (e) { /* ignore */ }
  }

  // Lädt die Zuordnung: Liga-ID -> [Teamname 1, Teamname 2]
  async function loadLeagueMappings() {
    try {
      const response = await fetch(`./generated/table-links.json?t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        const mapping = {};
        data.forEach(item => { 
          if (item.ligaId && item.tvnTeams) {
            mapping[item.ligaId] = item.tvnTeams; 
          }
        });
        setLeagueMappings(mapping);
      } else {
        console.warn('table-links.json konnte nicht geladen werden.');
      }
    } catch (e) { console.error('Konnte Tabelle-Zuordnung nicht laden:', e); }
  }

  useEffect(() => {
    async function initSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const userExists = await loadUsername(session.user.id);
          if (!userExists) return;
          setUser(session.user);
          loadBadges(session.user.id);
          loadWeeklyChampion();
          loadLeagueMappings(); // WICHTIG: Hier laden
          requestNotificationPermission();
          setView('tips');
          loadData(session.user.id);
          loadGroups(session.user.id);
        }
      } catch (e) { console.error('Session-Fehler:', e); }
    }
    initSession();

    const { data: al } = supabase.auth.onAuthStateChange(async (_e, session) => {
      try {
        if (session?.user) {
          const userExists = await loadUsername(session.user.id);
          if (!userExists) return;
          setUser(session.user);
          loadBadges(session.user.id);
          loadWeeklyChampion();
          loadLeagueMappings(); // WICHTIG: Hier laden
          requestNotificationPermission();
          setView('tips');
          loadData(session.user.id);
          loadGroups(session.user.id);
        } else {
          setUser(null); setView('login');
        }
      } catch (e) { console.error('Auth-Fehler:', e); }
    });
    return () => al.subscription.unsubscribe();
  }, []);

  async function loadData(uid) {
    setLoading(true);
    try {
      const now = new Date();
      const in7 = new Date(now.getTime() + 7*24*60*60*1000);
      const { data: gd } = await supabase.from('games').select('*').eq('is_cancelled', false)
        .gte('start_time', now.toISOString()).lte('start_time', in7.toISOString())
        .order('start_time', { ascending: true });
      setGames(gd || []);
      await loadFinishedGames('7');
      const { data: ld } = await supabase.from('leaderboard').select('*');
      setLeaderboard(ld || []);
      if (uid) {
        const { data: td } = await supabase.from('predictions').select('*').eq('user_id', uid);
        if (td) {
          const tm = {}; td.forEach(t => tm[t.game_id] = t); setMyTips(tm);
          const ts = {}; td.forEach(t => {
            ts[t.game_id+'h'] = t.predicted_home_score?.toString() || '';
            ts[t.game_id+'a'] = t.predicted_away_score?.toString() || '';
          }); setTips(ts);
        }
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function loadFinishedGames(days) {
    setResultFilter(days);
    let q = supabase.from('games').select('*').eq('is_cancelled', false).not('home_score', 'is', null).order('start_time', { ascending: false });
    if (days !== 'all') {
      const s = new Date(Date.now() - parseInt(days)*24*60*60*1000);
      q = q.gte('start_time', s.toISOString());
    }
    const { data } = await q;
    setFinishedGames(data || []);
    setMyFinishedGames(data.filter(g => myTips[g.id]));
  }

  async function loadGroups(uid) {
    try {
      const u = uid || user?.id; if (!u) return;
      const { data: mg } = await supabase.from('group_members').select('group_id').eq('user_id', u);
      const ids = mg?.map(m => m.group_id) || [];
      let ag = [];
      const { data: pg } = await supabase.from('groups').select('*').eq('is_public', true);
      if (pg) ag = [...pg];
      if (ids.length > 0) {
        const { data: prg } = await supabase.from('groups').select('*').in('id', ids).eq('is_public', false);
        if (prg) ag = [...ag, ...prg];
      }
      setGroups(ag.filter((g,i,s) => i === s.findIndex(x => x.id === g.id)));
    } catch (e) { console.error(e); }
  }

  async function createGroup() {
    const nc = isNameAllowed(newGroupName);
    if (!nc.ok) { showToast(nc.msg, 'error'); return; }
    try {
      const { data: cd } = await supabase.rpc('generate_join_code');
      const code = cd || Math.random().toString(36).substring(2, 8).toUpperCase();
      const { data: group, error } = await supabase.from('groups').insert({
        name: newGroupName.trim(), is_public: newGroupIsPublic,
        join_code: newGroupIsPublic ? null : code, created_by: user.id
      }).select().single();
      if (error) throw error;
      await supabase.from('group_members').insert({ group_id: group.id, user_id: user.id, is_admin: true });
      showToast('Gruppe erstellt! 🎉', 'success');
      setShowCreateGroup(false); setNewGroupName(''); setNewGroupIsPublic(false);
      await loadGroups(user.id);
    } catch (e) { showToast('Fehler: ' + e.message, 'error'); }
  }

  async function joinGroupWithCode() {
    if (!joinCode.trim()) { showToast('Bitte Code eingeben.', 'error'); return; }
    try {
      const { data: group, error: ge } = await supabase.from('groups').select('*').eq('join_code', joinCode.toUpperCase()).single();
      if (ge || !group) { showToast('Ungültiger Code.', 'error'); return; }
      const { error: me } = await supabase.from('group_members').insert({ group_id: group.id, user_id: user.id, is_admin: false });
      if (me) {
        if (me.code === '23505') showToast('Bereits Mitglied.', 'info'); else throw me;
      } else showToast('Beigetreten! 🎉', 'success');
      setShowJoinGroup(false); setJoinCode(''); await loadGroups(user.id);
    } catch (e) { showToast('Fehler: ' + e.message, 'error'); }
  }

  async function joinPublicGroup(gid) {
    try {
      const { error } = await supabase.from('group_members').insert({ group_id: gid, user_id: user.id, is_admin: false });
      if (error) {
        if (error.code === '23505') showToast('Bereits Mitglied.', 'info'); else throw error;
      } else showToast('Beigetreten! 🎉', 'success');
      await loadGroupDetails(gid);
    } catch (e) { showToast('Fehler: ' + e.message, 'error'); }
  }

  async function leaveGroup(gid) {
    const ok = await askConfirm('Gruppe wirklich verlassen?');
    if (!ok) return;
    try {
      const { error } = await supabase.from('group_members').delete().eq('group_id', gid).eq('user_id', user.id);
      if (error) throw error;
      showToast('Gruppe verlassen!', 'success');
      setSelectedGroup(null); await loadGroups(user.id);
    } catch (e) { showToast('Fehler: ' + e.message, 'error'); }
  }

  async function deleteGroup(gid) {
    const ok = await askConfirm('Gruppe wirklich löschen?');
    if (!ok) return;
    try {
      const { error } = await supabase.from('groups').delete().eq('id', gid);
      if (error) throw error;
      showToast('Gruppe gelöscht!', 'success');
      setSelectedGroup(null); await loadGroups(user.id);
    } catch (e) { showToast('Fehler: ' + e.message, 'error'); }
  }

  async function loadGroupDetails(gid) {
    const { data: g } = await supabase.from('groups').select('*').eq('id', gid).single();
    setSelectedGroup(g);
    const { data: m } = await supabase.from('group_members').select('*, profiles(username)').eq('group_id', gid);
    setGroupMembers(m || []);
    const { data: lb } = await supabase.from('group_leaderboard').select('*').eq('group_id', gid);
    setGroupLeaderboard(lb || []);
  }

  async function removeMember(gid, uid) {
    const ok = await askConfirm('Mitglied entfernen?');
    if (!ok) return;
    try {
      const { error } = await supabase.from('group_members').delete().eq('group_id', gid).eq('user_id', uid);
      if (error) throw error;
      showToast('Entfernt!', 'success'); await loadGroupDetails(gid);
    } catch (e) { showToast('Fehler: ' + e.message, 'error'); }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setMsg('');
    setShowResendButton(false);
    setSubmitting(true);

    try {
      if (isRegistering) {
        if (honeypotValue) {
          console.log('🤖 Bot erkannt (Honeypot)');
          setMsg('❌ Registrierung fehlgeschlagen.');
          setSubmitting(false);
          return;
        }

        const timeSpent = Date.now() - formStartTime;
        if (timeSpent < 3000) {
          console.log('🤖 Bot erkannt (zu schnell: ' + timeSpent + 'ms)');
          setMsg('❌ Bitte nimm dir mehr Zeit beim Ausfüllen.');
          setSubmitting(false);
          return;
        }

        if (!turnstileToken) {
          setMsg('❌ Bitte bestätige, dass du kein Bot bist.');
          setSubmitting(false);
          return;
        }

        try {
          const { data: turnstileData, error: turnstileError } = await supabase.functions.invoke('verify-turnstile', {
            body: { token: turnstileToken }
          });
          if (turnstileError || !turnstileData?.success) {
            console.log('🤖 Bot erkannt (Turnstile)');
            setMsg('❌ Bot-Prüfung fehlgeschlagen.');
            setSubmitting(false);
            return;
          }
        } catch (err) {
          console.error('Turnstile Fehler:', err);
          setMsg('❌ Fehler bei der Bot-Prüfung.');
          setSubmitting(false);
          return;
        }

        const nc = isNameAllowed(regUsername);
        if (!nc.ok) {
          setMsg(nc.msg);
          setSubmitting(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(), password: password,
          options: {
            data: { username: regUsername.trim() },
            emailRedirectTo: 'https://celloschach.github.io/tvn-tips/confirm.html'
          }
        });
        if (error) { setMsg('❌ ' + error.message); }
        else {
          setMsg('✅ Registrierung erfolgreich! Bitte prüfe deine E-Mails.');
          showToast('📧 Bestätigungs-E-Mail gesendet!', 'success');
          setRegUsername(''); setEmail(''); setPassword(''); setIsRegistering(false);
          setTurnstileToken(''); setHoneypotValue(''); setFormStartTime(null);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) {
          if (error.message.toLowerCase().includes('not confirmed')) {
            setMsg('⚠️ E-Mail nicht bestätigt. Prüfe dein Postfach!');
            setShowResendButton(true);
          } else { setMsg('❌ ' + error.message); }
        } else if (data.user && !data.user.email_confirmed_at) {
          setMsg('⚠️ Bitte bestätige zuerst deine E-Mail-Adresse.');
          setShowResendButton(true);
        }
      }
    } catch (err) { setMsg('❌ Fehler: ' + (err.message || 'Unbekannter Fehler')); }
    setSubmitting(false);
  }

  async function handleLogout() {
    try { await supabase.auth.signOut(); } catch (e) { /* ignore */ }
    setUser(null); setUsername(''); setView('login');
    setEmail(''); setPassword(''); setRegUsername('');
    setMyTips({}); setTips({}); setGroups([]); setBadges([]);
    setShowResendButton(false);
  }

  async function submitTip(gid, hs, as) {
    if (!hs || !as) { showToast('Beide Ergebnisse eingeben.', 'error'); return; }
    try {
      const { data: ex } = await supabase.from('predictions').select('id').eq('user_id', user.id).eq('game_id', gid).single();
      if (ex) {
        const { error } = await supabase.from('predictions').update({ predicted_home_score: parseInt(hs), predicted_away_score: parseInt(as) }).eq('id', ex.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('predictions').insert({ user_id: user.id, game_id: gid, predicted_home_score: parseInt(hs), predicted_away_score: parseInt(as) });
        if (error) throw error;
      }
      showToast('Tipp gespeichert! 🏀', 'success');
      await loadData(user.id); await loadBadges(user.id);
    } catch (e) { showToast('Fehler: ' + e.message, 'error'); }
  }

  async function deleteTip(gid) {
    const ok = await askConfirm('Tipp löschen?');
    if (!ok) return;
    try {
      const { error } = await supabase.from('predictions').delete().eq('user_id', user.id).eq('game_id', gid);
      if (error) throw error;
      showToast('Tipp gelöscht!', 'success'); await loadData(user.id);
    } catch (e) { showToast('Fehler: ' + e.message, 'error'); }
  }

  async function loadCalendarGames(y, m) {
    const s = new Date(y, m, 1);
    const e = new Date(y, m+1, 0, 23, 59, 59);
    const { data } = await supabase.from('games').select('*').eq('is_cancelled', false)
      .gte('start_time', s.toISOString()).lte('start_time', e.toISOString())
      .order('start_time', { ascending: true });
    setGamesOnDate(data || []);
  }

  useEffect(() => { if (view === 'calendar') loadCalendarGames(calendarYear, calendarMonth); }, [calendarYear, calendarMonth, view]);

  function getCalendarDays(y, m) {
    const fd = new Date(y, m, 1);
    const ld = new Date(y, m+1, 0).getDate();
    let sd = fd.getDay(); sd = sd === 0 ? 6 : sd - 1;
    const d = [];
    for (let i = 0; i < sd; i++) d.push(null);
    for (let i = 1; i <= ld; i++) d.push(i);
    return d;
  }

  function getGamesForDay(day) {
    if (!day) return [];
    return gamesOnDate.filter(g => {
      const gd = getDisplayTime(g.start_time);
      return gd.getDate() === day && gd.getMonth() === calendarMonth && gd.getFullYear() === calendarYear;
    });
  }

  function prevMonth() {
    if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(calendarYear-1); }
    else setCalendarMonth(calendarMonth-1);
    setSelectedDate(null);
  }

  function nextMonth() {
    if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(calendarYear+1); }
    else setCalendarMonth(calendarMonth+1);
    setSelectedDate(null);
  }

  function isGameStarted(t) { return new Date(new Date(t).getTime() - 2*60*60*1000) <= new Date(); }

  function getResultBadge(g) {
    const h = g.home_team.toLowerCase(), a = g.away_team.toLowerCase();
    const tvnH = h.includes('neunkirchen') || h.includes('tvn');
    const tvnA = a.includes('neunkirchen') || a.includes('tvn');
    let w = false, l = false;
    if (tvnH) { w = g.home_score > g.away_score; l = g.home_score < g.away_score; }
    else if (tvnA) { w = g.away_score > g.home_score; l = g.away_score < g.home_score; }
    else { w = g.home_score > g.away_score; l = g.home_score < g.away_score; }
    if (g.home_score === g.away_score) return <span className="badge-draw text-xs px-3 py-1.5 rounded-button font-mono font-bold">UNENTSCHIEDEN</span>;
    if (w) return <span className="badge-win text-xs px-3 py-1.5 rounded-button font-mono font-bold">SIEG</span>;
    if (l) return <span className="badge-loss text-xs px-3 py-1.5 rounded-button font-mono font-bold">NIEDERLAGE</span>;
    return null;
  }

  function getTipPoints(tip, g) {
    if (!tip || g.home_score === null) return null;
    if (tip.predicted_home_score === g.home_score && tip.predicted_away_score === g.away_score) return 10;
    if (Math.abs((tip.predicted_home_score - tip.predicted_away_score) - (g.home_score - g.away_score)) <= 20) return 5;
    const tH = tip.predicted_home_score > tip.predicted_away_score;
    const tA = tip.predicted_home_score < tip.predicted_away_score;
    const tD = tip.predicted_home_score === tip.predicted_away_score;
    const gH = g.home_score > g.away_score;
    const gA = g.home_score < g.away_score;
    const gD = g.home_score === g.away_score;
    if ((tH && gH) || (tA && gA) || (tD && gD)) return 3;
    return 1;
  }

  function getBadgeIcon(t) { return BADGE_DEFS[t]?.icon || '🏅'; }
  function getBadgeName(t) { return BADGE_DEFS[t]?.name || t; }
  function getMyPoints() { return leaderboard.find(r => r.username === username)?.total_points || 0; }
  function getMyRank() { const i = leaderboard.findIndex(r => r.username === username); return i >= 0 ? i+1 : null; }

  function hasTipChanged(gameId) {
    const currentTip = myTips[gameId];
    const currentH = tips[gameId + 'h'];
    const currentA = tips[gameId + 'a'];
    if (!currentTip) return false;
    return currentH !== currentTip.predicted_home_score?.toString() || currentA !== currentTip.predicted_away_score?.toString();
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
        <div className="glass-card p-6 md:p-8 rounded-card shadow-card max-w-md w-full">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🏀</div>
            <h1 className="text-3xl font-heading font-bold bg-gradient-to-r from-neon-gold to-neon-pink bg-clip-text text-transparent">TVN Tipp-Spiel</h1>
            <p className="text-gray-400 font-body mt-2">{isRegistering ? 'Erstelle deinen Account' : 'Willkommen zurück'}</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="text" name="website" tabIndex={-1} autoComplete="off" placeholder="" value={honeypotValue} onChange={(e) => setHoneypotValue(e.target.value)} style={{ position: 'absolute', left: '-9999px', top: '-9999px', opacity: 0, height: 0, width: 0, overflow: 'hidden' }} />
            {isRegistering && (
              <input type="text" placeholder="Benutzername" value={regUsername} onChange={(e) => setRegUsername(e.target.value)}
                className="w-full p-3 bg-dark-800 border border-white/10 rounded-button text-white placeholder-gray-500 focus:border-neon-gold focus:ring-2 focus:ring-neon-gold/20 outline-none font-body transition" required />
            )}
            <input type="email" placeholder="E-Mail-Adresse" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-dark-800 border border-white/10 rounded-button text-white placeholder-gray-500 focus:border-neon-gold focus:ring-2 focus:ring-neon-gold/20 outline-none font-body transition" required autoComplete="email" inputMode="email" />
            <input type="password" placeholder="Passwort" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-dark-800 border border-white/10 rounded-button text-white placeholder-gray-500 focus:border-neon-gold focus:ring-2 focus:ring-neon-gold/20 outline-none font-body transition" required minLength={6} autoComplete={isRegistering ? 'new-password' : 'current-password'} />
                {isRegistering && (
              {isRegistering && (
  <div className="flex flex-col items-center mt-4">
    <Turnstile
      siteKey="0x4AAAAAAFDsuncEtGNWUI8C" // <-- HIER DEINEN ECHTEN KEY EINFÜGEN!
      onVerify={(token) => {
        console.log('✅ Token erhalten:', token);
        setTurnstileToken(token);
      }}
      onError={(error) => {
        console.error('❌ Turnstile Fehler:', error);
      }}
      options={{ theme: 'dark', language: 'de' }}
    />
    {/* DEBUG-ANZEIGE: */}
    <p className="text-xs mt-2 font-mono">
      Status: {turnstileToken ? '✅ Token da (Button sollte aktiv sein)' : '⏳ Warte auf Token...'}
    </p>
  </div>
            )}
            {showResendButton && (
              <button type="button" onClick={async () => {
                if (!email) { setMsg('Bitte erst E-Mail eingeben.'); return; }
                try {
                  const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() });
                  if (error) setMsg('❌ ' + error.message);
                  else { showToast('📧 E-Mail erneut gesendet!', 'success'); setShowResendButton(false); }
                } catch (err) { setMsg('❌ ' + err.message); }
              }} className="w-full text-neon-gold hover:text-neon-pink text-sm font-medium font-body transition">
                📧 Bestätigungs-E-Mail erneut senden
              </button>
            )}
                  <button type="submit" disabled={submitting || (isRegistering && !turnstileToken)} className={`glow-button w-full bg-gradient-to-r from-neon-gold to-yellow-500 text-dark-900 p-3 rounded-button font-heading font-bold hover:shadow-glow transition ${submitting || (isRegistering && !turnstileToken) ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {submitting ? '⏳ Bitte warten...' : (isRegistering ? 'Registrieren' : 'Anmelden')}
            </button>
          </form>
            <button onClick={() => { setIsRegistering(!isRegistering); setMsg(''); setShowResendButton(false); setTurnstileToken(''); setHoneypotValue(''); setFormStartTime(null); }}
            className="w-full mt-4 text-neon-gold hover:text-neon-pink text-sm font-medium font-body transition">
            {isRegistering ? 'Zurück zum Login' : 'Noch keinen Account? Registrieren'}
          </button>
          {msg && (
            <div className={`mt-4 p-3 rounded-button text-sm text-center font-body ${msg.includes('✅') ? 'bg-neon-green/20 text-neon-green' : msg.includes('⚠️') ? 'bg-yellow-500/20 text-yellow-400' : 'bg-neon-red/20 text-neon-red'}`}>
              {msg}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900">
      {toast && (
        <div className={`toast ${toast.type === 'success' ? 'toast-success' : toast.type === 'error' ? 'toast-error' : 'toast-info'}`}>
          <div className="px-6 py-4 rounded-card shadow-card font-body font-semibold flex items-center gap-2">
            <span>{toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}</span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {confirmModal && (
        <div className="modal-overlay" onClick={handleConfirmNo}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-4"><div className="text-4xl mb-2">⚠️</div><h3 className="text-xl font-heading font-bold text-white">Bist du sicher?</h3></div>
            <p className="text-gray-400 font-body mb-6 text-center">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button onClick={handleConfirmNo} className="flex-1 glow-button bg-dark-700 text-white px-4 py-3 rounded-button font-heading font-semibold hover:bg-dark-600 transition">Abbrechen</button>
              <button onClick={handleConfirmYes} className="flex-1 glow-button bg-neon-red text-white px-4 py-3 rounded-button font-heading font-semibold hover:bg-red-700 transition">Bestätigen</button>
            </div>
          </div>
        </div>
      )}

      {showPointsInfo && (
        <div className="modal-overlay" onClick={() => setShowPointsInfo(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-heading font-bold text-white mb-4">🏆 Punkte-System</h3>
            <div className="space-y-3 font-body text-gray-400">
              <div className="flex items-start gap-3"><span className="text-2xl">🎯</span><div><div className="font-bold text-white">10 Punkte</div><div className="text-sm">Exaktes Ergebnis</div></div></div>
              <div className="flex items-start gap-3"><span className="text-2xl">👍</span><div><div className="font-bold text-white">5 Punkte</div><div className="text-sm">Innerhalb von 20 Punkten Differenz</div></div></div>
              <div className="flex items-start gap-3"><span className="text-2xl">✓</span><div><div className="font-bold text-white">3 Punkte</div><div className="text-sm">Richtige Tendenz</div></div></div>
              <div className="flex items-start gap-3"><span className="text-2xl">🏀</span><div><div className="font-bold text-white">1 Punkt</div><div className="text-sm">Teilnahme</div></div></div>
            </div>
            <button onClick={() => setShowPointsInfo(false)} className="mt-6 w-full glow-button bg-gradient-to-r from-neon-gold to-yellow-500 text-dark-900 px-4 py-3 rounded-button font-heading font-bold hover:shadow-glow transition">Verstanden</button>
          </div>
        </div>
      )}

      {showCreateGroup && (
        <div className="modal-overlay" onClick={() => setShowCreateGroup(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-heading font-bold text-white mb-4">Gruppe erstellen</h3>
            <div className="space-y-4">
              <input type="text" placeholder="Gruppenname" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} className="w-full p-3 bg-dark-800 border border-white/10 rounded-button text-white placeholder-gray-500 focus:border-neon-gold outline-none font-body" />
              <label className="flex items-center gap-2 font-body text-gray-400">
                <input type="checkbox" checked={newGroupIsPublic} onChange={(e) => setNewGroupIsPublic(e.target.checked)} className="w-5 h-5" />
                <span>Öffentliche Gruppe</span>
              </label>
              <div className="flex gap-3">
                <button onClick={() => setShowCreateGroup(false)} className="flex-1 glow-button bg-dark-700 text-white px-4 py-3 rounded-button font-heading font-semibold hover:bg-dark-600 transition">Abbrechen</button>
                <button onClick={createGroup} className="flex-1 glow-button bg-gradient-to-r from-neon-gold to-yellow-500 text-dark-900 px-4 py-3 rounded-button font-heading font-bold hover:shadow-glow transition">Erstellen</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showJoinGroup && (
        <div className="modal-overlay" onClick={() => setShowJoinGroup(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-heading font-bold text-white mb-4">Gruppe beitreten</h3>
            <div className="space-y-4">
              <input type="text" placeholder="Beitrittscode" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} className="w-full p-3 bg-dark-800 border border-white/10 rounded-button text-white placeholder-gray-500 focus:border-neon-gold outline-none font-body uppercase" />
              <div className="flex gap-3">
                <button onClick={() => setShowJoinGroup(false)} className="flex-1 glow-button bg-dark-700 text-white px-4 py-3 rounded-button font-heading font-semibold hover:bg-dark-600 transition">Abbrechen</button>
                <button onClick={joinGroupWithCode} className="flex-1 glow-button bg-gradient-to-r from-neon-gold to-yellow-500 text-dark-900 px-4 py-3 rounded-button font-heading font-bold hover:shadow-glow transition">Beitreten</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <aside className="sidebar hidden lg:flex flex-col">
        <div className="p-6 border-b border-white/10">
          <button onClick={() => setView('tips')} className="flex items-center gap-2 hover:opacity-80 transition">
            <span className="text-3xl">🏀</span>
            <span className="text-xl font-heading font-bold bg-gradient-to-r from-neon-gold to-neon-pink bg-clip-text text-transparent">TVN Tipps</span>
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {[{ id: 'tips', label: 'Spiele', icon: '⚽' }, { id: 'results', label: 'Ergebnisse', icon: '📊' }, { id: 'calendar', label: 'Kalender', icon: '📅' }, { id: 'groups', label: 'Gruppen', icon: '👥' }, { id: 'leaderboard', label: 'Tabelle', icon: '🏆' }].map(tab => (
            <button key={tab.id} onClick={() => setView(tab.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-button font-heading font-semibold transition ${view === tab.id ? 'bg-gradient-to-r from-neon-gold to-yellow-500 text-dark-900 shadow-glow' : 'text-gray-400 hover:text-white hover:bg-dark-700'}`}>
              <span className="text-xl">{tab.icon}</span><span>{tab.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10 space-y-3">
          {badges.length > 0 && (<div className="flex flex-wrap gap-1 mb-3">{badges.map(badge => <div key={badge.id} className="text-xl" title={getBadgeName(badge.badge_type)}>{getBadgeIcon(badge.badge_type)}</div>)}</div>)}
          <button onClick={() => setDarkMode(!darkMode)} className="w-full flex items-center justify-between px-4 py-2 rounded-button bg-dark-700 hover:bg-dark-600 transition">
            <span className="text-sm font-body text-gray-400">{darkMode ? '🌙 Dark' : '☀️ Light'}</span>
            <div className={`w-12 h-6 rounded-full p-1 transition ${darkMode ? 'bg-neon-gold' : 'bg-gray-600'}`}><div className={`w-4 h-4 rounded-full bg-white transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-0'}`} /></div>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-neon-purple to-neon-pink flex items-center justify-center text-white font-bold">{username?.[0]?.toUpperCase() || 'U'}</div>
            <div className="flex-1 min-w-0"><div className="text-sm font-heading font-bold text-white truncate">{username}</div><div className="text-xs text-gray-500 font-body">Online</div></div>
          </div>
          <button onClick={handleLogout} className="w-full glow-button bg-neon-red/20 text-neon-red px-4 py-2 rounded-button font-heading font-semibold hover:bg-neon-red/30 transition">Logout</button>
        </div>
      </aside>

      <header className="lg:hidden bg-dark-800 border-b border-white/10 p-4 sticky top-0 z-50">
        <div className="flex justify-between items-center">
          <button onClick={() => setView('tips')} className="flex items-center gap-2">
            <span className="text-2xl">🏀</span>
            <span className="text-lg font-heading font-bold bg-gradient-to-r from-neon-gold to-neon-pink bg-clip-text text-transparent">TVN Tipps</span>
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => setDarkMode(!darkMode)} className="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center text-lg hover:bg-dark-600 transition">{darkMode ? '☀️' : '🌙'}</button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-neon-purple to-neon-pink flex items-center justify-center text-white text-sm font-bold">{username?.[0]?.toUpperCase() || 'U'}</div>
            <button onClick={handleLogout} className="glow-button bg-neon-red/20 text-neon-red px-3 py-1.5 rounded-button text-xs font-heading font-semibold hover:bg-neon-red/30 transition">Logout</button>
          </div>
        </div>
      </header>

      <main className="lg:ml-60 p-4 md:p-6 pb-24 lg:pb-6">
        {view === 'tips' && (
          <div>
            <div className="glass-card rounded-card p-6 mb-6 bg-gradient-to-r from-neon-purple/10 to-neon-pink/10">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-heading font-bold text-white mb-2">Hallo {username}! 👋</h1>
                  <p className="text-gray-400 font-body">Spiele der nächsten 7 Tage</p>
                  {badges.length > 0 && (<div className="flex flex-wrap gap-2 mt-3">{badges.map(badge => (<div key={badge.id} className="flex items-center gap-1 bg-dark-700 px-2 py-1 rounded-button" title={BADGE_DEFS[badge.badge_type]?.desc}><span className="text-lg">{getBadgeIcon(badge.badge_type)}</span><span className="text-xs font-body text-gray-300">{getBadgeName(badge.badge_type)}</span></div>))}</div>)}
                </div>
                <div className="text-right">
                  <div className="text-3xl font-heading font-bold text-neon-gold">{getMyPoints()}</div>
                  <div className="text-sm text-gray-400 font-body">{getMyRank() ? `Platz ${getMyRank()}` : 'Noch kein Rang'}</div>
                  {weeklyChampion && <div className="mt-2 text-xs bg-neon-gold/20 text-neon-gold px-2 py-1 rounded-button font-mono font-bold">👑 {weeklyChampion.username}</div>}
                </div>
              </div>
            </div>
            <h2 className="text-xl font-heading font-bold text-white mb-4">Kommende Spiele</h2>
            {loading && <div className="text-center py-12 text-gray-500 font-body"><div className="text-4xl mb-4 animate-pulse">🏀</div>Lade Spiele...</div>}
            {!loading && games.length === 0 && <div className="glass-card rounded-card p-8 text-center text-gray-500 font-body">Keine Spiele in den nächsten 7 Tagen.</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {games.map((game, index) => {
                const hD = game.age_group ? `${game.age_group} ${game.home_team}` : game.home_team;
                const aD = game.age_group ? `${game.age_group} ${game.away_team}` : game.away_team;
                const started = isGameStarted(game.start_time);
                const hasTip = myTips[game.id];
                const dT = getDisplayTime(game.start_time);
                const tipChanged = hasTipChanged(game.id);
                
                // Prüfen, ob wir eine Tabelle für diese Liga haben
                const hasTable = game.liga_id && leagueMappings[game.liga_id] && leagueMappings[game.liga_id].length > 0;

                return (
                  <div key={game.id} ref={el => cardsRef.current[index] = el} className="card-reveal hover-lift glass-card rounded-card overflow-hidden">
                    <div className="game-card-content p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs font-mono font-semibold text-neon-gold uppercase tracking-wide">{game.competition || 'Liga'}</div>
                        {hasTip && <div className="text-xs bg-neon-green/20 text-neon-green px-2 py-1 rounded-button font-mono font-bold">✓ Getippt</div>}
                      </div>
                      <div className="text-xs text-gray-500 mb-4 font-body">📅 {dT.toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} Uhr</div>
                      <div className="team-names-row flex justify-between items-center text-base font-heading font-bold mb-4 text-white">
                        <span className="text-right flex-1 team-name-clamp pr-2">{hD}</span>
                        <span className="text-neon-gold px-3 text-sm font-normal flex-shrink-0">vs</span>
                        <span className="text-left flex-1 team-name-clamp pl-2">{aD}</span>
                      </div>
                      
                      {/* ✅ DER TABELLEN-BUTTON */}
                      {hasTable && (
                      <button 
  onClick={() => setShowTableModal({ 
    ligaId: game.liga_id, 
    competition: game.competition,
    homeTeam: game.home_team,
    awayTeam: game.away_team
  })}
  className="mb-3 w-full text-xs text-neon-gold hover:text-neon-pink font-body transition flex items-center justify-center gap-1 py-2 border border-white/10 rounded-button hover:bg-white/5"
>
  📊 Tabelle für {leagueMappings[game.liga_id].join(' & ')} anzeigen
</button>
                      )}

                      <div className="mt-auto">
                        {started ? (
                          <div className="bg-dark-700 p-3 rounded-button border border-white/5 text-center">
                            <span className="text-gray-500 font-body text-sm">⏰ Tipp-Sperre aktiv</span>
                            {hasTip && <div className="mt-2 text-neon-gold font-mono font-bold">Dein Tipp: {hasTip.predicted_home_score} : {hasTip.predicted_away_score}</div>}
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center gap-2 bg-dark-700 p-3 rounded-button border border-white/5">
                              <input type="number" min="0" placeholder="H" className="w-14 p-2 bg-dark-800 border border-white/10 rounded-button text-center font-mono font-bold text-white focus:border-neon-gold outline-none text-sm" value={tips[game.id + 'h'] || ''} onChange={(e) => setTips({ ...tips, [game.id + 'h']: e.target.value })} />
                              <span className="font-bold text-neon-gold">:</span>
                              <input type="number" min="0" placeholder="G" className="w-14 p-2 bg-dark-800 border border-white/10 rounded-button text-center font-mono font-bold text-white focus:border-neon-gold outline-none text-sm" value={tips[game.id + 'a'] || ''} onChange={(e) => setTips({ ...tips, [game.id + 'a']: e.target.value })} />
                              <button className="glow-button ml-auto bg-gradient-to-r from-neon-gold to-yellow-500 text-dark-900 px-3 py-2 rounded-button font-heading font-bold hover:shadow-glow transition text-sm" onClick={() => submitTip(game.id, tips[game.id + 'h'], tips[game.id + 'a'])}>
                                {hasTip && tipChanged ? 'Ändern' : 'Tippen'}
                              </button>
                            </div>
                            {hasTip && <button onClick={() => deleteTip(game.id)} className="mt-2 w-full text-xs text-neon-red hover:text-red-400 font-body transition">🗑️ Tipp löschen</button>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === 'results' && (
          <div>
            <h2 className="text-xl font-heading font-bold text-white mb-4">Ergebnisse</h2>
            <div className="flex gap-2 mb-4">
              <button onClick={() => setResultTab('all')} className={`glow-button px-4 py-2 rounded-button text-sm font-heading font-semibold transition ${resultTab === 'all' ? 'bg-gradient-to-r from-neon-gold to-yellow-500 text-dark-900 shadow-glow' : 'bg-dark-700 text-gray-400 hover:text-white'}`}>Alle</button>
              <button onClick={() => setResultTab('my')} className={`glow-button px-4 py-2 rounded-button text-sm font-heading font-semibold transition ${resultTab === 'my' ? 'bg-gradient-to-r from-neon-gold to-yellow-500 text-dark-900 shadow-glow' : 'bg-dark-700 text-gray-400 hover:text-white'}`}>Meine Tipps</button>
            </div>
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {[{ label: '7 Tage', value: '7' }, { label: '30 Tage', value: '30' }, { label: '90 Tage', value: '90' }, { label: 'Alle', value: 'all' }].map(f => (
                <button key={f.value} onClick={() => loadFinishedGames(f.value)} className={`glow-button px-3 py-1.5 rounded-button text-xs font-heading font-semibold transition whitespace-nowrap ${resultFilter === f.value ? 'bg-dark-700 text-white border border-neon-gold' : 'bg-dark-800 text-gray-500 hover:text-white'}`}>{f.label}</button>
              ))}
            </div>
            {(resultTab === 'all' ? finishedGames : myFinishedGames).length === 0 && <div className="glass-card rounded-card p-8 text-center text-gray-500 font-body">{resultTab === 'all' ? 'Keine Ergebnisse.' : 'Keine Tipps in diesem Zeitraum.'}</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(resultTab === 'all' ? finishedGames : myFinishedGames).map((game, index) => {
                const hD = game.age_group ? `${game.age_group} ${game.home_team}` : game.home_team;
                const aD = game.age_group ? `${game.age_group} ${game.away_team}` : game.away_team;
                const tip = myTips[game.id];
                const points = getTipPoints(tip, game);
                const dT = getDisplayTime(game.start_time);
                const hasTable = game.liga_id && leagueMappings[game.liga_id] && leagueMappings[game.liga_id].length > 0;

                return (
                  <div key={game.id} ref={el => finishedCardsRef.current[index] = el} className="card-reveal hover-lift glass-card rounded-card overflow-hidden">
                    <div className="game-card-content p-5">
                      <div className="flex justify-between items-start mb-3"><div className="text-xs font-mono font-semibold text-neon-gold uppercase tracking-wide">{game.competition || 'Liga'}</div>{getResultBadge(game)}</div>
                      <div className="text-xs text-gray-500 mb-4 font-body">📅 {dT.toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} Uhr</div>
                      <div className="result-teams flex justify-between items-center mb-3 text-white">
                        <span className="team-name team-left text-right flex-1 font-heading font-bold team-name-clamp pr-2">{hD}</span>
                        <span className="vs-score-mobile text-neon-gold font-mono font-bold text-xl px-3 flex-shrink-0">{game.home_score} : {game.away_score}</span>
                        <span className="team-name team-right text-left flex-1 font-heading font-bold team-name-clamp pl-2">{aD}</span>
                      </div>
                      
                      {/* ✅ DER TABELLEN-BUTTON (auch in Ergebnissen) */}
                      {hasTable && (
                     <button 
  onClick={() => setShowTableModal({ 
    ligaId: game.liga_id, 
    competition: game.competition,
    homeTeam: game.home_team,
    awayTeam: game.away_team
  })}
  className="mb-3 w-full text-xs text-neon-gold hover:text-neon-pink font-body transition flex items-center justify-center gap-1 py-2 border border-white/10 rounded-button hover:bg-white/5"
>
  📊 Tabelle für {leagueMappings[game.liga_id].join(' & ')} anzeigen
</button>
                      )}

                      {tip && (
                        <div className="mt-auto bg-dark-700 p-3 rounded-button border border-white/5">
                          <div className="flex justify-between items-center"><span className="text-gray-500 text-xs font-body">Dein Tipp:</span><span className="text-white font-mono font-bold">{tip.predicted_home_score} : {tip.predicted_away_score}</span></div>
                          <div className="flex justify-between items-center mt-1"><span className="text-gray-500 text-xs font-body">Punkte:</span><span className={`font-mono font-bold ${points === 10 ? 'text-neon-green' : points === 5 ? 'text-neon-gold' : points === 3 ? 'text-neon-purple' : 'text-gray-400'}`}>{points === 10 ? '🎯 10' : points === 5 ? '👍 5' : points === 3 ? '✓ 3' : '🏀 1'}</span></div>
                        </div>
                      )}
                      {!tip && resultTab === 'all' && <div className="mt-auto text-center text-gray-600 text-xs font-body">Kein Tipp abgegeben</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === 'calendar' && (
          <div>
            <h2 className="text-xl font-heading font-bold text-white mb-4">📅 Spielkalender</h2>
            <div className="glass-card rounded-card p-3 md:p-6">
              <div className="flex justify-between items-center mb-3">
                <button onClick={prevMonth} className="glow-button bg-dark-700 text-white px-3 py-1.5 rounded-button font-heading font-semibold hover:bg-dark-600 transition text-sm">←</button>
                <h3 className="text-sm md:text-lg font-heading font-bold text-white capitalize">{new Date(calendarYear, calendarMonth).toLocaleString('de-DE', { month: 'long', year: 'numeric' })}</h3>
                <button onClick={nextMonth} className="glow-button bg-dark-700 text-white px-3 py-1.5 rounded-button font-heading font-semibold hover:bg-dark-600 transition text-sm">→</button>
              </div>
              <div className="calendar-grid mb-1">{['Mo','Di','Mi','Do','Fr','Sa','So'].map(day => <div key={day} className="text-center text-xs font-mono font-bold text-gray-500 py-1">{day}</div>)}</div>
              <div className="calendar-grid">
                {getCalendarDays(calendarYear, calendarMonth).map((day, idx) => {
                  const dayGames = getGamesForDay(day);
                  const hasGames = dayGames.length > 0;
                  const isToday = day === new Date().getDate() && calendarMonth === new Date().getMonth() && calendarYear === new Date().getFullYear();
                  const isSelected = selectedDate === day;
                  return (
                    <div key={idx} onClick={() => { if (day && hasGames) setSelectedDate(isSelected ? null : day); }} className={`calendar-day ${hasGames ? 'has-games' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${!day ? 'opacity-0 pointer-events-none' : ''}`}>
                      {day && (<>
                        <span className={`text-xs md:text-sm font-body ${isSelected ? 'text-neon-gold font-bold' : 'text-white'}`}>{day}</span>
                        {hasGames && <div className="flex gap-0.5 mt-0.5">{dayGames.slice(0, 3).map((_, i) => <div key={i} className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-neon-gold'}`} />)}</div>}
                      </>)}
                    </div>
                  );
                })}
              </div>
            </div>
            {selectedDate && getGamesForDay(selectedDate).length > 0 && (
              <div className="glass-card rounded-card p-4 mt-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-heading font-bold text-neon-gold">📅 {selectedDate}. {new Date(calendarYear, calendarMonth).toLocaleString('de-DE', { month: 'long' })}</h3>
                  <button onClick={() => setSelectedDate(null)} className="text-gray-500 hover:text-white transition text-lg">✕</button>
                </div>
                <div className="space-y-2">
                  {getGamesForDay(selectedDate).map(game => {
                    const hD = game.age_group ? `${game.age_group} ${game.home_team}` : game.home_team;
                    const aD = game.age_group ? `${game.age_group} ${game.away_team}` : game.away_team;
                    const dT = getDisplayTime(game.start_time);
                    const hasResult = game.home_score !== null;
                    return (
                      <div key={game.id} className="bg-dark-700 rounded-button border border-white/5 overflow-hidden">
                        <div className="px-3 py-1.5 bg-dark-800 flex justify-between items-center">
                          <span className="text-xs text-gray-500 font-body">🕐 {dT.toLocaleString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</span>
                          <span className="text-xs font-mono text-neon-gold">{game.competition || 'Liga'}</span>
                        </div>
                        <div className="calendar-game">
                          <span className="team-left text-sm font-heading font-bold text-white">{hD}</span>
                          <span className="vs-score">{hasResult ? <span className="text-neon-gold font-mono font-bold text-sm">{game.home_score}:{game.away_score}</span> : <span className="text-gray-500 font-heading text-xs">vs</span>}</span>
                          <span className="team-right text-sm font-heading font-bold text-white">{aD}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'groups' && !selectedGroup && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-heading font-bold text-white">Meine Gruppen</h2>
              <div className="flex gap-2">
                <button onClick={() => setShowJoinGroup(true)} className="glow-button bg-dark-700 text-gray-400 hover:text-white px-4 py-2 rounded-button font-heading font-semibold transition">Beitreten</button>
                <button onClick={() => setShowCreateGroup(true)} className="glow-button bg-gradient-to-r from-neon-gold to-yellow-500 text-dark-900 px-4 py-2 rounded-button font-heading font-bold hover:shadow-glow transition">+ Erstellen</button>
              </div>
            </div>
            {groups.length === 0 && <div className="glass-card rounded-card p-8 text-center text-gray-500 font-body">Du bist noch in keiner Gruppe.</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map(group => (
                <div key={group.id} onClick={() => loadGroupDetails(group.id)} className="hover-lift glass-card rounded-card overflow-hidden cursor-pointer">
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-lg font-heading font-bold text-white">{group.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded-button font-mono font-bold ${group.is_public ? 'bg-neon-green/20 text-neon-green' : 'bg-neon-purple/20 text-neon-purple'}`}>{group.is_public ? 'ÖFFENTLICH' : 'PRIVAT'}</span>
                    </div>
                    {!group.is_public && <div className="text-sm text-gray-500 font-mono">Code: {group.join_code}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'groups' && selectedGroup && (
          <div>
            <button onClick={() => setSelectedGroup(null)} className="mb-4 text-neon-gold hover:text-neon-pink font-heading font-semibold transition">← Zurück</button>
            <div className="glass-card rounded-card p-6 mb-6">
              <div className="flex justify-between items-start mb-4 flex-wrap gap-3">
                <div>
                  <h2 className="text-2xl font-heading font-bold text-white mb-2">{selectedGroup.name}</h2>
                  <span className={`text-xs px-2 py-1 rounded-button font-mono font-bold ${selectedGroup.is_public ? 'bg-neon-green/20 text-neon-green' : 'bg-neon-purple/20 text-neon-purple'}`}>{selectedGroup.is_public ? 'ÖFFENTLICH' : 'PRIVAT'}</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {selectedGroup.is_public && selectedGroup.created_by !== user.id && !groupMembers.some(m => m.user_id === user.id) && (
                    <button onClick={() => joinPublicGroup(selectedGroup.id)} className="glow-button bg-gradient-to-r from-neon-gold to-yellow-500 text-dark-900 px-4 py-2 rounded-button font-heading font-bold hover:shadow-glow transition">Beitreten</button>
                  )}
                  {groupMembers.some(m => m.user_id === user.id) && selectedGroup.created_by !== user.id && (
                    <button onClick={() => leaveGroup(selectedGroup.id)} className="glow-button bg-dark-700 text-gray-400 hover:text-white px-4 py-2 rounded-button font-heading font-semibold transition">Verlassen</button>
                  )}
                  {selectedGroup.created_by === user.id && (
                    <button onClick={() => deleteGroup(selectedGroup.id)} className="glow-button bg-neon-red/20 text-neon-red px-4 py-2 rounded-button font-heading font-semibold hover:bg-neon-red/30 transition">Gruppe löschen</button>
                  )}
                </div>
              </div>
              {!selectedGroup.is_public && (
                <div className="bg-dark-700 p-4 rounded-button border border-white/5"><div className="text-sm text-gray-500 font-body mb-1">Beitrittscode:</div><div className="text-2xl font-mono font-bold text-neon-gold">{selectedGroup.join_code}</div></div>
              )}
            </div>
            <div className="glass-card rounded-card overflow-hidden mb-6">
              <h3 className="text-lg font-heading font-bold p-4 border-b border-white/10 text-white flex items-center gap-2"><span>👥</span> Mitglieder</h3>
              <div className="divide-y divide-white/5">
                {groupMembers.length > 0 ? groupMembers.map(member => {
                  const isMe = member.user_id === user.id;
                  const canRemove = selectedGroup.created_by === user.id && !isMe;
                  return (
                    <div key={member.id} className="p-4 flex items-center justify-between hover:bg-dark-800 transition">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-neon-purple to-neon-pink flex items-center justify-center text-white font-bold">{member.profiles?.username?.[0]?.toUpperCase() || 'U'}</div>
                        <div>
                          <div className="font-heading font-semibold text-white flex items-center gap-2">
                            {member.profiles?.username || 'Unbekannt'}
                            {isMe && <span className="text-xs bg-neon-gold text-dark-900 px-2 py-0.5 rounded-button font-bold">Du</span>}
                            {member.is_admin && !isMe && <span className="text-xs bg-neon-purple/20 text-neon-purple px-2 py-0.5 rounded-button font-semibold">Admin</span>}
                          </div>
                          <div className="text-xs text-gray-500 font-body">{member.is_admin ? 'Gruppen-Admin' : 'Mitglied'}</div>
                        </div>
                      </div>
                      {canRemove && <button onClick={() => removeMember(selectedGroup.id, member.user_id)} className="glow-button bg-neon-red/20 text-neon-red px-3 py-1.5 rounded-button text-sm font-heading font-semibold hover:bg-neon-red/30 transition">Entfernen</button>}
                    </div>
                  );
                }) : <div className="p-6 text-center text-gray-500 font-body">Keine Mitglieder.</div>}
              </div>
            </div>
            <div className="glass-card rounded-card overflow-hidden">
              <h3 className="text-lg font-heading font-bold p-4 border-b border-white/10 text-white">🏆 Leaderboard</h3>
              <table className="w-full text-left">
                <thead className="bg-dark-800 text-gray-500 text-sm font-mono"><tr><th className="p-4">Platz</th><th className="p-4">Name</th><th className="p-4 text-right">Punkte</th></tr></thead>
                <tbody className="text-white font-body">
                  {groupLeaderboard.map((row, index) => (
                    <tr key={row.username} className={`border-t border-white/5 ${row.username === username ? 'bg-neon-gold/10 font-bold' : ''}`}>
                      <td className="p-4 text-neon-gold font-mono">{index + 1}.</td>
                      <td className="p-4">{row.username}{row.username === username && <span className="ml-2 text-xs bg-neon-gold text-dark-900 px-2 py-1 rounded-button font-semibold">Du</span>}</td>
                      <td className="p-4 text-right font-mono font-bold text-neon-gold">{row.total_points}</td>
                    </tr>
                  ))}
                  {groupLeaderboard.length === 0 && <tr><td colSpan="3" className="p-8 text-center text-gray-600 font-body">Noch keine gewerteten Spiele.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === 'leaderboard' && (
          <div className="glass-card rounded-card overflow-hidden">
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-xl font-heading font-bold text-white">🏆 All-Time Leaderboard</h2>
              <button onClick={() => setShowPointsInfo(true)} className="glow-button bg-neon-gold/20 text-neon-gold px-4 py-2 rounded-button text-sm font-heading font-semibold hover:bg-neon-gold/30 transition">ℹ️ Punkte</button>
            </div>
            {weeklyChampion && (
              <div className="p-4 bg-gradient-to-r from-neon-gold/20 to-neon-pink/20 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">👑</span>
                  <div><div className="text-xs text-gray-400 font-body">Wochen-Champion</div><div className="text-lg font-heading font-bold text-white">{weeklyChampion.username}</div></div>
                  <div className="ml-auto text-right"><div className="text-2xl font-heading font-bold text-neon-gold">{weeklyChampion.weekly_points}</div><div className="text-xs text-gray-400 font-body">Punkte diese Woche</div></div>
                </div>
              </div>
            )}
            <table className="w-full text-left">
              <thead className="bg-dark-800 text-gray-500 text-sm font-mono"><tr><th className="p-4">Platz</th><th className="p-4">Name</th><th className="p-4 text-right">Punkte</th></tr></thead>
              <tbody className="text-white font-body">
                {leaderboard.map((row, index) => (
                  <tr key={row.username} className={`border-t border-white/5 ${row.username === username ? 'bg-neon-gold/10 font-bold' : 'hover:bg-dark-800'}`}>
                    <td className="p-4 text-neon-gold font-mono">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}</td>
                    <td className="p-4">{row.username}{row.username === username && <span className="ml-2 text-xs bg-neon-gold text-dark-900 px-2 py-1 rounded-button font-semibold">Du</span>}</td>
                    <td className="p-4 text-right font-mono font-bold text-neon-gold">{row.total_points}</td>
                  </tr>
                ))}
                {leaderboard.length === 0 && <tr><td colSpan="3" className="p-8 text-center text-gray-600 font-body">Noch keine registrierten Nutzer.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </main>

    {/* TABELLEN-MODAL */}
{showTableModal && (
  <div 
    className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
    onClick={() => setShowTableModal(null)}
  >
    {/* Backdrop */}
    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
    
    {/* Modal Content */}
    <div 
      className="relative bg-dark-800 border border-white/10 rounded-card shadow-card max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header (fixiert) */}
      <div className="flex justify-between items-center p-6 border-b border-white/10 flex-shrink-0">
        <h3 className="text-xl font-heading font-bold text-white">📊 {showTableModal.competition || 'Liga'}</h3>
        <button onClick={() => setShowTableModal(null)} className="text-gray-400 hover:text-white text-2xl">✕</button>
      </div>
      
      {/* Scrollbarer Inhalt */}
      <div className="overflow-y-auto flex-1 p-6">
        <LeagueTableContent 
          ligaId={showTableModal.ligaId} 
          homeTeam={showTableModal.homeTeam}
          awayTeam={showTableModal.awayTeam}
        />
      </div>
    </div>
  </div>
)}

      <nav className="bottom-nav lg:hidden">
        <div className="flex justify-around items-center">
          {[{ id: 'tips', label: 'Spiele', icon: '⚽' }, { id: 'results', label: 'Ergebnisse', icon: '📊' }, { id: 'calendar', label: 'Kalender', icon: '📅' }, { id: 'groups', label: 'Gruppen', icon: '👥' }, { id: 'leaderboard', label: 'Tabelle', icon: '🏆' }].map(tab => (
            <button key={tab.id} onClick={() => setView(tab.id)} className={`flex flex-col items-center gap-1 px-3 py-2 transition ${view === tab.id ? 'text-neon-gold' : 'text-gray-500 hover:text-gray-300'}`}>
              <span className="text-xl">{tab.icon}</span><span className="text-xs font-heading font-semibold">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

// ==========================================
// HILFSKOMPONENTE: TABELLEN-ANZEIGE IM MODAL
// ==========================================
function LeagueTableContent({ ligaId, homeTeam, awayTeam }) {
  const [table, setTable] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`./generated/tabelle_${ligaId}.json?t=${Date.now()}`);
        const data = await res.json();
        setTable(data);
      } catch (e) {
        console.error('Fehler beim Laden der Tabelle', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [ligaId, homeTeam, awayTeam]);

  if (loading) return <div className="text-center text-gray-400 py-8">Lade Tabelle...</div>;
  if (!table) return <div className="text-center text-neon-red py-8">Tabelle nicht verfügbar.</div>;

  function parseTeamName(name) {
    if (!name) return { base: '', number: null };
    const normalized = name.toLowerCase().trim();
    const match = normalized.match(/^(.+?)\s+(\d+)$/);
    if (match) {
      return { base: match[1].trim(), number: parseInt(match[2]) };
    }
    return { base: normalized, number: null };
  }

  function isTeamPlaying(tableName) {
    if (!homeTeam || !awayTeam) return false;
    
    const tableParsed = parseTeamName(tableName);
    const homeParsed = parseTeamName(homeTeam);
    const awayParsed = parseTeamName(awayTeam);
    
    return (
      (tableParsed.base === homeParsed.base && tableParsed.number === homeParsed.number) ||
      (tableParsed.base === awayParsed.base && tableParsed.number === awayParsed.number)
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-dark-700 text-gray-400 font-mono">
          <tr>
            <th className="p-3 rounded-tl-button">#</th>
            <th className="p-3">Mannschaft</th>
            <th className="p-3 text-center">Sp</th>
            <th className="p-3 text-center">S</th>
            <th className="p-3 text-center">Pkte</th>
            <th className="p-3 text-right rounded-tr-button">Körbe</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {table.map((row) => {
            const isTVN = row.team.toLowerCase().includes('neunkirchen') || row.team.toLowerCase().includes('tvn');
            const isPlaying = isTeamPlaying(row.team);
            
            let rowClass = 'text-white hover:bg-dark-700';
            let indicator = '';
            
            if (isPlaying && isTVN) {
              rowClass = 'bg-neon-gold/20 font-bold text-neon-gold border-l-4 border-neon-gold';
              indicator = ' ⚡🏀';
            } else if (isPlaying) {
              rowClass = 'bg-blue-500/20 font-bold text-blue-400 border-l-4 border-blue-500';
              indicator = ' ⚡';
            }
            
            return (
              <tr key={row.rank} className={rowClass}>
                <td className="p-3 font-mono">{row.rank}.</td>
                <td className="p-3">{row.team}{indicator}</td>
                <td className="p-3 text-center">{row.games}</td>
                <td className="p-3 text-center">{row.wins}</td>
                <td className="p-3 text-center font-bold">{row.points}</td>
                <td className="p-3 text-right font-mono text-xs">{row.baskets}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap gap-4 text-xs font-body">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-neon-gold/20 border-l-4 border-neon-gold"></div>
          <span className="text-gray-400">TVN spielt ⚡🏀</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500/20 border-l-4 border-blue-500"></div>
          <span className="text-gray-400">Gegner spielt ⚡</span>
        </div>
      </div>
    </div>
  );
}
