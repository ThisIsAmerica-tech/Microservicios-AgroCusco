const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

// Almacenamiento en memoria (MVP). Se pierde al reiniciar el contenedor.
let usuarios = [];
let siguienteId = 1;
const sesiones = new Map(); // token -> id de usuario
app.reiniciar = () => { usuarios = []; siguienteId = 1; sesiones.clear(); };

const ROLES = ['productor', 'comprador', 'administrador'];

// Contraseña con hash (scrypt, incluido en Node) y sal aleatoria
function hashClave(clave) {
  const sal = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(clave, sal, 64).toString('hex');
  return `${sal}:${hash}`;
}
function claveCorrecta(clave, guardada) {
  const [sal, hash] = guardada.split(':');
  const intento = crypto.scryptSync(clave, sal, 64);
  return crypto.timingSafeEqual(intento, Buffer.from(hash, 'hex'));
}
// Nunca devolvemos la contraseña
const publico = ({ id, nombre, email, rol }) => ({ id, nombre, email, rol });

// Monitoreo
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'usuarios-service' });
});

// Registrar usuario
app.post('/usuarios', (req, res) => {
  const { nombre, email, clave, rol } = req.body || {};
  if (typeof nombre !== 'string' || !nombre.trim()
      || typeof email !== 'string' || !email.includes('@')
      || typeof clave !== 'string' || clave.length < 6
      || !ROLES.includes(rol)) {
    return res.status(400).json({ error: 'Datos inválidos: nombre, email, clave (mínimo 6 caracteres) y rol (productor, comprador o administrador)' });
  }
  if (usuarios.some((u) => u.email === email.toLowerCase())) {
    return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
  }
  const usuario = { id: siguienteId++, nombre: nombre.trim(), email: email.toLowerCase(), rol, clave: hashClave(clave) };
  usuarios.push(usuario);
  res.status(201).json(publico(usuario));
});

// Iniciar sesión
app.post('/login', (req, res) => {
  const { email, clave } = req.body || {};
  const usuario = usuarios.find((u) => typeof email === 'string' && u.email === email.toLowerCase());
  if (!usuario || typeof clave !== 'string' || !claveCorrecta(clave, usuario.clave)) {
    return res.status(401).json({ error: 'Email o clave incorrectos' });
  }
  const token = crypto.randomBytes(24).toString('hex');
  sesiones.set(token, usuario.id);
  res.json({ token, usuario: publico(usuario) });
});

// Consultar un usuario (lo usa pedidos-service para validar al comprador)
app.get('/usuarios/:id', (req, res) => {
  const usuario = usuarios.find((u) => u.id === Number(req.params.id));
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(publico(usuario));
});

module.exports = app;
