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
 *
 * Mensagens automáticas por email (versão 2):
 * - quem se inscreve recebe logo um email de confirmação com as formas de pagamento;
 * - quando o painel marca alguém como "Pago", a pessoa recebe a confirmação e o link do grupo,
 *   e quem a indicou (se também estiver inscrito com email) fica a saber que vai receber 100 MT;
 * - todos os dias às 9h, quem ainda não pagou recebe um lembrete (no máximo de 2 em 2 dias, até ao início do curso).
 * Depois de colar esta versão: Implementar → Gerir implementações → editar (lápis) → Versão: Nova versão → Implementar.
 * E uma única vez: escolher a função "instalarLembretes" no topo e carregar em Executar (autorizar o envio de emails).
 */

const CHAVE = '1234';

const CAMPOS = ['nome', 'telefone', 'email', 'idade', 'localidade', 'ocupacao', 'escolaridade',
  'experiencia', 'equipamento', 'horario', 'origem', 'observacoes', 'pagina'];
const COLUNAS = ['data'].concat(CAMPOS, ['estado', 'notas', 'lembrete']);
const COL_ESTADO = COLUNAS.indexOf('estado') + 1;   // coluna O
const COL_NOTAS = COLUNAS.indexOf('notas') + 1;     // coluna P
const COL_LEMBRETE = COLUNAS.indexOf('lembrete') + 1; // coluna Q: data do último lembrete

// ---- dados do curso usados nos emails ----
const CURSO = 'Introdução à Programação com C++';
const INICIO = new Date(2026, 10, 2);                 // 2 de Novembro de 2026 (o mês conta a partir de 0)
const PRAZO = 'sexta-feira, 30 de Outubro';
const PRECO = 600, COMISSAO = 100;
const GRUPO = 'https://chat.whatsapp.com/LfdWYkOnIdWJ3x3SnxaYpd';
const SITE = 'https://ecoaisolutions-mezt.onrender.com';
const WHATS = '84 381 3137';
const EMAILS_ATIVOS = true;                          // false = desliga todos os emails automáticos
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
        const antes = String(folha().getRange(linha, COL_ESTADO).getValue());
        folha().getRange(linha, COL_ESTADO).setValue(p.estado);
        if (p.estado === 'Pago' && antes !== 'Pago' && antes !== 'Link enviado') aoPagar(linha);
      }
      if (p.notas !== undefined) folha().getRange(linha, COL_NOTAS).setValue(limpar(p.notas));
      return json({ ok: true });
    }

    if (p._gotcha) return json({ ok: true });                 // robô de spam
    if (!p.nome || !p.telefone) return json({ ok: false, erro: 'dados' });

    const linha = [new Date()].concat(CAMPOS.map(c => limpar(p[c])), ['Pendente', '', '']);
    folha().appendRow(linha);
    emailBoasVindas(p);
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


// =================== EMAILS AUTOMÁTICOS ===================

