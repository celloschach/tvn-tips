import ical from 'node-ical';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Fehler: SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY nicht in den Secrets gefunden!');
  process.exit(1);
}

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

    if (games.length === 0) {
      console.log('Keine Spiele in der ICS-Datei gefunden.');
      return;
    }

    // Direkter Aufruf der Supabase REST API zum Upserten (Aktualisieren oder Einfügen)
    const response = await fetch(`${supabaseUrl}/rest/v1/games`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates' // Das ist der Supabase-Befehl für "Upsert"
      },
      body: JSON.stringify(games)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Supabase API Fehler:', response.status, errorData);
      process.exit(1);
    }

    console.log(`✅ Erfolgreich ${games.length} Spiele synchronisiert!`);
  } catch (err) {
    console.error('Allgemeiner Fehler beim Sync:', err);
    process.exit(1);
  }
}

sync();
