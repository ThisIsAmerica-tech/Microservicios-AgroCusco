// Pruebas con el test runner nativo de Node (node --test). Los otros microservicios se simulan.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');
const clientes = require('../src/clientes');

const PRODUCTO = { id: 1, nombre: 'Papa', precio: 2.5, stock: 10 };
let server, base, descuentos, notificaciones;

before(() => { server = app.listen(0); base = `http://127.0.0.1:${server.address().port}`; });
after(() => server.close());

beforeEach(() => {
  app.reiniciar();
  descuentos = [];
  notificaciones = [];
  clientes.validarUsuario = async (id) => id === 1;
  clientes.obtenerProducto = async (id) => (id === 1 ? PRODUCTO : null);
  clientes.descontarStock = async (id, cantidad) => { descuentos.push([id, cantidad]); };
  clientes.notificar = async (uid, msg) => { notificaciones.push([uid, msg]); };
});

const enviar = (metodo, ruta, body) => fetch(base + ruta, {
  method: metodo,
  headers: { 'Content-Type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
});
const crear = (cantidad = 2, comprador_id = 1, producto_id = 1) =>
  enviar('POST', '/pedidos', { comprador_id, items: [{ producto_id, cantidad }] });

test('GET /health responde OK', async () => {
  const r = await enviar('GET', '/health');
  assert.equal(r.status, 200);
  assert.equal((await r.json()).service, 'pedidos-service');
});

test('crear pedido válido: 201, total correcto, estado Pendiente, descuenta stock y notifica', async () => {
  const r = await crear(4);
  const p = await r.json();
  assert.equal(r.status, 201);
  assert.equal(p.total, 10);
  assert.equal(p.estado, 'Pendiente');
  assert.deepEqual(descuentos, [[1, 4]]);
  assert.equal(notificaciones.length, 1);
});

test('pedido que excede el stock: 400 y no se crea ni descuenta', async () => {
  const r = await crear(99);
  assert.equal(r.status, 400);
  assert.equal(descuentos.length, 0);
  assert.deepEqual(await (await enviar('GET', '/pedidos')).json(), []);
});

test('comprador inexistente: 404', async () => {
  assert.equal((await crear(1, 7)).status, 404);
});

test('producto inexistente: 404', async () => {
  assert.equal((await crear(1, 1, 5)).status, 404);
});

test('datos inválidos (sin items / cantidad 0): 400', async () => {
  assert.equal((await enviar('POST', '/pedidos', { comprador_id: 1, items: [] })).status, 400);
  assert.equal((await crear(0)).status, 400);
});

test('servicio de productos caído: 503', async () => {
  clientes.obtenerProducto = async () => { throw new Error('caído'); };
  assert.equal((await crear(1)).status, 503);
});

test('consultar pedido existente y no existente', async () => {
  const { id } = await (await crear(1)).json();
  assert.equal((await enviar('GET', `/pedidos/${id}`)).status, 200);
  assert.equal((await enviar('GET', '/pedidos/999')).status, 404);
});

test('flujo de estados válido: Pendiente -> Aceptado -> En camino -> Entregado', async () => {
  const { id } = await (await crear(1)).json();
  for (const estado of ['Aceptado', 'En camino', 'Entregado']) {
    const r = await enviar('PATCH', `/pedidos/${id}/estado`, { estado });
    assert.equal(r.status, 200);
    assert.equal((await r.json()).estado, estado);
  }
});

test('salto de estado inválido: 400', async () => {
  const { id } = await (await crear(1)).json();
  const r = await enviar('PATCH', `/pedidos/${id}/estado`, { estado: 'Entregado' });
  assert.equal(r.status, 400);
});
