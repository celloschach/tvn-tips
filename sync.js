const ical = require('node-ical');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function syncGames() {
  console.log('🚀 Starte ICS Sync...');
  
  // Pfad zur ICS-Datei (passe den Namen an, falls er bei dir anders heißt, z.B. 'tvn.ics')
  const icsPath = path.join(__dirname, 'schedule.ics'); 
  
  if (!fs.existsSync(icsPath)) {
    console.log('❌ ICS-Datei nicht gefunden. Prüfe den Dateinamen.');
    return;
  }

  const icsData = fs.readFileSync(icsPath, 'utf8');
  const events = ical.parseICS(icsData);
  const gamesToUpsert = [];

  for (const key in events) {
    const event = events[key];
    if (event.type === 'VEVENT') {
      
      // 1. NEU: Liga-ID aus dem Raw-String extrahieren
      const eventStartIndex = icsData.indexOf(`UID:${event.uid}`);
      const eventEndIndex = icsData.indexOf('END:VEVENT', eventStartIndex) + 10;
      const rawEventString = icsData.substring(eventStartIndex, eventEndIndex);
      const ligaMatch = rawEventString.match(/X-LIGA-ID:(\d+)/);
      const ligaId = ligaMatch ? ligaMatch[1] : null;

      // 2. Daten aufbereiten (Passe die Feldnamen an deine Supabase-Tabelle an)
      const startDate = new Date(event.start);
      const endDate = new Date(event.end);
      const summary = event.summary || '';
      
      // Beispiel-Parser für "HBC 58:83 TVN1" oder "TVN1 - HBC"
      // Falls du bereits eine bessere Logik hast, ersetze diesen Block.
      let homeTeam = 'Unbekannt';
      let awayTeam = 'Unbekannt';
      let homeScore = null;
      let awayScore = null;

      if (summary.includes(':')) {
        const parts = summary.split(':');
        // Sehr vereinfachte Logik, passe sie an deine Bedürfnisse an
        homeTeam = parts[0].trim();
        const scoreAndAway = parts[1].split(' ');
        homeScore = parseInt(scoreAndAway[0]) || null;
        awayTeam = scoreAndAway.slice(1).join(' ').trim();
      } else if (summary.includes('-')) {
        const parts = summary.split('-');
        homeTeam = parts[0].trim();
        awayTeam = parts[1].trim();
      } else {
        homeTeam = summary;
      }

      const gameData = {
        uid: event.uid,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        home_team: homeTeam,
        away_team: awayTeam,
        home_score: homeScore,
        away_score: awayScore,
        competition: event.description ? event.description.match(/Wettbewerb: (.*?) \(/)?.[1] || 'Liga' : 'Liga',
        location: event.location || '',
        is_cancelled: summary.toUpperCase().includes('ABGESAGT') || summary.toUpperCase().includes('CANCELLED'),
        liga_id: ligaId // <--- HIER WIRD DIE LIGA-ID GESPEICHERT
      };

      gamesToUpsert.push(gameData);
    }
  }

  console.log(`📦 ${gamesToUpsert.length} Spiele zum Aktualisieren gefunden.`);

  // 3. In Supabase speichern (Upsert anhand der 'uid')
  const { data, error } = await supabase
    .from('games')
    .upsert(gamesToUpsert, { onConflict: 'uid' });

  if (error) {
    console.error('❌ Fehler beim Speichern:', error);
  } else {
    console.log('✅ ICS Sync erfolgreich abgeschlossen!');
  }
}

syncGames();
