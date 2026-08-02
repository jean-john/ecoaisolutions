# ECOAI SOLUTIONS, SU, SA — Website

Site institucional estático (HTML/CSS/JS puro — sem dependências, sem build).
Conteúdo baseado no contrato de sociedade (NUEL 105039425, Conservatória de Maxixe).

## Estrutura
```
ecoai-site/
├── index.html
├── styles.css
├── script.js
└── README.md
```

## Testar localmente
Não precisas de instalar nada. Numa pasta com estes ficheiros:
```bash
python3 -m http.server 8000
```
Depois abre http://localhost:8000 no navegador.

---

## Publicar no GitHub (5 min)

1. Cria uma conta em https://github.com (se ainda não tiveres).
2. Clica em **New repository** → nome sugerido: `ecoai-solutions-site` → **Public** → **Create repository**.
3. Na página do repositório vazio, clica em **uploading an existing file** e arrasta os 4 ficheiros (`index.html`, `styles.css`, `script.js`, `README.md`).
4. Clica em **Commit changes**.

Ou, via terminal, se tiveres git instalado:
```bash
cd ecoai-site
git init
git add .
git commit -m "Site inicial ECOAI SOLUTIONS"
git branch -M main
git remote add origin https://github.com/TEU-UTILIZADOR/ecoai-solutions-site.git
git push -u origin main
```

---

## Hospedar no Render (grátis, ~3 min)

1. Cria conta em https://render.com e faz login com o GitHub (mais rápido — autoriza o acesso ao repositório).
2. No dashboard, clica **New +** → **Static Site**.
3. Escolhe o repositório `ecoai-solutions-site`.
4. Configuração:
   - **Build Command**: (deixa vazio)
   - **Publish directory**: `.` (o próprio diretório raiz, já que é HTML puro)
5. Clica **Create Static Site**.

Em 1-2 minutos o Render dá-te um URL público tipo:
`https://ecoai-solutions-site.onrender.com`

Podes depois configurar um domínio próprio (ex: `ecoaisolutions.co.mz`) em
**Settings → Custom Domains**, se a empresa tiver um domínio registado.

---

## Alternativa ainda mais rápida: GitHub Pages
Se quiseres publicar sem sequer sair do GitHub:
1. No repositório → **Settings** → **Pages**.
2. Em **Source**, escolhe branch `main`, pasta `/ (root)`.
3. Guarda. O site fica disponível em `https://TEU-UTILIZADOR.github.io/ecoai-solutions-site/`.

---

## Notas
- O formulário de contacto neste momento abre o cliente de email (`mailto:`)
  do visitante com a mensagem pré-preenchida, porque não está ligado a nenhum
  serviço de backend. Para receber submissões diretamente (sem abrir o email
  do visitante), pode integrar-se com Formspree, Getform ou um pequeno backend
  — digam se querem que eu prepare isso.
- O email de contacto usado (`geral@ecoaisolutions.co.mz`) é um placeholder —
  substituir por um email real da empresa em `script.js`.
