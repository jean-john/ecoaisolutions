/**
 * ECOAI SOLUTIONS — base de dados de inscrições (Google Sheets)
 *
 * Como instalar (uma vez):
 * 1. Abrir a folha "ECOAI — Inscrições Curso C++" no Google Sheets.
 * 2. Extensões → Apps Script. Apagar o que lá estiver e colar este ficheiro todo.
 * 3. Mudar a CHAVE abaixo para uma palavra-passe só tua (é a palavra-passe do painel).
 * 4. Guardar. Implementar → Nova implementação → tipo "Aplicação Web".
 *    Executar como: Eu.  Quem tem acesso: Qualquer pessoa.  → Implementar → Autorizar.
 * 5. Copiar o URL que termina em /exec e enviá-lo ao Claude (sem a chave).
 */

const CHAVE = 'MUDAR-ESTA-PALAVRA-PASSE';

const CAMPOS = ['nome', 'telefone', 'email', 'idade', 'localidade', 'ocupacao', 'escolaridade',
  'experiencia', 'equipamento', 'horario', 'origem', 'observacoes', 'pagina'];
const COLUNAS = ['data'].concat(CAMPOS, ['estado', 'notas']);
const COL_ESTADO = COLUNAS.indexOf('estado') + 1;   // coluna O
const COL_NOTAS = COLUNAS.indexOf('notas') + 1;     // coluna P
const ESTADOS = ['Pendente', 'Pago', 'Link enviado', 'Desistiu'];

function folha() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
}

// Recebe inscrições do site e mudanças de estado vindas do painel
function doPost(e) {
  const p = (e && e.parameter) || {};
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (p.acao === 'estado') {
      if (p.chave !== CHAVE) return json({ ok: false, erro: 'chave' });
      const linha = Number(p.linha);
      if (!(linha >= 2) || linha > folha().getLastRow()) return json({ ok: false, erro: 'linha' });
      if (p.estado !== undefined) {
        if (ESTADOS.indexOf(p.estado) < 0) return json({ ok: false, erro: 'estado' });
        folha().getRange(linha, COL_ESTADO).setValue(p.estado);
      }
      if (p.notas !== undefined) folha().getRange(linha, COL_NOTAS).setValue(limpar(p.notas));
      return json({ ok: true });
    }

    if (p._gotcha) return json({ ok: true });                 // robô de spam
    if (!p.nome || !p.telefone) return json({ ok: false, erro: 'dados' });

    const linha = [new Date()].concat(CAMPOS.map(c => limpar(p[c])), ['Pendente', '']);
    folha().appendRow(linha);
    return json({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

// Entrega todas as inscrições ao painel (só com a chave certa)
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.chave !== CHAVE) return json({ ok: false, erro: 'chave' });
  const valores = folha().getDataRange().getValues();
  valores.shift(); // cabeçalho
  const linhas = valores
    .map((r, i) => {
      const o = { linha: i + 2 };
      COLUNAS.forEach((c, j) => {
        const v = r[j];
        o[c] = v instanceof Date ? v.toISOString() : String(v === undefined ? '' : v);
      });
      if (!o.estado) o.estado = 'Pendente';
      return o;
    })
    .filter(o => o.nome);
  return json({ ok: true, atualizado: new Date().toISOString(), linhas: linhas });
}

// Corta textos longos e impede que um valor seja lido como fórmula
function limpar(v) {
  v = String(v === undefined ? '' : v).slice(0, 500).trim();
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
