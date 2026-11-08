// Pruebas con el test runner nativo de Node (node --test).
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');

let server, base;
before(() => { server = app.listen(0); base = `http://127.0.0.1:${server.address().port}`; });
after(() => server.close());
beforeEach(() => app.reiniciar());

const enviar = (metodo, ruta, body) => fetch(base + ruta, {
  method: metodo,
  headers: { 'Content-Type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
});
const NUEVO = { nombre: 'Rosa Quispe', email: 'rosa@correo.com', clave: 'secreta123', rol: 'productor' };

test('GET /health responde OK', async () => {
  const r = await enviar('GET', '/health');
  assert.equal(r.status, 200);
  assert.equal((await r.json()).service, 'usuarios-service');
});

test('registrar usuario válido: 201, devuelve id y no devuelve la clave', async () => {
  const r = await enviar('POST', '/usuarios', NUEVO);
  const u = await r.json();
  assert.equal(r.status, 201);
  assert.equal(u.id, 1);
  assert.equal(u.rol, 'productor');
  assert.equal(u.clave, undefined);
});

test('registrar con datos inválidos (clave corta o rol inexistente): 400', async () => {
  assert.equal((await enviar('POST', '/usuarios', { ...NUEVO, clave: '123' })).status, 400);
  assert.equal((await enviar('POST', '/usuarios', { ...NUEVO, rol: 'jefe' })).status, 400);
});

test('registrar email repetido: 409', async () => {
  await enviar('POST', '/usuarios', NUEVO);
  assert.equal((await enviar('POST', '/usuarios', NUEVO)).status, 409);
});

test('login correcto: 200 y devuelve token', async () => {
  await enviar('POST', '/usuarios', NUEVO);
  const r = await enviar('POST', '/login', { email: NUEVO.email, clave: NUEVO.clave });
  assert.equal(r.status, 200);
  assert.ok((await r.json()).token);
});

test('login con clave incorrecta: 401', async () => {
  await enviar('POST', '/usuarios', NUEVO);
  assert.equal((await enviar('POST', '/login', { email: NUEVO.email, clave: 'otra-clave' })).status, 401);
});

test('login con email que no existe: 401', async () => {
  assert.equal((await enviar('POST', '/login', { email: 'nadie@correo.com', clave: 'secreta123' })).status, 401);
});

test('consultar usuario existente: 200; inexistente: 404', async () => {
  await enviar('POST', '/usuarios', NUEVO);
  const ok = await enviar('GET', '/usuarios/1');
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).email, NUEVO.email);
  assert.equal((await enviar('GET', '/usuarios/999')).status, 404);
});
