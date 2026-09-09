// Soften only the paint mask, leaving the text and animated illustration sharp.
export function portfolioSoftAboutMask(svg, element) {
  if (!element.classList.contains('about-underlay')) return svg;
  return svg.replace(/(<svg\b[^>]*>)([\s\S]*)(<\/svg>)/, (_, open, strokes, close) =>
    open
    + '<defs><filter id="soft-edge" filterUnits="userSpaceOnUse" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">'
    + '<feGaussianBlur stdDeviation="10"/></filter>'
    + '<mask id="paint-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%" style="mask-type:luminance">'
    + '<rect width="100%" height="100%" fill="black"/>'
    + '<g filter="url(#soft-edge)">' + strokes + '</g></mask></defs>'
    + '<rect width="100%" height="100%" fill="white" mask="url(#paint-mask)"/>'
    + close);
}

export function patchAboutBrush(bundle) {
  const start = bundle.indexOf('function b({ignore:');
  const end = bundle.indexOf('function x({language:', start);
  if (start < 0 || end < 0) throw new Error('About brush implementation changed; review soft-mask integration.');
  const brush = bundle.slice(start, end);
  if (brush.split('encodeURIComponent(a)').length !== 2
      || bundle.split('ref:b({radius:82,modeRef:t})').length !== 2) {
    throw new Error('About brush anchors changed; refusing a partial patch.');
  }
  return (bundle.slice(0, start)
    + brush.replace('encodeURIComponent(a)', 'encodeURIComponent(portfolioSoftAboutMask(a,r))')
    + bundle.slice(end))
    .replace('ref:b({radius:82,modeRef:t})', 'ref:b({radius:64,modeRef:t})')
    + '\n' + portfolioSoftAboutMask.toString() + '\n';
}
