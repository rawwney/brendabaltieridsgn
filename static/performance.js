(() => {
  // The build also installs this class inline in <head>, before first paint.
  // Keeping the assignment here makes direct/static previews fail safe too.
  document.documentElement.classList.add('portfolio-booting');
  const projectImagePattern = /^\/projects\/.*\.(?:webp|png)$/i;

  async function revealEnhancedSite() {
    try { await document.fonts.ready; } catch { /* the fallback still reveals */ }

    const heroTitle = document.querySelector('.hero .hero-stage > h1');
    const deadline = performance.now() + 900;
    while (
      heroTitle?.isConnected
      && !heroTitle.classList.contains('hero-inflate-ready')
      && performance.now() < deadline
    ) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    // Allow layout and canvas sizing to settle before the cover fades away.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    clearTimeout(window.__portfolioBootTimeout);
    document.documentElement.dataset.portfolioEnhanced = 'true';
    document.documentElement.classList.add('portfolio-revealing');
    window.setTimeout(() => {
      document.documentElement.classList.remove('portfolio-booting', 'portfolio-revealing');
    }, 280);
  }

  function enhanceImage(image) {
    const source = image.getAttribute('src');
    if (!source || !projectImagePattern.test(source) || image.dataset.responsive === 'true') {
      return;
    }

    const base = source.replace(/\.(?:webp|png)$/i, '');
    image.srcset = `${base}-mobile.webp 960w, ${base}-desktop.webp 2000w`;
    image.sizes = image.closest('.popup-slide')
      ? '(max-width: 760px) calc(100vw - 44px), 86vw'
      : '(max-width: 900px) calc(100vw - 44px), 52vw';
    image.decoding = 'async';
    image.dataset.responsive = 'true';
  }

  function enhanceImages(root = document) {
    root.querySelectorAll('img[src^="/projects/"]').forEach(enhanceImage);
  }

  function enhanceProject(project) {
    const image = project.querySelector('.project-image');
    const opener = project.querySelector('.project-open');
    if (!image || !opener) return;

    const english = document.documentElement.lang.startsWith('en');
    const projectTitle = project.querySelector('.project-title')?.textContent?.trim() || 'project';
    const openLabel = `${english ? 'View project' : 'Ver projeto'} ${projectTitle}`;

    if (project.dataset.interactiveImage !== 'true') {
      image.setAttribute('role', 'button');
      image.setAttribute('tabindex', '0');
      image.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        opener.click();
      });
      image.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        opener.click();
      });
      project.addEventListener('click', (event) => {
        const separateAction = event.target.closest('button, a');
        if (separateAction && separateAction !== opener) return;
        if (event.target !== opener) opener.click();
      });
      project.dataset.interactiveImage = 'true';
    }

    image.setAttribute('aria-label', openLabel);
    opener.setAttribute('aria-label', openLabel);

    let like = project.querySelector(':scope > .project-like');
    const projectKey = projectTitle.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const storageKey = `brenda-project-like:${projectKey}`;
    const renderLike = (button, liked, count) => {
      const isEnglish = document.documentElement.lang.startsWith('en');
      button.setAttribute('aria-pressed', String(liked));
      button.dataset.count = String(Math.max(0, Number(count) || 0));
      const markup = `<span class="project-like-icon" aria-hidden="true">${liked ? '♥' : '♡'}</span><span class="project-like-label">${isEnglish ? (liked ? 'LIKED' : 'LIKE') : 'GOSTEI'}</span><span class="project-like-count" aria-hidden="true">${button.dataset.count}</span>`;
      if (button.innerHTML !== markup) button.innerHTML = markup;
      button.setAttribute('aria-label', isEnglish
        ? `${liked ? 'Already liked' : 'Like'} ${projectTitle}. ${button.dataset.count} likes.`
        : `${liked ? 'Você já gostou de' : 'Gostei de'} ${projectTitle}. ${button.dataset.count} curtidas.`);
    };
    if (!like) {
      like = document.createElement('button');
      like.type = 'button';
      like.className = 'project-like';
      like.dataset.storageKey = storageKey;
      like.dataset.projectKey = projectKey;
      project.append(like);
      like.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (like.getAttribute('aria-pressed') === 'true' || like.dataset.pending === 'true') return;
        like.dataset.pending = 'true';
        const optimisticCount = Number(like.dataset.count || 0) + 1;
        renderLike(like, true, optimisticCount);
        try { localStorage.setItem(like.dataset.storageKey, '1'); } catch { /* storage is optional */ }
        try {
          const response = await fetch('/api/likes', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ project: like.dataset.projectKey }),
          });
          if (!response.ok) throw new Error('Like counter unavailable');
          const payload = await response.json();
          renderLike(like, true, payload.count);
        } catch {
          renderLike(like, true, optimisticCount);
        } finally {
          delete like.dataset.pending;
        }
      });
    }
    let liked = false;
    try { liked = localStorage.getItem(storageKey) === '1'; } catch { /* storage is optional */ }
    renderLike(like, liked, like.dataset.count || 0);
    if (like.dataset.countRequested !== 'true') {
      like.dataset.countRequested = 'true';
      fetch(`/api/likes?project=${encodeURIComponent(projectKey)}`)
        .then((response) => {
          if (!response.ok) throw new Error('Like counter unavailable');
          return response.json();
        })
        .then((payload) => {
          let currentLiked = like.getAttribute('aria-pressed') === 'true';
          try { currentLiked = localStorage.getItem(storageKey) === '1'; } catch { /* storage is optional */ }
          renderLike(like, currentLiked, payload.count);
        })
        .catch(() => {
          let currentLiked = like.getAttribute('aria-pressed') === 'true';
          try { currentLiked = localStorage.getItem(storageKey) === '1'; } catch { /* storage is optional */ }
          renderLike(like, currentLiked, like.dataset.count || 0);
        });
    }
  }

  function enhanceProjects(root = document) {
    if (root.matches?.('.project-grid > .project')) enhanceProject(root);
    root.querySelectorAll?.('.project-grid > .project').forEach(enhanceProject);
  }

  const glyphMorphControllers = new WeakMap();

  function destroyGlyphMorph(element) {
    const controller = glyphMorphControllers.get(element);
    if (!controller) return;
    controller.destroy();
    glyphMorphControllers.delete(element);
  }

  function prepareGlyphMorph(element) {
    if (!element) return;
    element.classList.add('morph-text');
    const letters = Array.from(element.querySelectorAll('.morph-letter'))
      .filter((letter) => (letter.dataset.glyph ?? letter.textContent ?? '').trim());
    const signature = letters.map((letter) => letter.dataset.glyph ?? letter.textContent).join('');
    const previous = glyphMorphControllers.get(element);
    if (previous?.signature === signature && previous.letters.length === letters.length) return;
    destroyGlyphMorph(element);
    const precisePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!precisePointer.matches || reducedMotion.matches || !letters.length) return;

    const interactionSurface = element.matches('.hero .hero-stage > h1, .hero .hero-bottom > .hero-value-headline')
      ? element.closest('.hero')
      : element.matches('.footer-signature h2')
        ? element.closest('.footer-signature')
        : element.closest('section') || element.parentElement || element;
    const states = letters.map((letter) => ({ letter, current: 0, target: 0 }));
    let frame = 0;
    let inside = false;
    const animate = () => {
      frame = 0;
      let moving = false;
      states.forEach((state) => {
        const delta = state.target - state.current;
        state.current += delta * (inside ? 0.16 : 0.11);
        if (Math.abs(delta) > 0.002 || state.current > 0.004) moving = true;
        if (state.current > 0.004) {
          state.letter.style.setProperty('--morph-weight', state.current.toFixed(4));
        } else if (!inside) {
          state.current = 0;
          state.letter.style.removeProperty('--morph-weight');
        }
      });
      if (moving) frame = window.requestAnimationFrame(animate);
      else element.classList.remove('is-morphing');
    };
    const requestAnimation = () => {
      element.classList.add('is-morphing');
      if (!frame) frame = window.requestAnimationFrame(animate);
    };
    const handleMove = (event) => {
      inside = true;
      const fontSize = parseFloat(getComputedStyle(element).fontSize) || 80;
      const elementRect = element.getBoundingClientRect();
      const radius = Math.max(fontSize * 2.6, Math.min(elementRect.width * 0.42, 560));
      states.forEach((state) => {
        const rect = state.letter.getBoundingClientRect();
        const distance = Math.hypot(
          event.clientX - (rect.left + rect.width / 2),
          event.clientY - (rect.top + rect.height / 2),
        );
        const proximity = Math.max(0, 1 - distance / radius);
        const easedProximity = proximity * proximity * (3 - 2 * proximity);
        state.target = easedProximity;
      });
      requestAnimation();
    };
    const handleLeave = () => {
      inside = false;
      states.forEach((state) => { state.target = 0; });
      requestAnimation();
    };
    interactionSurface.addEventListener('pointermove', handleMove, { passive: true });
    interactionSurface.addEventListener('pointerleave', handleLeave, { passive: true });
    glyphMorphControllers.set(element, {
      signature,
      letters,
      destroy() {
        cancelAnimationFrame(frame);
        interactionSurface.removeEventListener('pointermove', handleMove);
        interactionSurface.removeEventListener('pointerleave', handleLeave);
        element.classList.remove('is-morphing');
        states.forEach((state) => {
          state.letter.style.removeProperty('--morph-weight');
        });
      },
    });
  }

  function appendMorphGlyphs(container, text) {
    Array.from(text).forEach((glyph) => {
      if (/\s/.test(glyph)) {
        container.append(document.createTextNode(glyph));
        return;
      }
      const letter = document.createElement('span');
      letter.className = 'morph-letter';
      letter.dataset.glyph = glyph;
      letter.setAttribute('aria-hidden', 'true');
      letter.textContent = glyph;
      container.append(letter);
    });
  }

  function renderMorphText(heading, text) {
    const mark = heading.querySelector(':scope > .inline-mark');
    destroyGlyphMorph(heading);
    const fragment = document.createDocumentFragment();
    appendMorphGlyphs(fragment, text);
    heading.replaceChildren(fragment);
    if (mark) heading.append(mark);
    heading.setAttribute('aria-label', text);
    heading.dataset.sectionDisplayTitle = text;
  }

  function wrapExistingMorphText(element) {
    if (!element || element.querySelector('.morph-letter')) return;
    const ignored = '.inline-mark, [aria-hidden="true"], script, style';
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.textContent?.trim() || node.parentElement?.closest(ignored)) continue;
      nodes.push(node);
    }
    if (!nodes.length) return;
    const accessibleText = element.textContent.replace(/\s+/g, ' ').trim();
    nodes.forEach((node) => {
      const fragment = document.createDocumentFragment();
      appendMorphGlyphs(fragment, node.textContent);
      node.replaceWith(fragment);
    });
    if (accessibleText) element.setAttribute('aria-label', accessibleText);
  }

  function prepareHeroNameMorph(element) {
    if (!element) return;
    element.querySelectorAll('.hero-letter').forEach((letter) => {
      const nestedLetter = letter.querySelector(':scope > .morph-letter');
      if (nestedLetter) letter.textContent = nestedLetter.textContent;
      letter.classList.add('morph-letter');
      letter.dataset.glyph ||= letter.textContent;
    });
  }

  function setSectionDisplayTitle(heading, text) {
    if (!heading) return;
    if (heading.dataset.sectionDisplayTitle !== text || !heading.querySelector(':scope > .morph-letter')) {
      renderMorphText(heading, text);
    }
    heading.classList.add('section-display-title', 'morph-text');
    prepareGlyphMorph(heading);
  }

  function enhanceMorphText(root = document) {
    const selector = '.section-display-title, .footer-signature h2';
    const candidates = [];
    if (root.matches?.(selector)) candidates.push(root);
    root.querySelectorAll?.(selector).forEach((item) => candidates.push(item));
    candidates.forEach((element) => {
      prepareGlyphMorph(element);
    });
  }

  function enhanceAboutGrid(grid) {
    const copy = grid.querySelector('.about-copy');
    if (!copy) return;
    const english = document.documentElement.lang.startsWith('en');
    setSectionDisplayTitle(
      grid.querySelector(':scope > .mega'),
      english ? 'ABOUT ME' : 'SOBRE MIM',
    );
    const lead = english
      ? 'I am a graphic designer focused on branding, visual identity and social media design. I start from a central concept and build visual systems that remain consistent across every format — from print to packaging, from feed to campaign. I enjoy projects where the brand is still defining itself or needs to reposition, because that is where visual structure makes the biggest difference. I work remotely with brands in Brazil and abroad.'
      : 'Sou designer gráfica focada em branding, identidade visual e design para redes sociais. Trabalho a partir de um conceito central e construo sistemas visuais que se mantêm consistentes em qualquer formato — do impresso à embalagem, do feed à campanha. Gosto de projetos onde a marca ainda está se definindo ou precisa se reposicionar, porque é onde a estrutura visual faz mais diferença. Trabalho remoto, atendendo marcas no Brasil e fora.';
    const paragraph = copy.querySelector(':scope > p');
    const small = copy.querySelector(':scope > small');
    if (paragraph && paragraph.textContent !== lead) paragraph.textContent = lead;
    if (small) small.remove();
    grid.querySelectorAll('.portrait-placeholder, .about-gif').forEach((portrait) => portrait.remove());
    let photoStack = grid.querySelector(':scope > .about-photo-stack');
    if (!photoStack) {
      grid.querySelector(':scope > .about-photo-space')?.remove();
      photoStack = document.createElement('div');
      photoStack.className = 'about-photo-stack';
      const space = document.createElement('figure');
      space.className = 'about-photo-space';
      const image = document.createElement('img');
      image.src = '/brand/brenda-about-portrait.webp';
      image.alt = english ? 'Portrait of Brenda Baltieri' : 'Retrato de Brenda Baltieri';
      image.loading = 'lazy';
      image.decoding = 'async';
      image.width = 1600;
      image.height = 1687;
      space.append(image);
      const download = document.createElement('a');
      download.className = 'about-cv-download';
      download.href = '/cv/brenda-baltieri-curriculo.pdf';
      download.download = 'Brenda-Baltieri-Curriculo.pdf';
      const label = document.createElement('span');
      label.className = 'about-cv-label';
      const arrow = document.createElement('span');
      arrow.className = 'about-cv-arrow';
      arrow.setAttribute('aria-hidden', 'true');
      download.append(label, arrow);
      photoStack.append(space, download);
      grid.prepend(photoStack);
    }
    const downloadLabel = photoStack.querySelector('.about-cv-label');
    const downloadText = english ? 'DOWNLOAD RÉSUMÉ' : 'BAIXAR CURRÍCULO';
    if (downloadLabel && downloadLabel.textContent !== downloadText) {
      downloadLabel.textContent = downloadText;
    }
    const downloadLink = photoStack.querySelector('.about-cv-download');
    if (downloadLink) {
      downloadLink.setAttribute('aria-label', english
        ? 'Download Brenda Baltieri résumé in PDF'
        : 'Baixar currículo de Brenda Baltieri em PDF');
    }
    const portrait = photoStack.querySelector('.about-photo-space img');
    if (portrait) portrait.alt = english ? 'Portrait of Brenda Baltieri' : 'Retrato de Brenda Baltieri';

    copy.querySelector(':scope > .about-practice')?.remove();
    grid.classList.remove('about-gif-layout');
    grid.classList.add('about-photo-layout');
  }

  function enhanceAbout(root = document) {
    if (root.matches?.('.about-grid')) enhanceAboutGrid(root);
    root.querySelectorAll?.('.about-grid').forEach(enhanceAboutGrid);
  }

  function simplifyProfile() {
    document.querySelectorAll('a[href="#experience"]').forEach((link) => link.remove());
    document.querySelectorAll('section.experience, section.skills').forEach((section) => section.remove());

    // The underlay is a visual-only clone used by the About brush reveal.
    // Hide it from assistive technology so the profile content is announced once.
    document.querySelectorAll('.about-underlay').forEach((underlay) => {
      if (underlay.getAttribute('aria-hidden') !== 'true') {
        underlay.setAttribute('aria-hidden', 'true');
      }
      underlay.inert = true;
      underlay.setAttribute('inert', '');
    });

    document.querySelectorAll('section.about .section-label').forEach((label) => {
      const english = document.documentElement.lang.startsWith('en');
      const prefix = english ? '03 / ABOUT ' : '03 / SOBRE ';
      const textNode = Array.from(label.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
      if (textNode && textNode.nodeValue !== prefix) textNode.nodeValue = prefix;
    });

    document.querySelectorAll('.marquee.marquee-slow').forEach((marquee) => {
      if (marquee.nextElementSibling?.matches('.contact')) marquee.remove();
    });

    document.querySelectorAll('section.contact').forEach((contact) => {
      const label = contact.querySelector(':scope > .section-label');
      if (!label) return;
      const english = document.documentElement.lang.startsWith('en');
      const prefix = english ? '04 / CONTACT ' : '04 / CONTATO ';
      const textNode = Array.from(label.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
      if (textNode && textNode.nodeValue !== prefix) textNode.nodeValue = prefix;
    });
  }

  const projectOrder = [
    'MORNING / EVENING / NIGHT',
    'CASAMAR',
    'RYZON',
    'LABIRINTO NOIR',
    'GURU SPIRIT / PACKAGING',
    'GURU SPIRIT / FOLDER',
    'GRUPO PIRASA',
    'DEPÓSITO 23',
    'EPJ CORRIDA',
    'MALHAFIL',
    'AGÊNCIA TRÊES / CARNAVAL',
    'FLUIS',
    'VIÉS / LIBERDADE SEM RÓTULOS',
  ];

  function enhanceNavigation() {
    document.querySelectorAll('.header nav, .mobile-menu nav, .mobile-menu').forEach((nav) => {
      if (!nav.querySelector('a[href="#work"]') || !nav.querySelector('a[href="#about"]')) return;
      let servicesLink = nav.querySelector('a[href="#services"]');
      if (!servicesLink) {
        servicesLink = document.createElement('a');
        servicesLink.href = '#services';
        nav.querySelector('a[href="#about"]').before(servicesLink);
      }
      const label = document.documentElement.lang.startsWith('en') ? 'SERVICES' : 'SERVIÇOS';
      if (servicesLink.textContent !== label) servicesLink.textContent = label;
      if (nav.closest('.mobile-menu')) {
        nav.querySelectorAll('a[href^="#"]').forEach((link) => {
          if (link.dataset.mobileNavigationBound === 'true') return;
          link.dataset.mobileNavigationBound = 'true';
          link.addEventListener('click', (event) => {
            event.preventDefault();
            const targetId = link.getAttribute('href')?.slice(1);
            requestAnimationFrame(() => {
              const menuButton = document.querySelector('.header .menu-button[aria-expanded="true"]');
              menuButton?.click();
              requestAnimationFrame(() => {
                const target = targetId ? document.getElementById(targetId) : null;
                if (!target) return;
                window.history.pushState(null, '', `#${targetId}`);
                target.scrollIntoView({
                  behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
                  block: 'start',
                });
              });
            });
          });
        });
      }
    });

    const menuButton = document.querySelector('.header .menu-button');
    if (menuButton) {
      const english = document.documentElement.lang.startsWith('en');
      const expanded = menuButton.getAttribute('aria-expanded') === 'true';
      menuButton.setAttribute('aria-label', english
        ? (expanded ? 'Close menu' : 'Open menu')
        : (expanded ? 'Fechar menu' : 'Abrir menu'));
    }
  }

  function syncPageIsolation() {
    const customDialogOpen = Boolean(document.querySelector('.modal-backdrop'));
    const mobileMenuOpen = Boolean(document.querySelector('.mobile-menu'));
    const targets = [
      document.querySelector('header.header'),
      document.querySelector('main'),
      document.querySelector('footer'),
    ].filter(Boolean);

    targets.forEach((target) => {
      const shouldIsolate = customDialogOpen || (mobileMenuOpen && target.matches('main, footer'));
      if (shouldIsolate) {
        if (target.dataset.isolationAriaHidden === undefined) {
          target.dataset.isolationAriaHidden = target.getAttribute('aria-hidden') ?? '';
        }
        target.inert = true;
        target.setAttribute('aria-hidden', 'true');
      } else if (target.dataset.isolationAriaHidden !== undefined) {
        const previous = target.dataset.isolationAriaHidden;
        target.inert = false;
        if (previous) target.setAttribute('aria-hidden', previous);
        else target.removeAttribute('aria-hidden');
        delete target.dataset.isolationAriaHidden;
      }
    });
  }

  function openProjectContactModal() {
    const english = document.documentElement.lang.startsWith('en');
    let dialog = document.querySelector('.hero-contact-dialog');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.className = 'hero-contact-dialog';
      document.body.append(dialog);
      dialog.addEventListener('click', (event) => {
        if (event.target === dialog) dialog.close();
      });
      dialog.addEventListener('close', () => {
        const brandCursor = dialog.querySelector(':scope > .brand-cursor');
        if (brandCursor) document.body.prepend(brandCursor);
      });
    }
    const copy = english
      ? {
        eyebrow: 'NEW PROJECT',
        close: 'CLOSE',
        whatsapp: 'WHATSAPP',
        whatsappDetail: 'Start a direct conversation before filling out the brief',
        formTitle: 'TELL ME ABOUT YOUR PROJECT',
        name: 'NAME',
        emailLabel: 'E-MAIL',
        phone: 'WHATSAPP / PHONE',
        service: 'WHAT DO YOU NEED?',
        select: 'SELECT A SERVICE',
        details: 'TELL ME A LITTLE ABOUT THE PROJECT',
        detailsPlaceholder: 'Context, goals, deliverables and expected timing.',
        submit: 'SEND BRIEF',
        sending: 'SENDING...',
        sent: 'BRIEF SENT ✓',
        sentDetail: 'Thank you! Your project details were sent successfully.',
        sendError: 'Unable to send right now. Please try again or use WhatsApp.',
        required: 'Required fields',
        serviceOptions: ['Branding', 'Visual Identity', 'Social Media Design', 'UX / UI Design', 'Packaging / Editorial', 'Other'],
      }
      : {
        eyebrow: 'NOVO PROJETO',
        close: 'FECHAR',
        whatsapp: 'WHATSAPP',
        whatsappDetail: 'Comece uma conversa direta antes de preencher o briefing',
        formTitle: 'CONTE SOBRE O SEU PROJETO',
        name: 'NOME',
        emailLabel: 'E-MAIL',
        phone: 'WHATSAPP / TELEFONE',
        service: 'O QUE VOCÊ PRECISA?',
        select: 'SELECIONE UM SERVIÇO',
        details: 'CONTE UM POUCO SOBRE O PROJETO',
        detailsPlaceholder: 'Contexto, objetivo, entregas e prazo esperado.',
        submit: 'ENVIAR BRIEFING',
        sending: 'ENVIANDO...',
        sent: 'BRIEFING ENVIADO ✓',
        sentDetail: 'Obrigada! As informações do seu projeto foram enviadas com sucesso.',
        sendError: 'Não foi possível enviar agora. Tente novamente ou use o WhatsApp.',
        required: 'Campos obrigatórios',
        serviceOptions: ['Branding', 'Identidade Visual', 'Design para Redes Sociais', 'UX / UI Design', 'Embalagens / Editorial', 'Outro'],
      };
    const carriedCursor = dialog.querySelector(':scope > .brand-cursor');
    if (carriedCursor) document.body.prepend(carriedCursor);
    dialog.replaceChildren();
    const shell = document.createElement('div');
    shell.className = 'hero-contact-shell';
    const top = document.createElement('div');
    top.className = 'hero-contact-top';
    const eyebrow = document.createElement('span');
    eyebrow.textContent = copy.eyebrow;
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = `${copy.close} ×`;
    close.addEventListener('click', () => dialog.close());
    top.append(eyebrow, close);
    const title = document.createElement('h2');
    title.textContent = copy.formTitle;
    title.classList.add('is-form-title');
    const makeOption = (element, labelText, detailText) => {
      element.className = 'hero-contact-option';
      const label = document.createElement('strong');
      label.textContent = labelText;
      const detail = document.createElement('small');
      detail.textContent = detailText;
      const arrow = document.createElement('span');
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '↗';
      element.append(label, detail, arrow);
      return element;
    };
    const whatsapp = makeOption(document.createElement('a'), copy.whatsapp, copy.whatsappDetail);
    whatsapp.href = english
      ? 'https://wa.me/5511984298730?text=Hi%20Brenda%2C%20I%20saw%20your%20portfolio%20and%20would%20like%20to%20discuss%20a%20project.'
      : 'https://wa.me/5511984298730?text=Ol%C3%A1%20Brenda%2C%20vi%20seu%20portf%C3%B3lio%20e%20gostaria%20de%20conversar%20sobre%20um%20projeto.';
    whatsapp.target = '_blank';
    whatsapp.rel = 'noreferrer';
    whatsapp.classList.add('hero-contact-whatsapp');

    const form = document.createElement('form');
    form.className = 'hero-contact-form';
    form.noValidate = false;

    const honeypot = document.createElement('input');
    honeypot.type = 'text';
    honeypot.name = 'website';
    honeypot.tabIndex = -1;
    honeypot.autocomplete = 'off';
    honeypot.setAttribute('aria-hidden', 'true');
    honeypot.className = 'hero-contact-honeypot';

    const makeField = (labelText, control) => {
      const label = document.createElement('label');
      const caption = document.createElement('span');
      caption.textContent = labelText;
      label.append(caption, control);
      return label;
    };

    const name = document.createElement('input');
    name.name = 'name';
    name.autocomplete = 'name';
    name.required = true;
    const emailInput = document.createElement('input');
    emailInput.type = 'email';
    emailInput.name = 'email';
    emailInput.autocomplete = 'email';
    emailInput.required = true;
    const phone = document.createElement('input');
    phone.type = 'tel';
    phone.name = 'phone';
    phone.autocomplete = 'tel';
    const service = document.createElement('select');
    service.name = 'service';
    service.required = true;
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = copy.select;
    placeholder.disabled = true;
    placeholder.selected = true;
    service.append(placeholder);
    copy.serviceOptions.forEach((optionText) => {
      const option = document.createElement('option');
      option.value = optionText;
      option.textContent = optionText;
      service.append(option);
    });
    const details = document.createElement('textarea');
    details.name = 'details';
    details.rows = 5;
    details.required = true;
    details.placeholder = copy.detailsPlaceholder;

    const fields = document.createElement('div');
    fields.className = 'hero-contact-fields';
    fields.append(
      makeField(`${copy.name} *`, name),
      makeField(`${copy.emailLabel} *`, emailInput),
      makeField(copy.phone, phone),
      makeField(`${copy.service} *`, service),
      makeField(`${copy.details} *`, details),
    );

    const actions = document.createElement('div');
    actions.className = 'hero-contact-form-actions';
    const required = document.createElement('small');
    required.textContent = `* ${copy.required}`;
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'hero-contact-submit';
    submit.textContent = `${copy.submit} ↗`;
    const feedback = document.createElement('p');
    feedback.className = 'hero-contact-feedback';
    feedback.setAttribute('aria-live', 'polite');
    feedback.hidden = true;
    actions.append(required, feedback, submit);
    form.append(honeypot, fields, actions);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      submit.disabled = true;
      submit.textContent = copy.sending;
      feedback.hidden = true;
      feedback.className = 'hero-contact-feedback';

      try {
        if (honeypot.value) {
          form.reset();
          feedback.textContent = copy.sentDetail;
          feedback.classList.add('is-success');
          feedback.hidden = false;
          submit.textContent = copy.sent;
          return;
        }

        const response = await fetch('https://formsubmit.co/ajax/brenda.baltieri01@gmail.com', {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            Nome: name.value.trim(),
            Email: emailInput.value.trim(),
            'WhatsApp / telefone': phone.value.trim() || 'Não informado',
            Serviço: service.value,
            'Sobre o projeto': details.value.trim(),
            Idioma: english ? 'Inglês' : 'Português',
            'Página de origem': window.location.href,
            _replyto: emailInput.value.trim(),
            _subject: `Novo briefing do portfólio — ${name.value.trim()}`,
            _template: 'table',
            _captcha: 'false',
            _honey: '',
          }),
        });
        const result = await response.json().catch(() => null);
        if (!response.ok || result?.success !== 'true') throw new Error('Brief delivery failed.');

        form.reset();
        feedback.textContent = copy.sentDetail;
        feedback.classList.add('is-success');
        feedback.hidden = false;
        submit.textContent = copy.sent;
      } catch {
        feedback.textContent = copy.sendError;
        feedback.classList.add('is-error');
        feedback.hidden = false;
        submit.disabled = false;
        submit.textContent = `${copy.submit} ↗`;
      }
    });
    shell.append(top, title, whatsapp, form);
    dialog.append(shell);
    const brandCursor = document.querySelector('body > .brand-cursor');
    if (
      brandCursor &&
      window.matchMedia('(hover:hover) and (pointer:fine)').matches &&
      !window.matchMedia('(prefers-reduced-motion:reduce)').matches
    ) {
      dialog.append(brandCursor);
    }
    if (!dialog.open) dialog.showModal();
    requestAnimationFrame(() => name.focus({ preventScroll: true }));
  }

  function enhanceHeroCopy() {
    const bottom = document.querySelector('.hero .hero-bottom');
    if (!bottom) return;
    const english = document.documentElement.lang.startsWith('en');
    const copy = english
      ? {
        headline: 'BRAND SYSTEMS, FROM CONCEPT TO APPLICATION.',
        headlineLines: ['BRAND SYSTEMS, FROM', 'CONCEPT TO APPLICATION.'],
        subhead: 'Branding, visual identity and social media design for brands that want to stop reinventing their communication with every post.',
        primary: 'I HAVE A PROJECT',
        secondary: 'VIEW PROJECTS ↓',
        tags: ['BRANDING', 'VISUAL IDENTITY', 'SOCIAL MEDIA DESIGN', 'PACKAGING', 'EDITORIAL'],
      }
      : {
        headline: 'MARCA COM SISTEMA, DO CONCEITO À APLICAÇÃO.',
        headlineLines: ['MARCA COM SISTEMA, DO', 'CONCEITO À APLICAÇÃO.'],
        subhead: 'Branding, identidade visual e design para redes sociais para marcas que querem parar de reinventar a comunicação a cada post.',
        primary: 'TENHO UM PROJETO',
        secondary: 'VER PROJETOS ↓',
        tags: ['BRANDING', 'IDENTIDADE VISUAL', 'DESIGN PARA REDES SOCIAIS', 'EMBALAGENS', 'EDITORIAL'],
      };
    const signature = `${document.documentElement.lang}|${copy.headline}`;
    if (bottom.dataset.copySignature === signature && bottom.querySelector('.hero-value-headline')) return;

    const headline = document.createElement('h2');
    headline.className = 'hero-value-headline';
    headline.setAttribute('aria-label', copy.headline);
    headline.append(document.createTextNode(copy.headlineLines[0]));
    const lineBreak = document.createElement('br');
    lineBreak.className = 'hero-value-line-break';
    headline.append(lineBreak, document.createTextNode(` ${copy.headlineLines[1]}`));
    const subhead = document.createElement('p');
    subhead.className = 'hero-value-subhead';
    subhead.textContent = copy.subhead;
    const actions = document.createElement('div');
    actions.className = 'hero-value-actions';
    const primary = document.createElement('a');
    primary.className = 'hero-value-cta hero-value-cta-primary';
    primary.href = '#contact';
    primary.textContent = copy.primary;
    primary.setAttribute('aria-haspopup', 'dialog');
    primary.addEventListener('click', (event) => {
      event.preventDefault();
      openProjectContactModal();
    });
    const secondary = document.createElement('a');
    secondary.className = 'hero-value-cta hero-value-cta-secondary';
    secondary.href = '#work';
    secondary.textContent = copy.secondary;
    actions.append(primary, secondary);
    const side = document.createElement('div');
    side.className = 'hero-value-side';
    side.append(subhead, actions);
    const tags = document.createElement('p');
    tags.className = 'hero-value-tags';
    tags.textContent = copy.tags.join(' / ');
    bottom.replaceChildren(headline, side, tags);
    bottom.dataset.copySignature = signature;
  }

  function enhanceProjectGrid() {
    const grid = document.querySelector('.project-grid');
    if (!grid) return;
    const projects = Array.from(grid.querySelectorAll(':scope > .project'));
    const byTitle = new Map(projects.map((project) => [
      project.querySelector('.project-title')?.textContent.trim().toUpperCase(),
      project,
    ]));
    const orderedProjects = [
      ...projectOrder.map((title) => byTitle.get(title)).filter(Boolean),
      ...projects.filter((project) => !projectOrder.includes(
        project.querySelector('.project-title')?.textContent.trim().toUpperCase(),
      )),
    ];
    if (orderedProjects.some((project, index) => projects[index] !== project)) {
      grid.append(...orderedProjects);
    }
    Array.from(grid.querySelectorAll(':scope > .project')).forEach((project, index) => {
      const number = String(index + 1).padStart(2, '0');
      project.id = `projeto-${number}`;
      project.dataset.archiveIndex = String(index);
      const projectNumber = project.querySelector('.project-number');
      const posterIndex = project.querySelector('.poster-index');
      if (projectNumber && projectNumber.textContent !== number) projectNumber.textContent = number;
      if (posterIndex && posterIndex.textContent !== `BB—${number}`) posterIndex.textContent = `BB—${number}`;
    });

    const english = document.documentElement.lang.startsWith('en');
    const authorial = english ? 'AUTHOR-LED PROJECT' : 'PROJETO AUTORAL';
    const categoryTranslations = new Map([
      ['BRANDING / IDENTIDADE VISUAL', 'BRANDING / VISUAL IDENTITY'],
      ['MÍDIAS SOCIAIS / DIREÇÃO DE ARTE', 'SOCIAL MEDIA / ART DIRECTION'],
      ['MÍDIAS SOCIAIS / CAMPANHA', 'SOCIAL MEDIA / CAMPAIGN'],
      ['MÍDIAS SOCIAIS / ILUSTRAÇÃO', 'SOCIAL MEDIA / ILLUSTRATION'],
      ['MÍDIAS SOCIAIS / CORPORATIVO', 'SOCIAL MEDIA / CORPORATE'],
      ['MÍDIAS SOCIAIS / SAÚDE', 'SOCIAL MEDIA / HEALTH'],
      ['REBRANDING / EMBALAGENS', 'REBRANDING / PACKAGING'],
      ['REBRANDING / DESIGN IMPRESSO', 'REBRANDING / PRINT DESIGN'],
      ['EMBALAGENS / 3D', 'PACKAGING / 3D'],
      ['EDITORIAL / DESIGN IMPRESSO', 'EDITORIAL / PRINT DESIGN'],
    ]);
    const categoryTranslationsReverse = new Map(
      Array.from(categoryTranslations, ([portuguese, translated]) => [translated, portuguese]),
    );
    grid.querySelectorAll(':scope > .project .project-meta').forEach((meta) => {
      const parts = meta.innerHTML.split(/<br\s*\/?\s*>/i);
      const rawCategory = parts[0].replace(/\s+—\s+(?:PROJETO AUTORAL|AUTHOR-LED PROJECT)$/i, '').trim();
      const category = english
        ? (categoryTranslations.get(rawCategory) || rawCategory)
        : (categoryTranslationsReverse.get(rawCategory) || rawCategory);
      const suffix = /\s+—\s+(?:PROJETO AUTORAL|AUTHOR-LED PROJECT)$/i.test(parts[0])
        ? ` — ${authorial}` : '';
      const desired = `${category}${suffix}<br>${(parts[1] || '').trim()}`;
      if (meta.innerHTML !== desired) meta.innerHTML = desired;
    });
    ['CASAMAR', 'LABIRINTO NOIR', 'VIÉS / LIBERDADE SEM RÓTULOS'].forEach((title) => {
      const project = byTitle.get(title);
      const meta = project?.querySelector('.project-meta');
      if (!meta) return;
      const parts = meta.innerHTML.split(/<br\s*\/?\s*>/i);
      const category = parts[0].replace(/\s+—\s+(?:PROJETO AUTORAL|AUTHOR-LED PROJECT)$/i, '').trim();
      const year = (parts[1] || '').trim();
      const desired = `${category} — ${authorial}<br>${year}`;
      if (meta.innerHTML !== desired) meta.innerHTML = desired;
    });

    const work = document.querySelector('.work');
    const count = work?.querySelector('.section-label span');
    if (count) {
      const desired = english ? 'ARCHIVE [ 13 ]' : 'ARQUIVO [ 13 ]';
      if (count.textContent !== desired) count.textContent = desired;
    }
    const mega = work?.querySelector(':scope > .mega');
    if (mega) {
      setSectionDisplayTitle(mega, english ? 'SELECTED WORK' : 'PROJETOS SELECIONADOS');
      let intro = work.querySelector(':scope > .work-intro');
      if (!intro) {
        intro = document.createElement('p');
        intro.className = 'work-intro';
        mega.after(intro);
      }
      const text = english
        ? 'Projects where I built the visual system from scratch or carried it into new formats.'
        : 'Projetos onde construí o sistema visual do zero ou o levei a novos formatos.';
      if (intro.textContent !== text) intro.textContent = text;
    }
  }

  function enhanceServices() {
    const work = document.querySelector('.work');
    if (!work) return;
    const english = document.documentElement.lang.startsWith('en');
    let section = document.querySelector('#services');
    if (!section) {
      section = document.createElement('section');
      section.id = 'services';
      section.className = 'services section';
      work.after(section);
    } else if (section.previousElementSibling !== work) {
      work.after(section);
    }
    const copy = english
      ? {
        label: '02 / SERVICES',
        title: 'WHAT I DO',
        intro: 'Four core practices connected from concept through application.',
        services: [
          ['01', 'BRANDING'],
          ['02', 'VISUAL IDENTITY'],
          ['03', 'SOCIAL MEDIA DESIGN'],
          ['04', 'UX / UI DESIGN'],
        ],
        extras: ['Art direction', 'Typography', 'Print design', 'Packaging', '3D mockups', 'Social media', 'Generative AI', 'Editorial design', 'Motion design', 'Image retouching'],
      }
      : {
        label: '02 / SERVIÇOS',
        title: 'O QUE EU FAÇO',
        intro: 'Quatro frentes principais conectadas do conceito à aplicação.',
        services: [
          ['01', 'BRANDING'],
          ['02', 'IDENTIDADE VISUAL'],
          ['03', 'DESIGN PARA REDES SOCIAIS'],
          ['04', 'UX / UI DESIGN'],
        ],
        extras: ['Direção de Arte', 'Tipografia', 'Impressos', 'Embalagens', 'Mockups 3D', 'Mídias Sociais', 'IA Generativa', 'Editorial', 'Motion Design', 'Tratamento de Imagem'],
      };
    const signature = `${document.documentElement.lang}|${copy.title}`;
    if (section.dataset.copySignature === signature && section.querySelector('.services-title')) return;

    const label = document.createElement('div');
    label.className = 'section-label';
    label.textContent = copy.label;
    const title = document.createElement('h2');
    title.className = 'services-title section-display-title';
    setSectionDisplayTitle(title, copy.title);
    const decorativeMark = work.querySelector(':scope > .mega .inline-mark')?.cloneNode(true);
    if (decorativeMark) title.append(decorativeMark);
    const intro = document.createElement('p');
    intro.className = 'services-intro';
    intro.textContent = copy.intro;
    const grid = document.createElement('div');
    grid.className = 'services-grid';
    copy.services.forEach(([number, name]) => {
      const article = document.createElement('article');
      const meta = document.createElement('span');
      meta.className = 'service-number';
      meta.textContent = `${english ? 'SERVICE' : 'SERVIÇO'} ${String(number)}`;
      const heading = document.createElement('h3');
      heading.textContent = name;
      article.append(meta, heading);
      grid.append(article);
    });
    const extras = document.createElement('div');
    extras.className = 'services-extras';
    const extrasList = document.createElement('ul');
    copy.extras.forEach((item) => {
      const listItem = document.createElement('li');
      listItem.textContent = item;
      extrasList.append(listItem);
    });
    extras.append(extrasList);
    section.replaceChildren(label, title, intro, grid, extras);
    section.dataset.copySignature = signature;
    prepareGlyphMorph(title);
  }

  function removeBehanceConnections() {
    document.querySelectorAll('a[href*="behance.net"]').forEach((link) => {
      if (link.closest('.socials')) {
        link.href = 'https://instagram.com/brendabaltieridsgn';
        link.target = '_blank';
        link.rel = 'noreferrer';
        link.textContent = 'INSTAGRAM ↗';
        link.setAttribute('aria-label', 'Instagram — Brenda Baltieri');
        return;
      }
      link.hidden = true;
      link.tabIndex = -1;
      link.removeAttribute('href');
      link.setAttribute('aria-hidden', 'true');
    });
  }

  function enhanceContactCopy() {
    const contact = document.querySelector('.contact');
    const heading = contact?.querySelector(':scope > .mega');
    if (!contact || !heading) return;
    const english = document.documentElement.lang.startsWith('en');
    setSectionDisplayTitle(
      heading,
      english ? "LET'S CREATE SOMETHING" : 'VAMOS CRIAR ALGO',
    );
    let intro = contact.querySelector(':scope > .contact-intro');
    if (!intro) {
      intro = document.createElement('p');
      intro.className = 'contact-intro';
      const gif = contact.querySelector(':scope > .contact-gif');
      (gif || heading).after(intro);
    }
    const text = english
      ? 'Available for new branding, visual identity and social media design projects.'
      : 'Disponível para novos projetos de branding, identidade visual e design para redes sociais.';
    if (intro.textContent !== text) intro.textContent = text;
  }

  function enhanceFooterCredit() {
    const footer = document.querySelector('footer');
    if (!footer) return;
    const parent = footer.querySelector(':scope > .footer-details') || footer;
    let credit = parent.querySelector(':scope > .footer-credit');
    if (!credit) {
      credit = document.createElement('p');
      credit.className = 'footer-credit';
      parent.append(credit);
    }
    const text = document.documentElement.lang.startsWith('en')
      ? 'Site design and UX: Brenda Baltieri, 2026.'
      : 'Design e UX deste site: Brenda Baltieri, 2026.';
    if (credit.textContent !== text) credit.textContent = text;
  }

  function enhanceSiteNarrative() {
    enhanceNavigation();
    enhanceHeroCopy();
    enhanceProjectGrid();
    enhanceServices();
    enhanceContactCopy();
    enhanceFooterCredit();
    removeBehanceConnections();
    enhanceMorphText();
  }

  function enhanceExperience(root = document) {
    const timelines = root.matches?.('.timeline') ? [root] : Array.from(root.querySelectorAll?.('.timeline') || []);
    const english = document.documentElement.lang.startsWith('en');
    const details = {
      'Sadhu Group': english
        ? 'At Sadhu Group, I develop print and digital materials for the group’s brands, including packaging, visual identities and brand extensions. I also contribute to copywriting, marketing campaigns, product launches and visual communication for industry events.'
        : 'Na Sadhu Group, desenvolvo materiais impressos e digitais para as marcas do grupo, incluindo embalagens, identidades visuais e desdobramentos de branding. Também participo de copywriting, campanhas de marketing, lançamentos de produtos e comunicação visual para eventos do setor.',
      'Agência Trêes': english
        ? 'At Agência Trêes, I created visual identities, key visuals, digital pieces and social campaigns for clients across different industries, translating brand strategy into consistent graphic systems from concept through rollout.'
        : 'Na Agência Trêes, criei identidades visuais, key visuals, peças digitais e campanhas para redes sociais de clientes de diferentes segmentos, traduzindo estratégia de marca em sistemas gráficos consistentes, do conceito aos desdobramentos.',
      'Meyer Publicidade': english
        ? 'At Meyer Publicidade, I created and adapted print and digital assets for advertising campaigns, promotional pieces and environmental design, using artificial intelligence as support for visual research, image generation and composition.'
        : 'Na Meyer Publicidade, criei e adaptei materiais impressos e digitais para campanhas, peças promocionais e projetos de ambientação, usando inteligência artificial como apoio à pesquisa visual, geração de imagens e composição.',
      Freelance: english
        ? 'As an independent designer, I work directly with clients on brands, visual identities and institutional, promotional and social media materials, leading each project from briefing and concept to applications and final delivery.'
        : 'Como designer independente, atendo clientes diretamente na criação de marcas, identidades visuais e materiais institucionais, promocionais e para redes sociais, conduzindo cada projeto do briefing e conceito às aplicações e arquivos finais.',
    };
    timelines.forEach((timeline) => {
      timeline.querySelectorAll(':scope > article').forEach((article) => {
        const role = article.querySelector('h3');
        const company = article.querySelector('b');
        const description = article.querySelector(':scope > p');
        if (!company || !description) return;
        const updated = details[company.textContent.trim()];
        if (updated && description.textContent !== updated) description.textContent = updated;
        if (!english && role?.textContent === 'DESIGNER GRÁFICO') role.textContent = 'DESIGNER GRÁFICA';
      });
    });
  }

  function enhanceContact(root = document) {
    const sections = root.matches?.('.contact') ? [root] : Array.from(root.querySelectorAll?.('.contact') || []);
    sections.forEach((section) => {
      const heading = section.querySelector(':scope > .mega');
      if (!heading || section.querySelector('.contact-gif')) return;
      const figure = document.createElement('figure');
      figure.className = 'contact-gif';
      figure.setAttribute('aria-hidden', 'true');
      const image = document.createElement('img');
      image.src = '/brand/brenda-about.gif';
      image.alt = '';
      image.loading = 'lazy';
      image.decoding = 'async';
      figure.append(image);
      heading.after(figure);
      section.classList.add('contact-with-gif');
    });
  }

  function enhanceFooterSignature() {
    const footer = document.querySelector('footer');
    if (!footer) return;

    const signatureText = 'BRENDA BALTIERI';

    let signature = document.querySelector('.footer-signature');
    let title = signature?.querySelector('h2');

    if (!signature) {
      signature = document.createElement('div');
      signature.className = 'footer-signature';
      signature.setAttribute('aria-label', 'Brenda Baltieri');

      title = document.createElement('h2');
      signature.append(title);
    }

    let morphLine = title?.querySelector('.footer-morph-line');
    if (title && !morphLine) {
      title.setAttribute('aria-label', signatureText);

      morphLine = document.createElement('span');
      morphLine.className = 'footer-morph-line';
      morphLine.setAttribute('aria-hidden', 'true');
      Array.from(signatureText).forEach((glyph) => {
        const letter = document.createElement('span');
        letter.className = 'footer-letter morph-letter';
        letter.dataset.glyph = glyph;
        morphLine.append(letter);
      });
      title.replaceChildren(morphLine);
    }
    title?.classList.add('morph-text');
    title?.querySelectorAll('.footer-letter').forEach((letter) => letter.classList.add('morph-letter'));
    if (signature.parentElement !== footer || signature !== footer.firstElementChild) footer.prepend(signature);

    let details = footer.querySelector(':scope > .footer-details');
    if (!details) {
      details = document.createElement('div');
      details.className = 'footer-details';
      signature.after(details);
    }

    const footerItems = Array.from(footer.children).filter((item) => item !== signature && item !== details);
    const backToTop = footerItems.find((item) => item.matches('a[href="#top"]'));
    footerItems.filter((item) => item !== backToTop).forEach((item) => details.append(item));

    const contact = document.querySelector('.contact');
    const socials = document.querySelector('.socials');
    if (contact && socials && socials.parentElement !== contact) {
      const copyRow = contact.querySelector('.contact-copy-row');
      if (copyRow) copyRow.after(socials);
      else contact.append(socials);
    }
    if (backToTop) details.append(backToTop);

    if (!footer.dataset.isolationObserver) {
      footer.dataset.isolationObserver = 'true';
      const observer = new IntersectionObserver(([entry]) => {
        document.body.classList.toggle('footer-isolated', entry.intersectionRatio >= .72);
      }, { threshold: [.72] });
      observer.observe(footer);
    }

    if (!title || !morphLine || title.dataset.morphReady) return;
    title.dataset.morphReady = 'true';

    const fitSignature = async () => {
      try {
        const faces = await Promise.all([
          document.fonts.load('800 100px "roc-grotesk"', signatureText),
          document.fonts.load('800 100px "roc-grotesk-compressed"', signatureText),
        ]);
        if (!signature.isConnected || faces.some((face) => !face.length)) return;
        const context = document.createElement('canvas').getContext('2d');
        if (!context) return;
        const letters = Array.from(morphLine.querySelectorAll('.footer-letter'));
        const heroTitle = document.querySelector('.hero .hero-stage > h1');
        const heroStyle = heroTitle ? getComputedStyle(heroTitle) : null;
        const heroSize = heroStyle ? parseFloat(heroStyle.fontSize) : 0;
        const tracking = heroSize > 0 ? (parseFloat(heroStyle.letterSpacing) || 0) / heroSize : -.08;
        const metrics = letters.map((letter) => {
          const glyph = letter.dataset.glyph || ' ';
          context.font = '800 1000px "roc-grotesk"';
          const base = context.measureText(glyph).width / 1000;
          context.font = '800 1000px "roc-grotesk-compressed"';
          const compressed = context.measureText(glyph).width / 1000;
          return { letter, base, compressed };
        });
        const baseTotal = metrics.reduce((sum, glyph) => sum + glyph.base, 0) + tracking * (letters.length - 1);
        const compressedTotal = metrics.reduce((sum, glyph) => sum + glyph.compressed, 0) + tracking * (letters.length - 1);
        const measure = () => {
          const sideInset = Math.min(76, Math.max(32, signature.clientWidth * .04));
          const available = Math.max(1, signature.clientWidth - sideInset * 2);
          if (baseTotal <= 0 || compressedTotal <= 0) return;

          const signatureScale = .88;
          const baseSize = available / baseTotal * signatureScale;
          const compressedSize = available / compressedTotal * signatureScale;
          const heightScale = compressedSize / baseSize;
          title.style.setProperty('--footer-base-size', `${baseSize}px`);
          title.style.setProperty('--footer-compressed-size', `${compressedSize}px`);
          title.style.setProperty('--footer-face-height', `${Math.max(baseSize, compressedSize) * .76}px`);
          title.style.setProperty('--footer-height-growth', `${heightScale - 1}`);
          morphLine.style.width = `${available * signatureScale}px`;

          metrics.forEach(({ letter, base, compressed }, index) => {
            const baseAdvance = base + (index < metrics.length - 1 ? tracking : 0);
            const compressedAdvance = (compressed + (index < metrics.length - 1 ? tracking : 0)) * heightScale;
            letter.style.setProperty('--footer-letter-base', `${baseAdvance}`);
            letter.style.setProperty('--footer-letter-growth', `${compressedAdvance - baseAdvance}`);
            letter.style.setProperty('--footer-letter-stretch', `${compressed * heightScale / base - 1}`);
          });
        };
        measure();
        window.addEventListener('resize', measure, { passive: true });
      } catch {
        // Keep the viewport-based CSS size if the hosted font is unavailable.
      }
    };
    void fitSignature();
    prepareGlyphMorph(title);
  }

  const softwarePanels = new WeakMap();
  let softwarePopover;

  function getSoftwarePopover() {
    if (softwarePopover) return softwarePopover;
    const panel = document.createElement('div');
    panel.className = 'software-popover';
    panel.id = 'software-proficiency';
    panel.setAttribute('role', 'tooltip');
    panel.hidden = true;
    document.body.append(panel);
    const state = { panel, button: null, timer: 0, frame: 0, point: null, pinned: false, sequence: 0 };
    state.hide = () => {
      state.sequence += 1;
      clearTimeout(state.timer);
      cancelAnimationFrame(state.frame);
      state.frame = 0;
      state.button?.removeAttribute('aria-describedby');
      state.button?.setAttribute('aria-expanded', 'false');
      state.button = null;
      state.panel.hidden = true;
      state.pinned = false;
    };
    state.move = (x, y) => {
      state.point = { x, y };
      if (state.frame) return;
      state.frame = requestAnimationFrame(() => {
        state.frame = 0;
        if (panel.hidden) return;
        if (!state.button?.isConnected) { state.hide(); return; }
        const width = panel.offsetWidth;
        const height = panel.offsetHeight;
        const margin = 12;
        const { x: px, y: py } = state.point;
        const gap = 56;
        const left = px + gap + width > innerWidth - margin ? px - width - gap : px + gap;
        const top = py - height / 2;
        panel.style.left = `${Math.max(margin, Math.min(left, innerWidth - width - margin))}px`;
        panel.style.top = `${Math.max(margin, Math.min(top, innerHeight - height - margin))}px`;
      });
    };
    state.leave = (button) => {
      if (state.pinned) return;
      const sequence = ++state.sequence;
      clearTimeout(state.timer);
      state.timer = setTimeout(() => {
        if (sequence === state.sequence && state.button === button && !state.pinned) state.hide();
      }, 120);
    };
    document.addEventListener('pointermove', (event) => {
      if (!panel.hidden && event.pointerType === 'mouse' && !state.pinned) state.move(event.clientX, event.clientY);
    }, { passive: true });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') state.hide(); });
    document.addEventListener('pointerdown', (event) => {
      if (state.button && !state.button.contains(event.target) && !panel.contains(event.target)) state.hide();
    }, { passive: true });
    window.addEventListener('scroll', state.hide, { passive: true });
    window.addEventListener('resize', state.hide, { passive: true });
    window.addEventListener('blur', state.hide);
    softwarePopover = state;
    return state;
  }

  function enhanceSoftwarePanel(section, language) {
    const columns = section.querySelector('.skill-cols');
    const rows = Array.from(columns?.querySelectorAll('b.software-skill') || []);
    if (!rows.length) return;
    let state = softwarePanels.get(columns);
    if (!state) {
      state = { language, bound: new WeakSet() };
      softwarePanels.set(columns, state);
    }
    if (state.language !== language) softwarePopover?.hide();
    state.language = language;
    columns.classList.add('software-hover-grid');
    const show = (row, index, button, event, pinned = false) => {
      const popup = getSoftwarePopover();
      clearTimeout(popup.timer);
      popup.sequence += 1;
      const en = state.language === 'en';
      const name = row.querySelector('.software-name').textContent.trim();
      const level = Math.max(0, Math.min(100, parseInt(row.querySelector('.software-level')?.textContent || '0', 10)));
      popup.button?.removeAttribute('aria-describedby');
      popup.button?.setAttribute('aria-expanded', 'false');
      popup.button = button;
      popup.pinned = pinned;
      button.setAttribute('aria-describedby', popup.panel.id);
      button.setAttribute('aria-expanded', 'true');
      const label = document.createElement('p');
      label.className = 'software-popover-index';
      label.textContent = `${String(index + 1).padStart(2, '0')} / SOFTWARE`;
      const title = document.createElement('h4');
      title.textContent = name;
      const value = document.createElement('strong');
      value.className = 'software-popover-value';
      value.textContent = `${level}%`;
      const scale = document.createElement('div');
      scale.className = 'software-popover-scale';
      scale.setAttribute('aria-hidden', 'true');
      for (let step = 0; step < 20; step += 1) {
        const bar = document.createElement('i');
        bar.style.setProperty('--bar-height', `${20 + step * 2}px`);
        bar.style.setProperty('--bar-fill', `${Math.max(0, Math.min(100, (level - step * 5) * 20))}%`);
        scale.append(bar);
      }
      const caption = document.createElement('p');
      caption.className = 'software-popover-caption';
      caption.textContent = en ? 'Self-assessed proficiency' : 'Nível de domínio autoavaliado';
      popup.panel.replaceChildren(label, title, value, scale, caption);
      popup.panel.hidden = false;
      const rect = button.getBoundingClientRect();
      popup.move(event?.clientX ?? rect.left + rect.width / 2, event?.clientY ?? rect.bottom);
    };
    rows.forEach((row, index) => {
      if (state.bound.has(row)) {
        row.querySelector('.software-select').setAttribute('aria-label', `${language === 'en' ? 'View proficiency:' : 'Ver nível de domínio:'} ${row.querySelector('.software-name').textContent}`);
        return;
      }
      state.bound.add(row);
      row.removeAttribute('tabindex');
      row.removeAttribute('aria-label');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'software-select';
      button.setAttribute('aria-label', `${language === 'en' ? 'View proficiency:' : 'Ver nível de domínio:'} ${row.querySelector('.software-name').textContent}`);
      button.setAttribute('aria-expanded', 'false');
      let pointerType = '';
      button.addEventListener('pointerdown', (event) => { pointerType = event.pointerType; });
      button.addEventListener('pointerenter', (event) => {
        if (event.pointerType === 'mouse') show(row, index, button, event);
      });
      button.addEventListener('pointermove', (event) => {
        if (event.pointerType === 'mouse' && softwarePopover?.button === button && !softwarePopover.pinned) softwarePopover.move(event.clientX, event.clientY);
      });
      button.addEventListener('pointerleave', () => softwarePopover?.leave(button));
      button.addEventListener('focus', () => { if (button.matches(':focus-visible')) show(row, index, button, null, true); });
      button.addEventListener('blur', () => softwarePopover?.hide());
      button.addEventListener('click', (event) => {
        if (pointerType === 'touch' || pointerType === 'pen') {
          if (softwarePopover?.button === button && softwarePopover.pinned) softwarePopover.hide();
          else show(row, index, button, null, true);
        } else if (event.detail === 0) show(row, index, button, null, true);
      });
      row.append(button);
    });
  }

  function enhanceEducationSection(section) {
    const education = section.querySelector('.education');
    const label = section.querySelector('.section-label');
    if (!education || !label) return;
    let heading = section.querySelector('.education-title');
    if (!heading) {
      heading = document.createElement('h2');
      heading.className = 'mega education-title';
      education.before(heading);
    }
    const title = label.textContent.includes('EDUCATION') ? 'EDUCATION' : 'FORMAÇÃO';
    if (heading.textContent !== title) heading.textContent = title;
    const courseworkLanguage = title === 'EDUCATION' ? 'en' : 'pt';
    enhanceSoftwarePanel(section, courseworkLanguage);
    const practicePanel = section.querySelector('.skill-cols > div:nth-child(2)');
    if (practicePanel) {
      let identityPractice = practicePanel.querySelector('[data-practice-added="identity"]');
      if (!identityPractice) {
        identityPractice = document.createElement('b');
        identityPractice.dataset.practiceAdded = 'identity';
        practicePanel.append(identityPractice);
      }
      const identityLabel = courseworkLanguage === 'en' ? 'VISUAL IDENTITY' : 'IDENTIDADE VISUAL';
      if (identityPractice.textContent !== identityLabel) identityPractice.textContent = identityLabel;
    }
    let coursework = education.querySelector('.education-coursework');
    if (!coursework) {
      coursework = document.createElement('div');
      coursework.className = 'education-coursework';
      education.append(coursework);
    }
    if (coursework.dataset.language !== courseworkLanguage) {
      const courseworkTitle = document.createElement('h3');
      courseworkTitle.textContent = courseworkLanguage === 'en' ? 'Selected studies' : 'Estudos em destaque';
      const subjects = courseworkLanguage === 'en'
        ? ['Image and visual identity', 'Visual languages and typography', 'Information and graphic design', 'Design methodology', 'Visual expression', 'Digital marketing']
        : ['Imagem e identidade visual', 'Linguagens visuais e tipografia', 'Informação e projeto gráfico', 'Metodologia de projeto', 'Expressão visual', 'Marketing digital'];
      const list = document.createElement('ul');
      subjects.forEach((subject) => {
        const item = document.createElement('li');
        item.textContent = subject;
        list.append(item);
      });
      coursework.dataset.language = courseworkLanguage;
      coursework.replaceChildren(courseworkTitle, list);
    }
    let profile = education.querySelector('.education-profile');
    if (!profile) {
      profile = document.createElement('p');
      profile.className = 'education-profile';
      education.append(profile);
    }
    const profileText = courseworkLanguage === 'en'
      ? 'This degree strengthened my approach to visual identity, typography and design methodology — knowledge I now apply to brands, packaging, campaigns and communication systems.'
      : 'A graduação fortaleceu meu olhar para identidade visual, tipografia e metodologia de projeto — repertório que hoje aplico na construção de marcas, embalagens, campanhas e sistemas de comunicação.';
    if (profile.textContent !== profileText) profile.textContent = profileText;
    if (!education.querySelector('.education-emblem')) {
      const brandMark = label.querySelector('.note-mark');
      if (brandMark) {
        const emblem = brandMark.cloneNode(true);
        emblem.classList.remove('note-mark');
        emblem.classList.add('education-emblem');
        emblem.setAttribute('aria-hidden', 'true');
        education.append(emblem);
      }
    }
  }

  function enhanceEducation(root = document) {
    if (root.matches?.('.skills')) enhanceEducationSection(root);
    root.querySelectorAll?.('.skills').forEach(enhanceEducationSection);
  }

  function createAsteriskOutline() {
    const points = [];
    const arms = 8;
    const outerRadius = 1;
    const innerRadius = 0.25;
    const halfTip = 0.092;

    for (let index = 0; index < arms; index += 1) {
      const angle = -Math.PI / 2 + index * Math.PI / 4;
      const before = angle - Math.PI / 8;
      const direction = { x: Math.cos(angle), y: Math.sin(angle) };
      const perpendicular = { x: -direction.y, y: direction.x };

      points.push({
        x: Math.cos(before) * innerRadius,
        y: Math.sin(before) * innerRadius,
      });
      points.push({
        x: direction.x * outerRadius - perpendicular.x * halfTip,
        y: direction.y * outerRadius - perpendicular.y * halfTip,
      });
      points.push({
        x: direction.x * outerRadius + perpendicular.x * halfTip,
        y: direction.y * outerRadius + perpendicular.y * halfTip,
      });
    }

    return points;
  }

  const heroRenderers = new WeakMap();

  function createAsteriskRenderer(canvas, hero) {
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return null;

    const outline = createAsteriskOutline();
    const depth = 0.32;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const state = { x: 0, y: 0, active: 0 };
    const target = { x: 0, y: 0, active: 0 };
    let frame = 0;
    let visible = true;
    let width = 0;
    let height = 0;
    let lastFrame = 0;
    let elapsed = 0;
    let spinAngle = 0.45;
    let spinBoostRemaining = 0;
    let destroyed = false;
    let previousClientPointer = null;
    const listeners = new AbortController();
    const observers = [];
    const stage = hero.querySelector('.hero-stage');
    const registration = document.createElement('div');
    registration.className = 'hero-registration';
    registration.setAttribute('aria-hidden', 'true');
    for (let index = 0; index < 4; index += 1) {
      registration.append(document.createElement('i'));
    }
    stage.prepend(registration);

    const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

    const rotate = (point, xAngle, yAngle, zAngle) => {
      const cosX = Math.cos(xAngle);
      const sinX = Math.sin(xAngle);
      const cosY = Math.cos(yAngle);
      const sinY = Math.sin(yAngle);
      const cosZ = Math.cos(zAngle);
      const sinZ = Math.sin(zAngle);
      const y1 = point.y * cosX - point.z * sinX;
      const z1 = point.y * sinX + point.z * cosX;
      const x2 = point.x * cosY + z1 * sinY;
      const z2 = -point.x * sinY + z1 * cosY;

      return {
        x: x2 * cosZ - y1 * sinZ,
        y: x2 * sinZ + y1 * cosZ,
        z: z2,
      };
    };

    const polygonNormal = (vertices) => {
      const first = vertices[0];
      const second = vertices[1];
      const third = vertices[2];
      const a = { x: second.x - first.x, y: second.y - first.y, z: second.z - first.z };
      const b = { x: third.x - first.x, y: third.y - first.y, z: third.z - first.z };
      const normal = {
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x,
      };
      const length = Math.hypot(normal.x, normal.y, normal.z) || 1;
      return { x: normal.x / length, y: normal.y / length, z: normal.z / length };
    };

    const resize = () => {
      // Layout dimensions exclude the entrance transform, avoiding blurry or
      // incorrectly sized backing buffers during the first animation.
      const rect = { width: canvas.clientWidth, height: canvas.clientHeight };
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      const nextWidth = Math.round(width * ratio);
      const nextHeight = Math.round(height * ratio);
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = (time = 0) => {
      if (!canvas.isConnected) {
        destroy();
        return;
      }
      if (destroyed || !visible || document.hidden) {
        frame = 0;
        return;
      }

      const mobile = window.innerWidth <= 760;
      const frameInterval = mobile ? 1000 / 36 : 1000 / 60;
      if (time - lastFrame < frameInterval) {
        frame = window.requestAnimationFrame(draw);
        return;
      }
      const delta = lastFrame ? Math.min(time - lastFrame, 60) : 16.67;
      lastFrame = time;
      if (!reducedMotion.matches) {
        elapsed += delta;
        // Integrate speed into the current angle so clicks never reset the
        // object's orientation. A new click renews, rather than stacks, boost.
        const boostBefore = spinBoostRemaining / 1800;
        spinBoostRemaining = Math.max(0, spinBoostRemaining - delta);
        const boostAfter = spinBoostRemaining / 1800;
        spinAngle += delta * .00026 + .022 * 1800 / 4 * (boostBefore ** 4 - boostAfter ** 4);
        spinAngle %= Math.PI * 2;
      }

      const pointerEase = 1 - Math.exp(-delta / 240);
      state.x += (target.x - state.x) * pointerEase;
      state.y += (target.y - state.y) * pointerEase;
      state.active += (target.active - state.active) * 0.06;
      registration.style.setProperty('--registration-x', `${Math.round(-state.x * 8)}px`);
      registration.style.setProperty('--registration-y', `${Math.round(-state.y * 6)}px`);

      const still = reducedMotion.matches;
      const xAngle = -0.25 + state.y * 0.34;
      const yAngle = (still ? 0.7 : spinAngle) + state.x * 0.58;
      const zAngle = still ? -0.12 : -0.1 + Math.sin(elapsed * 0.00022) * 0.12;
      const centerX = width * 0.5;
      const centerY = height * 0.5;
      const radius = Math.min(width, height) * (mobile ? 0.42 : 0.43);
      const camera = 4.3;

      context.clearRect(0, 0, width, height);

      const transformPoint = (point) => rotate(point, xAngle, yAngle, zAngle);
      const project = (point) => {
        const scale = camera / (camera - point.z);
        return {
          x: centerX + point.x * radius * scale,
          y: centerY + point.y * radius * scale,
          z: point.z,
        };
      };

      const front = outline.map((point) => transformPoint({ ...point, z: depth / 2 }));
      const back = outline.map((point) => transformPoint({ ...point, z: -depth / 2 }));
      const polygons = [];

      for (let index = 0; index < outline.length; index += 1) {
        const next = (index + 1) % outline.length;
        polygons.push({ kind: 'side', vertices: [front[index], back[index], back[next], front[next]] });
      }

      polygons.forEach((polygon) => {
        polygon.normal = polygonNormal(polygon.vertices);
        polygon.depth = polygon.vertices.reduce((sum, point) => sum + point.z, 0) / polygon.vertices.length;
      });
      polygons.sort((a, b) => a.depth - b.depth);

      // Each cap is ONE concave path. Separately antialiased triangles leave
      // hairline cracks even with strokes disabled. Draw visible caps last.
      const frontNormal = transformPoint({ x: 0, y: 0, z: 1 });
      polygons.push({ kind: 'front', vertices: front, normal: frontNormal });
      polygons.push({
        kind: 'back', vertices: [...back].reverse(),
        normal: { x: -frontNormal.x, y: -frontNormal.y, z: -frontNormal.z },
      });

      const light = { x: -0.42, y: -0.58, z: 0.7 };
      const frontGradient = context.createLinearGradient(
        centerX - radius * 0.62,
        centerY - radius * 0.72,
        centerX + radius * 0.66,
        centerY + radius * 0.78,
      );
      frontGradient.addColorStop(0, '#f1ffd9');
      frontGradient.addColorStop(0.28, '#c2ff73');
      frontGradient.addColorStop(0.72, '#adf05d');
      frontGradient.addColorStop(1, '#76a93c');

      polygons.forEach((polygon) => {
        const origin = polygon.vertices[0];
        const facingCamera = -polygon.normal.x * origin.x - polygon.normal.y * origin.y
          + polygon.normal.z * (camera - origin.z);
        if (facingCamera <= 0) return;
        const projected = polygon.vertices.map(project);
        const lightAmount = clamp(
          polygon.normal.x * light.x + polygon.normal.y * light.y + polygon.normal.z * light.z,
          -1,
          1,
        );

        context.beginPath();
        projected.forEach((point, index) => {
          if (index === 0) context.moveTo(point.x, point.y);
          else context.lineTo(point.x, point.y);
        });
        context.closePath();

        if (polygon.kind === 'front' || polygon.kind === 'back') {
          context.fillStyle = frontGradient;
        } else {
          const illumination = Math.max(0, lightAmount);
          const red = Math.round(54 + illumination * 50);
          const green = Math.round(9 + illumination * 22);
          const blue = Math.round(142 + illumination * 93);
          context.fillStyle = `rgb(${red}, ${green}, ${blue})`;
        }
        context.fill();
      });

      if (still) {
        frame = 0;
        return;
      }
      frame = window.requestAnimationFrame(draw);
    };

    const start = () => {
      if (!frame && visible && !document.hidden && !destroyed) frame = window.requestAnimationFrame(draw);
    };

    const onPointerMove = (event) => {
      if (window.innerWidth <= 760 || !finePointer.matches || reducedMotion.matches || document.hidden || !visible) return;
      if (event.pointerType && !['mouse', 'pen'].includes(event.pointerType)) return;
      // Only real pointer movement changes the print-registration alignment.
      const clientDistance = previousClientPointer
        ? Math.hypot(event.clientX - previousClientPointer.x, event.clientY - previousClientPointer.y) : 0;
      if (previousClientPointer && clientDistance < 1.5) return;
      previousClientPointer = { x: event.clientX, y: event.clientY };
      const stage = hero.querySelector('.hero-stage');
      const rect = stage?.getBoundingClientRect() ?? hero.getBoundingClientRect();
      const px = event.clientX - rect.left;
      const py = event.clientY - rect.top;
      if (px < 0 || py < 0 || px > rect.width || py > rect.height) return;
      target.x = clamp(((event.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2, -1, 1);
      target.y = clamp(((event.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2, -1, 1);
      target.active = 1;
      hero.classList.add('is-asterisk-active');
      start();
    };

    const onPointerLeave = () => {
      target.x = 0;
      target.y = 0;
      target.active = 0;
      previousClientPointer = null;
      hero.classList.remove('is-asterisk-active');
      start();
    };

    const eventOptions = { passive: true, signal: listeners.signal };
    const spinButton = canvas.parentElement;
    spinButton.disabled = reducedMotion.matches;
    spinButton.addEventListener('click', () => {
      if (reducedMotion.matches || document.hidden || !visible || destroyed) return;
      spinBoostRemaining = 1800;
      start();
    }, { signal: listeners.signal });
    stage.addEventListener('pointermove', onPointerMove, eventOptions);
    stage.addEventListener('pointerleave', onPointerLeave, eventOptions);
    stage.addEventListener('pointercancel', onPointerLeave, eventOptions);
    window.addEventListener('blur', onPointerLeave, eventOptions);
    window.addEventListener('scroll', onPointerLeave, eventOptions);

    if ('ResizeObserver' in window) {
      const resizeObserver = new ResizeObserver(() => {
        resize();
        start();
      });
      resizeObserver.observe(canvas);
      resizeObserver.observe(stage);
      observers.push(resizeObserver);
    } else {
      window.addEventListener('resize', () => {
        resize();
        start();
      }, eventOptions);
    }

    if ('IntersectionObserver' in window) {
      const intersectionObserver = new IntersectionObserver(([entry]) => {
        visible = Boolean(entry?.isIntersecting);
        lastFrame = 0;
        if (!visible) { spinBoostRemaining = 0; onPointerLeave(); }
        if (visible) start();
        else if (frame) {
          window.cancelAnimationFrame(frame);
          frame = 0;
        }
      }, { threshold: 0.02 });
      intersectionObserver.observe(hero);
      observers.push(intersectionObserver);
    }

    reducedMotion.addEventListener?.('change', () => {
      state.x = state.y = target.x = target.y = 0;
      target.active = state.active = 0;
      previousClientPointer = null;
      spinBoostRemaining = 0;
      spinButton.disabled = reducedMotion.matches;
      start();
    }, eventOptions);
    document.addEventListener('visibilitychange', () => {
      lastFrame = 0;
      if (document.hidden) {
        spinBoostRemaining = 0;
        window.cancelAnimationFrame(frame);
        frame = 0;
        target.x = target.y = target.active = 0;
        previousClientPointer = null;
      } else start();
    }, eventOptions);

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      window.cancelAnimationFrame(frame);
      listeners.abort();
      observers.forEach((observer) => observer.disconnect());
      registration.remove();
    }
    resize();
    start();

    return { start, destroy, canvas };
  }

  const heroHoverStates = new WeakMap();
  function enhanceHeroHover(hero, title) {
    const existing = heroHoverStates.get(hero);
    if (existing?.title === title) return;
    existing?.controller.abort();
    const controller = new AbortController();
    const options = { signal: controller.signal, passive: true };
    // The Adobe kit contains static faces, so font-family cannot interpolate.
    // Use ExtraWide metrics as width targets, but animate only one visible glyph.
    // This approximates inflation without overlapping different static outlines.
    const prepareInflation = async () => {
      try {
        const fonts = await Promise.all([
          document.fonts.load('800 100px "roc-grotesk"', 'BRENDA BALTIERI'),
          document.fonts.load('900 100px "roc-grotesk-extrawide"', 'BRENDA BALTIERI'),
        ]);
        if (controller.signal.aborted || !title.isConnected || fonts.some((face) => !face.length)) return;
        const context = document.createElement('canvas').getContext('2d');
        if (!context) return;
        const measure = () => {
          const style = getComputedStyle(title);
          const size = parseFloat(style.fontSize);
          const tracking = (parseFloat(style.letterSpacing) || 0) / size;
          title.style.setProperty('--hero-tracking', `${tracking}em`);
          title.querySelectorAll('.hero-name-line').forEach((line) => {
            const letters = Array.from(line.querySelectorAll('.hero-letter'));
            const metrics = letters.map((letter) => {
              const glyph = letter.textContent;
              context.font = '800 1000px "roc-grotesk"';
              const base = context.measureText(glyph).width / 1000;
              context.font = '900 1000px "roc-grotesk-extrawide"';
              const wide = context.measureText(glyph).width / 1000;
              return { letter, glyph, base, wide };
            });
            const baseTotal = metrics.reduce((sum, glyph) => sum + glyph.base, 0);
            const wideTotal = metrics.reduce((sum, glyph) => sum + glyph.wide, 0);
            const frameWidth = hero.querySelector('.hero-registration')?.clientWidth || title.clientWidth;
            const space = Math.max(1, (frameWidth - 96) / size - tracking * (letters.length - 1));
            const baseFit = Math.min(1, space / baseTotal);
            const wideFit = Math.min(1, space / wideTotal, baseTotal * baseFit * 1.12 / wideTotal);
            metrics.forEach(({ letter, glyph, base, wide }) => {
              if (!base || !wide) return;
              letter.dataset.glyph = glyph;
              letter.style.setProperty('--glyph-base', base * baseFit);
              letter.style.setProperty('--glyph-growth', wide * wideFit - base * baseFit);
              letter.style.setProperty('--glyph-base-scale', baseFit);
              letter.style.setProperty('--glyph-stretch', wide * wideFit / base - baseFit);
            });
          });
        };
        measure();
        title.classList.add('hero-inflate-ready');
        window.addEventListener('resize', measure, options);
      } catch {
        // Retain readable ExtraBold text if the font service is unavailable.
      }
    };
    void prepareInflation();
    const expand = (event) => {
      if (event.pointerType === 'touch') return;
      const bounds = hero.querySelector('.hero-registration')?.getBoundingClientRect();
      const inside = bounds && bounds.width > 0 && event.clientX >= bounds.left
        && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
      hero.classList.toggle('hero-name-expanded', Boolean(inside));
    };
    hero.addEventListener('pointerenter', expand, options);
    hero.addEventListener('pointermove', expand, options);
    hero.addEventListener('pointerleave', () => hero.classList.remove('hero-name-expanded'), options);
    hero.addEventListener('pointercancel', () => hero.classList.remove('hero-name-expanded'), options);
    heroHoverStates.set(hero, { title, controller });
  }

  function enhanceSpatialHeroElement(hero) {
    const stage = hero.querySelector('.hero-stage');
    const mark = hero.querySelector('.hero-stage > .hero-mark');
    const title = hero.querySelector('.hero-stage > h1:not(.hero-lens-title)');
    if (!stage || !mark || !title) return;
    enhanceHeroHover(hero, title);

    hero.classList.remove('hero-magnetic', 'is-magnetic-active');
    hero.classList.add('hero-spatial');
    stage.querySelectorAll(':scope > .hero-lens-title, :scope > .hero-echo-layer, :scope > .hero-field-meta')
      .forEach((element) => element.remove());

    let spatialAsterisk = stage.querySelector(':scope > .hero-asterisk-3d');
    if (!spatialAsterisk) {
      heroRenderers.get(hero)?.destroy();
      spatialAsterisk = document.createElement('button');
      spatialAsterisk.type = 'button';
      spatialAsterisk.className = 'hero-asterisk-3d';

      const canvas = document.createElement('canvas');
      canvas.className = 'hero-asterisk-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      spatialAsterisk.append(canvas);
      stage.insertBefore(spatialAsterisk, mark);
      const renderer = createAsteriskRenderer(canvas, hero);
      if (!renderer) {
        spatialAsterisk.remove();
        return;
      }
      heroRenderers.set(hero, renderer);
    } else if (spatialAsterisk.nextElementSibling !== mark) {
      stage.insertBefore(spatialAsterisk, mark);
    }

    spatialAsterisk.setAttribute('aria-label', document.documentElement.lang.startsWith('en')
      ? 'Spin the asterisk' : 'Girar o asterisco');

    hero.classList.add('has-spatial-asterisk');
    hero.dataset.spatialHero = 'true';
  }

  function enhanceSpatialHero(root = document) {
    if (root.matches?.('.hero')) enhanceSpatialHeroElement(root);
    root.querySelectorAll?.('.hero').forEach(enhanceSpatialHeroElement);
  }

  function buildHorizontalArchive() {
    const work = document.querySelector('.work');
    const grid = work?.querySelector('.project-grid');
    if (!work || !grid || grid.closest('.work-horizontal-shell')) return;

    const projects = Array.from(grid.querySelectorAll(':scope > .project'));
    if (!projects.length) return;

    const shell = document.createElement('div');
    shell.className = 'work-horizontal-shell';

    const sticky = document.createElement('div');
    sticky.className = 'work-horizontal-sticky';

    projects.forEach((project, index) => {
      project.id = `projeto-${String(index + 1).padStart(2, '0')}`;
      project.dataset.archiveIndex = String(index);
      project.classList.add('is-in-view');
    });

    grid.before(shell);
    sticky.append(grid);
    shell.append(sticky);

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;

    const updatePosition = () => {
      frame = 0;
      if (!shell.isConnected) return;

      const horizontal = window.innerWidth > 900 && !reducedMotion.matches;
      shell.classList.toggle('is-horizontal', horizontal);
      if (!horizontal) {
        shell.style.removeProperty('--horizontal-distance');
        grid.style.removeProperty('transform');
        return;
      }

      const distance = Math.max(0, grid.scrollWidth - sticky.clientWidth);
      shell.style.setProperty('--horizontal-distance', `${distance}px`);
      const travel = Math.max(1, shell.offsetHeight - sticky.offsetHeight);
      const progress = Math.max(0, Math.min(1, (66 - shell.getBoundingClientRect().top) / travel));
      grid.style.transform = `translate3d(${-distance * progress}px, 0, 0)`;
    };

    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updatePosition);
    };

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate, { passive: true });
    reducedMotion.addEventListener?.('change', requestUpdate);
    if ('ResizeObserver' in window) new ResizeObserver(requestUpdate).observe(grid);
    window.requestAnimationFrame(updatePosition);
    window.setTimeout(updatePosition, 600);
  }

  const observer = new MutationObserver((records) => {
    const changedHeroes = new Set();
    const changedAbout = new Set();
    const changedExperience = new Set();
    const changedEducation = new Set();
    for (const record of records) {
      const mutationElement = record.target instanceof Element
        ? record.target
        : record.target.parentElement;
      if (mutationElement) {
        const hero = mutationElement.closest('.hero');
        if (hero) changedHeroes.add(hero);
        const about = mutationElement.closest('.about-grid');
        if (about) changedAbout.add(about);
        const experience = mutationElement.closest('.experience');
        if (experience) changedExperience.add(experience);
        const education = mutationElement.closest('.skills');
        if (education) changedEducation.add(education);
      }
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches('img[src^="/projects/"]')) enhanceImage(node);
        enhanceImages(node);
        enhanceProjects(node);
        enhanceAbout(node);
        enhanceExperience(node);
        enhanceContact(node);
        enhanceFooterSignature();
        enhanceEducation(node);
        enhanceSpatialHero(node);
        buildHorizontalArchive();
      }
    }
    simplifyProfile();
    enhanceProjects();
    enhanceSiteNarrative();
    syncPageIsolation();
    changedHeroes.forEach((hero) => {
      if (hero.isConnected) enhanceSpatialHeroElement(hero);
      else heroRenderers.get(hero)?.destroy();
    });
    changedAbout.forEach((grid) => {
      if (grid.isConnected) enhanceAboutGrid(grid);
    });
    changedExperience.forEach((section) => {
      if (section.isConnected) enhanceExperience(section);
    });
    changedEducation.forEach((section) => {
      if (section.isConnected) enhanceEducationSection(section);
    });
  });

  // Let React finish hydrating the static document before adding the
  // progressive visual and interaction layers. Mutating the archive sooner
  // forces React to recover from a mismatched tree and can drop event handlers.
  window.setTimeout(() => {
    simplifyProfile();
    enhanceImages();
    enhanceProjects();
    enhanceAbout();
    enhanceExperience();
    enhanceContact();
    enhanceFooterSignature();
    enhanceEducation();
    enhanceSpatialHero();
    enhanceSiteNarrative();
    buildHorizontalArchive();
    syncPageIsolation();
    observer.observe(document.documentElement, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    void revealEnhancedSite();
  }, 1400);
})();
