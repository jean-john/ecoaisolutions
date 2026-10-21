// ============================================================
// ECOAI SOLUTIONS — painel de inscrições
// Lê as inscrições da folha do Google Sheets (via Apps Script),
// mostra números, gráficos, um resumo escrito e a lista completa.
// ============================================================

const PRECO = 600;            // MT por participante
const META = 40;              // vagas da turma
const INICIO = '2026-11-02';  // primeira aula
const ESTADOS = ['Pendente', 'Pago', 'Link enviado', 'Desistiu'];
const PAGOS = ['Pago', 'Link enviado'];

const el = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const mt = n => n.toLocaleString('pt-PT') + ' MT';
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;

let chave = '';
let linhas = [];
let demo = false;
let filtro = 'Todos';

/* ---------- guardar a palavra-passe neste aparelho ---------- */
const guardar = v => { try { v ? localStorage.setItem('ecoai-chave', v) : localStorage.removeItem('ecoai-chave'); } catch (_) {} };
const lerGuardada = () => { try { return localStorage.getItem('ecoai-chave') || ''; } catch (_) { return ''; } };

/* ---------- entrada ---------- */
if (!CONFIG.sheetUrl) el('semBase').hidden = false;

el('formEntrar').addEventListener('submit', async e => {
  e.preventDefault();
  const v = el('p-chave').value.trim();
  if (!v) { mostrarErro('Escreve a palavra-passe.'); return; }
  await entrar(v);
});
el('btnDemo').addEventListener('click', () => { demo = true; linhas = exemplo(); abrirPainel(); });
el('btnSair').addEventListener('click', () => {
  guardar(''); chave = ''; linhas = []; demo = false;
  el('vistaPainel').hidden = true; el('acoesTopo').hidden = true; el('vistaEntrar').hidden = false;
  el('p-chave').value = '';
});
el('btnAtualizar').addEventListener('click', () => demo ? render() : entrar(chave, true));

function mostrarErro(t) { const p = el('entrarErro'); p.textContent = t; p.hidden = !t; }

async function entrar(v, silencioso) {
  if (!CONFIG.sheetUrl) { mostrarErro('A base de dados ainda não está ligada ao site.'); return; }
  const btn = el('btnEntrar');
  btn.disabled = true; btn.textContent = 'A carregar…';
  try {
    const res = await fetch(`${CONFIG.sheetUrl}?chave=${encodeURIComponent(v)}&t=${Date.now()}`);
    const data = await res.json();
    if (!data.ok) {
      guardar('');
      mostrarErro(data.erro === 'chave' ? 'Palavra-passe errada.' : 'Não foi possível ler a base de dados.');
      if (silencioso) el('btnSair').click();
      return;
    }
    chave = v; guardar(v); mostrarErro('');
    linhas = data.linhas || [];
    el('atualizado').textContent = 'Actualizado às ' + new Date(data.atualizado || Date.now()).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
    abrirPainel();
    if (silencioso) toast('Dados actualizados');
  } catch (_) {
    mostrarErro('Sem ligação à base de dados. Verifica a internet e tenta de novo.');
  } finally {
    btn.disabled = false; btn.textContent = 'Entrar';
  }
}

function abrirPainel() {
  el('vistaEntrar').hidden = true;
  el('vistaPainel').hidden = false;
  el('acoesTopo').hidden = false;
  el('avisoDemo').hidden = !demo;
  if (demo) el('atualizado').textContent = '';
  render();
}

/* ---------- contas ---------- */
function contar(lista, campo) {
  const m = new Map();
  lista.forEach(r => { const k = (r[campo] || '').trim() || 'Não indicado'; m.set(k, (m.get(k) || 0) + 1); });
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}
function faixa(idade) {
  const n = Number(idade);
  if (!n) return 'Não indicado';
  if (n < 18) return 'Menos de 18';
  if (n < 25) return '18 a 24';
  if (n < 35) return '25 a 34';
  return '35 ou mais';
}
// dia local (Maputo) no formato AAAA-MM-DD; aceita ISO ou dd/mm/aaaa
function paraData(v) {
  if (!v) return null;
  let d = new Date(v);
  if (isNaN(d)) {
    const m = String(v).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) d = new Date(+m[3], +m[2] - 1, +m[1]);
  }
  return isNaN(d) ? null : d;
}
const chaveDia = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dia = v => { const d = paraData(v); return d ? chaveDia(d) : ''; };

