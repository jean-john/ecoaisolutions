// ============================================================
// ECOAI SOLUTIONS — interactivity
// ============================================================

document.getElementById('year').textContent = new Date().getFullYear();

/* ---------- Mobile nav ---------- */
const navToggle = document.getElementById('navToggle');
navToggle.addEventListener('click', () => {
  const isOpen = document.body.classList.toggle('nav-open');
  navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
});
document.querySelectorAll('.nav a').forEach(link => {
  link.addEventListener('click', () => document.body.classList.remove('nav-open'));
});

/* ---------- Áreas de actuação (objecto social) ---------- */
const areas = [
  "Tecnologia e Inovação",
  "Redes e Infraestrutura Tecnológica",
  "Desenvolvimento, Comercialização e Manutenção de Software e Aplicações",
  "Inteligência Artificial e Ciência de Dados",
  "Segurança de Dados e Cibersegurança",
  "Sustentabilidade Ambiental e Tecnologias Verdes",
  "Educação e Capacitação Tecnológica",
  "Consultoria em Tecnologia da Informação e Comunicação",
  "Pesquisa e Desenvolvimento em Tecnologias Avançadas",
  "Soluções de Energia Renovável e Eficiência Energética",
  "Automação e Internet das Coisas",
  "Gestão e Análise de Dados",
  "Tecnologias para Agricultura de Precisão e Agroindústria",
  "Realidade Virtual, Aumentada e Tecnologias Imersivas",
  "Organização e Apoio a Eventos Tecnológicos",
  "Parcerias e Acolhimento de Programas Tecnológicos"
];

const grid = document.getElementById('areasGrid');
areas.forEach((name, i) => {
  const card = document.createElement('div');
  card.className = 'area-card';
  card.innerHTML = `
    <span class="area-num">${String(i + 1).padStart(2, '0')}</span>
    <span class="area-name">${name}</span>
  `;
  grid.appendChild(card);
});

/* ---------- Hero canvas: growing circuit-root motif ---------- */
(function heroCanvas() {
  const container = document.getElementById('heroCanvas');
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 1200 800');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  svg.style.width = '100%';
  svg.style.height = '100%';

  // Generate branching root/circuit paths from bottom, ending in leaf nodes
  const branches = [];
  function branch(x, y, angle, len, depth) {
    if (depth > 5 || len < 18) return;
    const rad = (angle * Math.PI) / 180;
    const x2 = x + Math.cos(rad) * len;
    const y2 = y + Math.sin(rad) * len;
    branches.push({ x1: x, y1: y, x2, y2, depth });
    if (Math.random() > 0.15) {
      branch(x2, y2, angle - (14 + Math.random() * 18), len * 0.8, depth + 1);
    }
    if (Math.random() > 0.15) {
      branch(x2, y2, angle + (14 + Math.random() * 18), len * 0.8, depth + 1);
    }
  }

  const startPoints = [140, 420, 700, 980, 1120];
  startPoints.forEach((sx, i) => {
    branch(sx, 800, -90 + (i % 2 === 0 ? -6 : 6), 130 + Math.random() * 40, 0);
  });

  let maxLen = 0;
  branches.forEach(b => {
    const l = Math.hypot(b.x2 - b.x1, b.y2 - b.y1);
    b.length = l;
    maxLen += l;
  });

  let cumulative = 0;
  branches.forEach((b, idx) => {
    const path = document.createElementNS(NS, 'line');
    path.setAttribute('x1', b.x1);
    path.setAttribute('y1', b.y1);
    path.setAttribute('x2', b.x2);
    path.setAttribute('y2', b.y2);
    path.setAttribute('stroke', b.depth > 3 ? '#49C9A6' : '#E0BE63');
    path.setAttribute('stroke-width', Math.max(0.6, 2.6 - b.depth * 0.4));
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('opacity', b.depth > 3 ? '0.55' : '0.8');
    path.style.strokeDasharray = b.length;
    path.style.strokeDashoffset = b.length;
    path.style.transition = `stroke-dashoffset 1.1s ${(cumulative / maxLen) * 1.6}s cubic-bezier(.22,.68,.32,1)`;
    svg.appendChild(path);
    cumulative += b.length;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      path.style.strokeDashoffset = '0';
    }));

    // node dot at terminal branches
    if (b.depth >= 4 || Math.random() > 0.7) {
      const dot = document.createElementNS(NS, 'circle');
      dot.setAttribute('cx', b.x2);
      dot.setAttribute('cy', b.y2);
      dot.setAttribute('r', 2.5);
      dot.setAttribute('fill', '#E0BE63');
      dot.setAttribute('opacity', '0');
      dot.style.transition = `opacity .6s ${(cumulative / maxLen) * 1.6 + 0.4}s`;
      svg.appendChild(dot);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        dot.setAttribute('opacity', '0.9');
      }));
    }
  });

  container.appendChild(svg);
})();

/* ---------- Contact form: mailto fallback ---------- */
const form = document.getElementById('contactForm');
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = new FormData(form);
  const nome = data.get('nome');
  const email = data.get('email');
  const mensagem = data.get('mensagem');
  const subject = encodeURIComponent(`Contacto via site — ${nome}`);
  const body = encodeURIComponent(`Nome: ${nome}\nEmail: ${email}\n\nMensagem:\n${mensagem}`);
  window.location.href = `mailto:geral@ecoaisolutions.co.mz?subject=${subject}&body=${body}`;
});

/* ---------- Reveal-on-scroll for sections ---------- */
const revealables = document.querySelectorAll('.section > .wrap');
const io = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

revealables.forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(24px)';
  el.style.transition = 'opacity .7s cubic-bezier(.22,.68,.32,1), transform .7s cubic-bezier(.22,.68,.32,1)';
  io.observe(el);
});
