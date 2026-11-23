/* Componentes de interfaz compartidos: íconos, ventanas, avisos y piezas de HTML. */
(function () {
  const U = Gym.utils;
  const e = U.escapar;

  const icono = (nombre, clase) => `<svg class="icono ${clase || ''}" aria-hidden="true"><use href="#i-${nombre}"/></svg>`;

  /* ---------- Ventana modal ---------- */
  const modal = () => document.getElementById('modal');

  function abrirModal({ titulo, subtitulo, cuerpo, pie, ancho }) {
    const d = modal();
    d.className = `modal ${ancho ? 'modal--' + ancho : ''}`;
    d.innerHTML = `
      <div class="modal__caja">
        <header class="modal__cabecera">
          <div>
            <h2 class="modal__titulo">${e(titulo)}</h2>
            ${subtitulo ? `<p class="modal__subtitulo">${subtitulo}</p>` : ''}
          </div>
          <button type="button" class="boton-icono" data-cerrar aria-label="Cerrar">${icono('cerrar')}</button>
        </header>
        <div class="modal__cuerpo">${cuerpo}</div>
        ${pie ? `<footer class="modal__pie">${pie}</footer>` : ''}
      </div>`;
    d.querySelectorAll('[data-cerrar]').forEach((b) => b.addEventListener('click', cerrarModal));
    if (!d.open) d.showModal();
    const primero = d.querySelector('.modal__cuerpo input:not([type=hidden]), .modal__cuerpo select, .modal__cuerpo textarea');
    if (primero && window.matchMedia('(pointer: fine)').matches) primero.focus();
    return d;
  }

  function cerrarModal() {
    const d = modal();
    if (d.open) d.close();
  }

  /* ---------- Confirmación ---------- */
  function confirmar({ titulo, mensaje, textoConfirmar, peligro }) {
    return new Promise((resolver) => {
      const d = document.getElementById('confirmacion');
      d.innerHTML = `
        <form method="dialog" class="modal__caja">
          <header class="modal__cabecera"><h2 class="modal__titulo">${e(titulo || '¿Confirmás?')}</h2></header>
          <div class="modal__cuerpo"><p>${mensaje}</p></div>
          <footer class="modal__pie">
            <button value="no" class="boton boton--fantasma">Cancelar</button>
            <button value="si" class="boton ${peligro ? 'boton--peligro' : 'boton--primario'}">${e(textoConfirmar || 'Confirmar')}</button>
          </footer>
        </form>`;
      d.addEventListener('close', () => resolver(d.returnValue === 'si'), { once: true });
      d.returnValue = '';
      d.showModal();
    });
  }

  /* ---------- Avisos breves ---------- */
  function avisar(mensaje, tipo) {
    const zona = document.getElementById('avisos');
    const el = document.createElement('div');
    el.className = `aviso aviso--${tipo || 'ok'}`;
    el.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
    const ic = { ok: 'check', error: 'alerta', alerta: 'alerta', info: 'info' }[tipo || 'ok'];
    el.innerHTML = `${icono(ic)}<span>${mensaje}</span>`;
    zona.appendChild(el);
    setTimeout(() => el.classList.add('aviso--saliendo'), 3800);
    setTimeout(() => el.remove(), 4300);
  }

  /* ---------- Formularios ---------- */
  function leerFormulario(form) {
    const datos = {};
    new FormData(form).forEach((v, k) => {
      datos[k] = typeof v === 'string' ? v.trim() : v;
    });
    return datos;
  }

  function mostrarErrores(form, errores) {
    form.querySelectorAll('.campo__error').forEach((n) => n.remove());
    form.querySelectorAll('[aria-invalid]').forEach((n) => n.removeAttribute('aria-invalid'));
    Object.entries(errores).forEach(([campo, msj]) => {
      const input = form.elements[campo];
      if (!input) return;
      input.setAttribute('aria-invalid', 'true');
      const p = document.createElement('p');
      p.className = 'campo__error';
      p.textContent = msj;
      input.closest('.campo').appendChild(p);
    });
    const primero = form.querySelector('[aria-invalid]');
    if (primero) primero.focus();
    return Object.keys(errores).length === 0;
  }

  /* ---------- Piezas reutilizables ---------- */
  const ETIQUETAS_ESTADO = {
    activo: 'Activo',
    inactivo: 'Inactivo',
    suspendido: 'Suspendido',
    pagada: 'Pagada',
    pendiente: 'Pendiente',
    vencida: 'Vencida',
  };
  const ICONOS_ESTADO = { activo: 'check', pagada: 'check', pendiente: 'reloj', vencida: 'alerta', inactivo: 'pausa', suspendido: 'bloqueo' };

  const insignia = (estado) =>
    `<span class="insignia insignia--${estado}">${icono(ICONOS_ESTADO[estado] || 'info')}${ETIQUETAS_ESTADO[estado] || e(estado)}</span>`;

  const avatar = (alumno, clase) => `<span class="avatar ${clase || ''}" aria-hidden="true">${e(U.iniciales(alumno || {}))}</span>`;

  const vacio = (ic, titulo, texto, accion) => `
    <div class="vacio">
      <span class="vacio__icono">${icono(ic)}</span>
      <h3>${e(titulo)}</h3>
      <p>${texto}</p>
      ${accion || ''}
    </div>`;

  const campo = ({ etiqueta, nombre, tipo, valor, requerido, opciones, ayuda, atributos, ancho }) => {
    const id = `c-${nombre}-${Math.random().toString(36).slice(2, 6)}`;
    const attrs = `id="${id}" name="${nombre}" ${requerido ? 'required' : ''} ${atributos || ''}`;
    let control;
    if (tipo === 'select') {
      control = `<select ${attrs}>${opciones
        .map((o) => `<option value="${e(o.valor)}" ${String(o.valor) === String(valor ?? '') ? 'selected' : ''}>${e(o.texto)}</option>`)
        .join('')}</select>`;
    } else if (tipo === 'textarea') {
      control = `<textarea ${attrs} rows="3">${e(valor)}</textarea>`;
    } else {
      control = `<input type="${tipo || 'text'}" ${attrs} value="${e(valor)}" />`;
    }
    return `<div class="campo ${ancho ? 'campo--' + ancho : ''}">
      <label for="${id}">${e(etiqueta)}${requerido ? ' <span class="campo__req" aria-hidden="true">*</span>' : ''}</label>
      ${control}
      ${ayuda ? `<p class="campo__ayuda">${ayuda}</p>` : ''}
    </div>`;
  };

  Gym.ui = { icono, abrirModal, cerrarModal, confirmar, avisar, leerFormulario, mostrarErrores, insignia, avatar, vacio, campo };
})();