/* ---------- desenho ---------- */
function render() {
  const ativos = linhas.filter(r => r.estado !== 'Desistiu');
  const pagos = ativos.filter(r => PAGOS.includes(r.estado));
  const pendentes = ativos.filter(r => r.estado === 'Pendente');
  const faltam = Math.max(0, Math.ceil((Date.parse(INICIO) - Date.now()) / 864e5));

  el('kpis').innerHTML = [
    ['Inscritos', ativos.length, `meta: ${META} vagas`],
    ['Pagos', pagos.length, `${pct(pagos.length, ativos.length)}% dos inscritos`],
    ['Por pagar', pendentes.length, pendentes.length ? 'falta contactar ou confirmar' : 'tudo em dia'],
    ['Receita confirmada', mt(pagos.length * PRECO), `prevista: ${mt(ativos.length * PRECO)}`],
    ['Faltam', faltam + (faltam === 1 ? ' dia' : ' dias'), 'para 2 de Novembro']
  ].map(([t, v, s]) => `<div class="kpi"><span class="kpi-t">${t}</span><b class="kpi-v">${esc(v)}</b><span class="kpi-s">${esc(s)}</span></div>`).join('');

  renderRelatorio(ativos, pagos, pendentes);
  renderDias(ativos);

  const grupos = [
    ['Onde vivem', contar(ativos, 'localidade')],
    ['Ocupação', contar(ativos, 'ocupacao')],
    ['Como vão assistir', contar(ativos, 'equipamento')],
    ['Horário preferido', contar(ativos, 'horario')],
    ['Como souberam do curso', contar(ativos, 'origem')],
    ['Já programaram antes?', contar(ativos, 'experiencia')],
    ['Idade', contar(ativos.map(r => ({ f: faixa(r.idade) })), 'f')],
    ['Escolaridade', contar(ativos, 'escolaridade')]
  ];
  el('graficos').innerHTML = grupos.map(([titulo, dados]) => barras(titulo, dados, ativos.length)).join('');

  renderFiltros();
  renderTabela();
}

function barras(titulo, dados, total) {
  const max = Math.max(1, ...dados.map(d => d[1]));
  const linhasHtml = dados.length ? dados.map(([k, n]) => `
    <li title="${esc(k)}: ${n} (${pct(n, total)}%)">
      <span class="b-nome">${esc(k)}</span>
      <span class="b-trilho"><span class="b-barra" style="width:${Math.max(2, n / max * 100)}%"></span></span>
      <span class="b-val">${n}<small>${pct(n, total)}%</small></span>
    </li>`).join('') : '<li class="b-vazio">Ainda sem dados</li>';
  return `<article class="bloco"><h2>${esc(titulo)}</h2><ul class="barras">${linhasHtml}</ul></article>`;
}

function renderDias(ativos) {
  const contagem = new Map();
  ativos.forEach(r => { const d = dia(r.data); if (d) contagem.set(d, (contagem.get(d) || 0) + 1); });
  if (!contagem.size) { el('dias').innerHTML = '<p class="vazio">Ainda sem inscrições.</p>'; el('diasSub').textContent = ''; return; }
  const ordenados = [...contagem.keys()].sort();
  const [ay, am, ad] = ordenados[0].split('-').map(Number);
  const hoje = chaveDia(new Date());
  const ultimo = ordenados.at(-1) > hoje ? ordenados.at(-1) : hoje;
  const dias = [];
  for (let i = 0; i < 120; i++) {
    const k = chaveDia(new Date(ay, am - 1, ad + i));
    dias.push(k);
    if (k >= ultimo) break;
  }
  const max = Math.max(1, ...dias.map(d => contagem.get(d) || 0));
  const fmt = d => `${Number(d.slice(8, 10))}/${Number(d.slice(5, 7))}`;
  const melhor = dias.reduce((a, d) => (contagem.get(d) || 0) > (contagem.get(a) || 0) ? d : a, dias[0]);
  const nm = contagem.get(melhor) || 0;
  el('diasSub').textContent = `Melhor dia: ${fmt(melhor)}, com ${nm} ${nm === 1 ? 'inscrição' : 'inscrições'}`;
  el('dias').innerHTML = `<div class="dias-grade" style="--n:${dias.length}">` + dias.map((d, i) => {
    const n = contagem.get(d) || 0;
    const mostrarData = dias.length <= 14 || i % Math.ceil(dias.length / 10) === 0 || i === dias.length - 1;
    return `<div class="dia" title="${fmt(d)}: ${n} ${n === 1 ? 'inscrição' : 'inscrições'}">
      <span class="dia-n">${n || ''}</span>
      <span class="dia-barra" style="height:${n ? Math.max(4, n / max * 100) : 0}%"></span>
      <span class="dia-d">${mostrarData ? fmt(d) : ''}</span>
    </div>`;
  }).join('') + '</div>';
}

