import ical from 'node-ical';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Fehler: SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY nicht in den Secrets gefunden!');
  process.exit(1);
}

function extractAgeGroup(competition) {
  if (!competition) return '';
  const match = competition.match(/U\d+/i);
  if (match) return match[0].toUpperCase();
  if (competition.toLowerCase().includes('herren')) return 'Herren';
  if (competition.toLowerCase().includes('damen')) return 'Damen';
  return '';
}

function extractScore(summary, description) {
  const descMatch = description.match(/✅\s*ERGEBNIS:\s*(\d{1,3})\s*:\s*(\d{1,3})/i);
  if (descMatch) {
    return { home: parseInt(descMatch[1], 10), away: parseInt(descMatch[2], 10) };
  }
  const sumMatch = summary.match(/\s(\d{1,3})\s*:\s*(\d{1,3})\s/);
  if (sumMatch && !summary.toLowerCase().includes(" vs. ")) {
    return { home: parseInt(sumMatch[1], 10), away: parseInt(sumMatch[2], 10) };
  }
  return null;
}

async function sync() {
  console.log('🚀 Starte ICS-Sync mit Liga-ID-Extraktion...');
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

        // 🔍 NARRENSICHERE LIGA-ID EXTRAKTION (3 Versuche)
        let ligaId = event['x-liga-id'] || event['X-LIGA-ID']; // Versuch 1: Direkte Property
        
        if (!ligaId && desc) {
          const match1 = desc.match(/X-LIGA-ID:(\d+)/); // Versuch 2: Im Beschreibungstext
          if (match1) ligaId = match1[1];
          
          const match2 = desc.match(/\(ID:\s*(\d+)\)/i); // Versuch 3: Aus "(ID: 54574)" im Text
          if (match2) ligaId = match2[1];
        }

        const score = extractScore(summary, desc);
        
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
          home_score: score ? score.home : null,
          away_score: score ? score.away : null,
          liga_id: ligaId // ✅ WICHTIG: Wird jetzt definitiv mitgesendet
        };

        // 🔍 DEBUG LOG: Damit wir im GitHub Log sehen, ob es funktioniert!
        if (ligaId) {
          console.log(`  ✅ ID gefunden: ${ligaId} | ${heimTeam} vs. ${gastTeam}`);
        } else {
          console.log(`  ⚠️  KEINE ID gefunden | ${heimTeam} vs. ${gastTeam}`);
        }

        games.push(gameData);
      }
    }

    if (games.length === 0) {
      console.log('Keine Spiele in der ICS-Datei gefunden.');
      return;
    }

    // --- SCHRITT 1: Alle Spieldaten syncen (inklusive liga_id) ---
    const gamesWithoutScores = games.map(({ home_score, away_score, ...rest }) => rest);
    
    console.log(`\n📤 Sende ${gamesWithoutScores.length} Spiele an Supabase (inkl. liga_id)...`);
    const response = await fetch(`${supabaseUrl}/rest/v1/games`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates' 
      },
      body: JSON.stringify(gamesWithoutScores)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Supabase API Fehler:', response.status, errorData);
      process.exit(1);
    }
    console.log(`✅ Schritt 1 erfolgreich: Spieldaten aktualisiert.`);

    // --- SCHRITT 2: Ergebnisse gezielt aktualisieren ---
    const gamesWithScores = games.filter(g => g.home_score !== null);
    
    if (gamesWithScores.length > 0) {
      console.log(`\n🔄 Schritt 2: Aktualisiere ${gamesWithScores.length} Ergebnisse...`);
      for (const game of gamesWithScores) {
        const updateResponse = await fetch(`${supabaseUrl}/rest/v1/games?id=eq.${encodeURIComponent(game.id)}`, {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            home_score: game.home_score,
            away_score: game.away_score
          })
        });

        if (!updateResponse.ok) {
          console.error(`  ❌ Fehler bei ${game.id}:`, updateResponse.status);
        }
      }
    }

    console.log(`\n🎉 Sync erfolgreich abgeschlossen!`);
  } catch (err) {
    console.error('❌ Allgemeiner Fehler beim Sync:', err);
    process.exit(1);
  }
}

sync();
