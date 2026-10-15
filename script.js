// ============================================================
// ECOAI SOLUTIONS — configuração e interactividade
// ============================================================

/* ---------- CONFIGURAÇÃO: altere só aqui ----------
   whatsapp:    número com indicativo, só dígitos. Ex.: '258841234567'
   email:       email real da empresa
   formspreeId: código do formulário em formspree.io (ex.: 'xyzabcd').
                Enquanto estiver vazio, as inscrições seguem por WhatsApp. */
const CONFIG = {
  whatsapp: '',
  email: '',
  formspreeId: ''
};
// ---------------------------------------------------

const $ = (sel, root = document) => root.querySelector(sel);

$('#year').textContent = new Date().getFullYear();

/* ---------- menu no telemóvel ---------- */
const navToggle = $('#navToggle');
navToggle.addEventListener('click', () => {
  const open = document.body.classList.toggle('nav-open');
  navToggle.setAttribute('aria-expanded', String(open));
  navToggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
});
document.querySelectorAll('#nav a').forEach(a => a.addEventListener('click', () => {
  document.body.classList.remove('nav-open');
  navToggle.setAttribute('aria-expanded', 'false');
  navToggle.setAttribute('aria-label', 'Abrir menu');
}));

/* ---------- objecto social (Boletim da República n.º 55, III Série) ---------- */
const ramos = [
  'Tecnologia e inovação',
  'Redes e infra-estrutura tecnológica',
  'Desenvolvimento, comercialização e manutenção de software e aplicações',
  'Inteligência artificial e ciência de dados',
  'Segurança de dados e cibersegurança',
  'Sustentabilidade ambiental e tecnologias verdes',
  'Educação e capacitação tecnológica',
  'Consultoria em tecnologia da informação e comunicação',
  'Pesquisa e desenvolvimento em tecnologias avançadas',
  'Soluções de energia renovável e eficiência energética',
  'Automação e internet das coisas',
  'Gestão e análise de dados',
  'Tecnologias para agricultura de precisão e agro-indústria',
  'Realidade virtual, realidade aumentada e tecnologias imersivas',
  'Organização, promoção e apoio a eventos tecnológicos',
  'Parcerias e acolhimento de programas e iniciativas tecnológicas'
];
const lista = $('#ramosLista');
ramos.forEach(r => { const li = document.createElement('li'); li.textContent = r; lista.appendChild(li); });

/* ---------- contactos ---------- */
const waDigits = CONFIG.whatsapp.replace(/\D/g, '');
const waUrl = text => `https://wa.me/${waDigits}?text=${encodeURIComponent(text)}`;
function formatPhone(d) {
  // 258841234567 -> +258 84 123 4567
  return d.startsWith('258') && d.length === 12
    ? `+258 ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8)}`
    : `+${d}`;
}
if (waDigits) {
  const a = $('#waLink');
  a.href = waUrl('Olá ECOAI SOLUTIONS, gostaria de mais informações.');
  a.textContent = formatPhone(waDigits);
  $('[data-canal="whatsapp"]').hidden = false;
}
if (CONFIG.email) {
  const a = $('#emailLink');
  a.href = `mailto:${CONFIG.email}`;
  a.textContent = CONFIG.email;
  $('[data-canal="email"]').hidden = false;
}

/* ---------- validação ---------- */
function validate(form) {
  let first = null;
  form.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
  const seenRadio = new Set();
  form.querySelectorAll('[required]').forEach(el => {
    let bad = false;
    let mark = el;
    if (el.type === 'radio') {
      if (seenRadio.has(el.name)) return;
      seenRadio.add(el.name);
      bad = !form.querySelector(`input[name="${el.name}"]:checked`);
      mark = el.closest('fieldset');
    } else if (el.type === 'checkbox') {
      bad = !el.checked;
      mark = el.closest('label');
    } else if (el.type === 'tel') {
      bad = el.value.replace(/\D/g, '').length < 9;
    } else {
      bad = !el.value.trim() || !el.checkValidity();
    }
    if (bad) {
      mark.classList.add('invalid');
      if (!first) first = el;
    }
  });
  const emailEl = form.querySelector('input[type="email"]');
  if (emailEl && emailEl.value && !emailEl.checkValidity()) {
    emailEl.classList.add('invalid');
    if (!first) first = emailEl;
  }
  return first;
}