function emailValido(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim()); }
function primeiroNome(n) { return String(n || '').trim().split(/\s+/)[0] || ''; }
function esc(v) { return String(v || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

function enviar(para, assunto, paragrafos) {
  if (!EMAILS_ATIVOS || !emailValido(para)) return false;
  const html = '<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#15201F;max-width:560px">'
    + paragrafos.map(x => '<p style="margin:0 0 14px">' + x + '</p>').join('')
    + '<p style="margin:22px 0 0;color:#4B5B59;font-size:13px">ECOAI SOLUTIONS · ' + SITE.replace('https://', '') + ' · WhatsApp ' + WHATS + '</p></div>';
  const texto = paragrafos.join('\n\n').replace(/<[^>]+>/g, '');
  try {
    MailApp.sendEmail({ to: String(para).trim(), subject: assunto, htmlBody: html, body: texto, name: 'ECOAI SOLUTIONS' });
    return true;
  } catch (err) { console.warn('Falhou o email para ' + para + ': ' + err); return false; }
}

function blocoPagamento() {
  return '<b>Formas de pagamento (' + PRECO + ' MT):</b><br>'
    + '📱 M-Pesa: 84 381 3137<br>📱 e-Mola: 86 249 7846<br>'
    + '🏦 Bancos (BCI, FNB, Millennium bim): <a href="' + SITE + '/inscricao.html#pagamento">ver todas as contas</a><br>'
    + 'Depois de pagar, envia o comprovativo por WhatsApp para o ' + WHATS + '.';
}

// 1) Logo após a inscrição
function emailBoasVindas(p) {
  enviar(p.email, 'Recebemos a tua inscrição no curso de C++ 🎉', [
    'Olá ' + esc(primeiroNome(p.nome)) + '! 😊',
    'Obrigado por te inscreveres no curso <b>' + CURSO + '</b> da ECOAI SOLUTIONS. O curso é online e começa na <b>segunda-feira, 2 de Novembro</b>.',
    'Para garantir a tua vaga, falta só o pagamento da inscrição até <b>' + PRAZO + '</b>.',
    blocoPagamento(),
    'Assim que confirmarmos o pagamento, adicionamos-te ao grupo da turma no WhatsApp. Qualquer dúvida, responde a este email ou fala connosco no WhatsApp. Até breve! 💻'
  ]);
}

// 2) Quando o painel marca alguém como Pago
function aoPagar(linha) {
  const dados = folha().getRange(linha, 1, 1, COLUNAS.length).getValues()[0];
  const r = {}; COLUNAS.forEach((c, j) => r[c] = dados[j]);
  enviar(r.email, 'Pagamento confirmado: estás na turma de C++! ✅', [
    'Olá ' + esc(primeiroNome(r.nome)) + '! 🎉',
    'Confirmámos o teu pagamento de ' + PRECO + ' MT. Estás oficialmente na 1.ª turma do curso <b>' + CURSO + '</b>. Obrigado pela confiança! 💙',
    'Entra já no grupo da turma, onde vamos partilhar o horário, os materiais e o link da primeira aula:<br><a href="' + GRUPO + '">' + GRUPO + '</a>',
    'Conheces alguém que também queira aprender? Por cada pessoa que trouxeres e que pague, recebes ' + COMISSAO + ' MT. Basta essa pessoa escrever o teu nome e número no campo «Quem te indicou» da inscrição.'
  ]);
  const ang = encontrarAngariador(r);
  if (ang && ang.email) {
    enviar(ang.email, 'O teu colega pagou: tens ' + COMISSAO + ' MT a caminho! 💰', [
      'Olá ' + esc(primeiroNome(ang.nome)) + '! 😊',
      'Boas notícias: <b>' + esc(primeiroNome(r.nome)) + '</b>, que indicaste para o curso de C++, já confirmou o pagamento.',
      'Por isso tens <b>' + COMISSAO + ' MT</b> a receber, que te vamos enviar brevemente. Obrigado por acreditares na ECOAI SOLUTIONS! 🙏',
      'Cada nova pessoa que trouxeres e que pague são mais ' + COMISSAO + ' MT para ti.'
    ]);
  }
}

// Procura, entre os inscritos, a pessoa escrita em «Indicado por: …»
function encontrarAngariador(r) {
  const m = String(r.observacoes || '').match(/Indicado por:\s*([^.]+)\./);
  if (!m) return null;
  const quem = m[1];
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const tel = quem.replace(/\D/g, '').slice(-9);
  const partes = norm(quem.replace(/[\d+]/g, ' ')).split(' ').filter(Boolean);
  if (partes.join(' ').indexOf('jean marie john') >= 0) return null;   // a equipa não recebe comissão
  const valores = folha().getDataRange().getValues(); valores.shift();
  for (const v of valores) {
    const o = {}; COLUNAS.forEach((c, j) => o[c] = v[j]);
    if (!o.nome || o.nome === r.nome) continue;
    const t = String(o.telefone).replace(/\D/g, '');
    const n = ' ' + norm(o.nome) + ' ';
    const porTel = tel.length === 9 && t.indexOf(tel) >= 0;
    const porNome = partes.length > 1 && n.indexOf(' ' + partes[0] + ' ') >= 0 && n.indexOf(' ' + partes[partes.length - 1] + ' ') >= 0;
    if (porTel || porNome) return o;
  }
  return null;
}

// 3) Lembrete diário a quem ainda não pagou (corre sozinho às 9h)
function lembretesDiarios() {
  const hoje = new Date();
  if (hoje >= INICIO) return;                                    // o curso já começou: pára
  const f = folha();
  if (!f.getRange(1, COL_LEMBRETE).getValue()) f.getRange(1, COL_LEMBRETE).setValue('lembrete');
  const valores = f.getDataRange().getValues();
  const faltam = Math.ceil((INICIO - hoje) / 864e5);
  let enviados = 0;
  for (let i = 1; i < valores.length && enviados < 80; i++) {
    const o = {}; COLUNAS.forEach((c, j) => o[c] = valores[i][j]);
    if (String(o.estado || 'Pendente') !== 'Pendente' || !emailValido(o.email)) continue;
    const inscrito = o.data instanceof Date ? o.data : new Date(o.data);
    if (hoje - inscrito < 864e5) continue;                        // inscreveu-se há menos de 1 dia
    const ultimo = o.lembrete instanceof Date ? o.lembrete : (o.lembrete ? new Date(o.lembrete) : null);
    if (ultimo && hoje - ultimo < 2 * 864e5 - 36e5) continue;     // no máximo de 2 em 2 dias
    const ok = enviar(o.email, faltam <= 3 ? 'Faltam ' + faltam + ' dias: a tua vaga no curso de C++ ⏳' : 'A tua vaga no curso de C++ está à espera 😊', [
      'Olá ' + esc(primeiroNome(o.nome)) + '! 😊',
      'Faltam só <b>' + faltam + ' ' + (faltam === 1 ? 'dia' : 'dias') + '</b> para começar o curso <b>' + CURSO + '</b>, e o grupo da turma já está activo! 🎉',
      'A tua inscrição está feita; para manteres a vaga, falta confirmar o pagamento até <b>' + PRAZO + '</b>.',
      blocoPagamento(),
      'Se tiveres alguma dificuldade ou precisares de mais tempo, responde a este email ou fala connosco no WhatsApp. Estamos aqui para ajudar! 💙'
    ]);
    if (ok) { f.getRange(i + 1, COL_LEMBRETE).setValue(hoje); enviados++; }
  }
  console.log('Lembretes enviados: ' + enviados);
}

// Executar UMA vez para ligar o lembrete diário (às 9h, hora de Maputo)
function instalarLembretes() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'lembretesDiarios').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('lembretesDiarios').timeBased().everyDays(1).atHour(9).inTimezone('Africa/Maputo').create();
  MailApp.getRemainingDailyQuota();   // pede logo a autorização para enviar emails
  console.log('Lembrete diário ligado.');
}
