import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from './supabaseClient';

// ============================================
// NAMENSFILTER
// ============================================
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

function normalizeText(text) {
  if (!text) return '';
  let normalized = text.toLowerCase();
  const leetMap = {
    '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b',
    '@': 'a', '$': 's', '!': 'i', '+': 't',
  };
  normalized = normalized.replace(/[0134578@\$!+]/g, (char) => leetMap[char] || char);
  const similarChars = {
    'ä': 'a', 'ö': 'o', 'ü': 'u', 'ß': 'ss',
    'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
    'á': 'a', 'à': 'a', 'â': 'a', 'å': 'a',
    'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
    'ó': 'o', 'ò': 'o', 'ô': 'o', 'ø': 'o',
    'ú': 'u', 'ù': 'u', 'û': 'u',
    'ñ': 'n', 'ç': 'c',
    'к': 'k', 'р': 'p', 'о': 'o', 'а': 'a', 'е': 'e',
    'с': 'c', 'т': 't', 'у': 'y', 'х': 'h', 'д': 'd',
    'л': 'l', 'м': 'm', 'н': 'n', 'з': 'z', 'г': 'g',
    'ш': 'sh', 'щ': 'sh', 'ф': 'f', 'в': 'v', 'б': 'b',
    'п': 'p', 'й': 'y', 'ц': 'ts', 'ч': 'ch', 'ж': 'zh',
  };
  normalized = normalized.replace(/[äöüßéèêëáàâåíìîïóòôøúùûñçк-я]/g, (char) => similarChars[char] || char);
  normalized = normalized.replace(/(.)\1+/g, '$1');
  normalized = normalized.replace(/[^a-z]/g, '');
  return normalized;
}

function calculateSimilarity(str1, str2) {
  if (str1 === str2) return 1;
  if (!str1 || !str2) return 0;
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(0));
  for (let i = 0; i <= len1; i++) matrix[0][i] = i;
  for (let j = 0; j <= len2; j++) matrix[j][0] = j;
  for (let j = 1; j <= len2; j++) {
    for (let i = 1; i <= len1; i++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + cost
      );
    }
  }
  const distance = matrix[len2][len1];
  const maxLen = Math.max(len1, len2);
  return 1 - distance / maxLen;
}

function isNameAllowed(name) {
  if (!name || name.trim().length < 2) return { ok: false, msg: 'Name muss mindestens 2 Zeichen haben.' };
  if (name.trim().length > 20) return { ok: false, msg: 'Name darf maximal 20 Zeichen haben.' };
  if (!/^[a-zA-Z0-9äöüÄÖÜßéèêëáàâåíìîïóòôøúùûñçа-яА-Я_.\- ]+$/.test(name)) {
    return { ok: false, msg: 'Unerlaubte Zeichen im Namen.' };
  }
  const lower = name.toLowerCase().trim();
  const normalized = normalizeText(lower);
  for (const word of BLOCKED_WORDS) {
    const wordLower = word.toLowerCase();
    const wordNormalized = normalizeText(wordLower);
    if (lower.includes(wordLower) || normalized.includes(wordNormalized)) {
      return { ok: false, msg: 'Dieser Name ist nicht erlaubt.' };
    }
    if (normalized.length > 3 && wordNormalized.length > 3) {
      const similarity = calculateSimilarity(normalized, wordNormalized);
      if (similarity > 0.8) {
        return { ok: false, msg: 'Dieser Name ist nicht erlaubt.' };
      }
    }
  }
  return { ok: true, msg: '' };
}

function getDisplayTime(startTime) {
  return new Date(new Date(startTime).getTime() - 2 * 60 * 60 * 1000);
}

