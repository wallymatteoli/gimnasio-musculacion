/*
 * Datos de ejemplo para la demostración. Son ficticios y se generan
 * relativos a la fecha de hoy, para que el panel siempre luzca actual.
 * Se cargan sólo la primera vez (o desde Administración > Restaurar).
 */
(function () {
  const U = Gym.utils;

  function generador(semilla) {
    let s = semilla >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function generar() {
    const azar = generador(20261121);
    const entre = (min, max) => Math.floor(azar() * (max - min + 1)) + min;
    const hoy = U.hoyISO();
    const periodo = U.periodoActual();

    const planes = [
      { id: 'pln_2', nombre: 'Musculación — 2 veces por semana', precio: 50000, limiteSemanal: 2, descripcion: 'Cuota mensual. Hasta 2 días por semana.' },
      { id: 'pln_3', nombre: 'Musculación — 3 veces por semana', precio: 60000, limiteSemanal: 3, descripcion: 'Cuota mensual. Hasta 3 días por semana.' },
      { id: 'pln_4', nombre: 'Musculación — 4 veces por semana', precio: 65000, limiteSemanal: 4, descripcion: 'Cuota mensual. Hasta 4 días por semana.' },
      { id: 'pln_libre', nombre: 'Musculación — Todos los días - Pase libre', precio: 70000, limiteSemanal: 0, descripcion: 'Cuota mensual. Sin límite semanal.' },
    ];

    const personas = [
      ['Martina', 'Gallardo', '11 5823-4471'], ['Joaquín', 'Ferreyra', '11 6402-1938'], ['Camila', 'Benítez', '11 3317-8820'],
      ['Tomás', 'Aguirre', '11 4790-2265'], ['Valentina', 'Quiroga', '11 6158-0347'], ['Lautaro', 'Medina', '11 2894-6611'],
      ['Rocío', 'Paz', '11 5530-7192'], ['Facundo', 'Ledesma', '11 3046-5583'], ['Agustina', 'Sosa', '11 6721-4409'],
      ['Nicolás', 'Villalba', '11 4185-9036'], ['Micaela', 'Ríos', '11 5967-1254'], ['Santiago', 'Correa', '11 2238-7740'],
      ['Florencia', 'Domínguez', '11 6612-3085'], ['Matías', 'Ojeda', '11 3871-4927'], ['Julieta', 'Cabrera', '11 4456-0812'],
      ['Gonzalo', 'Herrera', '11 5104-6378'], ['Lucía', 'Vera', '11 6390-2751'], ['Ezequiel', 'Molina', '11 2763-9104'],
      ['Sofía', 'Acosta', '11 4928-5560'], ['Bruno', 'Peralta', '11 3582-1847'], ['Milagros', 'Godoy', '11 6047-7329'],
      ['Ignacio', 'Romero', '11 5219-3608'], ['Antonella', 'Luna', '11 4671-2095'], ['Franco', 'Navarro', '11 3395-8462'],
      ['Carolina', 'Suárez', '11 6283-5017'], ['Emiliano', 'Castro', '11 2946-1173'],
    ];
    const estados = ['activo', 'activo', 'activo', 'activo', 'activo', 'activo', 'activo', 'activo', 'activo', 'inactivo', 'suspendido'];
    const notas = ['', '', '', 'Lesión de rodilla izquierda: evitar impacto.', '', 'Prefiere entrenar a la mañana.', '', 'Objetivo: preparar media maratón.', ''];

    const alumnos = personas.map(([nombre, apellido, telefono], i) => {
      const plan = planes[entre(0, planes.length - 1)];
      return {
        id: `alu_demo_${i + 1}`,
        nombre,
        apellido,
        telefono,
        fechaInscripcion: U.sumarDias(hoy, -entre(12, 520)),
        estado: i < 22 ? 'activo' : estados[entre(9, estados.length - 1)],
        planId: plan.id,
        notas: notas[i % notas.length],
      };
    });

    // Cuotas: los tres meses anteriores (casi todos pagos) y el mes actual.
    const cuotas = [];
    alumnos.forEach((a) => {
      const plan = planes.find((p) => p.id === a.planId);
      const dia = 15;
      for (let k = 3; k >= 0; k--) {
        const per = U.sumarMeses(periodo, -k);
        if (U.periodoDe(a.fechaInscripcion) > per) continue;
        if (a.estado !== 'activo' && k === 0) continue;
        const vencimiento = U.vencimientoEnPeriodo(per, dia);
        let pagada;
        if (k > 0) pagada = a.estado === 'activo' ? azar() > 0.04 : azar() > 0.5;
        else pagada = vencimiento <= hoy ? azar() > 0.3 : azar() > 0.75;
        const metodo = ['Efectivo', 'Transferencia', 'Tarjeta de débito', 'Mercado Pago'][entre(0, 3)];
        const fechaPago = pagada ? U.sumarDias(vencimiento, -entre(-3, 6)) : null;
        cuotas.push({
          id: `cuo_demo_${a.id}_${per}`,
          alumnoId: a.id,
          periodo: per,
          monto: plan.precio,
          vencimiento,
          fechaPago: fechaPago && fechaPago > hoy ? hoy : fechaPago,
          metodo: pagada ? metodo : null,
          nota: '',
        });
      }
    });

    // Asistencias de los últimos 35 días.
    const asistencias = [];
    alumnos
      .filter((a) => a.estado === 'activo')
      .forEach((a) => {
        const frecuencia = 0.25 + azar() * 0.45;
        const horaHabitual = [7, 8, 9, 12, 18, 19, 20][entre(0, 6)];
        for (let d = 35; d >= 0; d--) {
          const fecha = U.sumarDias(hoy, -d);
          if (fecha < a.fechaInscripcion) continue;
          const dia = U.desdeISO(fecha).getDay();
          if (dia === 0) continue;
          if (azar() > (dia === 6 ? frecuencia * 0.5 : frecuencia)) continue;
          let h = Math.min(22, Math.max(7, horaHabitual + entre(-1, 1)));
          if (d === 0 && h > new Date().getHours()) continue;
          asistencias.push({
            id: `asi_demo_${a.id}_${fecha}`,
            alumnoId: a.id,
            fecha,
            hora: `${String(h).padStart(2, '0')}:${String(entre(0, 59)).padStart(2, '0')}`,
          });
        }
      });

    const ej = (dia, nombre, series, repeticiones, descanso, notas) => ({ dia, nombre, series, repeticiones, descanso, notas: notas || '' });
    const rutinas = [
      {
        id: 'rut_demo_1',
        nombre: 'Hipertrofia en 4 días',
        objetivo: 'Ganar masa muscular',
        nivel: 'Intermedio',
        alumnoId: 'alu_demo_2',
        dias: [1, 2, 4, 5],
        ejercicios: [
          ej(1, 'Press de banca plano', 4, '8-10', '90 s'),
          ej(1, 'Press inclinado con mancuernas', 3, '10-12', '75 s'),
          ej(1, 'Fondos en paralelas', 3, 'Al fallo', '60 s'),
          ej(1, 'Extensión de tríceps en polea', 3, '12', '45 s'),
          ej(2, 'Dominadas', 4, '6-8', '90 s', 'Con banda si hace falta'),
          ej(2, 'Remo con barra', 4, '8-10', '90 s'),
          ej(2, 'Curl de bíceps con barra', 3, '10', '60 s'),
          ej(4, 'Sentadilla trasera', 4, '6-8', '120 s'),
          ej(4, 'Prensa 45°', 3, '12', '90 s'),
          ej(4, 'Peso muerto rumano', 3, '10', '90 s'),
          ej(4, 'Gemelos de pie', 4, '15', '45 s'),
          ej(5, 'Press militar', 4, '8', '90 s'),
          ej(5, 'Elevaciones laterales', 3, '12-15', '45 s'),
          ej(5, 'Face pull', 3, '15', '45 s'),
        ],
      },
      {
        id: 'rut_demo_2',
        nombre: 'Adaptación — primer mes',
        objetivo: 'Aprender la técnica y crear el hábito',
        nivel: 'Principiante',
        alumnoId: null,
        dias: [1, 3, 5],
        ejercicios: [
          ej(1, 'Sentadilla con peso corporal', 3, '15', '60 s'),
          ej(1, 'Remo en máquina', 3, '12', '60 s'),
          ej(1, 'Plancha frontal', 3, '30 s', '45 s'),
          ej(3, 'Prensa de piernas', 3, '12', '60 s'),
          ej(3, 'Press de pecho en máquina', 3, '12', '60 s'),
          ej(3, 'Bicicleta fija', 1, '15 min', '—', 'Ritmo moderado'),
          ej(5, 'Zancadas alternadas', 3, '10 por pierna', '60 s'),
          ej(5, 'Jalón al pecho', 3, '12', '60 s'),
          ej(5, 'Abdominales bicho muerto', 3, '12', '45 s'),
        ],
      },
      {
        id: 'rut_demo_3',
        nombre: 'Fuerza base 3 días',
        objetivo: 'Mejorar marcas en los básicos',
        nivel: 'Avanzado',
        alumnoId: 'alu_demo_6',
        dias: [1, 3, 5],
        ejercicios: [
          ej(1, 'Sentadilla trasera', 5, '5', '180 s', 'RPE 8'),
          ej(1, 'Press de banca', 5, '5', '180 s'),
          ej(3, 'Peso muerto convencional', 3, '5', '180 s'),
          ej(3, 'Press militar', 5, '5', '150 s'),
          ej(5, 'Sentadilla frontal', 4, '6', '150 s'),
          ej(5, 'Remo Pendlay', 4, '6', '120 s'),
        ],
      },
      {
        id: 'rut_demo_4',
        nombre: 'Running + fuerza',
        objetivo: 'Preparación media maratón',
        nivel: 'Intermedio',
        alumnoId: 'alu_demo_8',
        dias: [2, 4, 6],
        ejercicios: [
          ej(2, 'Sentadilla búlgara', 3, '10 por pierna', '75 s'),
          ej(2, 'Hip thrust', 4, '10', '75 s'),
          ej(4, 'Peso muerto a una pierna', 3, '8 por pierna', '60 s'),
          ej(4, 'Elevación de gemelos a una pierna', 3, '15', '45 s'),
          ej(6, 'Circuito de core', 4, '40 s trabajo / 20 s pausa', '90 s'),
        ],
      },
    ];

    const clase = (id, nombre, instructor, dias, horaInicio, horaFin, sala, cupo) => ({ id, nombre, instructor, dias, horaInicio, horaFin, sala, cupo });
    const clases = [
      clase('cla_demo_1', 'Funcional', 'Lucía Ferreyra', [1, 3, 5], '08:00', '09:00', 'Sala 1', 20),
      clase('cla_demo_2', 'Crossfit', 'Diego Arce', [1, 2, 3, 4, 5], '18:00', '19:00', 'Box', 16),
      clase('cla_demo_3', 'Spinning', 'Paula Iturbe', [2, 4], '19:15', '20:00', 'Sala de ciclismo', 24),
      clase('cla_demo_4', 'Boxeo', 'Ramiro Toledo', [2, 4], '20:15', '21:30', 'Sala 2', 14),
      clase('cla_demo_5', 'GAP', 'Lucía Ferreyra', [3], '19:00', '20:00', 'Sala 1', 22),
      clase('cla_demo_6', 'Yoga', 'Inés Barrios', [6], '10:00', '11:15', 'Sala 2', 18),
      clase('cla_demo_7', 'Movilidad y estiramiento', 'Inés Barrios', [1, 5], '20:00', '20:45', 'Sala 2', 18),
      clase('cla_demo_8', 'Funcional', 'Diego Arce', [2, 4], '07:30', '08:30', 'Sala 1', 20),
    ];

    return {
      version: Gym.config.version,
      ajustes: {
        nombreGimnasio: 'Mi Gimnasio',
        direccion: 'Av. Ejemplo 1234',
        telefono: '11 4000-0000',
        horario: 'Lunes a viernes de 7 a 23 h · Sábados de 9 a 14 h',
      },
      planes,
      alumnos,
      cuotas,
      asistencias,
      rutinas,
      clases,
    };
  }

  Gym.datosDemo = { generar };
})();