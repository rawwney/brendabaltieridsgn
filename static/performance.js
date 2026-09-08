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
    if (grid.dataset.aboutGif === 'true') return;

    const copy = grid.querySelector('.about-copy');
    if (!copy) return;

    grid.querySelectorAll('.portrait-placeholder').forEach((portrait) => portrait.remove());

    const figure = document.createElement('figure');
    figure.className = 'about-gif';

    const image = document.createElement('img');
    image.src = '/brand/brenda-about.gif';
    image.alt = 'Ilustração animada de Brenda Baltieri com fones verdes';
    image.loading = 'lazy';
    image.decoding = 'async';

    figure.append(image);
    copy.before(figure);
    grid.classList.add('about-gif-layout');
    grid.dataset.aboutGif = 'true';
  }

  function enhanceAbout(root = document) {
    if (root.matches?.('.about-grid')) enhanceAboutGrid(root);
    root.querySelectorAll?.('.about-grid').forEach(enhanceAboutGrid);
  }

  function enhanceMagneticHeroElement(hero) {
    if (hero.dataset.magneticHero === 'true') return;

    const stage = hero.querySelector('.hero-stage');
    const mark = hero.querySelector('.hero-stage > .hero-mark');
    const letters = Array.from(hero.querySelectorAll('h1 .hero-letter'));
    if (!stage || !mark || !letters.length) return;

    hero.classList.add('hero-magnetic');
    hero.dataset.magneticHero = 'true';

    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!finePointer.matches || reducedMotion.matches) return;

    const state = { x: 0, y: 0, rotation: 0 };
    const target = { x: 0, y: 0, rotation: 0 };
    let frame = 0;
    let rotationTimer = 0;

    const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

    const render = () => {
      frame = 0;
      state.x += (target.x - state.x) * 0.105;
      state.y += (target.y - state.y) * 0.105;
      state.rotation += (target.rotation - state.rotation) * 0.09;

      hero.style.setProperty('--magnetic-x', `${state.x.toFixed(2)}px`);
      hero.style.setProperty('--magnetic-y', `${state.y.toFixed(2)}px`);
      hero.style.setProperty('--magnetic-r', `${state.rotation.toFixed(2)}deg`);

      const moving = Math.abs(target.x - state.x) > 0.08
        || Math.abs(target.y - state.y) > 0.08
        || Math.abs(target.rotation - state.rotation) > 0.08;
      if (moving) frame = window.requestAnimationFrame(render);
    };

    const requestRender = () => {
      if (!frame) frame = window.requestAnimationFrame(render);
    };

    const resetLetters = () => {
      letters.forEach((letter) => {
        letter.style.removeProperty('--letter-push-x');
        letter.style.removeProperty('--letter-push-y');
      });
    };

    const reactLetters = (pointerX, pointerY) => {
      const radius = Math.min(190, window.innerWidth * 0.12);
      const measurements = letters.map((letter) => {
        const rect = letter.getBoundingClientRect();
        const dx = rect.left + rect.width / 2 - pointerX;
        const dy = rect.top + rect.height / 2 - pointerY;
        const distance = Math.hypot(dx, dy);
        return { letter, dx, dy, distance };
      });

      measurements.forEach(({ letter, dx, dy, distance }) => {
        if (!distance || distance >= radius) {
          letter.style.setProperty('--letter-push-x', '0px');
          letter.style.setProperty('--letter-push-y', '0px');
          return;
        }

        const force = Math.pow(1 - distance / radius, 1.6) * 16;
        letter.style.setProperty('--letter-push-x', `${(dx / distance * force).toFixed(2)}px`);
        letter.style.setProperty('--letter-push-y', `${(dy / distance * force).toFixed(2)}px`);
      });
    };

    hero.addEventListener('pointermove', (event) => {
      const rect = stage.getBoundingClientRect();
      const horizontal = (event.clientX - rect.left) / Math.max(1, rect.width);
      const vertical = (event.clientY - rect.top) / Math.max(1, rect.height);

      target.x = clamp((horizontal - 0.72) * rect.width * 0.16, -175, 90);
      target.y = clamp((vertical - 0.48) * rect.height * 0.18, -82, 82);
      target.rotation = clamp(event.movementX * 0.65 + (horizontal - 0.5) * 10, -18, 18);
      hero.classList.add('is-magnetic-active');
      reactLetters(event.clientX, event.clientY);
      requestRender();

      window.clearTimeout(rotationTimer);
      rotationTimer = window.setTimeout(() => {
        target.rotation = (horizontal - 0.5) * 6;
        requestRender();
      }, 90);
    });

    hero.addEventListener('pointerleave', () => {
      target.x = 0;
      target.y = 0;
      target.rotation = 0;
      hero.classList.remove('is-magnetic-active');
      resetLetters();
      requestRender();
    });
  }

  function enhanceMagneticHero(root = document) {
    if (root.matches?.('.hero')) enhanceMagneticHeroElement(root);
    root.querySelectorAll?.('.hero').forEach(enhanceMagneticHeroElement);
  }

  enhanceImages();
  enhanceProjects();
  enhanceAbout();
  enhanceMagneticHero();

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
  window.setTimeout(enhanceMagneticHero, 1400);

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches('img[src^="/projects/"]')) enhanceImage(node);
        enhanceImages(node);
        enhanceProjects(node);
        enhanceAbout(node);
        enhanceMagneticHero(node);
        buildHorizontalArchive();
      }
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
