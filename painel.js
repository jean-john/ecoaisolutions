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
const COMISSAO = 100;   // MT por indicado que pagou
const SEM_COMISSAO = ['jean marie john'];   // a equipa não recebe comissão
const MARCA_PAGA = /comiss[aã]o paga/i;     // escrito nas notas do indicado quando os 100 MT já foram enviados

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
    (() => { const f = financas(); return ['Receita líquida', mt(f.liquida), `bruta ${mt(f.bruta)} − comissões ${mt(f.comissoes)}`]; })(),
    (() => { const f = financas(); return ['Comissões', mt(f.comissoes), f.porPagar ? `${mt(f.porPagar)} por enviar aos angariadores` : 'todas enviadas ✓']; })(),
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

  renderAngariadores(ativos);
  renderFiltros();
  renderTabela();
  renderEnvios();
}

function indicadoPor(r) {
  const x = String(r.observacoes || '').match(/Indicado por:\s*([^.]+)\./);
  return x ? x[1].trim() : '';
}
/* ---------- angariadores e comissões ---------- */
function grupoAngariadores() {
  const ativos = linhas.filter(r => r.estado !== 'Desistiu');
  const grupos = new Map();
  ativos.forEach(r => {
    const quem = indicadoPor(r);
    if (!quem) return;
    const tel = quem.replace(/\D/g, '').slice(-9);
    const k = tel.length === 9 ? tel : norm(quem.replace(/[\d+]/g, ' '));
    if (!grupos.has(k)) grupos.set(k, { k, quem, lista: [] });
    grupos.get(k).lista.push(r);
  });
  const primeiro = n => (n || '').split(' ')[0];
  return [...grupos.values()].map(g => {
    const nomeQuem = g.quem.replace(/[\d+]/g, ' ').replace(/[-–·,]+\s*$/, '').replace(/\s+/g, ' ').trim() || g.quem;
    const p = norm(nomeQuem).split(' ');
    // o número que a própria pessoa escreveu na inscrição é mais fiável do que o escrito por quem foi indicado
    const inscrito = p.length > 1 && linhas.find(r => { const n = ' ' + norm(r.nome) + ' '; return n.includes(' ' + p[0] + ' ') && n.includes(' ' + p.at(-1) + ' '); });
    const equipa = SEM_COMISSAO.some(x => norm(nomeQuem).includes(x));
    const pagos = g.lista.filter(r => PAGOS.includes(r.estado));
    const jaPagas = pagos.filter(r => MARCA_PAGA.test(r.notas || ''));
    const porPagar = equipa ? [] : pagos.filter(r => !MARCA_PAGA.test(r.notas || ''));
    return {
      ...g, nomeQuem, inscrito, equipa, pagos, jaPagas, porPagar,
      primeiro: primeiro(nomeQuem),
      num: (inscrito && waNum(inscrito.telefone)) || waNum(g.quem),
      tel: (inscrito && inscrito.telefone) || g.quem.replace(/[^\d+]/g, ''),
      devido: equipa ? 0 : pagos.length * COMISSAO
    };
  }).sort((a, b) => b.pagos.length - a.pagos.length || b.lista.length - a.lista.length);
}
function financas() {
  const pagos = linhas.filter(r => r.estado !== 'Desistiu' && PAGOS.includes(r.estado));
  const G = grupoAngariadores();
  const comissoes = G.reduce((t, g) => t + g.devido, 0);
  const porPagar = G.reduce((t, g) => t + g.porPagar.length * COMISSAO, 0);
  const bruta = pagos.length * PRECO;
  return { bruta, comissoes, porPagar, enviadas: comissoes - porPagar, liquida: bruta - comissoes };
}
function renderAngariadores() {
  const G = grupoAngariadores();
  el('blocoAng').hidden = !G.length;
  const f = financas();
  el('angResumo').innerHTML = `Comissões: <b>${mt(f.comissoes)}</b> no total · <b>${mt(f.enviadas)}</b> já enviados · <b>${mt(f.porPagar)}</b> por enviar`;
  el('angLinhas').innerHTML = G.map(g => {
    const estado = g.equipa ? '<small>equipa · sem comissão</small>'
      : g.porPagar.length ? `<button type="button" class="btn btn-primary btn-sm" data-pagar="${esc(g.k)}">Já enviei ${mt(g.porPagar.length * COMISSAO)}</button>`
      : g.pagos.length ? '<span class="ok-pago">Tudo enviado ✓</span>' : '<small>à espera do pagamento</small>';
    return `<tr><td><b>${esc(g.nomeQuem)}</b>${g.tel ? `<br><small>${esc(g.tel)}</small>` : ''}</td><td>${g.lista.length}</td><td>${g.pagos.length}</td>
      <td>${mt(g.devido)}</td><td>${mt(g.jaPagas.length * COMISSAO)}</td><td><b>${mt(g.porPagar.length * COMISSAO)}</b></td>
      <td><small>${g.lista.map(r => esc(r.nome) + (PAGOS.includes(r.estado) ? ' ✓' : '')).join(', ')}</small></td><td>${estado}</td></tr>`;
  }).join('');
}
el('angLinhas').addEventListener('click', async e => {
  const b = e.target.closest('[data-pagar]');
  if (!b) return;
  const g = grupoAngariadores().find(x => x.k === b.dataset.pagar);
  if (!g || !g.porPagar.length) return;
  const valor = g.porPagar.length * COMISSAO;
  if (!confirm(`Confirmas que já enviaste ${mt(valor)} a ${g.nomeQuem}?`)) return;
  const hoje = new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
  const nomes = g.porPagar.map(r => r.nome.split(' ')[0]);
  for (const r of g.porPagar) await gravarNotas(r, `${(r.notas || '').trim()} [comissão paga ${hoje}]`.trim());
  render();
  if (g.num) {
    const msg = `Olá ${g.primeiro}! 😊 A equipa da ECOAI SOLUTIONS acabou de te enviar ${mt(valor)}: a tua comissão por teres trazido ${lista(nomes)} para o curso de C++. Muito obrigado! 🙏\n\nConfirma por favor que recebeste. E lembra-te: cada nova pessoa que trouxeres e que pague são mais ${COMISSAO} MT para ti. 💙`;
    abrirPosAccao(`Comissão de ${g.nomeQuem} marcada como enviada.`, [{ t: `Avisar ${g.primeiro} no WhatsApp`, href: linkWa(g.num, msg) }]);
  } else toast('Comissão marcada como enviada');
});

