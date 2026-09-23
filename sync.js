const ical = require('node-ical');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function sync() {
  console.log('Starte ICS-Sync...');
  const data = await ical.fromURL('https://mragg.github.io/bbb-ics-generator/all_teams.ics');
  const games = [];

  for (const k in data) {
    const event = data[k];
    if (event.type === 'VEVENT') {
      const desc = event.description || '';
      const heimMatch = desc.match(/Heim:\s*([^\n]+)/);
      const gastMatch = desc.match(/Gast:\s*([^\n]+)/);
      
      const heimTeam = heimMatch ? heimMatch[1].trim() : 'Unbekannt';
      const gastTeam = gastMatch ? gastMatch[1].trim() : 'Unbekannt';
      const isCancelled = event.summary.includes('AUSGEFALLEN') || event.summary.includes('ABGESAGT');

      games.push({
        id: event.uid,
        summary: event.summary,
        home_team: heimTeam,
        away_team: gastTeam,
        start_time: event.start ? event.start.toISOString() : null,
        location: event.location || '',
        is_cancelled: isCancelled
      });
    }
  }

  const { error } = await supabase.from('games').upsert(games, { onConflict: 'id' });
  if (error) {
    console.error('Fehler:', error);
    process.exit(1);
  } else {
    console.log(`Erfolgreich ${games.length} Spiele synchronisiert!`);
  }
}
sync();
