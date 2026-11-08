const express = require('express');
const clientes = require('./clientes');

const app = express();
app.use(express.json());

// Almacenamiento en memoria (MVP). Se pierde al reiniciar el contenedor.
let pedidos = [];
let siguienteId = 1;
app.reiniciar = () => { pedidos = []; siguienteId = 1; };

// Estados permitidos y a cuáles se puede pasar desde cada uno
const TRANSICIONES = {
  'Pendiente': ['Aceptado', 'Rechazado'],
  'Aceptado': ['En camino'],
  'En camino': ['Entregado'],
};

const entero = (n) => Number.isInteger(n);

// Monitoreo
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'pedidos-service' });
});

// Crear pedido: valida usuario y stock, descuenta stock y notifica
app.post('/pedidos', async (req, res) => {
  const { comprador_id, items } = req.body || {};
  if (!entero(comprador_id) || !Array.isArray(items) || items.length === 0
      || !items.every((it) => it && entero(it.producto_id) && entero(it.cantidad) && it.cantidad > 0)) {
    return res.status(400).json({ error: 'Datos inválidos: se requiere comprador_id e items [{producto_id, cantidad > 0}]' });
  }

  const detalles = [];
  let total = 0;
  try {
    if (!(await clientes.validarUsuario(comprador_id))) {
      return res.status(404).json({ error: 'El comprador no existe' });
    }
    for (const it of items) {
      const prod = await clientes.obtenerProducto(it.producto_id);
      if (!prod) return res.status(404).json({ error: `El producto ${it.producto_id} no existe` });
      if (prod.stock < it.cantidad) {
        return res.status(400).json({ error: `Stock insuficiente de ${prod.nombre}` });
      }
      total += prod.precio * it.cantidad;
      detalles.push({ producto_id: it.producto_id, cantidad: it.cantidad, precio_unitario: prod.precio });
    }
    for (const it of items) {
      await clientes.descontarStock(it.producto_id, it.cantidad);
    }
  } catch (e) {
    return res.status(503).json({ error: 'Un servicio dependiente no responde' });
  }

  const pedido = {
    id: siguienteId++,
    comprador_id,
    estado: 'Pendiente',
    total: Math.round(total * 100) / 100,
    items: detalles,
    creado: new Date().toISOString(),
  };
  pedidos.push(pedido);
  await clientes.notificar(comprador_id, `Tu pedido #${pedido.id} fue creado`);
  res.status(201).json(pedido);
});

// Listar pedidos (opcional: ?comprador_id=1)
app.get('/pedidos', (req, res) => {
  const { comprador_id } = req.query;
  const lista = comprador_id ? pedidos.filter((p) => p.comprador_id === Number(comprador_id)) : pedidos;
  res.json(lista);
});

// Consultar un pedido
app.get('/pedidos/:id', (req, res) => {
  const pedido = pedidos.find((p) => p.id === Number(req.params.id));
  if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
  res.json(pedido);
});

// Cambiar estado del pedido
app.patch('/pedidos/:id/estado', async (req, res) => {
  const pedido = pedidos.find((p) => p.id === Number(req.params.id));
  if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
  const nuevo = (req.body || {}).estado;
  if (!(TRANSICIONES[pedido.estado] || []).includes(nuevo)) {
    return res.status(400).json({ error: `No se puede pasar de ${pedido.estado} a ${nuevo}` });
  }
  pedido.estado = nuevo;
  await clientes.notificar(pedido.comprador_id, `Tu pedido #${pedido.id} ahora está: ${nuevo}`);
  res.json(pedido);
});

module.exports = app;
