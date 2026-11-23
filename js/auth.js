/*
 * Autenticación y permisos.
 *
 * En el modo demostración no hay usuarios ni contraseñas: se trabaja como un
 * administrador de prueba. La estructura (roles, permisos y funciones de
 * sesión) ya está definida para conectar más adelante un sistema de inicio
 * de sesión seguro del lado del servidor. Nunca guardar contraseñas en el
 * navegador: la verificación debe hacerse siempre en el servidor.
 */
(function () {
  const ROLES = {
    admin: {
      nombre: 'Administración',
      permisos: ['panel', 'alumnos', 'cuotas', 'asistencia', 'rutinas', 'calendario', 'administracion'],
    },
    recepcion: {
      nombre: 'Recepción',
      permisos: ['panel', 'alumnos', 'cuotas', 'asistencia', 'calendario'],
    },
    entrenador: {
      nombre: 'Entrenador/a',
      permisos: ['panel', 'asistencia', 'rutinas', 'calendario'],
    },
  };

  const USUARIO_DEMO = { id: 'demo', nombre: 'Administración', rol: 'admin', demo: true };

  let usuario = Gym.config.autenticacion === 'demo' ? USUARIO_DEMO : null;

  Gym.auth = {
    ROLES,
    usuarioActual: () => usuario,
    estaAutenticado: () => Boolean(usuario),
    puede(permiso) {
      if (!usuario) return false;
      const rol = ROLES[usuario.rol];
      return Boolean(rol && rol.permisos.includes(permiso));
    },
    // Pendiente: enviar credenciales al servidor y guardar el token de sesión.
    async iniciarSesion() {
      throw new Error('El inicio de sesión todavía no está disponible en la versión de demostración.');
    },
    async cerrarSesion() {
      if (Gym.config.autenticacion === 'demo') return;
      usuario = null;
    },
  };
})();