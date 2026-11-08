// Llamadas HTTP a los otros microservicios.
// Se exporta un objeto para que las pruebas puedan reemplazar cada función.
const USUARIOS_URL = process.env.USUARIOS_URL || 'http://usuarios:8000';
const PRODUCTOS_URL = process.env.PRODUCTOS_URL || 'http://productos:8000';
const NOTIFICACIONES_URL = process.env.NOTIFICACIONES_URL || 'http://notificaciones:8000';
const TIMEOUT_MS = 5000;

const clientes = {
  // true si el usuario existe (200), false si no (404). Lanza error si el servicio falla.
  async validarUsuario(id) {
    const r = await fetch(`${USUARIOS_URL}/usuarios/${id}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (r.status === 404) return false;
    if (!r.ok) throw new Error(`usuarios-service respondió ${r.status}`);
    return true;
  },

  // Devuelve { id, nombre, precio, stock } o null si no existe.
  async obtenerProducto(id) {
    const r = await fetch(`${PRODUCTOS_URL}/productos/${id}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`productos-service respondió ${r.status}`);
    return r.json();
  },

  // Resta stock: PATCH /productos/:id/stock con { cantidad: -n }
  async descontarStock(id, cantidad) {
    const r = await fetch(`${PRODUCTOS_URL}/productos/${id}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cantidad: -cantidad }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!r.ok) throw new Error(`productos-service respondió ${r.status} al descontar stock`);
  },

  // Una falla de notificaciones NO debe romper el pedido.
  async notificar(usuario_id, mensaje) {
    try {
      await fetch(`${NOTIFICACIONES_URL}/notificaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_id, mensaje }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (e) {
      console.warn('No se pudo notificar:', e.message);
    }
  },
};

module.exports = clientes;