// Badge-Definitionen
const BADGE_DEFINITIONS = {
  rookie: { icon: '🏀', name: 'Rookie', desc: 'Erster Tipp abgegeben' },
  perfect_shooter: { icon: '🎯', name: 'Perfekter Schuss', desc: '5 exakte Tipps' },
  century: { icon: '💯', name: 'Centurion', desc: '100 Punkte erreicht' },
  weekly_champion: { icon: '👑', name: 'Wochen-Champion', desc: 'Bester Tipper der Woche' },
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
  
  // Dark Mode State
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('tvn-dark-mode');
    return saved !== null ? JSON.parse(saved) : true;
  });
  
  // Badges State
  const [badges, setBadges] = useState([]);
  const [weeklyChampion, setWeeklyChampion] = useState(null);
  
  // Kalender State
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(null);
  const [gamesOnDate, setGamesOnDate] = useState([]);
    // ============================================
  // HELPER FUNKTIONEN
  // ============================================
  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  function askConfirm(message) {
    return new Promise((resolve) => {
      confirmResolveRef.current = resolve;
      setConfirmModal({ message });
    });
  }

  function handleConfirmYes() {
    setConfirmModal(null);
    if (confirmResolveRef.current) {
      confirmResolveRef.current(true);
      confirmResolveRef.current = null;
    }
  }

  function handleConfirmNo() {
    setConfirmModal(null);
    if (confirmResolveRef.current) {
      confirmResolveRef.current(false);
      confirmResolveRef.current = null;
    }
  }

  // ============================================
  // NOTIFICATIONS
  // ============================================
  async function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }

  function sendNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '🏀',
        badge: '🏀',
      });
    }
  }

  // ============================================
  // SCROLL OBSERVER
  // ============================================
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
  }, [finishedGames, myFinishedGames, resultTab, view, setupObserver]);

  // ============================================
  // DARK MODE
  // ============================================
  useEffect(() => {
    localStorage.setItem('tvn-dark-mode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // ============================================
  // AUTH & INITIAL LOAD
  // ============================================
  async function loadUsername(userId) {
    const { data } = await supabase.from('profiles').select('username').eq('id', userId).single();
    if (data) setUsername(data.username);
  }

  async function loadBadges(userId) {
    const { data } = await supabase.from('badges').select('*').eq('user_id', userId);
    setBadges(data || []);
  }

  async function loadWeeklyChampion() {
    const { data } = await supabase.from('weekly_champion').select('*');
    setWeeklyChampion(data?.[0] || null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadUsername(session.user.id);
        loadBadges(session.user.id);
        loadWeeklyChampion();
        requestNotificationPermission();
        setView('tips');
        loadData(session.user.id);
        loadGroups(session.user.id);
      }
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUsername(session.user.id);
        loadBadges(session.user.id);
        loadWeeklyChampion();
        requestNotificationPermission();
        setView('tips');
        loadData(session.user.id);
        loadGroups(session.user.id);
      }
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  // ============================================
  // DATA LOADING
  // ============================================
  async function loadData(userId) {
    setLoading(true);
    try {
      const now = new Date();
      const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const { data: gamesData } = await supabase
        .from('games')
        .select('*')
        .eq('is_cancelled', false)
        .gte('start_time', now.toISOString())
        .lte('start_time', in7Days.toISOString())
        .order('start_time', { ascending: true });
      setGames(gamesData || []);
      await loadFinishedGames('7');
      const { data: lbData } = await supabase.from('leaderboard').select('*');
      setLeaderboard(lbData || []);
      if (userId) {
        const { data: tipsData } = await supabase.from('predictions').select('*').eq('user_id', userId);
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
      console.error('Fehler:', err);
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
    setMyFinishedGames(data.filter(game => myTips[game.id]));
  }

  async function loadGroups(userId) {
    try {
      const uid = userId || user?.id;
      if (!uid) return;
      const { data: memberGroups } = await supabase.from('group_members').select('group_id').eq('user_id', uid);
      const memberGroupIds = memberGroups?.map(m => m.group_id) || [];
      let allGroups = [];
      const { data: publicGroups } = await supabase.from('groups').select('*').eq('is_public', true);
      if (publicGroups) allGroups = [...publicGroups];
      if (memberGroupIds.length > 0) {
        const { data: privateGroups } = await supabase
          .from('groups')
          .select('*')
          .in('id', memberGroupIds)
          .eq('is_public', false);
        if (privateGroups) allGroups = [...allGroups, ...privateGroups];
      }
      setGroups(allGroups.filter((group, index, self) => index === self.findIndex((g) => g.id === group.id)));
    } catch (err) {
      console.error('Fehler beim Laden der Gruppen:', err);
    }
  }

  // ============================================
  // GROUP ACTIONS
  // ============================================
  async function createGroup() {
    const nameCheck = isNameAllowed(newGroupName);
    if (!nameCheck.ok) {
      showToast(nameCheck.msg, 'error');
      return;
    }
    try {
      const { data: codeData } = await supabase.rpc('generate_join_code');
      const code = codeData || Math.random().toString(36).substring(2, 8).toUpperCase();
      const { data: group, error } = await supabase.from('groups').insert({
        name: newGroupName.trim(),
        is_public: newGroupIsPublic,
        join_code: newGroupIsPublic ? null : code,
        created_by: user.id,
      }).select().single();
      if (error) throw error;
      await supabase.from('group_members').insert({
        group_id: group.id,
        user_id: user.id,
        is_admin: true,
      });
      showToast('Gruppe erstellt! 🎉', 'success');
      setShowCreateGroup(false);
      setNewGroupName('');
      setNewGroupIsPublic(false);
      await loadGroups(user.id);
    } catch (err) {
      showToast('Fehler: ' + err.message, 'error');
    }
  }

  async function joinGroupWithCode() {
    if (!joinCode.trim()) {
      showToast('Bitte Beitrittscode eingeben.', 'error');
      return;
    }
    try {
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('join_code', joinCode.toUpperCase())
        .single();
      if (groupError || !group) {
        showToast('Ungültiger Beitrittscode.', 'error');
        return;
      }
      const { error: memberError } = await supabase.from('group_members').insert({
        group_id: group.id,
        user_id: user.id,
        is_admin: false,
      });
      if (memberError) {
        if (memberError.code === '23505') {
          showToast('Du bist bereits Mitglied.', 'info');
        } else {
          throw memberError;
        }
      } else {
        showToast('Beigetreten! 🎉', 'success');
      }
      setShowJoinGroup(false);
      setJoinCode('');
      await loadGroups(user.id);
    } catch (err) {
      showToast('Fehler: ' + err.message, 'error');
    }
  }

  async function joinPublicGroup(groupId) {
    try {
      const { error } = await supabase.from('group_members').insert({
        group_id: groupId,
        user_id: user.id,
        is_admin: false,
      });
      if (error) {
        if (error.code === '23505') {
          showToast('Du bist bereits Mitglied.', 'info');
        } else {
          throw error;
        }
      } else {
        showToast('Beigetreten! 🎉', 'success');
      }
      await loadGroupDetails(groupId);
    } catch (err) {
      showToast('Fehler: ' + err.message, 'error');
    }
  }

  async function deleteGroup(groupId) {
    const confirmed = await askConfirm('Gruppe wirklich löschen? Dies kann nicht rückgängig gemacht werden.');
    if (!confirmed) return;
    try {
      const { error } = await supabase.from('groups').delete().eq('id', groupId);
      if (error) throw error;
      showToast('Gruppe gelöscht!', 'success');
      setSelectedGroup(null);
      await loadGroups(user.id);
    } catch (err) {
      showToast('Fehler: ' + err.message, 'error');
    }
  }

  async function loadGroupDetails(groupId) {
    const { data: group } = await supabase.from('groups').select('*').eq('id', groupId).single();
    setSelectedGroup(group);
    const { data: members } = await supabase
      .from('group_members')
      .select(`*, profiles(username)`)
      .eq('group_id', groupId);
    setGroupMembers(members || []);
    const { data: lb } = await supabase.from('group_leaderboard').select('*').eq('group_id', groupId);
    setGroupLeaderboard(lb || []);
  }

  async function removeMember(groupId, userId) {
    const confirmed = await askConfirm('Dieses Mitglied wirklich aus der Gruppe entfernen?');
    if (!confirmed) return;
    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);
      if (error) throw error;
      showToast('Mitglied entfernt!', 'success');
      await loadGroupDetails(groupId);
    } catch (err) {
      showToast('Fehler: ' + err.message, 'error');
    }
  }

  // ============================================
  // AUTH
  // ============================================
  async function handleLogin(e) {
    e.preventDefault();
    setMsg('');
    if (isRegistering) {
      const nameCheck = isNameAllowed(regUsername);
      if (!nameCheck.ok) {
        setMsg(nameCheck.msg);
        return;
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username: regUsername.trim() } },
      });
      if (error) {
        setMsg('Fehler: ' + error.message);
      } else {
        showToast('Registrierung erfolgreich!', 'success');
        setRegUsername('');
        setIsRegistering(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg('Fehler: ' + error.message);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    setUsername('');
    setView('login');
    setEmail('');
    setPassword('');
    setRegUsername('');
    setMyTips({});
    setTips({});
    setGroups([]);
    setBadges([]);
  }

  // ============================================
  // TIPS
  // ============================================
  async function submitTip(gameId, homeScore, awayScore) {
    if (!homeScore || !awayScore) {
      showToast('Bitte beide Ergebnisse eingeben.', 'error');
      return;
    }
    try {
      const { data: existing } = await supabase
        .from('predictions')
        .select('id')
        .eq('user_id', user.id)
        .eq('game_id', gameId)
        .single();
      if (existing) {
        const { error } = await supabase
          .from('predictions')
          .update({
            predicted_home_score: parseInt(homeScore),
            predicted_away_score: parseInt(awayScore),
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('predictions').insert({
          user_id: user.id,
          game_id: gameId,
          predicted_home_score: parseInt(homeScore),
          predicted_away_score: parseInt(awayScore),
        });
        if (error) throw error;
      }
      showToast('Tipp gespeichert! 🏀', 'success');
      await loadData(user.id);
      await loadBadges(user.id);
    } catch (err) {
      showToast('Fehler: ' + err.message, 'error');
    }
  }

  async function deleteTip(gameId) {
    const confirmed = await askConfirm('Tipp wirklich löschen?');
    if (!confirmed) return;
    try {
      const { error } = await supabase
        .from('predictions')
        .delete()
        .eq('user_id', user.id)
        .eq('game_id', gameId);
      if (error) throw error;
      showToast('Tipp gelöscht!', 'success');
      await loadData(user.id);
    } catch (err) {
      showToast('Fehler: ' + err.message, 'error');
    }
  }

  // ============================================
  // KALENDER
  // ============================================
  async function loadCalendarGames(year, month) {
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59);
    const { data } = await supabase
      .from('games')
      .select('*')
      .eq('is_cancelled', false)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())
      .order('start_time', { ascending: true });
    setGamesOnDate(data || []);
  }

  useEffect(() => {
    if (view === 'calendar') {
      loadCalendarGames(calendarYear, calendarMonth);
    }
  }, [calendarYear, calendarMonth, view]);

  function getCalendarDays(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  }

  function getGamesForDay(day) {
    if (!day) return [];
    return gamesOnDate.filter(game => {
      const gameDate = new Date(game.start_time);
      return gameDate.getDate() === day &&
             gameDate.getMonth() === calendarMonth &&
             gameDate.getFullYear() === calendarYear;
    });
  }

  function prevMonth() {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  }

  function nextMonth() {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  }

  // ============================================
  // GAME HELPERS
  // ============================================
  function isGameStarted(startTime) {
    return new Date(new Date(startTime).getTime() - 2 * 60 * 60 * 1000) <= new Date();
  }

  function getResultBadge(game) {
    const h = game.home_team.toLowerCase();
    const a = game.away_team.toLowerCase();
    const tvnH = h.includes('neunkirchen') || h.includes('tvn');
    const tvnA = a.includes('neunkirchen') || a.includes('tvn');
    let w = false, l = false;
    if (tvnH) {
      w = game.home_score > game.away_score;
      l = game.home_score < game.away_score;
    } else if (tvnA) {
      w = game.away_score > game.home_score;
      l = game.away_score < game.home_score;
    } else {
      w = game.home_score > game.away_score;
      l = game.home_score < game.away_score;
    }
    if (game.home_score === game.away_score) {
      return <span className="badge-draw text-xs px-3 py-1.5 rounded-button font-mono font-bold">UNENTSCHIEDEN</span>;
    }
    if (w) return <span className="badge-win text-xs px-3 py-1.5 rounded-button font-mono font-bold">SIEG</span>;
    if (l) return <span className="badge-loss text-xs px-3 py-1.5 rounded-button font-mono font-bold">NIEDERLAGE</span>;
    return null;
  }

  function getTipPoints(tip, game) {
    if (!tip || game.home_score === null) return null;
    if (tip.predicted_home_score === game.home_score && tip.predicted_away_score === game.away_score) return 5;
    if (Math.abs((tip.predicted_home_score - tip.predicted_away_score) - (game.home_score - game.away_score)) <= 10) return 3;
    const tH = tip.predicted_home_score > tip.predicted_away_score;
    const tA = tip.predicted_home_score < tip.predicted_away_score;
    const tD = tip.predicted_home_score === tip.predicted_away_score;
    const gH = game.home_score > game.away_score;
    const gA = game.home_score < game.away_score;
    const gD = game.home_score === game.away_score;
    if ((tH && gH) || (tA && gA) || (tD && gD)) return 1;
    return 0;
  }

  function getBadgeIcon(badgeType) {
    return BADGE_DEFINITIONS[badgeType]?.icon || '🏅';
  }

  function getBadgeName(badgeType) {
    return BADGE_DEFINITIONS[badgeType]?.name || badgeType;
  }

  function getMyPoints() {
    return leaderboard.find(r => r.username === username)?.total_points || 0;
  }

  function getMyRank() {
    const idx = leaderboard.findIndex(r => r.username === username);
    return idx >= 0 ? idx + 1 : null;
  }
    // ==================== LOGIN VIEW ====================
  if (!user) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
        <div className="glass-card p-8 rounded-card shadow-card max-w-md w-full">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🏀</div>
            <h1 className="text-3xl font-heading font-bold bg-gradient-to-r from-neon-gold to-neon-pink bg-clip-text text-transparent">
              TVN Tipp-Spiel
            </h1>
            <p className="text-gray-400 font-body mt-2">
              {isRegistering ? 'Erstelle deinen Account' : 'Willkommen zurück'}
            </p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            {isRegistering && (
              <input
                type="text"
                placeholder="Benutzername"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                className="w-full p-3 bg-dark-800 border border-white/10 rounded-button text-white placeholder-gray-500 focus:border-neon-gold focus:ring-2 focus:ring-neon-gold/20 outline-none font-body transition"
                required
              />
            )}
            <input
              type="email"
              placeholder="E-Mail-Adresse"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-dark-800 border border-white/10 rounded-button text-white placeholder-gray-500 focus:border-neon-gold focus:ring-2 focus:ring-neon-gold/20 outline-none font-body transition"
              required
            />
            <input
              type="password"
              placeholder="Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-dark-800 border border-white/10 rounded-button text-white placeholder-gray-500 focus:border-neon-gold focus:ring-2 focus:ring-neon-gold/20 outline-none font-body transition"
              required
              minLength={6}
            />
            <button
              type="submit"
              className="glow-button w-full bg-gradient-to-r from-neon-gold to-yellow-500 text-dark-900 p-3 rounded-button font-heading font-bold hover:shadow-glow transition"
            >
              {isRegistering ? 'Registrieren' : 'Anmelden'}
            </button>
          </form>
          <button
            onClick={() => { setIsRegistering(!isRegistering); setMsg(''); }}
            className="w-full mt-4 text-neon-gold hover:text-neon-pink text-sm font-medium font-body transition"
          >
            {isRegistering ? 'Zurück zum Login' : 'Noch keinen Account? Registrieren'}
          </button>
          {msg && <p className="mt-4 text-sm text-center text-neon-red font-medium font-body">{msg}</p>}
        </div>
      </div>
    );
  }

  // ==================== MAIN VIEW ====================
  return (
    <div className="min-h-screen bg-dark-900">
      {/* Toast Notification */}
      {toast && (
        <div className={`toast ${toast.type === 'success' ? 'toast-success' : toast.type === 'error' ? 'toast-error' : 'toast-info'}`}>
          <div className="px-6 py-4 rounded-card shadow-card font-body font-semibold flex items-center gap-2">
            <span>{toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}</span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="modal-overlay" onClick={handleConfirmNo}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">⚠️</div>
              <h3 className="text-xl font-heading font-bold text-white">Bist du sicher?</h3>
            </div>
            <p className="text-gray-400 font-body mb-6 text-center">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button onClick={handleConfirmNo} className="flex-1 glow-button bg-dark-700 text-white px-4 py-3 rounded-button font-heading font-semibold hover:bg-dark-600 transition">
                Abbrechen
              </button>
              <button onClick={handleConfirmYes} className="flex-1 glow-button bg-neon-red text-white px-4 py-3 rounded-button font-heading font-semibold hover:bg-red-700 transition">
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Points Info Modal */}
      {showPointsInfo && (
        <div className="modal-overlay" onClick={() => setShowPointsInfo(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-heading font-bold text-white mb-4">🏆 Punkte-System</h3>
            <div className="space-y-3 font-body text-gray-400">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🎯</span>
                <div>
                  <div className="font-bold text-white">5 Punkte</div>
                  <div className="text-sm">Exaktes Ergebnis</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">👍</span>
                <div>
                  <div className="font-bold text-white">3 Punkte</div>
                  <div className="text-sm">Innerhalb von 10 Punkten Differenz</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">✓</span>
                <div>
                  <div className="font-bold text-white">1 Punkt</div>
                  <div className="text-sm">Richtige Tendenz</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">❌</span>
                <div>
                  <div className="font-bold text-white">0 Punkte</div>
                  <div className="text-sm">Falsch getippt</div>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowPointsInfo(false)}
              className="mt-6 w-full glow-button bg-gradient-to-r from-neon-gold to-yellow-500 text-dark-900 px-4 py-3 rounded-button font-heading font-bold hover:shadow-glow transition"
            >
              Verstanden
            </button>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="modal-overlay" onClick={() => setShowCreateGroup(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-heading font-bold text-white mb-4">Gruppe erstellen</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Gruppenname"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="w-full p-3 bg-dark-800 border border-white/10 rounded-button text-white placeholder-gray-500 focus:border-neon-gold outline-none font-body"
              />
              <label className="flex items-center gap-2 font-body text-gray-400">
                <input
                  type="checkbox"
                  checked={newGroupIsPublic}
                  onChange={(e) => setNewGroupIsPublic(e.target.checked)}
                  className="w-5 h-5"
                />
                <span>Öffentliche Gruppe</span>
              </label>
              <div className="flex gap-3">
                <button onClick={() => setShowCreateGroup(false)} className="flex-1 glow-button bg-dark-700 text-white px-4 py-3 rounded-button font-heading font-semibold hover:bg-dark-600 transition">
                  Abbrechen
                </button>
                <button onClick={createGroup} className="flex-1 glow-button bg-gradient-to-r from-neon-gold to-yellow-500 text-dark-900 px-4 py-3 rounded-button font-heading font-bold hover:shadow-glow transition">
                  Erstellen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Join Group Modal */}
      {showJoinGroup && (
        <div className="modal-overlay" onClick={() => setShowJoinGroup(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-heading font-bold text-white mb-4">Gruppe beitreten</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Beitrittscode"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="w-full p-3 bg-dark-800 border border-white/10 rounded-button text-white placeholder-gray-500 focus:border-neon-gold outline-none font-body uppercase"
              />
              <div className="flex gap-3">
                <button onClick={() => setShowJoinGroup(false)} className="flex-1 glow-button bg-dark-700 text-white px-4 py-3 rounded-button font-heading font-semibold hover:bg-dark-600 transition">
                  Abbrechen
                </button>
                <button onClick={joinGroupWithCode} className="flex-1 glow-button bg-gradient-to-r from-neon-gold to-yellow-500 text-dark-900 px-4 py-3 rounded-button font-heading font-bold hover:shadow-glow transition">
                  Beitreten
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR (Desktop) */}
      <aside className="sidebar hidden lg:flex flex-col">
        <div className="p-6 border-b border-white/10">
          <button onClick={() => setView('tips')} className="flex items-center gap-2 hover:opacity-80 transition">
            <span className="text-3xl">🏀</span>
            <span className="text-xl font-heading font-bold bg-gradient-to-r from-neon-gold to-neon-pink bg-clip-text text-transparent">
              TVN Tipps
            </span>
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: 'tips', label: 'Spiele', icon: '⚽' },
            { id: 'results', label: 'Ergebnisse', icon: '📊' },
            { id: 'calendar', label: 'Kalender', icon: '📅' },
            { id: 'groups', label: 'Gruppen', icon: '👥' },
            { id: 'leaderboard', label: 'Tabelle', icon: '🏆' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-button font-heading font-semibold transition ${
                view === tab.id
                  ? 'bg-gradient-to-r from-neon-gold to-yellow-500 text-dark-900 shadow-glow'
                  : 'text-gray-400 hover:text-white hover:bg-dark-700'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10 space-y-3">
          {/* Badges */}
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {badges.map((badge) => (
                <div key={badge.id} className="text-xl" title={getBadgeName(badge.badge_type)}>
                  {getBadgeIcon(badge.badge_type)}
                </div>
              ))}
            </div>
          )}
          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="w-full flex items-center justify-between px-4 py-2 rounded-button bg-dark-700 hover:bg-dark-600 transition"
          >
            <span className="text-sm font-body text-gray-400">
              {darkMode ? '🌙 Dark' : '☀️ Light'}
            </span>
            <div className={`w-12 h-6 rounded-full p-1 transition ${darkMode ? 'bg-neon-gold' : 'bg-gray-600'}`}>
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-0'}`} />
            </div>
          </button>
          {/* User Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-neon-purple to-neon-pink flex items-center justify-center text-white font-bold">
              {username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1">
              <div className="text-sm font-heading font-bold text-white">{username}</div>
              <div className="text-xs text-gray-500 font-body">Online</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full glow-button bg-neon-red/20 text-neon-red px-4 py-2 rounded-button font-heading font-semibold hover:bg-neon-red/30 transition"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* HEADER (Mobile) */}
      <header className="lg:hidden bg-dark-800 border-b border-white/10 p-4 sticky top-0 z-50">
        <div className="flex justify-between items-center">
          <button onClick={() => setView('tips')} className="flex items-center gap-2">
            <span className="text-2xl">🏀</span>
            <span className="text-lg font-heading font-bold bg-gradient-to-r from-neon-gold to-neon-pink bg-clip-text text-transparent">
              TVN Tipps
            </span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center text-lg hover:bg-dark-600 transition"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-neon-purple to-neon-pink flex items-center justify-center text-white text-sm font-bold">
              {username?.[0]?.toUpperCase() || 'U'}
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="lg:ml-60 p-4 md:p-6 pb-24 lg:pb-6">
        {/* ===== SPIELE ===== */}
        {view === 'tips' && (
          <div>
            {/* Hero Section */}
            <div className="glass-card rounded-card p-6 mb-6 bg-gradient-to-r from-neon-purple/10 to-neon-pink/10">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-heading font-bold text-white mb-2">
                    Hallo {username}! 👋
                  </h1>
                  <p className="text-gray-400 font-body">Spiele der nächsten 7 Tage</p>
                  {/* Badges */}
                  {badges.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {badges.map((badge) => (
                        <div
                          key={badge.id}
                          className="flex items-center gap-1 bg-dark-700 px-2 py-1 rounded-button"
                          title={BADGE_DEFINITIONS[badge.badge_type]?.desc}
                        >
                          <span className="text-lg">{getBadgeIcon(badge.badge_type)}</span>
                          <span className="text-xs font-body text-gray-300">{getBadgeName(badge.badge_type)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-3xl font-heading font-bold text-neon-gold">{getMyPoints()}</div>
                  <div className="text-sm text-gray-400 font-body">
                    {getMyRank() ? `Platz ${getMyRank()}` : 'Noch kein Rang'}
                  </div>
                  {weeklyChampion && (
                    <div className="mt-2 text-xs bg-neon-gold/20 text-neon-gold px-2 py-1 rounded-button font-mono font-bold">
                      👑 Champion: {weeklyChampion.username}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <h2 className="text-xl font-heading font-bold text-white mb-4">Kommende Spiele</h2>

            {loading && (
              <div className="text-center py-12 text-gray-500 font-body">
                <div className="text-4xl mb-4 animate-pulse">🏀</div>
                Lade Spiele...
              </div>
            )}

            {!loading && games.length === 0 && (
              <div className="glass-card rounded-card p-8 text-center text-gray-500 font-body">
                Keine Spiele in den nächsten 7 Tagen.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {games.map((game, index) => {
                const hD = game.age_group ? `${game.age_group} ${game.home_team}` : game.home_team;
                const aD = game.age_group ? `${game.age_group} ${game.away_team}` : game.away_team;
                const started = isGameStarted(game.start_time);
                const hasTip = myTips[game.id];
                const dT = getDisplayTime(game.start_time);
                return (
                  <div
                    key={game.id}
                    ref={(el) => (cardsRef.current[index] = el)}
                    className="card-reveal hover-lift glass-card rounded-card overflow-hidden"
                  >
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs font-mono font-semibold text-neon-gold uppercase tracking-wide">
                          {game.competition || 'Liga'}
                        </div>
                        {hasTip && (
                          <div className="text-xs bg-neon-green/20 text-neon-green px-2 py-1 rounded-button font-mono font-bold">
                            ✓ Getippt
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mb-4 font-body">
                        📅 {dT.toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} Uhr
                      </div>
                      <div className="flex justify-between items-center text-base font-heading font-bold mb-4 text-white">
                        <span className="text-right flex-1">{hD}</span>
                        <span className="text-neon-gold px-3 text-sm font-normal">vs</span>
                        <span className="text-left flex-1">{aD}</span>
                      </div>
                      {started ? (
                        <div className="bg-dark-700 p-3 rounded-button border border-white/5 text-center">
                          <span className="text-gray-500 font-body text-sm">⏰ Tipp-Sperre aktiv</span>
                          {hasTip && (
                            <div className="mt-2 text-neon-gold font-mono font-bold">
                              Dein Tipp: {hasTip.predicted_home_score} : {hasTip.predicted_away_score}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2 bg-dark-700 p-3 rounded-button border border-white/5">
                            <input
                              type="number"
                              min="0"
                              placeholder="H"
                              className="w-16 p-2 bg-dark-800 border border-white/10 rounded-button text-center font-mono font-bold text-white focus:border-neon-gold outline-none"
                              value={tips[game.id + 'h'] || ''}
                              onChange={(e) => setTips({ ...tips, [game.id + 'h']: e.target.value })}
                            />
                            <span className="font-bold text-neon-gold">:</span>
                            <input
                              type="number"
                              min="0"
                              placeholder="G"
                              className="w-16 p-2 bg-dark-800 border border-white/10 rounded-button text-center font-mono font-bold text-white focus:border-neon-gold outline-none"
                              value={tips[game.id + 'a'] || ''}
                              onChange={(e) => setTips({ ...tips, [game.id + 'a']: e.target.value })}
                            />
                            <button
                              className="glow-button ml-auto bg-gradient-to-r from-neon-gold to-yellow-500 text-dark-900 px-4 py-2 rounded-button font-heading font-bold hover:shadow-glow transition"
                              onClick={() => submitTip(game.id, tips[game.id + 'h'], tips[game.id + 'a'])}
                            >
                              {hasTip ? 'Ändern' : 'Tippen'}
                            </button>
                          </div>
                          {hasTip && (
                            <button
                              onClick={() => deleteTip(game.id)}
                              className="mt-2 w-full text-xs text-neon-red hover:text-red-400 font-body transition"
                            >
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
            <h2 className="text-xl font-heading font-bold text-white mb-4">Ergebnisse</h2>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setResultTab('all')}
                className={`glow-button px-4 py-2 rounded-button text-sm font-heading font-semibold transition ${
                  resultTab === 'all' ? 'bg-gradient-to-r from-neon-gold to-yellow-500 text-dark-900 shadow-glow' : 'bg-dark-700 text-gray-400 hover:text-white'
                }`}
              >
                Alle
              </button>
              <button
                onClick={() => setResultTab('my')}
                className={`glow-button px-4 py-2 rounded-button text-sm font-heading font-semibold transition ${
                  resultTab === 'my' ? 'bg-gradient-to-r from-neon-gold to-yellow-500 text-dark-900 shadow-glow' : 'bg-dark-700 text-gray-400 hover:text-white'
                }`}
              >
                Meine Tipps
              </button>
            </div>
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {[
                { label: '7 Tage', value: '7' },
                { label: '30 Tage', value: '30' },
                { label: '90 Tage', value: '90' },
                { label: 'Alle', value: 'all' },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => loadFinishedGames(f.value)}
                  className={`glow-button px-3 py-1.5 rounded-button text-xs font-heading font-semibold transition whitespace-nowrap ${
                    resultFilter === f.value ? 'bg-dark-700 text-white border border-neon-gold' : 'bg-dark-800 text-gray-500 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {(resultTab === 'all' ? finishedGames : myFinishedGames).length === 0 && (
              <div className="glass-card rounded-card p-8 text-center text-gray-500 font-body">
                {resultTab === 'all' ? 'Keine Ergebnisse.' : 'Keine Tipps in diesem Zeitraum.'}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(resultTab === 'all' ? finishedGames : myFinishedGames).map((game, index) => {
                const hD = game.age_group ? `${game.age_group} ${game.home_team}` : game.home_team;
                const aD = game.age_group ? `${game.age_group} ${game.away_team}` : game.away_team;
                const tip = myTips[game.id];
                const points = getTipPoints(tip, game);
                const dT = getDisplayTime(game.start_time);
                return (
                  <div
                    key={game.id}
                    ref={(el) => (finishedCardsRef.current[index] = el)}
                    className="card-reveal hover-lift glass-card rounded-card overflow-hidden"
                  >
                    <div className="p-5">
                      <div className="flex justify-between items-start mb-3">
                        <div className="text-xs font-mono font-semibold text-neon-gold uppercase tracking-wide">
                          {game.competition || 'Liga'}
                        </div>
                        {getResultBadge(game)}
                      </div>
                      <div className="text-xs text-gray-500 mb-4 font-body">
                        📅 {dT.toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} Uhr
                      </div>
                      <div className="flex justify-between items-center mb-3 text-white">
                        <span className="text-right flex-1 font-heading font-bold">{hD}</span>
                        <span className="text-neon-gold font-mono font-bold text-xl px-3">
                          {game.home_score} : {game.away_score}
                        </span>
                        <span className="text-left flex-1 font-heading font-bold">{aD}</span>
                      </div>
                      {tip && (
                        <div className="mt-3 bg-dark-700 p-3 rounded-button border border-white/5">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500 text-xs font-body">Dein Tipp:</span>
                            <span className="text-white font-mono font-bold">
                              {tip.predicted_home_score} : {tip.predicted_away_score}
                            </span>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-gray-500 text-xs font-body">Punkte:</span>
                            <span
                              className={`font-mono font-bold ${
                                points === 5 ? 'text-neon-green' : points === 3 ? 'text-neon-gold' : points === 1 ? 'text-neon-purple' : 'text-neon-red'
                              }`}
                            >
                              {points === 5 ? '🎯 5' : points === 3 ? '👍 3' : points === 1 ? '✓ 1' : '❌ 0'}
                            </span>
                          </div>
                        </div>
                      )}
                      {!tip && resultTab === 'all' && (
                        <div className="mt-3 text-center text-gray-600 text-xs font-body">Kein Tipp abgegeben</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== KALENDER ===== */}
        {view === 'calendar' && (
          <div>
            <h2 className="text-xl font-heading font-bold text-white mb-4">📅 Spielkalender</h2>
            <div className="glass-card rounded-card p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <button onClick={prevMonth} className="glow-button bg-dark-700 text-white px-4 py-2 rounded-button font-heading font-semibold hover:bg-dark-600 transition">
                  ← Zurück
                </button>
                <h3 className="text-lg font-heading font-bold text-white">
                  {new Date(calendarYear, calendarMonth).toLocaleString('de-DE', { month: 'long', year: 'numeric' })}
                </h3>
                <button onClick={nextMonth} className="glow-button bg-dark-700 text-white px-4 py-2 rounded-button font-heading font-semibold hover:bg-dark-600 transition">
                  Weiter →
                </button>
              </div>
              {/* Wochentage Header */}
              <div className="calendar-grid mb-2">
                {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day) => (
                  <div key={day} className="text-center text-xs font-mono font-bold text-gray-500 py-2">
                    {day}
                  </div>
                ))}
              </div>
              {/* Kalender Grid */}
              <div className="calendar-grid">
                {getCalendarDays(calendarYear, calendarMonth).map((day, idx) => {
                  const dayGames = getGamesForDay(day);
                  const hasGames = dayGames.length > 0;
                  const isToday = day === new Date().getDate() && calendarMonth === new Date().getMonth() && calendarYear === new Date().getFullYear();
                  return (
                    <div
                      key={idx}
                      onClick={() => day && hasGames && setSelectedDate(day)}
                      className={`calendar-day ${hasGames ? 'has-games' : ''} ${isToday ? 'today' : ''} ${!day ? 'opacity-0' : ''}`}
                    >
                      {day && (
                        <>
                          <span className="text-sm font-body text-white">{day}</span>
                          {hasGames && (
                            <div className="flex gap-0.5 mt-1">
                              {dayGames.slice(0, 3).map((_, i) => (
                                <div key={i} className="w-1.5 h-1.5 rounded-full bg-neon-gold" />
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Spiele am ausgewählten Tag */}
            {selectedDate && (
              <div className="glass-card rounded-card p-6">
                <h3 className="text-lg font-heading font-bold text-white mb-4">
                  Spiele am {selectedDate}. {new Date(calendarYear, calendarMonth).toLocaleString('de-DE', { month: 'long' })}
                </h3>
                <div className="space-y-3">
                  {getGamesForDay(selectedDate).map((game) => {
                    const hD = game.age_group ? `${game.age_group} ${game.home_team}` : game.home_team;
                    const aD = game.age_group ? `${game.age_group} ${game.away_team}` : game.away_team;
                    const dT = getDisplayTime(game.start_time);
                    return (
                      <div key={game.id} className="bg-dark-700 p-4 rounded-button border border-white/5">
                        <div className="text-xs text-gray-500 mb-2 font-body">
                          🕐 {dT.toLocaleString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                        </div>
                        <div className="flex justify-between items-center text-white">
                          <span className="font-heading font-bold">{hD}</span>
                          <span className="text-neon-gold px-2">vs</span>
                          <span className="font-heading font-bold">{aD}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button onClick={() => setSelectedDate(null)} className="mt-4 text-neon-gold hover:text-neon-pink font-heading font-semibold transition">
                  ← Zurück zum Kalender
                </button>
              </div>
            )}
          </div>
        )}

        {/* ===== GRUPPEN LISTE ===== */}
        {view === 'groups' && !selectedGroup && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-heading font-bold text-white">Meine Gruppen</h2>
              <div className="flex gap-2">
                <button onClick={() => setShowJoinGroup(true)} className="glow-button bg-dark-700 text-gray-400 hover:text-white px-4 py-2 rounded-button font-heading font-semibold transition">
                  Beitreten
                </button>
                <button onClick={() => setShowCreateGroup(true)} className="glow-button bg-gradient-to-r from-neon-gold to-yellow-500 text-dark-900 px-4 py-2 rounded-button font-heading font-bold hover:shadow-glow transition">
                  + Erstellen
                </button>
              </div>
            </div>
            {groups.length === 0 && (
              <div className="glass-card rounded-card p-8 text-center text-gray-500 font-body">
                Du bist noch in keiner Gruppe.
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map((group) => (
                <div
                  key={group.id}
                  onClick={() => loadGroupDetails(group.id)}
                  className="hover-lift glass-card rounded-card overflow-hidden cursor-pointer"
                >
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-lg font-heading font-bold text-white">{group.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded-button font-mono font-bold ${group.is_public ? 'bg-neon-green/20 text-neon-green' : 'bg-neon-purple/20 text-neon-purple'}`}>
                        {group.is_public ? 'ÖFFENTLICH' : 'PRIVAT'}
                      </span>
                    </div>
                    {!group.is_public && <div className="text-sm text-gray-500 font-mono">Code: {group.join_code}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== GRUPPE DETAIL ===== */}
        {view === 'groups' && selectedGroup && (
          <div>
            <button onClick={() => setSelectedGroup(null)} className="mb-4 text-neon-gold hover:text-neon-pink font-heading font-semibold transition">
              ← Zurück
            </button>
            <div className="glass-card rounded-card p-6 mb-6">
              <div className="flex justify-between items-start mb-4 flex-wrap gap-3">
                <div>
                  <h2 className="text-2xl font-heading font-bold text-white mb-2">{selectedGroup.name}</h2>
                  <span className={`text-xs px-2 py-1 rounded-button font-mono font-bold ${selectedGroup.is_public ? 'bg-neon-green/20 text-neon-green' : 'bg-neon-purple/20 text-neon-purple'}`}>
                    {selectedGroup.is_public ? 'ÖFFENTLICH' : 'PRIVAT'}
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {/* Beitreten-Button für öffentliche Gruppen */}
                  {selectedGroup.is_public && selectedGroup.created_by !== user.id && !groupMembers.some((m) => m.user_id === user.id) && (
                    <button
                      onClick={() => joinPublicGroup(selectedGroup.id)}
                      className="glow-button bg-gradient-to-r from-neon-gold to-yellow-500 text-dark-900 px-4 py-2 rounded-button font-heading font-bold hover:shadow-glow transition"
                    >
                      Beitreten
                    </button>
                  )}
                  {selectedGroup.created_by === user.id && (
                    <button onClick={() => deleteGroup(selectedGroup.id)} className="glow-button bg-neon-red/20 text-neon-red px-4 py-2 rounded-button font-heading font-semibold hover:bg-neon-red/30 transition">
                      Gruppe löschen
                    </button>
                  )}
                </div>
              </div>
              {!selectedGroup.is_public && (
                <div className="bg-dark-700 p-4 rounded-button border border-white/5">
                  <div className="text-sm text-gray-500 font-body mb-1">Beitrittscode:</div>
                  <div className="text-2xl font-mono font-bold text-neon-gold">{selectedGroup.join_code}</div>
                </div>
              )}
            </div>

            {/* Mitglieder */}
            <div className="glass-card rounded-card overflow-hidden mb-6">
              <h3 className="text-lg font-heading font-bold p-4 border-b border-white/10 text-white flex items-center gap-2">
                <span>👥</span> Mitglieder
              </h3>
              <div className="divide-y divide-white/5">
                {groupMembers.length > 0 ? (
                  groupMembers.map((member) => {
                    const isMe = member.user_id === user.id;
                    const canRemove = selectedGroup.created_by === user.id && !isMe;
                    return (
                      <div key={member.id} className="p-4 flex items-center justify-between hover:bg-dark-800 transition">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-neon-purple to-neon-pink flex items-center justify-center text-white font-bold">
                            {member.profiles?.username?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="font-heading font-semibold text-white flex items-center gap-2">
                              {member.profiles?.username || 'Unbekannt'}
                              {isMe && <span className="text-xs bg-neon-gold text-dark-900 px-2 py-0.5 rounded-button font-bold">Du</span>}
                              {member.is_admin && !isMe && <span className="text-xs bg-neon-purple/20 text-neon-purple px-2 py-0.5 rounded-button font-semibold">Admin</span>}
                            </div>
                            <div className="text-xs text-gray-500 font-body">{member.is_admin ? 'Gruppen-Admin' : 'Mitglied'}</div>
                          </div>
                        </div>
                        {canRemove && (
                          <button onClick={() => removeMember(selectedGroup.id, member.user_id)} className="glow-button bg-neon-red/20 text-neon-red px-3 py-1.5 rounded-button text-sm font-heading font-semibold hover:bg-neon-red/30 transition">
                            Entfernen
                          </button>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-6 text-center text-gray-500 font-body">Keine Mitglieder.</div>
                )}
              </div>
            </div>

            {/* Gruppen Leaderboard */}
            <div className="glass-card rounded-card overflow-hidden">
              <h3 className="text-lg font-heading font-bold p-4 border-b border-white/10 text-white">🏆 Leaderboard</h3>
              <table className="w-full text-left">
                <thead className="bg-dark-800 text-gray-500 text-sm font-mono">
                  <tr>
                    <th className="p-4">Platz</th>
                    <th className="p-4">Name</th>
                    <th className="p-4 text-right">Punkte</th>
                  </tr>
                </thead>
                <tbody className="text-white font-body">
                  {groupLeaderboard.map((row, index) => (
                    <tr key={row.username} className={`border-t border-white/5 ${row.username === username ? 'bg-neon-gold/10 font-bold' : ''}`}>
                      <td className="p-4 text-neon-gold font-mono">{index + 1}.</td>
                      <td className="p-4">
                        {row.username}
                        {row.username === username && <span className="ml-2 text-xs bg-neon-gold text-dark-900 px-2 py-1 rounded-button font-semibold">Du</span>}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-neon-gold">{row.total_points}</td>
                    </tr>
                  ))}
                  {groupLeaderboard.length === 0 && (
                    <tr>
                      <td colSpan="3" className="p-8 text-center text-gray-600 font-body">Noch keine gewerteten Spiele.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== LEADERBOARD ===== */}
        {view === 'leaderboard' && (
          <div className="glass-card rounded-card overflow-hidden">
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-xl font-heading font-bold text-white">🏆 All-Time Leaderboard</h2>
              <button onClick={() => setShowPointsInfo(true)} className="glow-button bg-neon-gold/20 text-neon-gold px-4 py-2 rounded-button text-sm font-heading font-semibold hover:bg-neon-gold/30 transition">
                ℹ️ Punkte
              </button>
            </div>
            {/* Wochen-Champion */}
            {weeklyChampion && (
              <div className="p-4 bg-gradient-to-r from-neon-gold/20 to-neon-pink/20 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">👑</span>
                  <div>
                    <div className="text-xs text-gray-400 font-body">Wochen-Champion</div>
                    <div className="text-lg font-heading font-bold text-white">{weeklyChampion.username}</div>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-2xl font-heading font-bold text-neon-gold">{weeklyChampion.weekly_points}</div>
                    <div className="text-xs text-gray-400 font-body">Punkte diese Woche</div>
                  </div>
                </div>
              </div>
            )}
            <table className="w-full text-left">
              <thead className="bg-dark-800 text-gray-500 text-sm font-mono">
                <tr>
                  <th className="p-4">Platz</th>
                  <th className="p-4">Name</th>
                  <th className="p-4 text-right">Punkte</th>
                </tr>
              </thead>
              <tbody className="text-white font-body">
                {leaderboard.map((row, index) => (
                  <tr key={row.username} className={`border-t border-white/5 ${row.username === username ? 'bg-neon-gold/10 font-bold' : 'hover:bg-dark-800'}`}>
                    <td className="p-4 text-neon-gold font-mono">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                    </td>
                    <td className="p-4">
                      {row.username}
                      {row.username === username && <span className="ml-2 text-xs bg-neon-gold text-dark-900 px-2 py-1 rounded-button font-semibold">Du</span>}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-neon-gold">{row.total_points}</td>
                  </tr>
                ))}
                {leaderboard.length === 0 && (
                  <tr>
                    <td colSpan="3" className="p-8 text-center text-gray-600 font-body">Noch keine registrierten Nutzer.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* BOTTOM NAVIGATION (Mobile) */}
      <nav className="bottom-nav lg:hidden">
        <div className="flex justify-around items-center">
          {[
            { id: 'tips', label: 'Spiele', icon: '⚽' },
            { id: 'results', label: 'Ergebnisse', icon: '📊' },
            { id: 'calendar', label: 'Kalender', icon: '📅' },
            { id: 'groups', label: 'Gruppen', icon: '👥' },
            { id: 'leaderboard', label: 'Tabelle', icon: '🏆' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={`flex flex-col items-center gap-1 px-3 py-2 transition ${view === tab.id ? 'text-neon-gold' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-xs font-heading font-semibold">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
