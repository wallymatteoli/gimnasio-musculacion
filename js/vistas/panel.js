/* Panel principal: resumen del día y del mes. */
(function () {
  const U = Gym.utils;
  const UI = Gym.ui;
  const D = Gym.datos;
  const e = U.escapar;

  function graficoAsistencia(asistencias, hoy) {
    const dias = [];
    for (let i = 13; i >= 0; i--) {
      const f = U.sumarDias(hoy, -i);
      dias.push({ fecha: f, total: asistencias.filter((a) => a.fecha === f).length });
    }
    const max = Math.max(4, ...dias.map((d) => d.total));
    const tope = Math.ceil(max / 5) * 5;
    const idxMax = dias.reduce((m, d, i) => (d.total > dias[m].total ? i : m), 0);
    const promedio = dias.reduce((s, d) => s + d.total, 0) / dias.length;

    const barras = dias
      .map((d, i) => {
        const dt = U.desdeISO(d.fecha);
        const etiqueta = `${U.DIAS[dt.getDay()]} ${U.formatearFecha(d.fecha, 'corta')}: ${U.plural(d.total, 'entrada')}`;
        const mostrarValor = i === idxMax || i === dias.length - 1;
        return `<div class="barra ${i === dias.length - 1 ? 'barra--hoy' : ''}" tabindex="0" role="listitem" aria-label="${e(etiqueta)}" data-tip="${e(etiqueta)}">
          <div class="barra__pista">
            ${mostrarValor && d.total ? `<span class="barra__valor" style="bottom:${(d.total / tope) * 100}%">${d.total}</span>` : ''}
            <div class="barra__relleno" style="height:${(d.total / tope) * 100}%"></div>
          </div>
          <span class="barra__dia">${U.DIAS_CORTOS[dt.getDay()].charAt(0)}<small>${dt.getDate()}</small></span>
        </div>`;
      })
      .join('');

    return `<div class="grafico" role="list" aria-label="Entradas por día, últimos 14 días">
        <div class="grafico__guias" aria-hidden="true">
          ${[1, 0.5, 0].map((p) => `<span style="bottom:${p * 100}%"><em>${Math.round(tope * p)}</em></span>`).join('')}
        </div>
        <div class="grafico__barras">${barras}</div>
      </div>
      <p class="grafico__pie">Promedio: <strong>${promedio.toLocaleString('es-AR', { maximumFractionDigits: 1 })}</strong> entradas por día</p>`;
  }

  async function render(el) {
    const [ajustes, alumnos, cuotas, asistencias, clases] = await Promise.all([
      D.leerAjustes(),
      D.listar('alumnos'),
      D.listar('cuotas'),
      D.listar('asistencias'),
      D.listar('clases'),
    ]);
    const hoy = U.hoyISO();
    const periodo = U.periodoActual();
    const porId = Object.fromEntries(alumnos.map((a) => [a.id, a]));

    const activos = alumnos.filter((a) => a.estado === 'activo');
    const nuevosMes = alumnos.filter((a) => U.periodoDe(a.fechaInscripcion) === periodo).length;
    const impagas = cuotas.filter((c) => !c.fechaPago && porId[c.alumnoId]);
    const vencidas = impagas.filter((c) => D.estadoCuota(c, hoy) === 'vencida').sort((a, b) => a.vencimiento.localeCompare(b.vencimiento));
    const ingresosMes = cuotas.filter((c) => c.fechaPago && U.periodoDe(c.fechaPago) === periodo).reduce((s, c) => s + Number(c.monto), 0);
    const ingresosAnt = cuotas.filter((c) => c.fechaPago && U.periodoDe(c.fechaPago) === U.sumarMeses(periodo, -1)).reduce((s, c) => s + Number(c.monto), 0);
    const entradasHoy = asistencias.filter((a) => a.fecha === hoy).sort((a, b) => b.hora.localeCompare(a.hora));
    const entradasSemana = asistencias.filter((a) => a.fecha >= U.sumarDias(hoy, -6)).length;
    const diaSemana = U.desdeISO(hoy).getDay();
    const clasesHoy = clases.filter((c) => c.dias.includes(diaSemana)).sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
    const ahora = U.horaActual();

    const varIngresos = ingresosAnt ? Math.round(((ingresosMes - ingresosAnt) / ingresosAnt) * 100) : null;

    el.innerHTML = `
      <section class="portada">
        <div class="portada__texto">
          <p class="sobretitulo">${e(U.formatearFecha(hoy, 'larga'))}</p>
          <h1 class="titulo-grande">${e(ajustes.nombreGimnasio)}</h1>
          <p class="portada__bajada">${U.plural(entradasHoy.length, 'entrada')} hoy · ${clasesHoy.length ? U.plural(clasesHoy.length, 'clase') + ' en agenda' : 'sin clases en agenda'}</p>
        </div>
        <div class="acciones-rapidas">
          <a class="boton boton--primario boton--grande" href="#/asistencia">${UI.icono('entrada')}Registrar entrada</a>
          <button type="button" class="boton boton--secundario boton--grande" data-accion="pago">${UI.icono('dinero')}Registrar pago</button>
          <button type="button" class="boton boton--secundario boton--grande" data-accion="alumno">${UI.icono('mas')}Nuevo alumno</button>
        </div>
      </section>

      <section class="indicadores" aria-label="Resumen">
        <a href="#/alumnos" class="indicador indicador--destacado">
          <span class="indicador__etiqueta">${UI.icono('alumnos')}Alumnos activos</span>
          <strong class="indicador__valor">${U.numero(activos.length)}</strong>
          <span class="indicador__detalle">de ${U.numero(alumnos.length)} registrados · ${nuevosMes ? '+' + nuevosMes + ' este mes' : 'sin altas este mes'}</span>
        </a>
        <a href="#/cuotas?filtro=impagas" class="indicador ${vencidas.length ? 'indicador--alerta' : ''}">
          <span class="indicador__etiqueta">${UI.icono('cuotas')}Cuotas pendientes</span>
          <strong class="indicador__valor">${U.numero(impagas.length)}</strong>
          <span class="indicador__detalle">${vencidas.length ? `${UI.icono('alerta')}${U.plural(vencidas.length, 'vencida')}` : 'ninguna vencida'}</span>
        </a>
        <a href="#/cuotas?filtro=pagadas" class="indicador">
          <span class="indicador__etiqueta">${UI.icono('dinero')}Ingresos del mes</span>
          <strong class="indicador__valor indicador__valor--dinero">${U.moneda(ingresosMes)}</strong>
          <span class="indicador__detalle">${varIngresos === null ? U.nombrePeriodo(periodo) : `${varIngresos >= 0 ? '▲' : '▼'} ${Math.abs(varIngresos)}% vs. ${U.MESES[Number(U.sumarMeses(periodo, -1).slice(5)) - 1]} completo`}</span>
        </a>
        <a href="#/asistencia" class="indicador">
          <span class="indicador__etiqueta">${UI.icono('entrada')}Asistencia hoy</span>
          <strong class="indicador__valor">${U.numero(entradasHoy.length)}</strong>
          <span class="indicador__detalle">${U.plural(entradasSemana, 'entrada')} en 7 días</span>
        </a>
      </section>

      <div class="panel-grilla">
        <section class="tarjeta tarjeta--grafico">
          <header class="tarjeta__cabecera"><h2>Asistencia · últimos 14 días</h2><a href="#/asistencia" class="enlace">Ver historial</a></header>
          ${graficoAsistencia(asistencias, hoy)}
        </section>

        <section class="tarjeta">
          <header class="tarjeta__cabecera"><h2>Clases de hoy</h2><a href="#/calendario" class="enlace">Calendario</a></header>
          ${
            clasesHoy.length
              ? `<ul class="lista-clases">${clasesHoy
                  .map((c) => {
                    const estado = ahora >= c.horaFin ? 'terminada' : ahora >= c.horaInicio ? 'en-curso' : 'proxima';
                    return `<li class="clase-fila clase-fila--${estado}">
                      <span class="clase-fila__hora">${e(c.horaInicio)}<small>${e(c.horaFin)}</small></span>
                      <span class="clase-fila__info"><strong>${e(c.nombre)}</strong><small>${e(c.instructor)} · ${e(c.sala)}</small></span>
                      ${estado === 'en-curso' ? '<span class="chip chip--vivo">En curso</span>' : estado === 'terminada' ? '<span class="chip">Terminada</span>' : ''}
                    </li>`;
                  })
                  .join('')}</ul>`
              : UI.vacio('calendario', 'Sin clases hoy', 'No hay clases programadas para este día.', '<a href="#/calendario" class="boton boton--secundario">Ir al calendario</a>')
          }
        </section>

        <section class="tarjeta ${vencidas.length ? 'tarjeta--alerta' : ''}">
          <header class="tarjeta__cabecera"><h2>${vencidas.length ? UI.icono('alerta') : ''}Cuotas vencidas</h2><a href="#/cuotas?filtro=vencidas" class="enlace">Ver todas</a></header>
          ${
            vencidas.length
              ? `<ul class="lista-simple lista-simple--acciones">${vencidas
                  .slice(0, 6)
                  .map((c) => {
                    const a = porId[c.alumnoId];
                    const dias = U.diasEntre(c.vencimiento, hoy);
                    return `<li>
                      ${UI.avatar(a)}
                      <span><strong>${e(U.nombreCompleto(a))}</strong><small>${U.nombrePeriodo(c.periodo)} · ${U.moneda(c.monto)} · hace ${U.plural(dias, 'día')}</small></span>
                      <button type="button" class="boton boton--chico boton--primario" data-cobrar="${e(c.alumnoId)}" data-periodo="${e(c.periodo)}">Cobrar</button>
                    </li>`;
                  })
                  .join('')}</ul>
                ${vencidas.length > 6 ? `<p class="texto-suave lista-mas">y ${U.plural(vencidas.length - 6, 'cuota')} más</p>` : ''}`
              : UI.vacio('check', 'Todo al día', 'No hay cuotas vencidas en este momento.')
          }
        </section>

        <section class="tarjeta">
          <header class="tarjeta__cabecera"><h2>Entradas de hoy</h2><a href="#/asistencia" class="enlace">Registrar</a></header>
          ${
            entradasHoy.length
              ? `<ul class="lista-simple">${entradasHoy
                  .slice(0, 7)
                  .map((x) => `<li>${UI.avatar(porId[x.alumnoId])}<span><strong>${e(U.nombreCompleto(porId[x.alumnoId]))}</strong></span><span class="hora">${e(x.hora)}</span></li>`)
                  .join('')}</ul>`
              : UI.vacio('entrada', 'Nadie ingresó todavía', 'Las entradas que registres hoy aparecen acá.')
          }
        </section>
      </div>`;

    el.querySelector('[data-accion=pago]').addEventListener('click', () => Gym.formularios.pago());
    el.querySelector('[data-accion=alumno]').addEventListener('click', () => Gym.formularios.alumno());
    el.querySelectorAll('[data-cobrar]').forEach((b) =>
      b.addEventListener('click', () => Gym.formularios.pago({ alumnoId: b.dataset.cobrar, periodo: b.dataset.periodo }))
    );
  }

  Gym.vistas = Gym.vistas || {};
  Gym.vistas.panel = { titulo: 'Panel principal', render };
})();