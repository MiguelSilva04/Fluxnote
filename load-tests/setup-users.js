/**
 * setup-users.js
 *
 * Script k6 para pré-criar e ativar os 150 utilizadores de teste.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = 'http://localhost:5230';

export const options = {
  vus: 1,
  iterations: 150,
};

export default function () {
  const i = __ITER + 1;
  const padded = String(i).padStart(3, '0');
  const email = `loadtest${padded}@fluxnote-test.com`;

  const registerRes = http.post(
    `${BASE_URL}/api/auth/register`,
    JSON.stringify({
      email,
      fullName: `Load Test ${padded}`,
      password: 'LoadTest@1234',
      lang: 'pt',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  const registered = check(registerRes, {
    [`${padded} registado`]: (r) => r.status === 200 || r.status === 201,
  });

  if (!registered) {
    if (registerRes.status !== 409) {
      console.warn(`Falhou registo loadtest${padded}: HTTP ${registerRes.status} — ${registerRes.body?.substring(0, 200)}`);
      return;
    }
  }

  sleep(0.1);

  const linkRes = http.get(
    `${BASE_URL}/api/auth/dev/last-confirmation-link?email=${encodeURIComponent(email)}`
  );

  const gotLink = check(linkRes, {
    [`${padded} link obtido`]: (r) => r.status === 200,
  });

  if (!gotLink) {
    console.warn(`Sem link de confirmação para loadtest${padded}: HTTP ${linkRes.status}`);
    return;
  }

  const confirmationLink = linkRes.json('confirmationLink');
  if (!confirmationLink) {
    console.warn(`Link vazio para loadtest${padded}`);
    return;
  }

  sleep(0.1);
  
  const qs = confirmationLink.split('?')[1] || '';
  const params = {};
  qs.split('&').forEach((pair) => {
    const [k, v] = pair.split('=');
    params[decodeURIComponent(k)] = decodeURIComponent(v || '');
  });
  const userId = params['userId'];
  const token  = params['token'];

  const confirmRes = http.get(
    `${BASE_URL}/api/auth/confirm-email?userId=${encodeURIComponent(userId)}&token=${encodeURIComponent(token)}`
  );

  const activated = check(confirmRes, {
    [`${padded} ativado`]: (r) => r.status === 200,
  });

  if (!activated) {
    console.warn(`Falhou ativação loadtest${padded}: HTTP ${confirmRes.status} — ${confirmRes.body?.substring(0, 200)}`);
  }

  sleep(0.1);
}
