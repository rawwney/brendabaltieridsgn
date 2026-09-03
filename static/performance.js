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
    rail.setAttribute('aria-label', 'Índice de projetos');
    rail.innerHTML = '<div class="project-rail__heading"><span>ÍNDICE / OBRAS</span><span class="project-rail__count">00</span></div><div class="project-rail__list"></div>';
    rail.querySelector('.project-rail__count').textContent = String(projects.length).padStart(2, '0');
    const list = rail.querySelector('.project-rail__list');

    projects.forEach((project, index) => {
      project.style.setProperty('--project-order', String(index % 4));
      project.id = `projeto-${String(index + 1).padStart(2, '0')}`;
      const title = project.querySelector('.project-title')?.textContent?.trim() || `Projeto ${index + 1}`;
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'project-rail__item';
      item.setAttribute('aria-label', `Ir para ${title}`);
      item.innerHTML = `<span class="project-rail__number">${String(index + 1).padStart(2, '0')}</span><span class="project-rail__name"></span><span class="project-rail__arrow">↘</span>`;
      item.querySelector('.project-rail__name').textContent = title;
      item.addEventListener('click', () => project.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      list.append(item);
      project.dataset.archiveIndex = String(index);
    });

    grid.before(shell);
    shell.append(rail, grid);

    const setActive = (index) => {
      list.querySelectorAll('.project-rail__item').forEach((item, itemIndex) => {
        item.toggleAttribute('aria-current', itemIndex === index);
      });
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

  buildProjectArchive();

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches('img[src^="/projects/"]')) enhanceImage(node);
        enhanceImages(node);
        enhanceProjects(node);
      }
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
