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
      const rect = canvas.getBoundingClientRect();
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
      if (!visible || !canvas.isConnected) {
        frame = 0;
        return;
      }

      const mobile = window.innerWidth <= 760;
      const frameInterval = mobile ? 1000 / 36 : 1000 / 60;
      if (time - lastFrame < frameInterval) {
        frame = window.requestAnimationFrame(draw);
        return;
      }
      lastFrame = time;

      state.x += (target.x - state.x) * 0.055;
      state.y += (target.y - state.y) * 0.055;
      state.active += (target.active - state.active) * 0.06;
      hero.style.setProperty('--hero-wave-x', `${(state.x * 24).toFixed(2)}px`);
      hero.style.setProperty('--hero-wave-y', `${(state.y * 14).toFixed(2)}px`);

      const still = reducedMotion.matches;
      const xAngle = -0.25 + state.y * 0.34;
      const yAngle = (still ? 0.7 : time * 0.00031) + state.x * 0.58;
      const zAngle = still ? -0.12 : -0.1 + Math.sin(time * 0.00022) * 0.12;
      const centerX = width * (0.5 + state.x * 0.025);
      const centerY = height * (0.5 + state.y * 0.025);
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
      const frontCenter = transformPoint({ x: 0, y: 0, z: depth / 2 });
      const backCenter = transformPoint({ x: 0, y: 0, z: -depth / 2 });
      const polygons = [];

      for (let index = 0; index < outline.length; index += 1) {
        const next = (index + 1) % outline.length;
        polygons.push({ kind: 'front', vertices: [frontCenter, front[index], front[next]] });
        polygons.push({ kind: 'back', vertices: [backCenter, back[next], back[index]] });
        polygons.push({ kind: 'side', vertices: [front[index], back[index], back[next], front[next]] });
      }

      polygons.forEach((polygon) => {
        polygon.normal = polygonNormal(polygon.vertices);
        polygon.depth = polygon.vertices.reduce((sum, point) => sum + point.z, 0) / polygon.vertices.length;
      });
      polygons.sort((a, b) => a.depth - b.depth);

      const projectedFront = front.map(project);
      context.save();
      context.beginPath();
      projectedFront.forEach((point, index) => {
        if (index === 0) context.moveTo(point.x + 14, point.y + 18);
        else context.lineTo(point.x + 14, point.y + 18);
      });
      context.closePath();
      context.fillStyle = 'rgba(0, 0, 0, .4)';
      context.shadowColor = 'rgba(89, 15, 232, .72)';
      context.shadowBlur = 38 + state.active * 16;
      context.fill();
      context.restore();

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
        if (polygon.normal.z <= -0.035) return;
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

        if (polygon.kind === 'front') {
          context.fillStyle = frontGradient;
        } else if (polygon.kind === 'back') {
          const luminosity = Math.round(40 + Math.max(0, lightAmount) * 45);
          context.fillStyle = `rgb(${luminosity}, 16, ${Math.min(150, luminosity + 78)})`;
        } else {
          const illumination = Math.max(0, lightAmount);
          const red = Math.round(54 + illumination * 50);
          const green = Math.round(9 + illumination * 22);
          const blue = Math.round(142 + illumination * 93);
          context.fillStyle = `rgb(${red}, ${green}, ${blue})`;
        }
        context.fill();
        if (polygon.kind === 'side') {
          context.strokeStyle = 'rgba(194, 255, 115, .16)';
          context.lineWidth = 0.7;
          context.stroke();
        }
      });

      const frontNormal = polygonNormal([frontCenter, front[0], front[1]]);
      if (frontNormal.z > 0) {
        context.beginPath();
        projectedFront.forEach((point, index) => {
          if (index === 0) context.moveTo(point.x, point.y);
          else context.lineTo(point.x, point.y);
        });
        context.closePath();
        context.strokeStyle = 'rgba(241, 255, 217, .72)';
        context.lineWidth = 1.1;
        context.stroke();
      }

      if (still) {
        frame = 0;
        return;
      }
      frame = window.requestAnimationFrame(draw);
    };

    const start = () => {
      if (!frame && visible) frame = window.requestAnimationFrame(draw);
    };

    const onPointerMove = (event) => {
      if (!finePointer.matches || reducedMotion.matches) return;
      const stage = hero.querySelector('.hero-stage');
      const rect = stage?.getBoundingClientRect() ?? hero.getBoundingClientRect();
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
      hero.style.setProperty('--hero-wave-x', '0px');
      hero.style.setProperty('--hero-wave-y', '0px');
      hero.classList.remove('is-asterisk-active');
      start();
    };

    hero.addEventListener('pointermove', onPointerMove, { passive: true });
    hero.addEventListener('pointerleave', onPointerLeave, { passive: true });

    if ('ResizeObserver' in window) {
      const resizeObserver = new ResizeObserver(() => {
        resize();
        start();
      });
      resizeObserver.observe(canvas);
    } else {
      window.addEventListener('resize', () => {
        resize();
        start();
      }, { passive: true });
    }

    if ('IntersectionObserver' in window) {
      const intersectionObserver = new IntersectionObserver(([entry]) => {
        visible = Boolean(entry?.isIntersecting);
        if (visible) start();
        else if (frame) {
          window.cancelAnimationFrame(frame);
          frame = 0;
        }
      }, { threshold: 0.02 });
      intersectionObserver.observe(hero);
    }

    reducedMotion.addEventListener?.('change', start);
    resize();
    start();

    return { start };
  }

  function enhanceSpatialHeroElement(hero) {
    const stage = hero.querySelector('.hero-stage');
    const mark = hero.querySelector('.hero-stage > .hero-mark');
    const title = hero.querySelector('.hero-stage > h1:not(.hero-lens-title)');
    if (!stage || !mark || !title) return;

    hero.classList.remove('hero-magnetic', 'is-magnetic-active');
    hero.classList.add('hero-spatial');
    stage.querySelectorAll(':scope > .hero-lens-title, :scope > .hero-echo-layer, :scope > .hero-field-meta')
      .forEach((element) => element.remove());

    let spatialAsterisk = stage.querySelector(':scope > .hero-asterisk-3d');
    if (!spatialAsterisk) {
      spatialAsterisk = document.createElement('div');
      spatialAsterisk.className = 'hero-asterisk-3d';
      spatialAsterisk.setAttribute('aria-hidden', 'true');

      const canvas = document.createElement('canvas');
      canvas.className = 'hero-asterisk-canvas';
      spatialAsterisk.append(canvas);
      stage.insertBefore(spatialAsterisk, mark);
      if (!createAsteriskRenderer(canvas, hero)) {
        spatialAsterisk.remove();
        return;
      }
    } else if (spatialAsterisk.nextElementSibling !== mark) {
      stage.insertBefore(spatialAsterisk, mark);
    }

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
  window.setTimeout(enhanceSpatialHero, 1400);

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches('img[src^="/projects/"]')) enhanceImage(node);
        enhanceImages(node);
        enhanceProjects(node);
        enhanceAbout(node);
        enhanceSpatialHero(node);
        buildHorizontalArchive();
      }
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
