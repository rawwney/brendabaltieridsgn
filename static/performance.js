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

  enhanceImages();
  enhanceProjects();

  function buildProjectArchive() {
    const work = document.querySelector('.work');
    const grid = work?.querySelector('.project-grid');
    if (!work || !grid || grid.closest('.work-projects-shell')) return;

    const projects = Array.from(grid.querySelectorAll(':scope > .project'));
    if (!projects.length) return;

    const shell = document.createElement('div');
    shell.className = 'work-projects-shell';

    const rail = document.createElement('nav');
    rail.className = 'project-rail';
    rail.setAttribute('aria-label', 'Informações sobre os projetos selecionados');
    rail.innerHTML = '<div class="project-rail__masthead"><span class="project-rail__vertical">SELECTED WORKS</span><div class="project-rail__context"><span>01 / PROJETOS</span><strong class="project-rail__current">01</strong><span class="project-rail__total">DE 00</span><p>ARQUIVO VISUAL<br>2024 — 2026</p><p>SÃO PAULO / BRASIL<br>REMOTO MUNDIAL</p></div></div>';
    rail.querySelector('.project-rail__total').textContent = `DE ${String(projects.length).padStart(2, '0')}`;

    projects.forEach((project, index) => {
      project.style.setProperty('--project-order', String(index % 4));
      project.id = `projeto-${String(index + 1).padStart(2, '0')}`;
      project.dataset.archiveIndex = String(index);
    });

    grid.before(shell);
    shell.append(rail, grid);

    const setActive = (index) => {
      rail.querySelector('.project-rail__current').textContent = String(index + 1).padStart(2, '0');
    };

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        visible.forEach((entry) => entry.target.classList.add('is-in-view'));
        if (visible.length) {
          visible.sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top));
          setActive(Number(visible[0].target.dataset.archiveIndex));
        }
      }, { rootMargin: '-18% 0px -45% 0px', threshold: 0.08 });
      projects.forEach((project) => observer.observe(project));
    } else {
      projects.forEach((project) => project.classList.add('is-in-view'));
    }
    setActive(0);
  }

  // The portfolio hydrates after the static HTML appears. Run once now for a
  // quick first paint, then once more after hydration so the editorial shell
  // remains present even when React replaces the initial project grid.
  buildProjectArchive();
  window.setTimeout(buildProjectArchive, 1400);

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches('img[src^="/projects/"]')) enhanceImage(node);
        enhanceImages(node);
        enhanceProjects(node);
        buildProjectArchive();
      }
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
