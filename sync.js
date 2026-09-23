import ical from 'node-ical';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Fehler: SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY nicht in den Secrets gefunden!');
  process.exit(1);
}

// Funktion: Altersklasse extrahieren
function extractAgeGroup(competition) {
  if (!competition) return '';
  const match = competition.match(/U\d+/i);
  if (match) return match[0].toUpperCase();
  if (competition.toLowerCase().includes('herren')) return 'Herren';
  if (competition.toLowerCase().includes('damen')) return 'Damen';
  return '';
}

// Funktion: Spielstand sicher extrahieren
function extractScore(summary, description) {
  // 1. Priorität: Das explizite "✅ ERGEBNIS:" in der Beschreibung
  const descMatch = description.match(/✅\s*ERGEBNIS:\s*(\d{1,3})\s*:\s*(\d{1,3})/i);
  if (descMatch) {
    return { home: parseInt(descMatch[1], 10), away: parseInt(descMatch[2], 10) };
  }

  // 2. Fallback: Suche im Summary (z.B. "Hürther BC 58:83 TV Neunkirchen")
  // Wir suchen nach Zahlen:Zahlen, die von Leerzeichen umgeben sind.
  const sumMatch = summary.match(/\s(\d{1,3})\s*:\s*(\d{1,3})\s/);
  if (sumMatch && !summary.toLowerCase().includes(" vs. ")) {
    return { home: parseInt(sumMatch[1], 10), away: parseInt(sumMatch[2], 10) };
  }

  return null; // Kein Ergebnis gefunden
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
        const summary = event.summary || '';
        
        const wettbewerbMatch = desc.match(/Wettbewerb:\s*([^\n]+)/);
        const heimMatch = desc.match(/Heim:\s*([^\n]+)/);
        const gastMatch = desc.match(/Gast:\s*([^\n]+)/);
        
        const wettbewerb = wettbewerbMatch ? wettbewerbMatch[1].trim() : 'Unbekannt';
        const heimTeam = heimMatch ? heimMatch[1].trim() : 'Unbekannt';
        const gastTeam = gastMatch ? gastMatch[1].trim() : 'Unbekannt';
        const ageGroup = extractAgeGroup(wettbewerb);
        const isCancelled = summary.includes('AUSGEFALLEN') || summary.includes('ABGESAGT');

        // Spielstand extrahieren
        const score = extractScore(summary, desc);
        
        // WICHTIG: home_score und away_score sind HIER bereits definiert (als null)
        // Damit haben ALLE Objekte im Array exakt die gleichen Schlüssel!
        const gameData = {
          id: event.uid,
          summary: summary,
          competition: wettbewerb,
          age_group: ageGroup,
          home_team: heimTeam,
          away_team: gastTeam,
          start_time: event.start ? event.start.toISOString() : null,
          location: event.location || '',
          is_cancelled: isCancelled,
          home_score: null, 
          away_score: null
        };

        // Wenn ein Ergebnis gefunden wurde, überschreiben wir das null mit der Zahl
        if (score !== null) {
          gameData.home_score = score.home;
          gameData.away_score = score.away;
          console.log(`  ✅ Ergebnis gefunden: ${heimTeam} ${score.home}:${score.away} ${gastTeam}`);
        } else {
          console.log(`  ⏳ Kein Ergebnis (Zukunft): ${heimTeam} vs. ${gastTeam}`);
        }

        games.push(gameData);
      }
    }

    if (games.length === 0) {
      console.log('Keine Spiele in der ICS-Datei gefunden.');
      return;
    }

    // Upsert: Aktualisiert vorhandene Spiele (anhand der ID) oder fügt neue hinzu
    const response = await fetch(`${supabaseUrl}/rest/v1/games`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates' 
      },
      body: JSON.stringify(games)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Supabase API Fehler:', response.status, errorData);
      process.exit(1);
    }

    console.log(`\n🎉 Erfolgreich ${games.length} Spiele synchronisiert!`);
  } catch (err) {
    console.error('❌ Allgemeiner Fehler beim Sync:', err);
    process.exit(1);
  }
}

sync();