function summary(form, title) {
  const labels = {
    nome: 'Nome', telefone: 'Telefone', email: 'Email', idade: 'Idade',
    localidade: 'Localidade', ocupacao: 'Ocupação', escolaridade: 'Escolaridade',
    experiencia: 'Já programou', equipamento: 'Vai praticar com', horario: 'Horário',
    origem: 'Soube por', observacoes: 'Observações', contacto: 'Contacto', mensagem: 'Mensagem'
  };
  const lines = [title];
  new FormData(form).forEach((v, k) => {
    if (labels[k] && String(v).trim()) lines.push(`${labels[k]}: ${v}`);
  });
  return lines.join('\n');
}

/* ---------- envio (Formspree, ou WhatsApp como alternativa) ---------- */
function setupForm({ form, btn, err, done, doneMsg, doneWa, waTitle, okText }) {
  form.addEventListener('submit', async e => {
    e.preventDefault();
    err.hidden = true;
    const first = validate(form);
    if (first) {
      err.textContent = 'Falta preencher os campos assinalados a vermelho.';
      err.hidden = false;
      first.focus();
      return;
    }
    const text = summary(form, waTitle);

    if (CONFIG.formspreeId) {
      btn.disabled = true;
      btn.textContent = 'A enviar…';
      try {
        const res = await fetch(`https://formspree.io/f/${CONFIG.formspreeId}`, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: new FormData(form)
        });
        if (!res.ok) throw new Error(String(res.status));
        doneMsg.textContent = okText;
        if (waDigits) { doneWa.href = waUrl(text); doneWa.textContent = 'Enviar também por WhatsApp'; doneWa.hidden = false; }
        finish();
        return;
      } catch (_) {
        btn.disabled = false;
        btn.textContent = 'Tentar de novo';
        if (!waDigits) {
          err.textContent = 'Não foi possível enviar. Verifica a internet e tenta de novo.';
          err.hidden = false;
          return;
        }
      }
    }

    if (waDigits) {
      doneWa.href = waUrl(text);
      doneWa.textContent = 'Abrir WhatsApp e enviar';
      doneWa.hidden = false;
      doneMsg.textContent = 'Falta um passo: abre o WhatsApp com os teus dados já escritos e carrega em Enviar.';
      finish();
      window.open(doneWa.href, '_blank', 'noopener');
      return;
    }

    err.textContent = 'As inscrições online abrem em breve. Volta a tentar dentro de alguns dias.';
    err.hidden = false;

    function finish() {
      [...form.children].forEach(el => { if (el !== done) el.hidden = true; });
      done.hidden = false;
      done.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
  form.addEventListener('input', e => {
    const t = e.target;
    t.classList.remove('invalid');
    t.closest('.invalid')?.classList.remove('invalid');
  });
}

setupForm({
  form: $('#inscricaoForm'),
  btn: $('#inscricaoBtn'),
  err: $('#inscricaoErro'),
  done: $('#inscricaoOk'),
  doneMsg: $('#inscricaoOkMsg'),
  doneWa: $('#inscricaoWa'),
  waTitle: 'Inscrição: Introdução à Programação com C++',
  okText: 'Obrigado. Vamos contactar-te por WhatsApp em até 48 horas para confirmar a vaga.'
});

setupForm({
  form: $('#contactoForm'),
  btn: $('#contactoBtn'),
  err: $('#contactoErro'),
  done: $('#contactoOk'),
  doneMsg: $('#contactoOkMsg'),
  doneWa: $('#contactoWa'),
  waTitle: 'Contacto pelo site ECOAI',
  okText: 'Obrigado. Respondemos em até 48 horas.'
});
