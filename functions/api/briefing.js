const DESTINATION_EMAIL = 'brenda.baltieri01@gmail.com';
const ALLOWED_ORIGINS = new Set([
  'https://brendabaltieridsgn.pages.dev',
  'https://brendabaltieridsgn.brenda-lazarete.chatgpt.site',
]);

const responseHeaders = (request) => {
  const origin = request.headers.get('origin');
  const allowedOrigin = ALLOWED_ORIGINS.has(origin)
    ? origin
    : 'https://brendabaltieridsgn.pages.dev';
  return {
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-origin': allowedOrigin,
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
    'x-content-type-options': 'nosniff',
  };
};

const json = (request, body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: responseHeaders(request),
});

const clean = (value, maxLength) => typeof value === 'string'
  ? value.trim().slice(0, maxLength)
  : '';

export function onRequestOptions({ request }) {
  return new Response(null, { status: 204, headers: responseHeaders(request) });
}

export async function onRequestPost({ request }) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json(request, { ok: false, error: 'Invalid JSON.' }, 400);
  }

  // Bots tend to fill fields that are visually hidden. Return a neutral success
  // without forwarding those submissions.
  if (clean(payload?.website, 200)) return json(request, { ok: true });

  const name = clean(payload?.name, 120);
  const email = clean(payload?.email, 180);
  const phone = clean(payload?.phone, 80);
  const service = clean(payload?.service, 120);
  const details = clean(payload?.details, 5000);
  const language = payload?.language === 'en' ? 'en' : 'pt';
  const sourceUrl = clean(payload?.sourceUrl, 500);
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!name || !emailPattern.test(email) || !service || !details) {
    return json(request, { ok: false, error: 'Missing or invalid fields.' }, 400);
  }

  const subject = language === 'en'
    ? `New portfolio brief — ${service} — ${name}`
    : `Novo briefing pelo portfólio — ${service} — ${name}`;

  const upstream = await fetch(`https://formsubmit.co/ajax/${DESTINATION_EMAIL}`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      origin: 'https://brendabaltieridsgn.pages.dev',
      referer: 'https://brendabaltieridsgn.pages.dev/',
    },
    body: JSON.stringify({
      Nome: name,
      'E-mail': email,
      'WhatsApp / telefone': phone || '-',
      'Serviço': service,
      'Detalhes do projeto': details,
      Idioma: language === 'en' ? 'English' : 'Português',
      Origem: sourceUrl || 'Portfolio website',
      _replyto: email,
      _subject: subject,
      _template: 'table',
      _captcha: 'false',
      _honey: '',
    }),
  });

  let upstreamResult = null;
  try {
    upstreamResult = await upstream.json();
  } catch {
    // FormSubmit occasionally returns an empty body even when the request was
    // accepted. The HTTP status remains the authoritative signal.
  }

  const activationPending = upstreamResult?.success === 'false'
    && /activation/i.test(upstreamResult?.message || '');

  if (!upstream.ok || (upstreamResult?.success === 'false' && !activationPending)) {
    return json(request, { ok: false, error: 'Delivery service unavailable.' }, 502);
  }

  return json(request, { ok: true, activationPending });
}