function renderRelatorio(ativos, pagos, pendentes) {
  const n = ativos.length;
  if (!n) { el('relatorio').innerHTML = '<p>Ainda não há inscrições. Partilha o link <b>ecoaisolutions-mezt.onrender.com/inscricao.html</b> no WhatsApp e no Facebook.</p>'; return; }
  const top = campo => contar(ativos, campo)[0] || ['—', 0];
  const loc = top('localidade'), orig = top('origem'), hor = top('horario'), ocup = top('ocupacao');
  const tel = ativos.filter(r => r.equipamento === 'Só telemóvel').length;
  const novatos = ativos.filter(r => r.experiencia === 'Nunca').length;
  const fora = ativos.filter(r => r.localidade === 'Outra província').length;
  const frases = [
    `Há <b>${n} ${n === 1 ? 'inscrito' : 'inscritos'}</b> para ${META} vagas (${pct(n, META)}% da meta). ${pagos.length} já ${pagos.length === 1 ? 'pagou' : 'pagaram'}, o que dá <b>${mt(pagos.length * PRECO)}</b> confirmados.`,
    pendentes.length ? `<b>${pendentes.length}</b> ${pendentes.length === 1 ? 'pessoa ainda não pagou' : 'pessoas ainda não pagaram'}. Usa o botão de WhatsApp na lista para as contactar.` : 'Não há pagamentos pendentes.',
    `A maior parte vem de <b>${esc(loc[0])}</b> (${pct(loc[1], n)}%)${fora ? `, e ${fora} de outras províncias` : ''}. A ocupação mais comum é <b>${esc(ocup[0]).toLowerCase()}</b> (${pct(ocup[1], n)}%).`,
    `${pct(tel, n)}% vão assistir <b>só pelo telemóvel</b> e ${pct(novatos, n)}% <b>nunca programaram</b>: as aulas devem começar devagar e os exercícios devem funcionar no telemóvel.`,
    `O horário mais pedido é <b>${esc(hor[0]).toLowerCase()}</b> (${pct(hor[1], n)}%).`,
    orig[0] !== 'Não indicado' ? `O canal que mais inscrições trouxe foi <b>${esc(orig[0])}</b> (${pct(orig[1], n)}%): vale a pena reforçar a divulgação aí.` : ''
  ].filter(Boolean);
  el('relatorio').innerHTML = '<ul class="relatorio-lista">' + frases.map(f => `<li>${f}</li>`).join('') + '</ul>';
}

/* ---------- lista ---------- */
function renderFiltros() {
  const opcoes = ['Todos', ...ESTADOS];
  el('filtroEstado').innerHTML = opcoes.map(o => {
    const n = o === 'Todos' ? linhas.length : linhas.filter(r => r.estado === o).length;
    return `<button type="button" class="chip-f${o === filtro ? ' ativo' : ''}" data-f="${o}" aria-pressed="${o === filtro}">${o} <span>${n}</span></button>`;
  }).join('');
}
el('filtroEstado').addEventListener('click', e => {
  const b = e.target.closest('[data-f]');
  if (!b) return;
  filtro = b.dataset.f; renderFiltros(); renderTabela();
});
el('busca').addEventListener('input', renderTabela);

