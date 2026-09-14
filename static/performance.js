(() => {
  const projectImagePattern = /^\/projects\/.*\.(?:webp|png)$/i;

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
    if (project.dataset.interactiveImage === 'true') return;

    const image = project.querySelector('.project-image');
    const opener = project.querySelector('.project-open');
    if (!image || !opener) return;

    image.setAttribute('role', 'button');
    image.setAttribute('tabindex', '0');
    image.setAttribute('aria-label', opener.getAttribute('aria-label') || 'Abrir projeto');
    image.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      opener.click();
    });
    project.addEventListener('click', (event) => {
      const separateAction = event.target.closest('button, a');
      if (separateAction && separateAction !== opener) return;
      if (event.target !== opener) opener.click();
    });
    project.dataset.interactiveImage = 'true';
  }

  function enhanceProjects(root = document) {
    if (root.matches?.('.project-grid > .project')) enhanceProject(root);
    root.querySelectorAll?.('.project-grid > .project').forEach(enhanceProject);
  }

  function enhanceAboutGrid(grid) {
    const copy = grid.querySelector('.about-copy');
    if (!copy) return;
    const english = document.documentElement.lang.startsWith('en');
    const lead = english
      ? 'I am a graphic designer, graduated from Universidade São Judas Tadeu, and currently part of the Sadhu Group team. My path spans branding, visual communication, packaging and social media — fields where I turn strategy into clear, consistent visual systems with personality.'
      : 'Sou designer gráfica, formada pela Universidade São Judas Tadeu, e atualmente faço parte do time da Sadhu Group. Minha trajetória passa por branding, comunicação visual, embalagens e social media — áreas em que transformo estratégia em sistemas visuais claros, consistentes e cheios de personalidade.';
    const detail = english
      ? 'From concept to rollout, I enjoy building brands that work across identities, logos, advertising, digital pieces and print. I speak advanced English and am open to new work opportunities in São Paulo or remotely.'
      : 'Do conceito ao desdobramento, gosto de construir marcas que funcionam em identidades, logotipos, peças publicitárias, materiais digitais e impressos. Tenho inglês avançado e estou aberta a novas oportunidades de trabalho, em São Paulo ou remotamente.';
    const paragraph = copy.querySelector(':scope > p');
    const small = copy.querySelector(':scope > small');
    if (paragraph && paragraph.textContent !== lead) paragraph.textContent = lead;
    if (small && small.textContent !== detail) small.textContent = detail;
    grid.querySelectorAll('.portrait-placeholder, .about-gif').forEach((portrait) => portrait.remove());
    if (!grid.querySelector('.about-photo-space')) {
      const space = document.createElement('div');
      space.className = 'about-photo-space';
      space.setAttribute('aria-hidden', 'true');
      grid.prepend(space);
    }
    grid.classList.remove('about-gif-layout');
    grid.classList.add('about-photo-layout');
  }

  function enhanceAbout(root = document) {
    if (root.matches?.('.about-grid')) enhanceAboutGrid(root);
    root.querySelectorAll?.('.about-grid').forEach(enhanceAboutGrid);
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

    let signature = document.querySelector('.footer-signature');
    let title = signature?.querySelector('h2');
    const created = !signature;

    if (!signature) {
      signature = document.createElement('div');
      signature.className = 'footer-signature';
      signature.setAttribute('aria-label', 'Brenda Baltieri');

      title = document.createElement('h2');
      title.textContent = 'BRENDA BALTIERI';
      signature.append(title);
    }
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

    const socials = document.querySelector('.contact .socials');
    if (socials) details.append(socials);
    if (backToTop) details.append(backToTop);

    if (!created || !title) return;

    const measureExpansion = async () => {
      try {
        const faces = await Promise.all([
          document.fonts.load('800 100px "roc-grotesk"', title.textContent),
          document.fonts.load('900 100px "roc-grotesk-extrawide"', title.textContent),
        ]);
        if (!signature.isConnected || faces.some((face) => !face.length)) return;
        const context = document.createElement('canvas').getContext('2d');
        if (!context) return;
        const measure = () => {
          const size = parseFloat(getComputedStyle(title).fontSize);
          context.font = '800 1000px "roc-grotesk"';
          const base = context.measureText(title.textContent).width;
          context.font = '900 1000px "roc-grotesk-extrawide"';
          const wide = context.measureText(title.textContent).width;
          const renderedBase = base / 1000 * size;
          const available = Math.max(1, signature.clientWidth - 64);
          title.style.setProperty('--footer-wide-scale', Math.min(wide / base, available / renderedBase).toFixed(4));
        };
        measure();
        window.addEventListener('resize', measure, { passive: true });
      } catch {
        // Keep the restrained CSS expansion if the hosted font is unavailable.
      }
    };
    void measureExpansion();
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

  enhanceImages();
  enhanceProjects();
  enhanceAbout();
  enhanceExperience();
  enhanceContact();
  enhanceFooterSignature();
  enhanceEducation();
  enhanceSpatialHero();

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

  // The portfolio hydrates after the static HTML appears. Run once now for a
  // quick first paint, then once more after hydration so the editorial shell
  // remains present even when React replaces the initial project grid.
  buildHorizontalArchive();
  window.setTimeout(buildHorizontalArchive, 1400);
  window.setTimeout(enhanceAbout, 1400);
  window.setTimeout(enhanceExperience, 1400);
  window.setTimeout(enhanceContact, 1400);
  window.setTimeout(enhanceFooterSignature, 1400);
  window.setTimeout(enhanceEducation, 1400);
  window.setTimeout(enhanceSpatialHero, 1400);

  const observer = new MutationObserver((records) => {
    const changedHeroes = new Set();
    const changedAbout = new Set();
    const changedExperience = new Set();
    const changedEducation = new Set();
    for (const record of records) {
      if (record.target instanceof Element) {
        const hero = record.target.closest('.hero');
        if (hero) changedHeroes.add(hero);
        const about = record.target.closest('.about-grid');
        if (about) changedAbout.add(about);
        const experience = record.target.closest('.experience');
        if (experience) changedExperience.add(experience);
        const education = record.target.closest('.skills');
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

  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
