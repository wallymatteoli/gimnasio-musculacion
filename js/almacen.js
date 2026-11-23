/*
 * Capa de datos.
 *
 * Las vistas nunca tocan localStorage directamente: usan Gym.datos, que
 * delega en un "adaptador". Todas las operaciones devuelven promesas, así
 * que el día que exista un servidor con base de datos se reemplaza el
 * adaptador local por el de API sin modificar las pantallas.
 *
 * Colecciones: alumnos, planes, cuotas, asistencias, rutinas, clases.
 * Además existe un objeto único de ajustes del gimnasio.
 */
(function () {
  const U = Gym.utils;
  const COLECCIONES = ['alumnos', 'planes', 'cuotas', 'asistencias', 'rutinas', 'clases', 'ejerciciosBiblioteca', 'entrenamientos'];
  const PREFIJOS = { alumnos: 'alu', planes: 'pln', cuotas: 'cuo', asistencias: 'asi', rutinas: 'rut', clases: 'cla', ejerciciosBiblioteca: 'eje', entrenamientos: 'ent' };

  const AJUSTES_INICIALES = {
    nombreGimnasio: 'Mi Gimnasio',
    direccion: '',
    telefono: '',
    horario: 'Lunes a viernes de 7 a 23 h · Sábados de 9 a 14 h',
  };

  /* ---------- Adaptador local: guarda todo en el navegador ---------- */
  function crearAdaptadorLocal(clave) {
    let cache = null;

    function vacio() {
      const base = { version: Gym.config.version, ajustes: { ...AJUSTES_INICIALES } };
      COLECCIONES.forEach((c) => (base[c] = []));
      return base;
    }
    function leer() {
      if (cache) return cache;
      try {
        const crudo = localStorage.getItem(clave);
        cache = crudo ? JSON.parse(crudo) : null;
      } catch (e) {
        console.warn('No se pudieron leer los datos guardados.', e);
        cache = null;
      }
      return cache;
    }
    function escribir() {
      try {
        localStorage.setItem(clave, JSON.stringify(cache));
      } catch (e) {
        throw new Error('El navegador no permitió guardar los datos (¿espacio lleno o modo privado?).');
      }
    }
    function asegurar() {
      if (!leer()) cache = vacio();
      COLECCIONES.forEach((c) => (cache[c] = cache[c] || []));
      cache.ajustes = { ...AJUSTES_INICIALES, ...(cache.ajustes || {}) };
      return cache;
    }
    const copia = (o) => JSON.parse(JSON.stringify(o));

    return {
      nombre: 'Navegador (localStorage)',
      async tieneDatos() {
        return Boolean(leer());
      },
      async listar(col) {
        return copia(asegurar()[col]);
      },
      async obtener(col, id) {
        const item = asegurar()[col].find((x) => x.id === id);
        return item ? copia(item) : null;
      },
      async crear(col, datos) {
        const db = asegurar();
        const ahora = new Date().toISOString();
        const item = { ...copia(datos), id: datos.id || U.uid(PREFIJOS[col]), creado: ahora, actualizado: ahora };
        db[col].push(item);
        escribir();
        return copia(item);
      },
      async crearVarios(col, lista) {
        const db = asegurar();
        const ahora = new Date().toISOString();
        const nuevos = lista.map((d) => ({ ...copia(d), id: d.id || U.uid(PREFIJOS[col]), creado: ahora, actualizado: ahora }));
        db[col].push(...nuevos);
        escribir();
        return copia(nuevos);
      },
      async actualizar(col, id, cambios) {
        const db = asegurar();
        const i = db[col].findIndex((x) => x.id === id);
        if (i < 0) throw new Error('El registro ya no existe.');
        db[col][i] = { ...db[col][i], ...copia(cambios), id, actualizado: new Date().toISOString() };
        escribir();
        return copia(db[col][i]);
      },
      async eliminar(col, id) {
        const db = asegurar();
        db[col] = db[col].filter((x) => x.id !== id);
        escribir();
      },
      async eliminarDonde(col, filtro) {
        const db = asegurar();
        db[col] = db[col].filter((x) => !filtro(x));
        escribir();
      },
      async leerAjustes() {
        return copia(asegurar().ajustes);
      },
      async guardarAjustes(ajustes) {
        asegurar().ajustes = { ...cache.ajustes, ...copia(ajustes) };
        escribir();
        return copia(cache.ajustes);
      },
      async exportar() {
        return copia(asegurar());
      },
      async reemplazarTodo(datos) {
        cache = vacio();
        COLECCIONES.forEach((c) => (cache[c] = Array.isArray(datos[c]) ? copia(datos[c]) : []));
        cache.ajustes = { ...AJUSTES_INICIALES, ...(datos.ajustes || {}) };
        escribir();
      },
      async borrarTodo() {
        cache = null;
        localStorage.removeItem(clave);
      },
    };
  }

  /*
   * Adaptador de API (pendiente). Cuando exista el servidor con base de datos,
   * implementar aquí las mismas funciones que el adaptador local usando
   * fetch(`${Gym.config.apiBase}/...`) y enviando el token de sesión que
   * entrega Gym.auth. Hoy NO está conectado a ningún servidor.
   */
  function crearAdaptadorApi() {
    const noDisponible = async () => {
      throw new Error('La conexión con un servidor todavía no está configurada.');
    };
    return {
      nombre: 'Servidor (no configurado)',
      tieneDatos: noDisponible,
      listar: noDisponible,
      obtener: noDisponible,
      crear: noDisponible,
      crearVarios: noDisponible,
      actualizar: noDisponible,
      eliminar: noDisponible,
      eliminarDonde: noDisponible,
      leerAjustes: noDisponible,
      guardarAjustes: noDisponible,
      exportar: noDisponible,
      reemplazarTodo: noDisponible,
      borrarTodo: noDisponible,
    };
  }

  const adaptador = Gym.config.almacenamiento === 'api' ? crearAdaptadorApi() : crearAdaptadorLocal(Gym.config.claveLocal);

  /* ---------- Validaciones (se reutilizarán en el servidor) ---------- */
  function validarAlumno(a) {
    const errores = {};
    if (!a.nombre || !a.nombre.trim()) errores.nombre = 'Ingresá el nombre.';
    if (!a.apellido || !a.apellido.trim()) errores.apellido = 'Ingresá el apellido.';
    if (a.telefono && !/^[\d\s()+-]{6,20}$/.test(a.telefono)) errores.telefono = 'Usá sólo números, espacios o guiones.';
    if (!a.fechaInscripcion) errores.fechaInscripcion = 'Indicá la fecha de inscripción.';
    if (!['activo', 'inactivo', 'suspendido'].includes(a.estado)) errores.estado = 'Elegí un estado.';
    return errores;
  }

  /* ---------- Reglas del negocio ---------- */
  function estadoCuota(cuota, hoy) {
    if (cuota.fechaPago) return 'pagada';
    return cuota.vencimiento < (hoy || U.hoyISO()) ? 'vencida' : 'pendiente';
  }

  function diaVencimientoDe() { return 15; }
  const PLANES_BASE = [
    {id:'pln_2',nombre:'Musculación — 2 veces por semana',limiteSemanal:2,precio:50000},
    {id:'pln_3',nombre:'Musculación — 3 veces por semana',limiteSemanal:3,precio:60000},
    {id:'pln_4',nombre:'Musculación — 4 veces por semana',limiteSemanal:4,precio:65000},
    {id:'pln_libre',nombre:'Musculación — Todos los días - Pase libre',limiteSemanal:0,precio:70000}
  ];
  async function asegurarPlanes() {
    const planes = await adaptador.listar('planes');
    const permitidos = new Set(PLANES_BASE.map(p => p.id));
    const alumnos = await adaptador.listar('alumnos');
    // Migración conservadora: reasigna alumnos sin tocar cuotas ni pagos históricos.
    // Los planes antiguos se corresponden por su nombre; el resto pasa a pase libre.
    function destino(plan) {
      const nombre = (plan?.nombre || '').toLocaleLowerCase('es');
      if (nombre.includes('2 veces')) return 'pln_2';
      if (nombre.includes('3 veces')) return 'pln_3';
      if (nombre.includes('4 veces')) return 'pln_4';
      return 'pln_libre';
    }
    for (const a of alumnos) {
      if (a.planId && !permitidos.has(a.planId)) {
        const anterior = planes.find(p => p.id === a.planId);
        await adaptador.actualizar('alumnos', a.id, {planId: destino(anterior), planAnterior: anterior?.nombre || a.planId, revisarPlan: true});
      }
    }
    for (const base of PLANES_BASE) {
      const actual = planes.find(p => p.id === base.id);
      if (!actual) await adaptador.crear('planes', {...base, historialPrecios:[{desde:'2026-11',precio:base.precio}]});
      else {
        const cambios = {nombre:base.nombre,limiteSemanal:base.limiteSemanal};
        if (!(actual.historialPrecios || []).some(h => h.desde === '2026-11')) {
          cambios.historialPrecios = [...(actual.historialPrecios || []), {desde:'2026-11',precio:base.precio}];
        }
        await adaptador.actualizar('planes',base.id,cambios);
      }
    }
    for (const plan of planes) if (!permitidos.has(plan.id)) await adaptador.eliminar('planes',plan.id);
  }
  function precioParaPeriodo(plan,periodo){
    if(!plan)return 0;
    const historial=(plan.historialPrecios||[]).filter(x=>x.desde<=periodo).sort((a,b)=>b.desde.localeCompare(a.desde));
    return Number(historial[0]?.precio ?? plan.precio ?? 0);
  }
  function detalleCuota(alumno,plan,periodo){
    const precio=precioParaPeriodo(plan,periodo);
    const ingreso=alumno.fechaInscripcion;
    const esPrimerMes=U.periodoDe(ingreso)===periodo;
    const dia=Number(ingreso.slice(8,10));
    const gracia=esPrimerMes&&dia>=28;
    const totalDias=new Date(Number(periodo.slice(0,4)),Number(periodo.slice(5,7)),0).getDate();
    const monto=gracia?0:esPrimerMes?Math.round(precio*(totalDias-dia+1)/totalDias):precio;
    const vencimiento=esPrimerMes&&!gracia?U.sumarDias(ingreso,7):`${periodo}-15`;
    return {monto,vencimiento,gracia,proporcional:esPrimerMes&&!gracia};
  }
  function planParaPeriodo(a,periodo){return a.planPendiente&&periodo>=a.planPendiente.desde?a.planPendiente.planId:a.planId;}
  async function generarCuotasDelPeriodo(periodo){
    const [alumnos,planes,cuotas]=await Promise.all(['alumnos','planes','cuotas'].map(adaptador.listar));
    const existentes=new Set(cuotas.filter(c=>c.periodo===periodo).map(c=>c.alumnoId));
    const nuevas=alumnos.filter(a=>a.estado==='activo'&&!existentes.has(a.id)&&a.fechaInscripcion.slice(0,7)<=periodo).map(a=>{
      const idPlan=planParaPeriodo(a,periodo);
      const d=detalleCuota(a,planes.find(p=>p.id===idPlan),periodo);
      return {alumnoId:a.id,periodo,monto:d.monto,vencimiento:d.vencimiento,gracia:d.gracia,proporcional:d.proporcional,fechaPago:d.gracia?'GRACIA':null,metodo:d.gracia?'Días de gracia':null};
    });
    if(nuevas.length)await adaptador.crearVarios('cuotas',nuevas);
    return nuevas.length;
  }
  async function registrarPago({alumnoId,periodo,monto,fechaPago,metodo,nota}){
    const cuotas=await adaptador.listar('cuotas');
    const existente=cuotas.find(c=>c.alumnoId===alumnoId&&c.periodo===periodo);
    const pago={monto:Number(monto),fechaPago,metodo,nota:nota||''};
    if(existente)return adaptador.actualizar('cuotas',existente.id,pago);
    const [alumno,planes]=await Promise.all([adaptador.obtener('alumnos',alumnoId),adaptador.listar('planes')]);
    if(!alumno)throw Error('Alumno inexistente');
    const d=detalleCuota(alumno,planes.find(p=>p.id===planParaPeriodo(alumno,periodo)),periodo);
    return adaptador.crear('cuotas',{alumnoId,periodo,vencimiento:d.vencimiento,proporcional:d.proporcional,...pago});
  }
  async function estadoIngreso(alumnoId,hoy=U.hoyISO()){
    const alumno=await adaptador.obtener('alumnos',alumnoId);
    if(!alumno||alumno.estado!=='activo')return {permitido:false,motivo:'El alumno no está activo.'};
    const periodo=U.periodoDe(hoy);
    if(alumno.fechaInscripcion>hoy)return {permitido:false,motivo:'La inscripción todavía no comenzó.'};
    const [planes,cuotas]=await Promise.all([adaptador.listar('planes'),adaptador.listar('cuotas')]);
    const cuota=cuotas.find(c=>c.alumnoId===alumnoId&&c.periodo===periodo);
    const d=detalleCuota(alumno,planes.find(p=>p.id===planParaPeriodo(alumno,periodo)),periodo);
    const vencimiento=(U.periodoDe(alumno.fechaInscripcion)===periodo?cuota?.vencimiento:d.vencimiento)||d.vencimiento;
    const pagada=Boolean(cuota?.fechaPago);
    if(!pagada&&!d.gracia&&hoy>vencimiento)return {permitido:false,motivo:`Cuota ${periodo} impaga. Venció el ${vencimiento}.`};
    return {permitido:true};
  }
  async function cambiarPrecioPlan(id,precio,desde){
    const plan=await adaptador.obtener('planes',id);
    if(!plan)throw Error('Plan inexistente');
    if(!/^\d{4}-\d{2}$/.test(desde))throw Error('Mes de vigencia inválido');
    if(!Number.isFinite(Number(precio))||Number(precio)<0)throw Error('Precio inválido');
    const historial=(plan.historialPrecios||[]).filter(x=>x.desde!==desde);
    historial.push({desde,precio:Number(precio)});
    return adaptador.actualizar('planes',id,{historialPrecios:historial});
  }

  async function registrarEntrada(alumnoId) {
    return adaptador.crear('asistencias', { alumnoId, fecha: U.hoyISO(), hora: U.horaActual() });
  }

  async function eliminarAlumno(id) {
    await adaptador.eliminar('alumnos', id);
    await adaptador.eliminarDonde('cuotas', (c) => c.alumnoId === id);
    await adaptador.eliminarDonde('asistencias', (a) => a.alumnoId === id);
    const rutinas = await adaptador.listar('rutinas');
    for (const r of rutinas.filter((r) => r.alumnoId === id)) {
      await adaptador.actualizar('rutinas', r.id, { alumnoId: null });
    }
  }

  async function restaurarDemo() {
    await adaptador.reemplazarTodo(Gym.datosDemo.generar());
  }

  async function iniciar() {
    if (Gym.config.almacenamiento === 'local' && !(await adaptador.tieneDatos())) {
      await restaurarDemo();
    }
    await asegurarPlanes();
  }

  Gym.datos = {
    COLECCIONES,
    adaptador,
    iniciar,
    listar: (c) => adaptador.listar(c),
    obtener: (c, id) => adaptador.obtener(c, id),
    crear: (c, d) => adaptador.crear(c, d),
    actualizar: (c, id, d) => adaptador.actualizar(c, id, d),
    eliminar: (c, id) => adaptador.eliminar(c, id),
    leerAjustes: () => adaptador.leerAjustes(),
    guardarAjustes: (a) => adaptador.guardarAjustes(a),
    exportar: () => adaptador.exportar(),
    importar: async (d) => { await adaptador.reemplazarTodo(d); await asegurarPlanes(); },
    borrarTodo: () => adaptador.borrarTodo(),
    restaurarDemo,
    validarAlumno,
    estadoCuota,
    diaVencimientoDe,
    generarCuotasDelPeriodo,
    registrarPago,
    registrarEntrada,
    planParaPeriodo,
    estadoIngreso,
    detalleCuota,
    precioParaPeriodo,
    cambiarPrecioPlan,
    eliminarAlumno,
  };
})();