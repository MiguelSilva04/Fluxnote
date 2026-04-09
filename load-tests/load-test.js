/**
 * load-test.js — Teste de Carga
 *
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = 'https://localhost:7041';

// --- Métricas personalizadas por endpoint ---
const listDocsDuration = new Trend('duration_list_docs', true);
const createDocDuration = new Trend('duration_create_doc', true);
const updateDocDuration = new Trend('duration_update_doc', true);
const profileDuration  = new Trend('duration_profile',  true);
const errorRate        = new Rate('errors');

// --- Opções do teste ---
export const options = {
  stages: [
    { duration: '10s', target: 10 }, // Ramp-up
    { duration: '3m',  target: 10 }, // Patamar sustentado
    { duration: '10s', target: 0  }, // Ramp-down
  ],

  setupTimeout: '120s',
  insecureSkipTLSVerify: true,

  thresholds: {
    // Latência global P95 < 800ms (exclui cleanup e setup)
    'http_req_duration{type:test}': ['p(95)<800'],

    // Taxa de erros HTTP < 0.5%
    http_req_failed: ['rate<0.005'],

    // Throughput > 150 req/s
    http_reqs: ['rate>150'],

    // Latências por endpoint (informativo)
    duration_list_docs: ['p(95)<600'],
    duration_create_doc: ['p(95)<800'],
    duration_update_doc: ['p(95)<800'],
    duration_profile:   ['p(95)<500'],

    errors: ['rate<0.005'],
  },
};

const JSON_HEADERS = { 'Content-Type': 'application/json' };

// --- Função auxiliar: gerar número do utilizador a partir do VU ---
function getUserIndex(vu) {
  // 150 utilizadores criados pelo setup-users.js (loadtest001 a loadtest150)
  return ((vu - 1) % 150) + 1;
}


// setup() — corre uma vez antes do teste, faz login de todos os utilizadores
// e devolve os tokens para reutilizar durante o teste (evita rate limit no login)
export function setup() {
  const tokens = {};
  for (let i = 1; i <= 150; i++) {
    const padded = String(i).padStart(3, '0');
    const email  = `loadtest${padded}@fluxnote-test.com`;

    const res = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({ email, password: 'LoadTest@1234' }),
      { headers: JSON_HEADERS, tags: { type: 'setup' } }
    );

    if (res.status === 200) {
      tokens[i] = res.json('accessToken');
    } else {
      console.warn(`setup: login falhou para ${email}: HTTP ${res.status}`);
    }

    sleep(0.2);
  }
  return { tokens };
}
export default function ({ tokens }) {
  const idx   = getUserIndex(__VU);
  const token = tokens[idx];
  let docId  = null;
  let teamId = null;

  if (!token) {
    console.error(`VU${__VU} sem token (utilizador ${idx})`);
    errorRate.add(1);
    return;
  }

  const authHeaders = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    tags: { type: 'test' },
  };

  // 1) Perfil do utilizador
  group('1_profile', () => {
    const res = http.get(`${BASE_URL}/api/auth/users/me`, authHeaders);
    profileDuration.add(res.timings.duration);
    const ok = check(res, { 'profile: status 200': (r) => r.status === 200 });
    errorRate.add(ok ? 0 : 1);
  });

  sleep(0.2);

  // 2) Listar documentos
  group('2_list_documents', () => {
    const res = http.get(`${BASE_URL}/api/documents`, authHeaders);
    listDocsDuration.add(res.timings.duration);
    const ok = check(res, { 'list docs: status 200': (r) => r.status === 200 });
    errorRate.add(ok ? 0 : 1);
  });

  sleep(0.2);

  // 3) Criar documento (cria equipa nova automaticamente via teamName)
  group('3_create_document', () => {
    const res = http.post(
      `${BASE_URL}/api/documents`,
      JSON.stringify({
        title: `LoadTest-VU${__VU}-IT${__ITER}`,
        teamName: `LoadTeam-VU${__VU}-IT${__ITER}`,
      }),
      authHeaders
    );

    createDocDuration.add(res.timings.duration);

    const ok = check(res, {
      'create doc: status 201': (r) => r.status === 201,
    });

    if (ok) {
      try { docId = res.json('id'); teamId = res.json('teamId'); } catch { }
    }

    errorRate.add(ok ? 0 : 1);
  });

  sleep(0.2);

  // 4) Atualizar documento
  if (docId) {
    group('4_update_document', () => {
      const res = http.put(
        `${BASE_URL}/api/documents/${docId}`,
        JSON.stringify({
          title: `LoadTest-VU${__VU}-IT${__ITER}-edited`,
          content: `<p>Conteúdo editado pelo teste de carga, iteração ${__ITER}.</p>`,
        }),
        authHeaders
      );

      updateDocDuration.add(res.timings.duration);
      const ok = check(res, { 'update doc: status 200': (r) => r.status === 200 });
      errorRate.add(ok ? 0 : 1);
    });

    sleep(0.2);
  }

  // 5) Cleanup: apagar equipa (cascade apaga documentos automaticamente)
  if (teamId) {
    http.del(`${BASE_URL}/api/teams/${teamId}`, null, {
      headers: authHeaders.headers,
      tags: { type: 'cleanup' },
    });
  }

  sleep(0.3);
}
