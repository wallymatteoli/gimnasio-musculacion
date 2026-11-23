/* Formularios y fichas que se abren desde varias pantallas. */
(function () {
  const U = Gym.utils;
  const UI = Gym.ui;
  const D = Gym.datos;
  const e = U.escapar;

  const ESTADOS = [
    { valor: 'activo', texto: 'Activo' },
    { valor: 'inactivo', texto: 'Inactivo' },
    { valor: 'suspendido', texto: 'Suspendido' },
  ];
  const METODOS = ['Efectivo', 'Transferencia', 'Tarjeta de débito', 'Tarjeta de crédito', 'Mercado Pago'];

  /* ---------- Alumno: alta y edición ---------- */
  async function alumno(id) {
    const [existente, planes] = await Promise.all([id ? D.obtener('alumnos', id) : null, D.listar('planes')]);
    const a = existente || { nombre: '', apellido: '', telefono: '', fechaInscripcion: U.hoyISO(), estado: 'activo', planId: planes[0]?.id || '', notas: '' };
    const opcionesPlan = [{ valor: '', texto: 'Sin plan asignado' }, ...planes.map((p) => ({ valor: p.id, texto: `${p.nombre} · ${U.moneda(D.precioParaPeriodo(p, U.periodoActual()))}` }))];

    const d = UI.abrirModal({
      titulo: existente ? 'Editar alumno' : 'Nuevo alumno',
      cuerpo: `<form id="form-alumno" class="formulario" novalidate>
        <div class="grilla-campos">
          ${UI.campo({ etiqueta: 'Nombre', nombre: 'nombre', valor: a.nombre, requerido: true, atributos: 'autocomplete="off"' })}
          ${UI.campo({ etiqueta: 'Apellido', nombre: 'apellido', valor: a.apellido, requerido: true, atributos: 'autocomplete="off"' })}
          ${UI.campo({ etiqueta: 'Teléfono', nombre: 'telefono', tipo: 'tel', valor: a.telefono, atributos: 'inputmode="tel" placeholder="11 5555-5555"' })}
          ${UI.campo({ etiqueta: 'Fecha de inscripción', nombre: 'fechaInscripcion', tipo: 'date', valor: a.fechaInscripcion, requerido: true })}
          ${UI.campo({ etiqueta: 'Estado', nombre: 'estado', tipo: 'select', valor: a.estado, opciones: ESTADOS, requerido: true })}
          ${UI.campo({ etiqueta: 'Plan', nombre: 'planId', tipo: 'select', valor: a.planId, opciones: opcionesPlan })}
          ${existente ? '<div class="panel" style="grid-column:1/-1;padding:12px">Si cambiás el plan, se aplicará desde el primer día del mes siguiente. Las cuotas anteriores no se modifican.</div>' : '<div id="vista-previa-cuota" class="panel" style="grid-column:1/-1;padding:12px" aria-live="polite"></div>'}
          ${UI.campo({ etiqueta: 'Notas', nombre: 'notas', tipo: 'textarea', valor: a.notas, ancho: 'completo', ayuda: 'Lesiones, objetivos u otra información útil.' })}
        </div>
      </form>`,
      pie: `<button type="button" class="boton boton--fantasma" data-cerrar>Cancelar</button>
            <button type="submit" form="form-alumno" class="boton boton--primario">${UI.icono('check')}Guardar alumno</button>`,
    });

    const fAlumno = d.querySelector('#form-alumno');
    function actualizarVistaPrevia() {
      const fecha = fAlumno.elements.fechaInscripcion.value;
      const plan = planes.find(p => p.id === fAlumno.elements.planId.value);
      const vista = d.querySelector('#vista-previa-cuota');
      if (!fecha || !plan) { vista.textContent = 'Elegí un plan y una fecha para ver la cuota.'; return; }
      const periodo = U.periodoDe(fecha);
      const detalle = D.detalleCuota({fechaInscripcion:fecha},plan,periodo);
      vista.textContent = detalle.gracia
        ? 'Primeros días sin cargo (desde el 28). Primera cuota completa desde el mes siguiente.'
        : `Primera cuota estimada: ${U.moneda(detalle.monto)} · Vence: ${detalle.vencimiento} · ${detalle.proporcional ? 'Importe proporcional' : 'Importe completo'}`;
    }
    if (!existente) {
      fAlumno.elements.fechaInscripcion.addEventListener('change',actualizarVistaPrevia);
      fAlumno.elements.planId.addEventListener('change',actualizarVistaPrevia);
      actualizarVistaPrevia();
    }
    d.querySelector('#form-alumno').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const form = ev.currentTarget;
      const datos = UI.leerFormulario(form);
      if (!UI.mostrarErrores(form, D.validarAlumno(datos))) return;
      try {
        if (existente) {
          if(datos.planId !== existente.planId){
            const hoy=U.periodoActual(), [y,m]=hoy.split('-').map(Number);
            const siguiente=new Date(y,m,1).toISOString().slice(0,7);
            datos.planPendiente={planId:datos.planId,desde:siguiente};
            datos.planId=existente.planId;
          }
          await D.actualizar('alumnos', existente.id, datos);
        }
        else await D.crear('alumnos', datos);
        UI.cerrarModal();
        UI.avisar(existente ? 'Datos del alumno actualizados.' : `${e(datos.nombre)} ${e(datos.apellido)} quedó registrado.`);
        Gym.app.refrescar();
      } catch (err) {
        UI.avisar(e(err.message), 'error');
      }
    });
  }

  /* ---------- Registrar pago de cuota ---------- */
  async function pago(opciones) {
    const { alumnoId, periodo } = opciones || {};
    const [alumnos, planes, cuotas] = await Promise.all([D.listar('alumnos'), D.listar('planes'), D.listar('cuotas')]);
    if (!alumnos.length) {
      UI.avisar('Primero registrá al menos un alumno.', 'alerta');
      return;
    }
    const ordenados = alumnos.sort((a,b)=>(a.apellido+' '+a.nombre).localeCompare(b.apellido+' '+b.nombre,'es'));
    const elegido = alumnoId || '';

    const d = UI.abrirModal({
      titulo: 'Registrar pago',
      subtitulo: 'Marca la cuota del mes como pagada.',
      cuerpo: `<form id="form-pago" class="formulario" novalidate>
        <div class="grilla-campos">
          <div class="field"><label>Buscar alumno</label><input id="buscar-pago" type="text" placeholder="Nombre, apellido o teléfono"></div>
          ${UI.campo({
            etiqueta: 'Alumno',
            nombre: 'alumnoId',
            tipo: 'select',
            valor: elegido,
            requerido: true,
            ancho: 'completo',
            opciones: [{ valor: '', texto: 'Elegí un alumno…' }, ...ordenados.map((a) => ({ valor: a.id, texto: `${U.nombreCompleto(a)}${a.estado !== 'activo' ? ' (' + a.estado + ')' : ''}` }))],
          })}
          ${UI.campo({ etiqueta: 'Mes de la cuota', nombre: 'periodo', tipo: 'month', valor: periodo || U.periodoActual(), requerido: true })}
          ${UI.campo({ etiqueta: 'Monto', nombre: 'monto', tipo: 'number', valor: '', requerido: true, atributos: 'min="0" step="100" inputmode="numeric"' })}
          ${UI.campo({ etiqueta: 'Fecha de pago', nombre: 'fechaPago', tipo: 'date', valor: U.hoyISO(), requerido: true })}
          ${UI.campo({ etiqueta: 'Medio de pago', nombre: 'metodo', tipo: 'select', valor: 'Efectivo', opciones: METODOS.map((m) => ({ valor: m, texto: m })) })}
          ${UI.campo({ etiqueta: 'Nota (opcional)', nombre: 'nota', valor: '', ancho: 'completo' })}
        </div>
        <div class="nota-cuota" id="nota-cuota" hidden></div>
      </form>`,
      pie: `<button type="button" class="boton boton--fantasma" data-cerrar>Cancelar</button>
            <button type="submit" form="form-pago" class="boton boton--primario">${UI.icono('dinero')}Confirmar pago</button>`,
    });

    const form = d.querySelector('#form-pago');
    const nota = d.querySelector('#nota-cuota');
    const buscador=d.querySelector('#buscar-pago');
    buscador.addEventListener('input',()=>{const seleccionado=form.alumnoId.value;const q=buscador.value.toLocaleLowerCase('es').trim();const encontrados=ordenados.filter(a=>(a.nombre+' '+a.apellido+' '+a.telefono+' '+a.apellido+' '+a.nombre).toLocaleLowerCase('es').includes(q));form.alumnoId.innerHTML='<option value="">Elegí un alumno…</option>'+encontrados.map(a=>`<option value="${e(a.id)}">${e(a.apellido+', '+a.nombre+' · '+(a.telefono||''))}</option>`).join('');if(encontrados.some(a=>a.id===seleccionado))form.alumnoId.value=seleccionado;else form.alumnoId.value='';sugerir()});
    function sugerir() {
      const a = alumnos.find((x) => x.id === form.alumnoId.value);
      const per = form.periodo.value;
      const cuota = cuotas.find((c) => c.alumnoId === form.alumnoId.value && c.periodo === per);
      const plan = a && planes.find((p) => p.id === D.planParaPeriodo(a,per));
      form.monto.value = cuota ? cuota.monto : a&&plan ? D.detalleCuota(a,plan,per).monto : '';
      if (cuota && cuota.fechaPago) {
        nota.hidden = false;
        nota.className = 'nota-cuota nota-cuota--info';
        nota.innerHTML = `${UI.icono('info')}Esta cuota ya figura pagada el ${U.formatearFecha(cuota.fechaPago)}. Si confirmás, se reemplaza el pago anterior.`;
      } else if (cuota) {
        const estado = D.estadoCuota(cuota);
        nota.hidden = false;
        nota.className = `nota-cuota nota-cuota--${estado}`;
        nota.innerHTML = `${UI.icono(estado === 'vencida' ? 'alerta' : 'reloj')}Cuota ${estado} · vence el ${U.formatearFecha(cuota.vencimiento)}.`;
      } else {
        nota.hidden = true;
      }
    }
    form.alumnoId.addEventListener('change', sugerir);
    form.periodo.addEventListener('change', sugerir);
    sugerir();

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const datos = UI.leerFormulario(form);
      const errores = {};
      if (!datos.alumnoId) errores.alumnoId = 'Elegí a quién corresponde el pago.';
      if (!/^\d{4}-\d{2}$/.test(datos.periodo)) errores.periodo = 'Indicá el mes.';
      if (!(Number(datos.monto) > 0)) errores.monto = 'Ingresá un monto mayor a cero.';
      if (!datos.fechaPago) errores.fechaPago = 'Indicá la fecha.';
      if (!UI.mostrarErrores(form, errores)) return;
      await D.registrarPago(datos);
      const a = alumnos.find((x) => x.id === datos.alumnoId);
      UI.cerrarModal();
      UI.avisar(`Pago de ${e(U.nombreCompleto(a))} registrado: ${U.moneda(datos.monto)}.`);
      Gym.app.refrescar();
    });
  }

  /* ---------- Registrar entrada con avisos ---------- */
  async function entrada(alumnoId) {
    const [a, cuotas, asistencias] = await Promise.all([D.obtener('alumnos', alumnoId), D.listar('cuotas'), D.listar('asistencias')]);
    if (!a) return;
    const hoy = U.hoyISO();
    const yaVino = asistencias.find((x) => x.alumnoId === a.id && x.fecha === hoy);
    if (yaVino) {
      const ok = await UI.confirmar({
        titulo: 'Ya registró entrada hoy',
        mensaje: `${e(U.nombreCompleto(a))} ingresó hoy a las ${e(yaVino.hora)}. ¿Registrar otra entrada?`,
        textoConfirmar: 'Registrar igual',
      });
      if (!ok) return;
    }
    await D.registrarEntrada(a.id);
    const vencidas = cuotas.filter((c) => c.alumnoId === a.id && D.estadoCuota(c, hoy) === 'vencida');
    if (a.estado !== 'activo') {
      UI.avisar(`Entrada registrada, pero ${e(a.nombre)} figura como <strong>${e(a.estado)}</strong>.`, 'alerta');
    } else if (vencidas.length) {
      UI.avisar(`Entrada de ${e(a.nombre)} registrada. Tiene ${U.plural(vencidas.length, 'cuota vencida', 'cuotas vencidas')}.`, 'alerta');
    } else {
      UI.avisar(`Entrada de ${e(U.nombreCompleto(a))} registrada a las ${U.horaActual()}.`);
    }
    Gym.app.refrescar();
  }

  /* ---------- Ficha completa del alumno ---------- */
  async function fichaAlumno(id) {
    const [a, planes, cuotas, asistencias, rutinas] = await Promise.all([
      D.obtener('alumnos', id),
      D.listar('planes'),
      D.listar('cuotas'),
      D.listar('asistencias'),
      D.listar('rutinas'),
    ]);
    if (!a) return;
    const hoy = U.hoyISO();
    const plan = planes.find((p) => p.id === D.planParaPeriodo(a,U.periodoActual()));
    const susCuotas = cuotas.filter((c) => c.alumnoId === id).sort((x, y) => y.periodo.localeCompare(x.periodo));
    const susEntradas = asistencias.filter((x) => x.alumnoId === id).sort((x, y) => (y.fecha + y.hora).localeCompare(x.fecha + x.hora));
    const ultimos30 = susEntradas.filter((x) => x.fecha >= U.sumarDias(hoy, -29)).length;
    const susRutinas = rutinas.filter((r) => r.alumnoId === id);
    const vencidas = susCuotas.filter((c) => D.estadoCuota(c, hoy) === 'vencida');

    const d = UI.abrirModal({
      titulo: U.nombreCompleto(a),
      subtitulo: `${UI.insignia(a.estado)} <span class="texto-suave">Alumno desde el ${U.formatearFecha(a.fechaInscripcion)}</span>`,
      ancho: 'grande',
      cuerpo: `
        ${vencidas.length ? `<div class="alerta-franja">${UI.icono('alerta')}<span>Tiene ${U.plural(vencidas.length, 'cuota vencida', 'cuotas vencidas')} por ${U.moneda(vencidas.reduce((s, c) => s + c.monto, 0))}.</span></div>` : ''}
        <dl class="ficha-datos">
          <div><dt>Teléfono</dt><dd>${a.telefono ? `<a href="tel:${e(a.telefono.replace(/[^\d+]/g, ''))}">${e(a.telefono)}</a>` : '—'}</dd></div>
          <div><dt>Plan</dt><dd>${plan ? `${e(plan.nombre)} · ${U.moneda(D.precioParaPeriodo(plan,U.periodoActual()))}` : 'Sin plan'}</dd></div>
          ${a.planPendiente ? `<div><dt>Próximo plan</dt><dd>${e(planes.find(p=>p.id===a.planPendiente.planId)?.nombre||'—')} desde ${e(a.planPendiente.desde)}</dd></div>` : ''}
          <div><dt>Vence cada mes</dt><dd>Día ${D.diaVencimientoDe(a)}</dd></div>
          <div><dt>Entradas (30 días)</dt><dd>${U.numero(ultimos30)}</dd></div>
        </dl>
        ${a.notas ? `<p class="ficha-notas">${UI.icono('nota')}${e(a.notas)}</p>` : ''}
        <div class="ficha-columnas">
          <section>
            <h3 class="subtitulo">Cuotas</h3>
            ${
              susCuotas.length
                ? `<ul class="lista-simple">${susCuotas
                    .slice(0, 6)
                    .map(
                      (c) => `<li><span><strong>${U.nombrePeriodo(c.periodo)}</strong><small>${c.fechaPago ? 'Pagó el ' + U.formatearFecha(c.fechaPago, 'corta') : 'Vence ' + U.formatearFecha(c.vencimiento, 'corta')} · ${U.moneda(c.monto)}</small></span>${UI.insignia(D.estadoCuota(c, hoy))}</li>`
                    )
                    .join('')}</ul>`
                : '<p class="texto-suave">Sin cuotas registradas.</p>'
            }
          </section>
          <section>
            <h3 class="subtitulo">Últimas entradas</h3>
            ${
              susEntradas.length
                ? `<ul class="lista-simple">${susEntradas
                    .slice(0, 6)
                    .map((x) => `<li><span><strong>${U.formatearFecha(x.fecha)}</strong><small>${U.DIAS[U.desdeISO(x.fecha).getDay()]}</small></span><span class="hora">${e(x.hora)}</span></li>`)
                    .join('')}</ul>`
                : '<p class="texto-suave">Todavía no registró entradas.</p>'
            }
            <h3 class="subtitulo">Rutinas asignadas</h3>
            ${
              susRutinas.length
                ? `<ul class="lista-simple">${susRutinas.map((r) => `<li><span><strong>${e(r.nombre)}</strong><small>${r.dias.map((x) => U.DIAS_CORTOS[x]).join(' · ')}</small></span></li>`).join('')}</ul>`
                : '<p class="texto-suave">Sin rutina asignada.</p>'
            }
          </section>
        </div>`,
      pie: `<button type="button" class="boton boton--peligro-suave" data-accion="eliminar">${UI.icono('basura')}Eliminar</button>
            <span class="pie-espacio"></span>
            <button type="button" class="boton boton--secundario" data-accion="editar">${UI.icono('editar')}Editar</button>
            <button type="button" class="boton boton--secundario" data-accion="pago">${UI.icono('dinero')}Registrar pago</button>
            <button type="button" class="boton boton--primario" data-accion="entrada">${UI.icono('entrada')}Registrar entrada</button>`,
    });

    d.querySelector('[data-accion=editar]').addEventListener('click', () => alumno(id));
    d.querySelector('[data-accion=pago]').addEventListener('click', () => pago({ alumnoId: id }));
    d.querySelector('[data-accion=entrada]').addEventListener('click', () => {
      UI.cerrarModal();
      entrada(id);
    });
    d.querySelector('[data-accion=eliminar]').addEventListener('click', async () => {
      const ok = await UI.confirmar({
        titulo: 'Eliminar alumno',
        mensaje: `Se eliminará a <strong>${e(U.nombreCompleto(a))}</strong> junto con sus cuotas y su historial de asistencia. Esta acción no se puede deshacer.`,
        textoConfirmar: 'Eliminar definitivamente',
        peligro: true,
      });
      if (!ok) return;
      await D.eliminarAlumno(id);
      UI.cerrarModal();
      UI.avisar('Alumno eliminado.');
      Gym.app.refrescar();
    });
  }

  Gym.formularios = { alumno, pago, entrada, fichaAlumno, METODOS, ESTADOS };
})();