function msgWhats(r) {
  const nome = (r.nome || '').split(' ')[0];
  if (r.estado === 'Pendente') return `Olá ${nome}! 😊

Aqui é o Jean, da ECOAI SOLUTIONS. Recebemos a tua inscrição no curso Introdução à Programação com C++ e ficamos mesmo contentes por quereres aprender connosco! 💻

O curso começa na segunda-feira, 2 de Novembro. Vamos do zero, passo a passo, e no fim vais ter o teu primeiro projecto e o certificado.

Para garantir a tua vaga, falta só o pagamento da inscrição (${PRECO} MT). Podes pagar por:
📱 M-Pesa: 84 381 3137 (Jean Marie John)
📱 e-Mola: 86 249 7846 (Jean Marie John)
🏦 Banco (BCI, FNB ou Millennium bim): todas as contas estão aqui 👉 https://ecoaisolutions-mezt.onrender.com/inscricao.html#pagamento

Depois é só mandares o comprovativo nesta conversa e eu junto-te ao grupo da turma. 🙌

Se tiveres alguma dúvida, ou se precisares de mais tempo para pagar, diz-me à vontade. Estou aqui para ajudar!`;
  if (r.estado === 'Pago') return `Olá ${nome}, confirmamos o teu pagamento de ${PRECO} MT. Obrigado! Antes de 2 de Novembro enviamos-te o link das aulas e o horário.`;
  return `Olá ${nome}, daqui fala a ECOAI SOLUTIONS.`;
}
/* abrir no WhatsApp Web (ex.: conta Business ligada no navegador) ou na aplicação */
let usarWeb = false;
try { usarWeb = localStorage.getItem('ecoai-wa-web') === '1'; } catch (_) {}
const linkWa = (num, txt) => usarWeb
  ? `https://web.whatsapp.com/send?phone=${num}&text=${encodeURIComponent(txt)}`
  : `https://wa.me/${num}?text=${encodeURIComponent(txt)}`;
el('optWeb').checked = usarWeb;
el('optWeb').addEventListener('change', e => {
  usarWeb = e.target.checked;
  try { localStorage.setItem('ecoai-wa-web', usarWeb ? '1' : '0'); } catch (_) {}
  renderTabela();
  toast(usarWeb ? 'As mensagens abrem no WhatsApp Web' : 'As mensagens abrem na aplicação');
});

function waNum(t) {
  // usa só o primeiro número quando a pessoa escreve dois (ex.: "871425704/879079814")
  const primeiro = String(t || '').split(/[\/,;|]|\sou\s/i)[0];
  let d = primeiro.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 9) d = '258' + d;
  return d.length === 12 && d.startsWith('258') ? d : '';
}

function renderTabela() {
  const q = el('busca').value.trim().toLowerCase();
  const lista = linhas
    .filter(r => filtro === 'Todos' || r.estado === filtro)
    .filter(r => !q || [r.nome, r.telefone, r.localidade, r.email].join(' ').toLowerCase().includes(q))
    .sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  el('vazio').hidden = lista.length > 0;
  el('linhas').innerHTML = lista.map(r => {
    const d = r.data ? new Date(r.data) : null;
    const data = d && !isNaN(d) ? d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : '';
    const num = waNum(r.telefone);
    return `<tr>
      <td class="t-data">${esc(data)}</td>
      <td><b>${esc(r.nome)}</b>${r.email ? `<br><small>${esc(r.email)}</small>` : ''}</td>
      <td class="t-tel">${esc(r.telefone)}${num ? `<br><a class="wa-mini" href="${linkWa(num, msgWhats(r))}" target="${usarWeb ? 'ecoai-whatsapp' : '_blank'}" rel="noopener">Mensagem</a>` : ''}</td>
      <td>${esc(r.localidade)}</td>
      <td>${esc(r.ocupacao)}</td>
      <td>${esc(r.equipamento)}</td>
      <td>${esc(r.horario)}</td>
      <td><select class="estado estado-${ESTADOS.indexOf(r.estado)}" data-linha="${r.linha}" aria-label="Estado de ${esc(r.nome)}">
        ${ESTADOS.map(s => `<option${s === r.estado ? ' selected' : ''}>${s}</option>`).join('')}
      </select></td>
    </tr>`;
  }).join('');
}

el('linhas').addEventListener('change', async e => {
  const s = e.target.closest('select.estado');
  if (!s) return;
  const r = linhas.find(x => String(x.linha) === s.dataset.linha);
  if (!r) return;
  r.estado = s.value;
  render();
  if (demo) { toast('Exemplo: o estado não foi gravado'); return; }
  try {
    await fetch(CONFIG.sheetUrl, {
      method: 'POST', mode: 'no-cors',
      body: new URLSearchParams({ acao: 'estado', chave, linha: r.linha, estado: r.estado })
    });
    toast(`${r.nome.split(' ')[0]}: ${r.estado}`);
  } catch (_) {
    toast('Não foi possível gravar. Verifica a internet.');
  }
});

/* ---------- exportar ---------- */
el('btnCsv').addEventListener('click', () => {
  const cols = ['data', 'nome', 'telefone', 'email', 'idade', 'localidade', 'ocupacao', 'escolaridade', 'experiencia', 'equipamento', 'horario', 'origem', 'observacoes', 'pagina', 'estado', 'notas'];
  const cel = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = '﻿' + [cols.join(';'), ...linhas.map(r => cols.map(c => cel(r[c])).join(';'))].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `inscricoes-ecoai-${new Date().toISOString().slice(0, 10)}.csv` });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

