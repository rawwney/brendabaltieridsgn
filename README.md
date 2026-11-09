# Brenda Baltieri — portfólio

Site estático publicado no Cloudflare Pages (`brendabaltieridsgn.pages.dev`).

## Como funciona

O site foi gerado originalmente no ChatGPT Sites. Este repositório guarda a
versão compilada e uma camada de ajustes por cima dela:

| Caminho | O que é |
| --- | --- |
| `static/index.html` | HTML pré-renderizado da página |
| `static/_next/` | JS e CSS compilados do site original (minificados) |
| `static/responsive-fixes.css` | Todos os ajustes visuais. **A seção "Interaction system", no fim do arquivo, concentra todos os hovers e focos.** |
| `static/performance.js` | Camadas interativas aplicadas depois do carregamento (hero, pincel do Sobre, setas etc.) |
| `scripts/build-static.mjs` | Copia `static/` para `dist/`, otimiza imagens e aplica as trocas de texto dos projetos |
| `functions/api/` | Funções do Cloudflare (curtidas e briefing) |

## Botões

- **Primário** (preenchido): no hover, sobe um preenchimento branco e o texto fica preto.
- **Secundário** (contorno): no hover, sobe um preenchimento verde-ácido e o texto fica preto.
- **Links de texto** (menu, rodapé, idioma): sublinhado cresce e o texto fica verde.

Para mudar a cor de hover de um botão, altere `--btn-hover-fill` / `--btn-hover-text`
na seção "Interaction system" de `static/responsive-fixes.css`.

## Comandos

```bash
pnpm install
pnpm dev      # build + servidor local em http://127.0.0.1:3000
pnpm build    # gera dist/
pnpm deploy   # publica dist/ no Cloudflare Pages
```

No Windows, se o build falhar com "unable to open for write", o caminho da pasta
está longo demais (limite de 260 caracteres): mova o projeto para uma pasta mais curta.
