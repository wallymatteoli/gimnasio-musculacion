/* Gestión de alumnos: búsqueda, filtros, alta y edición. */
(function () {
  const U = Gym.utils;
  const UI = Gym.ui;
  const D = Gym.datos;
  const e = U.escapar;

  const estadoVista = { busqueda: '', filtro: 'todos', orden: 'nombre' };

  async function render(el) {
    const [alumnos, planes, cuotas, asistencias] = await Promise.all([D.listar('alumnos'), D.listar('planes'), D.listar('cuotas'), D.listar('asistencias')]);
    const hoy = U.hoyISO();
    const planPorId = Object.fromEntries(planes.map((p) => [p.id, p]));
    const deudores = new Set(cuotas.filter((c) => D.estadoCuota(c, hoy) === 'vencida').map((c) => c.alumnoId));
    const ultimaEntrada = {};
    asistencias.forEach((a) => {
      if (!ultimaEntrada[a.alumnoId] || a.fecha > ultimaEntrada[a.alumnoId]) ultimaEntrada[a.alumnoId] = a.fecha;
    });

    const cuenta = {
      todos: alumnos.length,
      activo: alumnos.filter((a) => a.estado === 'activo').length,
      inactivo: alumnos.filter((a) => a.estado === 'inactivo').length,
      suspendido: alumnos.filter((a) => a.estado === 'suspendido').length,
      deuda: alumnos.filter((a) => deudores.has(a.id)).length,
    };

    el.innerHTML = `
      <header class="encabezado">
        <div>
          <p class="sobretitulo">Gestión</p>
          <h1 class="titulo-grande">Alumnos</h1>
        </div>
        <button type="button" class="boton boton--primario boton--grande" data-accion="nuevo">${UI.icono('mas')}Nuevo alumno</button>
      </header>

      <div class="barra-filtros">
        <label class="buscador">
          ${UI.icono('buscar')}
          <span class="sr">Buscar alumnos</span>
          <input type="search" id="buscar-alumno" placeholder="Buscar por nombre, apellido o teléfono" value="${e(estadoVista.busqueda)}" autocomplete="off" />
        </label>
        <div class="chips" role="group" aria-label="Filtrar por estado">
          ${[
            ['todos', 'Todos'],
            ['activo', 'Activos'],
            ['inactivo', 'Inactivos'],
            ['suspendido', 'Suspendidos'],
            ['deuda', 'Con deuda'],
          ]
            .map(([v, t]) => `<button type="button" class="chip-filtro" data-filtro="${v}" aria-pressed="${estadoVista.filtro === v}">${t}<span>${cuenta[v]}</span></button>`)
            .join('')}
        </div>
        <label class="selector-orden">
          <span>Ordenar</span>
          <select id="orden-alumnos">
            <option value="nombre" ${estadoVista.orden === 'nombre' ? 'selected' : ''}>Apellido A–Z</option>
            <option value="reciente" ${estadoVista.orden === 'reciente' ? 'selected' : ''}>Inscripción más reciente</option>
            <option value="asistencia" ${estadoVista.orden === 'asistencia' ? 'selected' : ''}>Última entrada</option>
          </select>
        </label>
      </div>

      <div id="lista-alumnos" aria-live="polite"></div>`;

    const contenedor = el.querySelector('#lista-alumnos');

    function pintar() {
      const q = U.normalizar(estadoVista.busqueda);
      let lista = alumnos.filter((a) => {
        if (estadoVista.filtro === 'deuda' && !deudores.has(a.id)) return false;
        if (!['todos', 'deuda'].includes(estadoVista.filtro) && a.estado !== estadoVista.filtro) return false;
        if (!q) return true;
        return U.normalizar(`${a.nombre} ${a.apellido} ${a.apellido} ${a.nombre}`).includes(q) || (a.telefono || '').replace(/\D/g, '').includes(q.replace(/\D/g, '') || '§');
      });
      if (estadoVista.orden === 'reciente') lista.sort((a, b) => b.fechaInscripcion.localeCompare(a.fechaInscripcion));
      else if (estadoVista.orden === 'asistencia') lista.sort((a, b) => (ultimaEntrada[b.id] || '').localeCompare(ultimaEntrada[a.id] || ''));
      else lista.sort((a, b) => `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`, 'es'));

      if (!alumnos.length) {
        contenedor.innerHTML = UI.vacio('alumnos', 'Todavía no hay alumnos', 'Registrá el primero para empezar a controlar cuotas y asistencia.', `<button type="button" class="boton boton--primario" data-accion="nuevo">${UI.icono('mas')}Nuevo alumno</button>`);
      } else if (!lista.length) {
        contenedor.innerHTML = UI.vacio('buscar', 'Sin resultados', 'Probá con otro nombre o quitá los filtros.');
      } else {
        contenedor.innerHTML = `
          <p class="conteo">${U.plural(lista.length, 'alumno')}</p>
          <div class="tabla" role="table" aria-label="Listado de alumnos">
            <div class="tabla__fila tabla__fila--cabecera" role="row">
              <span role="columnheader">Alumno</span><span role="columnheader">Teléfono</span><span role="columnheader">Inscripción</span><span role="columnheader">Plan</span><span role="columnheader">Estado</span><span role="columnheader"><span class="sr">Acciones</span></span>
            </div>
            ${lista
              .map((a) => {
                const ult = ultimaEntrada[a.id];
                return `<div class="tabla__fila" role="row">
                  <span role="cell" class="celda-alumno">
                    ${UI.avatar(a)}
                    <button type="button" class="enlace-fila" data-ver="${e(a.id)}"><strong>${e(a.apellido)}, ${e(a.nombre)}</strong><small>${ult ? 'Última entrada: ' + U.formatearFecha(ult, 'corta') : 'Sin entradas'}</small></button>
                  </span>
                  <span role="cell" data-etiqueta="Teléfono">${a.telefono ? `<a href="tel:${e(a.telefono.replace(/[^\d+]/g, ''))}">${e(a.telefono)}</a>` : '—'}</span>
                  <span role="cell" data-etiqueta="Inscripción">${U.formatearFecha(a.fechaInscripcion)}</span>
                  <span role="cell" data-etiqueta="Plan">${e(planPorId[a.planId]?.nombre || 'Sin plan')}</span>
                  <span role="cell" data-etiqueta="Estado" class="celda-estado">${UI.insignia(a.estado)}${deudores.has(a.id) ? UI.insignia('vencida') : ''}</span>
                  <span role="cell" class="celda-acciones">
                    <button type="button" class="boton-icono" data-editar="${e(a.id)}" aria-label="Editar a ${e(U.nombreCompleto(a))}" title="Editar">${UI.icono('editar')}</button>
                    <button type="button" class="boton-icono" data-ver="${e(a.id)}" aria-label="Ver ficha de ${e(U.nombreCompleto(a))}" title="Ver ficha">${UI.icono('flecha')}</button>
                  </span>
                </div>`;
              })
              .join('')}
          </div>`;
      }
      contenedor.querySelectorAll('[data-ver]').forEach((b) => b.addEventListener('click', () => Gym.formularios.fichaAlumno(b.dataset.ver)));
      contenedor.querySelectorAll('[data-editar]').forEach((b) => b.addEventListener('click', () => Gym.formularios.alumno(b.dataset.editar)));
      contenedor.querySelectorAll('[data-accion=nuevo]').forEach((b) => b.addEventListener('click', () => Gym.formularios.alumno()));
    }

    el.querySelector('[data-accion=nuevo]').addEventListener('click', () => Gym.formularios.alumno());
    el.querySelector('#buscar-alumno').addEventListener('input', (ev) => {
      estadoVista.busqueda = ev.target.value;
      pintar();
    });
    el.querySelector('#orden-alumnos').addEventListener('change', (ev) => {
      estadoVista.orden = ev.target.value;
      pintar();
    });
    el.querySelectorAll('[data-filtro]').forEach((b) =>
      b.addEventListener('click', () => {
        estadoVista.filtro = b.dataset.filtro;
        el.querySelectorAll('[data-filtro]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        pintar();
      })
    );
    pintar();
  }

  Gym.vistas.alumnos = { titulo: 'Alumnos', render };
})();