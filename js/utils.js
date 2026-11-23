/* Utilidades: fechas, moneda, texto seguro e identificadores. */
(function () {
  const { locale, moneda } = Gym.config;

  const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  // Orden de la semana empezando por lunes (índices de Date.getDay()).
  const ORDEN_SEMANA = [1, 2, 3, 4, 5, 6, 0];

  const pad = (n) => String(n).padStart(2, '0');

  function aISO(fecha) {
    return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`;
  }
  function desdeISO(iso) {
    const [a, m, d] = String(iso).split('-').map(Number);
    return new Date(a, (m || 1) - 1, d || 1);
  }
  function hoyISO() {
    return aISO(new Date());
  }
  function horaActual() {
    const d = new Date();
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function sumarDias(iso, dias) {
    const d = desdeISO(iso);
    d.setDate(d.getDate() + dias);
    return aISO(d);
  }
  function diasEntre(desdeIso, hastaIso) {
    return Math.round((desdeISO(hastaIso) - desdeISO(desdeIso)) / 86400000);
  }
  function periodoDe(iso) {
    return String(iso).slice(0, 7);
  }
  function periodoActual() {
    return periodoDe(hoyISO());
  }
  function sumarMeses(periodo, n) {
    const [a, m] = periodo.split('-').map(Number);
    const d = new Date(a, m - 1 + n, 1);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  }
  function nombrePeriodo(periodo) {
    const [a, m] = periodo.split('-').map(Number);
    const mes = MESES[m - 1] || '';
    return `${mes.charAt(0).toUpperCase()}${mes.slice(1)} ${a}`;
  }
  function vencimientoEnPeriodo(periodo, dia) {
    const [a, m] = periodo.split('-').map(Number);
    const ultimo = new Date(a, m, 0).getDate();
    return `${periodo}-${pad(Math.min(Math.max(1, dia), ultimo))}`;
  }
  function lunesDe(iso) {
    const d = desdeISO(iso);
    const dia = d.getDay();
    d.setDate(d.getDate() - (dia === 0 ? 6 : dia - 1));
    return aISO(d);
  }

  const fmtFecha = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  const fmtFechaCorta = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
  const fmtFechaLarga = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const fmtMoneda = new Intl.NumberFormat(locale, { style: 'currency', currency: moneda, maximumFractionDigits: 0 });
  const fmtNumero = new Intl.NumberFormat(locale);

  function formatearFecha(iso, estilo) {
    if (!iso) return '—';
    const d = desdeISO(iso);
    if (estilo === 'corta') return fmtFechaCorta.format(d).replace('.', '');
    if (estilo === 'larga') return fmtFechaLarga.format(d);
    return fmtFecha.format(d).replace('.', '');
  }

  function escapar(texto) {
    return String(texto ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizar(texto) {
    return String(texto ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  }

  function uid(prefijo) {
    const azar = Math.random().toString(36).slice(2, 8);
    return `${prefijo || 'id'}_${Date.now().toString(36)}${azar}`;
  }

  function iniciales(alumno) {
    return `${(alumno.nombre || '?').charAt(0)}${(alumno.apellido || '').charAt(0)}`.toUpperCase();
  }

  function nombreCompleto(alumno) {
    return alumno ? `${alumno.nombre} ${alumno.apellido}` : 'Alumno eliminado';
  }

  function plural(n, singular, pluralTxt) {
    return `${fmtNumero.format(n)} ${n === 1 ? singular : pluralTxt || singular + 's'}`;
  }

  Gym.utils = {
    DIAS,
    DIAS_CORTOS,
    MESES,
    ORDEN_SEMANA,
    aISO,
    desdeISO,
    hoyISO,
    horaActual,
    sumarDias,
    diasEntre,
    periodoDe,
    periodoActual,
    sumarMeses,
    nombrePeriodo,
    vencimientoEnPeriodo,
    lunesDe,
    formatearFecha,
    moneda: (n) => fmtMoneda.format(Number(n) || 0),
    numero: (n) => fmtNumero.format(Number(n) || 0),
    escapar,
    normalizar,
    uid,
    iniciales,
    nombreCompleto,
    plural,
  };
})();