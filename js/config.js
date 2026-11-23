/*
 * Configuración general de la aplicación.
 *
 * Hoy la aplicación funciona en "modo demostración": todos los datos se
 * guardan únicamente en el navegador (localStorage) y no hay usuarios reales.
 *
 * Para conectar más adelante una base de datos segura y usuarios con
 * contraseña, se cambia `almacenamiento` a "api" y `autenticacion` a
 * "servidor", y se completan los adaptadores en js/almacen.js y js/auth.js.
 * Las vistas no necesitan cambios: sólo hablan con Gym.datos y Gym.auth.
 */
window.Gym = window.Gym || {};

Gym.config = {
  version: 1,
  modo: 'demo',
  almacenamiento: 'local', // 'local' (navegador) | 'api' (futuro servidor)
  autenticacion: 'demo', // 'demo' (sin contraseña) | 'servidor' (futuro)
  apiBase: '/api', // ruta base del futuro servidor
  claveLocal: 'gimnasio.datos.v1',
  locale: 'es-AR',
  moneda: 'ARS',
};