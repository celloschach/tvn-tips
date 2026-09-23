import ical from 'node-ical';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Fehler: SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY nicht in den Secrets gefunden!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function sync() {
  console.log('Starte ICS-Sync...');
  try {
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
      console.error('Supabase Fehler:', error);
      process.exit(1);
    } else {
      console.log(`✅ Erfolgreich ${games.length} Spiele synchronisiert!`);
    }
  } catch (err) {
    console.error('Allgemeiner Fehler beim Sync:', err);
    process.exit(1);
  }
}

sync();
