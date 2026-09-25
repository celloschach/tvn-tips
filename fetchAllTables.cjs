const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const LEAGUE_IDS = [
  '54574', '54598', '54607', '54894', '55715', 
  '55721', '55727', '55729', '55726', '55724', '55730'
];

const OUTPUT_DIR = path.join(__dirname, 'public', 'generated');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function fetchTable(ligaId) {
  const url = `https://www.basketball-bund.net/public/tabelle.jsp?print=1&viewDescKey=sport.dbb.views.TabellePublicView/index.jsp_&liga_id=${ligaId}`;
  
  try {
    const { data } = await axios.get(url, { timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(data);
    const tableData = [];
    const tvnTeamsInLeague = [];

    $('table tr').each((index, element) => {
      const cells = $(element).find('td');
      if (cells.length >= 6) {
        const rank = $(cells[0]).text().trim();
        const team = $(cells[1]).text().trim();
        const games = $(cells[2]).text().trim();
        const wins = $(cells[3]).text().trim();
        const points = $(cells[cells.length - 2]).text().trim();
        const baskets = $(cells[cells.length - 1]).text().trim();

        if (!isNaN(parseInt(rank)) && team) {
          tableData.push({ 
            rank: parseInt(rank), 
            team, 
            games: parseInt(games) || 0, 
            wins: parseInt(wins) || 0, 
            points: parseInt(points) || 0, 
            baskets 
          });
          
          const lowerTeam = team.toLowerCase();
          if (lowerTeam.includes('neunkirchen') || lowerTeam.includes('tvn')) {
            tvnTeamsInLeague.push(team);
          }
        }
      }
    });

    if (tableData.length > 0 && tvnTeamsInLeague.length > 0) {
      const filename = `tabelle_${ligaId}.json`;
      fs.writeFileSync(path.join(OUTPUT_DIR, filename), JSON.stringify(tableData, null, 2));
      console.log(`✅ Gespeichert: ${filename} (TVN: ${tvnTeamsInLeague.join(', ')})`);
      return { ligaId, filename, tvnTeams: tvnTeamsInLeague };
    }
  } catch (error) {
    console.log(`⚠️  Liga ${ligaId} konnte nicht geladen werden.`);
  }
  return null;
}

async function main() {
  console.log('🚀 Starte Tabellen-Update für TVN...\n');
  const results = [];
  for (const id of LEAGUE_IDS) {
    const result = await fetchTable(id);
    if (result) results.push(result);
  }
  fs.writeFileSync(path.join(OUTPUT_DIR, 'table-links.json'), JSON.stringify(results, null, 2));
  console.log('\n🎉 Tabellen-Update abgeschlossen!');
}

main();