/* ---------- aviso curto ---------- */
let toastT;
function toast(t) {
  const b = el('toast');
  b.textContent = t; b.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { b.hidden = true; }, 2600);
}

/* ---------- dados de exemplo (só para ver o painel antes de haver inscrições) ---------- */
function exemplo() {
  const nomes = ['Amina Cossa', 'Hélder Machava', 'Luísa Mondlane', 'Carlos Nhantumbo', 'Fátima Sitoe', 'Jorge Muianga', 'Rosa Chilaule', 'Ernesto Bila', 'Sónia Mabunda', 'Tomás Langa', 'Lurdes Macuácua', 'Paulo Zandamela', 'Inês Mucavele', 'Abel Tembe'];
  const loc = ['Morrumbene', 'Maxixe', 'Maxixe', 'Cidade de Inhambane', 'Morrumbene', 'Massinga', 'Outra província', 'Maxixe', 'Morrumbene', 'Homoíne', 'Cidade de Inhambane', 'Maxixe', 'Morrumbene', 'Outra província'];
  const ocup = ['Estudante universitário', 'Estudante do secundário', 'Professor(a)', 'À procura de emprego', 'Estudante universitário', 'Estudante do secundário', 'Trabalhador(a)', 'Estudante universitário', 'À procura de emprego', 'Estudante do secundário', 'Professor(a)', 'Estudante universitário', 'Estudante do secundário', 'Trabalhador(a)'];
  const eq = ['Só telemóvel', 'Só telemóvel', 'Computador', 'Só telemóvel', 'Computador', 'Só telemóvel', 'Computador', 'Só telemóvel', 'Só telemóvel', 'Só telemóvel', 'Computador', 'Ainda não sei', 'Só telemóvel', 'Computador'];
  const hor = ['Dias úteis, noite (19h–21h)', 'Dias úteis, fim da tarde (17h–19h)', 'Dias úteis, noite (19h–21h)', 'Sábado de manhã', 'Dias úteis, noite (19h–21h)', 'Tanto faz', 'Dias úteis, noite (19h–21h)', 'Sábado de manhã', 'Dias úteis, fim da tarde (17h–19h)', 'Dias úteis, noite (19h–21h)', 'Sábado de manhã', 'Dias úteis, noite (19h–21h)', 'Tanto faz', 'Dias úteis, noite (19h–21h)'];
  const orig = ['WhatsApp', 'WhatsApp', 'Escola ou universidade', 'Facebook', 'WhatsApp', 'Amigo ou familiar', 'Facebook', 'Escola ou universidade', 'WhatsApp', 'Amigo ou familiar', 'WhatsApp', 'Escola ou universidade', 'WhatsApp', 'Facebook'];
  const exp = ['Nunca', 'Nunca', 'Um pouco', 'Nunca', 'Um pouco', 'Nunca', 'Sim', 'Nunca', 'Nunca', 'Nunca', 'Um pouco', 'Nunca', 'Nunca', 'Um pouco'];
  const idades = [21, 17, 34, 24, 20, 16, 29, 22, 26, 15, 41, 19, 18, 31];
  const est = ['Pago', 'Pendente', 'Link enviado', 'Pendente', 'Pago', 'Pendente', 'Pago', 'Pago', 'Pendente', 'Pendente', 'Pago', 'Desistiu', 'Pendente', 'Pago'];
  const hoje = Date.now();
  return nomes.map((nome, i) => ({
    linha: i + 2,
    data: new Date(hoje - (13 - Math.floor(i * 0.9)) * 864e5 + i * 3.6e6).toISOString(),
    nome, telefone: '84 000 00' + String(10 + i), email: '', idade: String(idades[i]),
    localidade: loc[i], ocupacao: ocup[i], escolaridade: i % 3 ? '11.ª ou 12.ª classe' : 'Ensino superior (a frequentar)',
    experiencia: exp[i], equipamento: eq[i], horario: hor[i], origem: orig[i],
    observacoes: '', pagina: i % 2 ? 'Página de inscrição' : 'Site principal', estado: est[i], notas: ''
  }));
}

/* ---------- arranque ---------- */
const guardada = lerGuardada();
if (guardada && CONFIG.sheetUrl) { el('p-chave').value = guardada; entrar(guardada); }
