// ============================================================
// ECOAI SOLUTIONS — configuração e interactividade
// ============================================================

/* ---------- CONFIGURAÇÃO: altere só aqui ----------
   whatsapp:    número com indicativo, só dígitos. Ex.: '258841234567'
   email:       email real da empresa
   formspreeId: código do formulário em formspree.io (ex.: 'xyzabcd').
                Enquanto estiver vazio, as inscrições seguem por WhatsApp.
   sheetUrl:    URL da aplicação web do Google Apps Script (termina em /exec).
                Cada inscrição é gravada na folha "ECOAI — Inscrições Curso C++". */
const CONFIG = {
  whatsapp: '258843813137',
  email: 'ecoaisolutionssusa@gmail.com',
  formspreeId: 'mgaorvrw',
  sheetUrl: 'https://script.google.com/macros/s/AKfycbwTapszwOGKqeT4YgurNYaSAvWC5UcnA1ynSF4VgDyM-4J7_ewIhCUFGeDtdS78K47r/exec'
};
// ---------------------------------------------------

const $ = (sel, root = document) => root.querySelector(sel);

const yearEl = $('#year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ---------- menu no telemóvel ---------- */
const navToggle = $('#navToggle');
if (navToggle) {
  const closeNav = () => {
    document.body.classList.remove('nav-open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Abrir menu');
  };
  navToggle.addEventListener('click', () => {
    const open = document.body.classList.toggle('nav-open');
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  });
  document.querySelectorAll('#nav a').forEach(a => a.addEventListener('click', closeNav));
}

/* ---------- contactos (só aparecem se estiverem configurados) ---------- */
const waDigits = CONFIG.whatsapp.replace(/\D/g, '');
const waUrl = text => `https://wa.me/${waDigits}?text=${encodeURIComponent(text)}`;
function formatPhone(d) {
  // 258841234567 -> +258 84 123 4567
  return d.startsWith('258') && d.length === 12
    ? `+258 ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8)}`
    : `+${d}`;
}
function showLink(sel, href, text, wrapSel) {
  const a = $(sel);
  if (!a) return;
  a.href = href;
  if (text) a.textContent = text;
  a.hidden = false;
  if (wrapSel && $(wrapSel)) $(wrapSel).hidden = false;
}
if (waDigits) {
  const geral = waUrl('Olá ECOAI SOLUTIONS, gostaria de mais informações.');
  showLink('#waLink', geral, formatPhone(waDigits), '[data-canal="whatsapp"]');
  showLink('#footWa', geral, 'WhatsApp ' + formatPhone(waDigits));
  showLink('#waFloat', waUrl('Olá ECOAI SOLUTIONS, gostaria de saber mais sobre o curso de C++.'));
}
if (waDigits) {
  showLink('#waComprovativo', waUrl('Olá ECOAI SOLUTIONS, envio o comprovativo de pagamento da inscrição no curso de C++. O meu nome completo é: '));
}
if (CONFIG.email) {
  showLink('#emailLink', `mailto:${CONFIG.email}`, CONFIG.email, '[data-canal="email"]');
  showLink('#footEmail', `mailto:${CONFIG.email}`, CONFIG.email);
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
  if (!form) return;
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

    // grava na base de dados (Google Sheets); a resposta não é legível, por isso não bloqueia
    if (CONFIG.sheetUrl && form.id === 'inscricaoForm') {
      try {
        fetch(CONFIG.sheetUrl, {
          method: 'POST',
          mode: 'no-cors',
          body: new URLSearchParams(new FormData(form))
        }).catch(() => {});
      } catch (_) {}
    }

    if (CONFIG.formspreeId) {
      btn.disabled = true;
      btn.textContent = 'A enviar…';
      try {
        const data = new FormData(form);
        if (data.get('_gotcha')) { finish(); return; } // robô de spam
        const res = await fetch(`https://formspree.io/f/${CONFIG.formspreeId}`, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: data
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
  okText: 'Obrigado. Vamos contactar-te por WhatsApp em até 48 horas. As formas de pagamento estão em "Como pagar a inscrição".'
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

/* ---------- copiar números de conta ---------- */
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-copy]');
  if (!b) return;
  const texto = b.dataset.copy;
  const original = b.textContent;
  try {
    await navigator.clipboard.writeText(texto);
    b.textContent = 'Copiado';
  } catch (_) {
    const v = b.previousElementSibling;
    if (v) { const r = document.createRange(); r.selectNodeContents(v); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); }
    b.textContent = 'Seleccionado';
  }
  setTimeout(() => { b.textContent = original; }, 1800);
});