function barras(titulo, dados, total) {
  const max = Math.max(1, ...dados.map(d => d[1]));
  const linhasHtml = dados.length ? dados.map(([k, n]) => `
    <li title="${esc(k)}: ${n} (${pct(n, total)}%)">
      <span class="b-nome">${esc(k)}</span>
      <span class="b-trilho"><span class="b-barra" style="width:${Math.max(2, n / max * 100)}%"></span></span>
      <span class="b-val">${n}<small> · ${pct(n, total)}%</small></span>
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
    (() => {
      const m = new Map();
      ativos.forEach(r => { const x = String(r.observacoes || '').match(/Indicado por:\s*([^.]+)\./); if (x) { const k = x[1].trim(); m.set(k, (m.get(k) || 0) + 1); } });
      const top = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
      return top.length ? `Quem mais trouxe colegas: ${top.map(([k, v]) => `<b>${esc(k)}</b> (${v})`).join(', ')}. Agradece-lhes! 🙏` : '';
    })(),
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

Daqui fala a equipa da ECOAI SOLUTIONS. Recebemos a tua inscrição no curso Introdução à Programação com C++ e ficamos mesmo contentes por quereres aprender connosco! 💻

O curso começa na segunda-feira, 2 de Novembro. Vamos do zero, passo a passo, e no fim vais ter o teu primeiro projecto e o certificado.

${(() => { const f = diasAte(); return f > 1 ? `Faltam só ${f} dias! ⏳ ` : f === 1 ? 'Já é amanhã! ⏳ ' : ''; })()}Para garantir a tua vaga, falta só o pagamento da inscrição (${PRECO} MT). Podes pagar por:
📱 M-Pesa: 84 381 3137 (Jean Marie John)
📱 e-Mola: 86 249 7846 (Jean Marie John)
🏦 Banco (BCI, FNB ou Millennium bim): todas as contas estão aqui 👉 https://ecoaisolutions-mezt.onrender.com/inscricao.html#pagamento

O grupo da turma já está aberto! Assim que mandares o comprovativo nesta conversa, adicionamos-te logo. 🙌

Se tiveres alguma dúvida, ou se precisares de mais tempo para pagar, diz-nos à vontade. Estamos aqui para ajudar!`;
  if (PAGOS.includes(r.estado)) return msgGrupo(r);
  return `Olá ${nome}, daqui fala a ECOAI SOLUTIONS.`;
}
/* ---------- enviar a todos: contactos (.vcf) + mensagem sem nome ---------- */
const pendentesComNum = () => linhas.filter(r => r.estado === 'Pendente' && waNum(r.telefone));
el('btnVcf').addEventListener('click', () => {
  const lista = pendentesComNum();
  if (!lista.length) { toast('Não há pendentes com número válido'); return; }
  const limpa = s => String(s || '').replace(/[\r\n;,]/g, ' ').trim();
  const vcf = lista.map(r => ['BEGIN:VCARD', 'VERSION:3.0', `FN:${limpa(r.nome)} (C++ ECOAI)`, `N:;${limpa(r.nome)} (C++ ECOAI);;;`, `TEL;TYPE=CELL:+${waNum(r.telefone)}`, 'END:VCARD'].join('\r\n')).join('\r\n');
  const url = URL.createObjectURL(new Blob([vcf], { type: 'text/vcard;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `pendentes-cpp-${chaveDia(new Date())}.vcf` });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(`${lista.length} contactos descarregados`);
});
el('btnCopiarGeral').addEventListener('click', async () => {
  const txt = msgWhats({ nome: '', estado: 'Pendente' }).replace(/^Olá\s*!/, 'Olá!');
  try { await navigator.clipboard.writeText(txt); toast('Mensagem copiada. Cola-a na lista de transmissão.'); }
  catch (_) { prompt('Copia a mensagem:', txt); }
});

function diasAte() { return Math.max(0, Math.ceil((Date.parse(INICIO) - Date.now()) / 864e5)); }
function msgGrupo(r) {
  const nome = (r.nome || '').split(' ')[0];
  const link = linkGrupo();
  return `Olá ${nome}! 🎉

Confirmámos o teu pagamento: estás oficialmente na 1.ª turma de C++ da ECOAI SOLUTIONS! Muito obrigado pela confiança. 💙

${link ? `Entra aqui no grupo da turma 👇\n${link}\n\nÉ lá que vamos partilhar o horário, os materiais e o link da primeira aula, a 2 de Novembro.` : 'Antes de 2 de Novembro adicionamos-te ao grupo da turma, onde vamos partilhar o horário, os materiais e o link da primeira aula.'}

Conheces alguém que também queira aprender? Por cada pessoa que trouxeres e que pague, recebes ${COMISSAO} MT. 😉

Até já! 💻`;
}

/* ---------- enviar mensagens em sequência ---------- */
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
function linkGrupo() { const v = el('linkGrupo').value.trim(); return /^https?:\/\/\S+$/.test(v) ? v : ''; }
try { el('linkGrupo').value = localStorage.getItem('ecoai-grupo') || ''; } catch (_) {}
el('linkGrupo').addEventListener('input', () => {
  try { localStorage.setItem('ecoai-grupo', el('linkGrupo').value.trim()); } catch (_) {}
  renderEnvios(); renderTabela();
});

function lista(nomes) { return nomes.length < 2 ? nomes.join('') : nomes.slice(0, -1).join(', ') + ' e ' + nomes.at(-1); }
function msgAngariador(g) {
  const primeiro = n => (n || '').split(' ')[0];
  return g.pagos.length
    ? `Olá ${g.primeiro}! 😊 A equipa da ECOAI SOLUTIONS quer agradecer-te por teres trazido ${lista(g.lista.map(r => primeiro(r.nome)))} para o curso de C++. ${g.pagos.length === 1 ? `O pagamento de ${primeiro(g.pagos[0].nome)} já foi confirmado` : `${g.pagos.length} já confirmaram o pagamento`}, por isso tens ${mt(g.pagos.length * COMISSAO)} a receber, que te vamos enviar brevemente! 🎉

Conheces mais alguém que queira aprender a programar? Cada pessoa que trouxeres e que pague são mais ${COMISSAO} MT para ti. Obrigado por acreditares em nós! 🙏`
    : `Olá ${g.primeiro}! 😊 Obrigado por teres falado do curso de C++ a ${lista(g.lista.map(r => primeiro(r.nome)))}. Ficámos muito contentes! Assim que ${g.lista.length === 1 ? 'confirmar' : 'confirmarem'} o pagamento, recebes ${COMISSAO} MT por cada pessoa. 🎉

Se puderes dar um toque, ajudas muito. Obrigado! 🙏`;
}
function angariadores() {
  return grupoAngariadores().filter(g => !g.equipa && g.num).map(g => ({
    id: 'ang-' + g.k, nome: g.nomeQuem, tel: g.tel, num: g.num, msg: msgAngariador(g),
    nota: g.porPagar.length ? `${mt(g.porPagar.length * COMISSAO)} por enviar` : g.pagos.length ? 'comissão já enviada' : 'indicados ainda por pagar'
  }));
}

const CAMPANHAS = {
  pendentes: {
    titulo: 'Lembrete a quem ainda não pagou',
    sub: 'Mensagem carinhosa com as formas de pagamento',
    itens: () => linhas.filter(r => r.estado === 'Pendente' && waNum(r.telefone))
      .map(r => ({ id: 'p-' + r.linha, nome: r.nome, tel: r.telefone, num: waNum(r.telefone), msg: msgWhats(r), r }))
  },
  grupo: {
    titulo: 'Link do grupo a quem já pagou',
    sub: 'Depois de abrir, o estado passa a «Link enviado»',
    precisaLink: true,
    itens: () => linhas.filter(r => r.estado === 'Pago' && waNum(r.telefone))
      .map(r => ({ id: 'g-' + r.linha, nome: r.nome, tel: r.telefone, num: waNum(r.telefone), msg: msgGrupo(r), r, depois: 'Link enviado' }))
  },
  angariadores: {
    titulo: 'Agradecer a quem trouxe colegas',
    sub: 'Diz quanto cada um tem a receber',
    itens: angariadores
  }
};

let fila = null; // { camp, itens, i, feitos:Set }
const chaveEnviados = camp => `ecoai-env-${camp}-${chaveDia(new Date())}`;
function lerEnviados(camp) { try { return new Set(JSON.parse(localStorage.getItem(chaveEnviados(camp)) || '[]')); } catch (_) { return new Set(); } }
function gravarEnviados(camp, s) { try { localStorage.setItem(chaveEnviados(camp), JSON.stringify([...s])); } catch (_) {} }

function renderEnvios() {
  if (!el('campanhas')) return;
  el('campanhas').innerHTML = Object.entries(CAMPANHAS).map(([k, c]) => {
    const itens = c.itens();
    const enviados = lerEnviados(k);
    const porEnviar = itens.filter(x => !enviados.has(x.id)).length;
    const semLink = c.precisaLink && !linkGrupo();
    const off = !itens.length || semLink;
    const estado = semLink ? 'Cola primeiro o link do grupo, acima'
      : !itens.length ? 'Ninguém nesta lista agora'
      : porEnviar ? `${porEnviar} por enviar hoje` : 'Todos enviados hoje ✓';
    return `<button type="button" class="campanha${fila && fila.camp === k ? ' ativa' : ''}" data-camp="${k}"${off ? ' disabled' : ''}>
      <span class="c-n">${itens.length}</span>
      <span class="c-txt"><b>${esc(c.titulo)}</b><small>${esc(c.sub)}</small><em>${esc(estado)}</em></span>
    </button>`;
  }).join('');
  renderFila();
}

function renderFila() {
  const box = el('fila');
  if (!fila) { box.hidden = true; box.innerHTML = ''; return; }
  box.hidden = false;
  const c = CAMPANHAS[fila.camp];
  const total = fila.itens.length;
  const x = fila.itens[fila.i];
  const listaHtml = `<ol class="fila-lista">${fila.itens.map((it, j) =>
    `<li class="${fila.feitos.has(it.id) ? 'feito' : ''}${j === fila.i ? ' atual' : ''}"><button type="button" class="link-btn" data-ir="${j}">${esc(it.nome)}</button>${fila.feitos.has(it.id) ? ' <span aria-label="enviado">✓</span>' : ''}</li>`).join('')}</ol>`;
  if (!x) {
    box.innerHTML = `<div class="fila-topo"><b>${esc(c.titulo)}</b><button type="button" class="link-btn" data-fila="fechar">Fechar</button></div>
      <p class="fila-fim">Terminaste a lista: ${fila.feitos.size} de ${total} ${fila.feitos.size === 1 ? 'mensagem aberta' : 'mensagens abertas'}. 🎉</p>${listaHtml}`;
    return;
  }
  const alvo = usarWeb ? 'ecoai-whatsapp' : '_blank';
  box.innerHTML = `<div class="fila-topo"><b>${esc(c.titulo)}</b><span>${fila.i + 1} de ${total}</span><button type="button" class="link-btn" data-fila="fechar">Fechar</button></div>
    <div class="fila-pessoa">
      <p class="fila-nome">${esc(x.nome)}${fila.feitos.has(x.id) ? ' <small>· já aberta</small>' : ''}</p>
      <p class="fila-tel">${esc(x.tel)}${x.nota ? ' · ' + esc(x.nota) : ''}</p>
    </div>
    <details class="fila-ver"><summary>Ver a mensagem</summary><pre>${esc(x.msg)}</pre></details>
    <div class="fila-acoes">
      <a class="btn btn-primary" id="filaAbrir" href="${linkWa(x.num, x.msg)}" target="${alvo}" rel="noopener">Abrir WhatsApp de ${esc(x.nome.split(' ')[0])}</a>
      <button type="button" class="btn btn-ghost btn-sm" data-fila="saltar">Saltar</button>
    </div>
    ${listaHtml}`;
}

el('campanhas').addEventListener('click', e => {
  const b = e.target.closest('[data-camp]');
  if (!b || b.disabled) return;
  const camp = b.dataset.camp;
  const itens = CAMPANHAS[camp].itens();
  const feitos = lerEnviados(camp);
  const i = itens.findIndex(x => !feitos.has(x.id));
  fila = { camp, itens, i: i < 0 ? itens.length : i, feitos };
  renderEnvios();
  el('fila').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

function proximo() {
  let j = fila.i + 1;
  while (j < fila.itens.length && fila.feitos.has(fila.itens[j].id)) j++;
  fila.i = j;
}
el('fila').addEventListener('click', e => {
  if (!fila) return;
  const a = e.target.closest('#filaAbrir');
  if (a) {
    const x = fila.itens[fila.i];
    fila.feitos.add(x.id); gravarEnviados(fila.camp, fila.feitos);
    if (x.depois && x.r && x.r.estado !== x.depois) gravarEstado(x.r, x.depois, true);
    // deixa o navegador abrir o link e só depois avança
    setTimeout(() => { proximo(); renderEnvios(); }, 300);
    return;
  }
  const ir = e.target.closest('[data-ir]');
  if (ir) { fila.i = Number(ir.dataset.ir); renderFila(); return; }
  const f = e.target.closest('[data-fila]');
  if (!f) return;
  if (f.dataset.fila === 'fechar') { fila = null; renderEnvios(); }
  if (f.dataset.fila === 'saltar') { proximo(); renderFila(); }
});
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
  renderTabela(); renderEnvios();
  toast(usarWeb ? 'As mensagens abrem no WhatsApp Web' : 'As mensagens abrem na aplicação');
});

function waNum(t) {
  // usa só o primeiro número quando a pessoa escreve dois (ex.: "871425704/879079814")
  const primeiro = String(t || '').split(/[\/,;|]|\sou\s/i)[0];
  let d = primeiro.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 9) d = '258' + d;
  if (d.length === 12 && d.startsWith('258')) return d;
  // números estrangeiros escritos com indicativo (ex.: +48 793 186 030)
  const internacional = /^\s*(\+|00)/.test(primeiro) && !d.startsWith('258');
  return internacional && d.length >= 10 && d.length <= 15 ? d : '';
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
  const antes = r.estado;
  gravarEstado(r, s.value);
  if (s.value === 'Pago' && antes !== 'Pago') aposPago(r);
});

async function gravarNotas(r, notas) {
  r.notas = notas;
  if (demo) return;
  try {
    await fetch(CONFIG.sheetUrl, { method: 'POST', mode: 'no-cors', body: new URLSearchParams({ acao: 'estado', chave, linha: r.linha, notas }) });
  } catch (_) { toast('Não foi possível gravar. Verifica a internet.'); }
}

/* depois de marcar alguém como Pago: oferecer as mensagens certas, já escritas */
function abrirPosAccao(titulo, botoes) {
  const box = el('posAccao');
  const alvo = usarWeb ? 'ecoai-whatsapp' : '_blank';
  box.innerHTML = `<p><b>${esc(titulo)}</b></p><div class="pos-botoes">${botoes.map(b => `<a class="btn btn-primary btn-sm" href="${b.href}" target="${alvo}" rel="noopener">${esc(b.t)}</a>`).join('')}<button type="button" class="btn btn-ghost btn-sm" data-fechar>Fechar</button></div>`;
  box.hidden = false;
}
el('posAccao').addEventListener('click', e => {
  if (e.target.closest('[data-fechar]')) { el('posAccao').hidden = true; return; }
  if (e.target.closest('a')) setTimeout(() => { el('posAccao').hidden = true; }, 400);
});
function aposPago(r) {
  const botoes = [];
  const num = waNum(r.telefone);
  if (num) botoes.push({ t: `Confirmar a ${r.nome.split(' ')[0]} e enviar o link do grupo`, href: linkWa(num, msgGrupo(r)) });
  const quem = indicadoPor(r);
  if (quem) {
    const g = grupoAngariadores().find(x => x.lista.includes(r));
    if (g && !g.equipa && g.num) botoes.push({ t: `Avisar ${g.primeiro} (angariador) dos ${COMISSAO} MT`, href: linkWa(g.num, msgAngariador(g)) });
  }
  if (botoes.length) abrirPosAccao(`${r.nome.split(' ')[0]} pagou! Envia as mensagens:`, botoes);
}

async function gravarEstado(r, estado, calado) {
  r.estado = estado;
  render();
  if (demo) { if (!calado) toast('Exemplo: o estado não foi gravado'); return; }
  try {
    await fetch(CONFIG.sheetUrl, {
      method: 'POST', mode: 'no-cors',
      body: new URLSearchParams({ acao: 'estado', chave, linha: r.linha, estado })
    });
    if (!calado) toast(`${r.nome.split(' ')[0]}: ${estado}`);
  } catch (_) {
    toast('Não foi possível gravar. Verifica a internet.');
  }
}

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
