import fetch from 'node-fetch';
import fs from 'fs';

const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTn7jYHWYnEY5lAMye8VWT3a0VD43GCoewkaTo38ip_yafcUN1RizBYR-Jj0hHlPWR8MEAN298CxzbZ/pub?output=csv";

async function main() {
  console.log('📊 Buscando dados do Google Sheets...');

  const resp = await fetch(SHEET_CSV_URL);
  if (!resp.ok) throw new Error(`Falha ao buscar planilha: ${resp.status}`);
  const csvText = await resp.text();

  console.log('✅ Dados recebidos.');

  const fileName = fs.existsSync('index.html') ? 'index.html' : 'dashboard.html';
  let html = fs.readFileSync(fileName, 'utf-8');

  const escapedCSV = csvText
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');

  const now = new Date().toISOString();

  const dataBlock = `// ── DADOS PRÉ-CARREGADOS (${now}) ──
const PRELOADED_CSV = \`${escapedCSV}\`;
const PRELOADED_TS = "${now}";
`;

  if (html.includes('// ── DADOS PRÉ-CARREGADOS')) {
    html = html.replace(
      /\/\/ ── DADOS PRÉ-CARREGADOS[\s\S]*?const PRELOADED_TS = "[^"]*";/,
      dataBlock.trim()
    );
  } else {
    html = html.replace(
      '// ── FETCH SHEETS ──',
      dataBlock + '\n// ── FETCH SHEETS ──'
    );
  }

  if (!html.includes('typeof PRELOADED_CSV')) {
    html = html.replace(
      `const r=await fetch(SHEET);if(!r.ok)throw new Error(r.status);
    const rows=parseCSV(await r.text());`,
      `let csvData;
    if(typeof PRELOADED_CSV!=='undefined'&&PRELOADED_CSV.trim().length>0){
      console.log('📦 Usando dados pré-carregados de',PRELOADED_TS);
      csvData=PRELOADED_CSV;
    } else {
      const r=await fetch(SHEET);if(!r.ok)throw new Error(r.status);
      csvData=await r.text();
    }
    const rows=parseCSV(csvData);`
    );
  }

  fs.writeFileSync(fileName, html, 'utf-8');
  console.log(`✅ ${fileName} atualizado em ${now}`);
}

main().catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
