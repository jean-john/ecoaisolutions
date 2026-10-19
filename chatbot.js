// ============================================================
// ECOAI SOLUTIONS — assistente do site
// Responde às perguntas mais comuns sobre o curso e a empresa.
// Para mudar ou acrescentar respostas, edite a lista RESPOSTAS.
// ============================================================
(function () {
  const WA = (typeof CONFIG !== 'undefined' && CONFIG.whatsapp) ? CONFIG.whatsapp.replace(/\D/g, '') : '258843813137';
  const waLink = t => `https://wa.me/${WA}?text=${encodeURIComponent(t)}`;
  const naPaginaInscricao = /inscricao\.html$/.test(location.pathname);
  const LINK_INSC = naPaginaInscricao ? '#inscricao' : 'inscricao.html';
  const LINK_PAG = '#pagamento';

  // Cada resposta: palavras-chave (sem acentos) e o texto.
  // Botões: [texto, endereço]. Endereços "wa:" abrem o WhatsApp com essa mensagem.
  const RESPOSTAS = [
    { id: 'ola', chaves: ['ola', 'bom dia', 'boa tarde', 'boa noite', 'oi', 'saudacoes', 'hello', 'hi'],
      texto: 'Olá! 👋 Sou o assistente da ECOAI SOLUTIONS. Posso ajudar com o curso de C++, inscrições e pagamentos. O que queres saber?',
      sugestoes: true },
    { id: 'curso', chaves: ['curso', 'programa', 'conteudo', 'aprender', 'aulas', 'materia', 'temas', 'semana', 'o que vou'],
      texto: 'O curso <b>Introdução à Programação com C++</b> dura 4 semanas:<br>1) Primeiro programa, variáveis e operações<br>2) Decisões: if, else, switch<br>3) Repetições e funções<br>4) Vectores e projecto final (um mini-sistema de stock)',
      botoes: [['Inscrever-me', LINK_INSC]] },
    { id: 'inicio', chaves: ['quando', 'comeca', 'inicio', 'data', 'dia', 'arranca', 'primeira aula', 'novembro'],
      texto: 'A primeira aula é na <b>segunda-feira, 2 de Novembro de 2026</b>. O curso dura 1 mês (4 semanas).' },
    { id: 'duracao', chaves: ['quanto tempo', 'duracao', 'dura', 'semanas', 'meses', 'termina', 'acaba'],
      texto: 'O curso dura <b>1 mês</b> (4 semanas), de 2 a 29 de Novembro.' },
    { id: 'preco', chaves: ['preco', 'custa', 'custo', 'gratis', 'gratuito', 'barato', 'valor', 'quanto', 'pagar quanto', 'mt', 'meticais', 'caro', 'propina'],
      texto: 'A inscrição custa <b>600 MT</b>, pagamento único. Podes pagar por M-Pesa, e-Mola ou banco (BCI, FNB, Millennium bim).',
      botoes: [['Ver formas de pagamento', LINK_PAG]] },
    { id: 'pagamento', chaves: ['pagar', 'pago', 'pagas', 'paga', 'pagamento', 'pagamentos', 'forma de pagar', 'carteira', 'mpesa', 'm-pesa', 'emola', 'e-mola', 'banco', 'nib', 'conta', 'transferencia', 'deposito', 'bci', 'fnb', 'bim', 'millennium'],
      texto: 'Podes pagar de 3 formas:<br>📱 <b>M-Pesa:</b> 84 381 3137 (Jean Marie John)<br>📱 <b>e-Mola:</b> 86 249 7846 (Jean Marie John)<br>🏦 <b>Banco:</b> BCI, FNB ou Millennium bim<br>Os números de conta e NIB estão na secção de pagamento.',
      botoes: [['Ver contas e NIB', LINK_PAG]] },
    { id: 'comprovativo', chaves: ['comprovativo', 'ja paguei', 'paguei', 'recibo', 'confirmar pagamento', 'enviei'],
      texto: 'Depois de pagar, envia a foto ou o PDF do comprovativo por WhatsApp, com o teu nome completo. Depois confirmamos a tua vaga.',
      botoes: [['Enviar comprovativo', 'wa:Olá ECOAI SOLUTIONS, envio o comprovativo de pagamento da inscrição no curso de C++. O meu nome completo é: ']] },
    { id: 'inscricao', chaves: ['inscrever', 'inscreve', 'inscricao', 'inscricoes', 'inscrevo-me', 'candidatar', 'inscrevo', 'registar', 'registo', 'ficha', 'matricula', 'como entro', 'participar', 'quero entrar'],
      texto: 'Inscrever-te leva 2 minutos:<br>1) Preenche a ficha de inscrição<br>2) Paga os 600 MT<br>3) Envia o comprovativo por WhatsApp<br>Recebes o link das aulas antes de 2 de Novembro.',
      botoes: [['Abrir ficha de inscrição', LINK_INSC]] },
    { id: 'requisitos', chaves: ['computador', 'portatil', 'laptop', 'telemovel', 'celular', 'internet', 'preciso', 'requisito', 'saber programar', 'nunca programei', 'experiencia', 'iniciante', 'zero'],
      texto: 'Não precisas de saber programar: começamos do zero. 💡<br>Basta um <b>telemóvel ou computador com internet</b>. Os exercícios correm num compilador online que funciona no navegador do telemóvel.' },
    { id: 'horario', chaves: ['horario', 'hora', 'que horas', 'noite', 'manha', 'tarde', 'sabado', 'fim de semana'],
      texto: 'O horário é combinado com a turma. Na ficha de inscrição escolhes o que te dá mais jeito (fim da tarde, noite ou sábado de manhã) e ficamos com o que serve a mais pessoas.' },
    { id: 'online', chaves: ['online', 'presencial', 'onde', 'local', 'sala', 'morrumbene', 'maxixe', 'inhambane', 'maputo', 'provincia', 'zoom', 'meet', 'link'],
      texto: 'As aulas são <b>online e ao vivo</b>, por isso podes participar de qualquer parte de Moçambique. O link das aulas chega por WhatsApp antes da primeira aula.' },
    { id: 'certificado', chaves: ['certificado', 'diploma', 'declaracao', 'certificacao'],
      texto: 'Sim! 🎓 No fim do curso recebes o <b>certificado da ECOAI SOLUTIONS</b> e ficas com o teu projecto final para mostrar.' },
    { id: 'comunidade', chaves: ['comunidade', 'parceiro', 'parceiros', 'depois do curso', 'emprego', 'trabalho', 'estagio', 'indabax', 'hack4dev'],
      texto: 'Depois do curso, ligamos-te a <b>comunidades de programação</b> através dos nossos parceiros, para continuares a aprender e a conhecer outras pessoas da área.' },
    { id: 'vagas', chaves: ['vagas', 'lugares', 'limite', 'quantas pessoas', 'esgotado', 'ainda ha'],
      texto: 'A turma tem <b>40 vagas</b>. A vaga fica garantida quando recebemos o comprovativo de pagamento.',
      botoes: [['Garantir a minha vaga', LINK_INSC]] },
    { id: 'idade', chaves: ['idade', 'anos', 'menor', 'crianca', 'adolescente', 'velho', 'adulto'],
      texto: 'O curso é para quem tem <b>14 anos ou mais</b>: estudantes, professores, jovens à procura de emprego e qualquer pessoa curiosa.' },
    { id: 'cpp', chaves: ['c++', 'cpp', 'porque c', 'linguagem', 'python', 'java', 'html'],
      texto: 'C++ é uma das linguagens mais usadas no mundo: em jogos, aplicações, sistemas e engenharia. Aprender com C++ dá-te bases sólidas que depois servem para qualquer outra linguagem.' },
    { id: 'servicos', chaves: ['servico', 'servicos', 'site', 'website', 'manutencao', 'rede', 'redes', 'empresa', 'orcamento', 'software', 'sistema', 'formacao para'],
      texto: 'Além dos cursos, a ECOAI SOLUTIONS faz <b>sites</b>, <b>manutenção de computadores e redes</b>, <b>software à medida</b> e <b>formação para equipas</b>. Pede-nos um orçamento.',
      botoes: [['Pedir orçamento', 'wa:Olá ECOAI SOLUTIONS, gostaria de pedir um orçamento para: ']] },
    { id: 'empresa', chaves: ['ecoai', 'quem sao', 'sobre vos', 'sobre a empresa', 'quem e'],
      texto: 'A <b>ECOAI SOLUTIONS</b> é uma empresa moçambicana de tecnologia, com base em Morrumbene, Inhambane. Formamos pessoas e criamos soluções digitais para escolas, negócios e instituições.' },
    { id: 'contacto', chaves: ['contacto', 'contato', 'falar', 'pessoa', 'humano', 'whatsapp', 'telefone', 'numero', 'email', 'ligar', 'atendente'],
      texto: 'Claro! Podes falar connosco directamente:<br>💬 WhatsApp: <b>84 381 3137</b><br>✉️ ecoaisolutionssusa@gmail.com',
      botoes: [['Abrir WhatsApp', 'wa:Olá ECOAI SOLUTIONS, tenho uma dúvida: ']] },
    { id: 'obrigado', chaves: ['obrigado', 'obrigada', 'valeu', 'agradeco', 'thanks', 'ok', 'fixe', 'perfeito'],
      texto: 'De nada! 😊 Se tiveres mais alguma dúvida, estou aqui.' }
  ];

  const NAO_SEI = {
    texto: 'Ainda não sei responder a isso. 🙏 Fala connosco no WhatsApp e respondemos-te o mais rápido possível.',
    botoes: [['Perguntar no WhatsApp', 'wa:Olá ECOAI SOLUTIONS, tenho uma dúvida: ']]
  };

  const SUGESTOES = ['Quando começa?', 'Quanto custa?', 'Como pago?', 'Como me inscrevo?', 'Preciso de computador?', 'Falar com uma pessoa'];

  const norm = s => ' ' + s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9+\- ]/g, ' ').replace(/\s+/g, ' ') + ' ';

  function procurar(pergunta) {
    const q = norm(pergunta);
    let melhor = null, pontos = 0;
    for (const r of RESPOSTAS) {
      let p = 0;
      for (const c of r.chaves) {
        const k = norm(c).trim();
        const hit = k.includes(' ') ? q.includes(' ' + k + ' ') || q.includes(' ' + k)
          : k.length <= 3 ? q.includes(' ' + k + ' ') : q.includes(' ' + k);
        if (hit) p += k.length > 4 ? 2 : 1;
      }
      if (r.id === 'ola' && p && q.trim().split(' ').length > 3) p = 0.5; // "olá, quanto custa?" → responde ao preço
      if (p > pontos) { pontos = p; melhor = r; }
    }
    return melhor || NAO_SEI;
  }

  /* ---------- interface ---------- */
  const el = (tag, attrs = {}, html) => {
    const e = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    if (html !== undefined) e.innerHTML = html;
    return e;
  };

  const botao = el('button', { type: 'button', class: 'chat-lancar', id: 'chatLancar', 'aria-expanded': 'false', 'aria-controls': 'chatJanela' },
    '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12Z"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01"/></svg><span>Dúvidas?</span>');

  const janela = el('section', { class: 'chat-janela', id: 'chatJanela', role: 'dialog', 'aria-label': 'Assistente ECOAI SOLUTIONS', hidden: '' });
  janela.innerHTML = `
    <header class="chat-topo">
      <img src="logo-ecoai.svg" alt="" width="34" height="34">
      <div><b>Assistente ECOAI</b><span>Responde na hora</span></div>
      <button type="button" class="chat-fechar" aria-label="Fechar o assistente">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
      </button>
    </header>
    <div class="chat-msgs" role="log" aria-live="polite"></div>
    <div class="chat-sug" aria-label="Perguntas frequentes"></div>
    <form class="chat-form">
      <label for="chatTexto" class="sr-only">Escreve a tua pergunta</label>
      <input id="chatTexto" type="text" autocomplete="off" placeholder="Escreve a tua pergunta…" maxlength="300">
      <button type="submit" aria-label="Enviar">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </button>
    </form>`;

  document.body.append(botao, janela);
  document.body.classList.add('tem-chat');

  const msgs = janela.querySelector('.chat-msgs');
  const sug = janela.querySelector('.chat-sug');
  const form = janela.querySelector('.chat-form');
  const input = janela.querySelector('#chatTexto');
  let iniciado = false;

  function mostrarSugestoes() {
    sug.innerHTML = '';
    SUGESTOES.forEach(s => {
      const b = el('button', { type: 'button', class: 'chat-chip' });
      b.textContent = s;
      b.addEventListener('click', () => perguntar(s));
      sug.appendChild(b);
    });
  }

  function msgBot(r) {
    const m = el('div', { class: 'chat-msg bot' });
    m.appendChild(el('div', { class: 'chat-bolha' }, r.texto));
    if (r.botoes) {
      const acoes = el('div', { class: 'chat-acoes' });
      r.botoes.forEach(([t, href]) => {
        const wa = href.startsWith('wa:');
        const a = el('a', { class: 'chat-acao' + (wa ? ' wa' : ''), href: wa ? waLink(href.slice(3)) : href });
        if (wa) { a.target = '_blank'; a.rel = 'noopener'; }
        a.textContent = t;
        if (!wa) a.addEventListener('click', () => { if (innerWidth < 640) fechar(); });
        acoes.appendChild(a);
      });
      m.appendChild(acoes);
    }
    msgs.appendChild(m);
    msgs.scrollTop = msgs.scrollHeight;
    if (r.sugestoes) mostrarSugestoes();
  }

  function msgUser(t) {
    const m = el('div', { class: 'chat-msg eu' });
    const b = el('div', { class: 'chat-bolha' });
    b.textContent = t;
    m.appendChild(b);
    msgs.appendChild(m);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function perguntar(t) {
    t = t.trim();
    if (!t) return;
    msgUser(t);
    const escrever = el('div', { class: 'chat-msg bot escrever' }, '<div class="chat-bolha"><span></span><span></span><span></span></div>');
    msgs.appendChild(escrever);
    msgs.scrollTop = msgs.scrollHeight;
    setTimeout(() => { escrever.remove(); msgBot(procurar(t)); }, 450);
  }

  function abrir() {
    janela.hidden = false;
    botao.setAttribute('aria-expanded', 'true');
    document.body.classList.add('chat-aberto');
    if (!iniciado) {
      iniciado = true;
      msgBot({ texto: 'Olá! 👋 Sou o assistente da ECOAI SOLUTIONS. Escolhe uma pergunta ou escreve a tua.', sugestoes: true });
    }
    setTimeout(() => input.focus(), 50);
  }
  function fechar() {
    janela.hidden = true;
    botao.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('chat-aberto');
    botao.focus();
  }

  botao.addEventListener('click', () => (janela.hidden ? abrir() : fechar()));
  janela.querySelector('.chat-fechar').addEventListener('click', fechar);
  janela.addEventListener('keydown', e => { if (e.key === 'Escape') fechar(); });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const t = input.value;
    input.value = '';
    perguntar(t);
  });
})();
