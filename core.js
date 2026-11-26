// Lógica de cálculo de plazos y puentes. Sin dependencias del navegador para poder probarla con Node.
import { festivosDe } from './festivos.js';

// ---------- Fechas (siempre 'YYYY-MM-DD', calculadas en UTC para evitar líos de horario de verano) ----------
export const aFecha = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
export const aISO = (f) => f.toISOString().slice(0, 10);
export const sumarDias = (iso, n) => { const f = aFecha(iso); f.setUTCDate(f.getUTCDate() + n); return aISO(f); };
export const diaSemana = (iso) => aFecha(iso).getUTCDay(); // 0 domingo … 6 sábado
export const diasEntre = (a, b) => Math.round((aFecha(b) - aFecha(a)) / 86400000);
export const diasDelMes = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m: 1-12

export function hoyISO(ahora = new Date()) {
  // Fecha local del dispositivo (no UTC): lo que la persona ve en su calendario.
  const p = (n) => String(n).padStart(2, '0');
  return `${ahora.getFullYear()}-${p(ahora.getMonth() + 1)}-${p(ahora.getDate())}`;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const nombreMes = (m) => MESES[m - 1];
export const nombreDia = (iso) => DIAS[diaSemana(iso)];
export function fechaLarga(iso, conAño = true) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${nombreDia(iso)} ${d} de ${nombreMes(m)}${conAño ? ` de ${y}` : ''}`;
}
export function fechaCorta(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d}/${m}/${y}`;
}

// ---------- Calendario de una persona ----------
// ctx = { region, zona, locales: ['YYYY-MM-DD', ...] }
export function crearCalendario(ctx) {
  const cache = new Map();
  const deAño = (y) => {
    if (!cache.has(y)) cache.set(y, festivosDe(y, ctx.region, ctx.zona));
    return cache.get(y);
  };
  const locales = new Set(ctx.locales || []);
  return {
    festivo(iso) {
      if (locales.has(iso)) return 'Fiesta local';
      return deAño(Number(iso.slice(0, 4))).mapa.get(iso) || null;
    },
    estimado(y) { return deAño(y).estimado; },
    tieneLocales(y) { return [...locales].some((d) => d.startsWith(`${y}-`)); },
  };
}

export function motivoInhabil(iso, cal, regimen = 'admin') {
  const dw = diaSemana(iso);
  if (dw === 6) return 'Sábado';
  if (dw === 0) return 'Domingo';
  const f = cal.festivo(iso);
  if (f) return f;
  if (regimen === 'judicial') {
    const m = Number(iso.slice(5, 7)), d = Number(iso.slice(8, 10));
    if (m === 8) return 'Agosto (inhábil en los juzgados)';
    if ((m === 12 && d >= 24) || (m === 1 && d <= 6)) return 'Navidad (inhábil en los juzgados, 24 dic – 6 ene)';
  }
  return null;
}
export const esHabil = (iso, cal, regimen) => motivoInhabil(iso, cal, regimen) === null;

export function siguienteHabil(iso, cal, regimen) {
  let d = iso;
  for (let i = 0; i < 400 && !esHabil(d, cal, regimen); i++) d = sumarDias(d, 1);
  return d;
}

// ---------- Cálculo de un plazo ----------
// p = { notificacion: 'YYYY-MM-DD', cantidad, unidad: 'habiles'|'naturales'|'meses', regimen: 'admin'|'judicial',
//       electronicaSinAbrir: bool }
// Reglas: art. 30 Ley 39/2015 (administrativo) y arts. 182-185 LOPJ y 130-133 LEC (judicial).
export function calcularPlazo(p, cal) {
  const avisos = [];
  let notif = p.notificacion;
  if (p.electronicaSinAbrir) {
    // Art. 43.2 Ley 39/2015: si no se abre, se entiende rechazada a los 10 días naturales de ponerse a disposición.
    notif = sumarDias(p.notificacion, 10);
    avisos.push(`Como no la has abierto, la notificación se da por hecha el ${fechaLarga(notif, false)} (10 días naturales después de ponerse a tu disposición).`);
  }
  const regimen = p.regimen || 'admin';
  const n = Math.max(1, Math.floor(Number(p.cantidad) || 0));
  const inicio = sumarDias(notif, 1); // los plazos empiezan a contar el día siguiente
  let nominal, fin, saltados = [];

  if (p.unidad === 'habiles') {
    let d = notif, c = 0;
    while (c < n) {
      d = sumarDias(d, 1);
      const mot = motivoInhabil(d, cal, regimen);
      if (mot) saltados.push({ fecha: d, motivo: mot }); else c++;
    }
    nominal = fin = d;
  } else if (p.unidad === 'naturales') {
    nominal = sumarDias(notif, n);
    fin = siguienteHabil(nominal, cal, regimen);
  } else {
    // Meses: de fecha a fecha; si en el mes final no existe ese día, vence el último día del mes.
    const [y, m, d] = notif.split('-').map(Number);
    const total = (m - 1) + n;
    const yf = y + Math.floor(total / 12), mf = (total % 12) + 1;
    const df = Math.min(d, diasDelMes(yf, mf));
    nominal = `${yf}-${String(mf).padStart(2, '0')}-${String(df).padStart(2, '0')}`;
    fin = siguienteHabil(nominal, cal, regimen);
  }

  const prorrogado = fin !== nominal;
  if (prorrogado) {
    avisos.push(`El ${fechaLarga(nominal, false)} es inhábil (${motivoInhabil(nominal, cal, regimen).toLowerCase()}), así que el plazo pasa al siguiente día hábil.`);
  }

  // Avisos de prudencia: años sin calendario publicado y fiestas locales sin indicar.
  const años = new Set([inicio.slice(0, 4), fin.slice(0, 4)].map(Number));
  for (const y of años) {
    if (cal.estimado(y)) avisos.push(`El calendario oficial de ${y} aún no está publicado: solo se cuentan las fiestas nacionales. Comprueba la fecha más adelante.`);
  }
  let sinLocales = false;
  for (const y of años) if (!cal.tieneLocales(y)) sinLocales = true;
  if (sinLocales && p.unidad === 'habiles') {
    avisos.push('No has indicado tus fiestas locales. Si alguna cae dentro del plazo, el vencimiento real es un día más tarde: la fecha que ves es la prudente.');
  }
  if (regimen === 'judicial') {
    avisos.push('En los juzgados puedes presentar el escrito hasta las 15:00 del día hábil siguiente al vencimiento (art. 135 LEC), pero no lo dejes para entonces.');
  }

  return {
    notificacion: notif,
    inicio,
    nominal,
    fin,
    prorrogado,
    // Fecha prudente: si el último día se prorrogó, recomendamos presentar antes del día original.
    prudente: prorrogado ? anteriorHabil(nominal, cal, regimen) : fin,
    saltados,
    avisos,
  };
}

export function anteriorHabil(iso, cal, regimen) {
  let d = iso;
  for (let i = 0; i < 400 && !esHabil(d, cal, regimen); i++) d = sumarDias(d, -1);
  return d;
}

// Días hábiles que quedan desde hoy (sin contar hoy) hasta el vencimiento (incluido).
export function habilesRestantes(hoy, fin, cal, regimen) {
  if (fin < hoy) return -1;
  let c = 0;
  for (let d = sumarDias(hoy, 1); d <= fin; d = sumarDias(d, 1)) if (esHabil(d, cal, regimen)) c++;
  return c;
}

// ---------- Tipos de notificación habituales ----------
export const TIPOS = [
  { id: 'multa-pago', nombre: 'Multa de tráfico: pagar con el 50 % de descuento', cantidad: 20, unidad: 'naturales', regimen: 'admin',
    ley: 'Art. 94 de la Ley de Tráfico (RDL 6/2015): 20 días naturales desde el día siguiente a la notificación.' },
  { id: 'multa-alegaciones', nombre: 'Multa de tráfico: presentar alegaciones', cantidad: 20, unidad: 'naturales', regimen: 'admin',
    ley: 'Art. 95 de la Ley de Tráfico (RDL 6/2015): 20 días naturales.' },
  { id: 'subsanar', nombre: 'Requerimiento para aportar o corregir documentación', cantidad: 10, unidad: 'habiles', regimen: 'admin',
    ley: 'Art. 68 de la Ley 39/2015: 10 días hábiles. Si tu carta indica otro plazo, usa el de la carta.' },
  { id: 'audiencia', nombre: 'Trámite de audiencia o alegaciones', cantidad: 10, unidad: 'habiles', regimen: 'admin',
    ley: 'Art. 82 de la Ley 39/2015: entre 10 y 15 días hábiles. Ponemos 10 por prudencia; mira el que indica tu carta.' },
  { id: 'alzada', nombre: 'Recurso de alzada', cantidad: 1, unidad: 'meses', regimen: 'admin',
    ley: 'Art. 122 de la Ley 39/2015: un mes.' },
  { id: 'reposicion', nombre: 'Recurso de reposición', cantidad: 1, unidad: 'meses', regimen: 'admin',
    ley: 'Art. 124 de la Ley 39/2015 (y art. 223 de la Ley General Tributaria para Hacienda): un mes.' },
  { id: 'economico', nombre: 'Reclamación económico-administrativa (Hacienda)', cantidad: 1, unidad: 'meses', regimen: 'admin',
    ley: 'Art. 235 de la Ley General Tributaria: un mes.' },
  { id: 'contencioso', nombre: 'Recurso contencioso-administrativo', cantidad: 2, unidad: 'meses', regimen: 'admin',
    ley: 'Art. 46 de la Ley 29/1998: dos meses. En agosto este plazo no corre (art. 128): si agosto queda en medio, el vencimiento real es más tarde. Te damos la fecha prudente; confírmala con un abogado.' },
  { id: 'judicial', nombre: 'Plazo de un juzgado (días)', cantidad: 20, unidad: 'habiles', regimen: 'judicial',
    ley: 'Arts. 182-185 LOPJ y 130-133 LEC: no cuentan sábados, domingos, festivos, agosto ni del 24 de diciembre al 6 de enero. Escribe los días que indique la resolución.' },
  { id: 'otro', nombre: 'Otro plazo (lo escribo yo)', cantidad: 10, unidad: 'habiles', regimen: 'admin', ley: '' },
];

// ---------- Puentes ----------
// Busca combinaciones de días de vacaciones que unen festivos con fines de semana.
// opciones = { libres: [0, 6] (días de la semana que no trabajas), maxDias: 4 }
export function buscarPuentes(año, cal, opciones = {}) {
  const libresSemana = new Set(opciones.libres || [0, 6]);
  const maxDias = opciones.maxDias || 4;
  const dias = [];
  for (let d = `${año}-01-01`; d.startsWith(String(año)); d = sumarDias(d, 1)) {
    const fest = cal.festivo(d);
    const libre = libresSemana.has(diaSemana(d)) || !!fest;
    dias.push({ fecha: d, libre, festivo: fest && !libresSemana.has(diaSemana(d)) ? fest : null });
  }
  // Bloques de días libres seguidos.
  const bloques = [];
  for (let i = 0; i < dias.length; i++) {
    if (!dias[i].libre) continue;
    let j = i;
    while (j + 1 < dias.length && dias[j + 1].libre) j++;
    bloques.push({ desde: i, hasta: j, festivos: dias.slice(i, j + 1).filter((x) => x.festivo).map((x) => x.festivo) });
    i = j;
  }
  const candidatos = [];
  for (let a = 0; a < bloques.length; a++) {
    let pedir = 0;
    for (let b = a + 1; b < bloques.length; b++) {
      pedir += bloques[b].desde - bloques[b - 1].hasta - 1;
      if (pedir > maxDias) break;
      const tramo = bloques.slice(a, b + 1);
      const festivos = tramo.flatMap((x) => x.festivos);
      if (!festivos.length) continue; // solo nos interesan los que aprovechan un festivo
      const desde = bloques[a].desde, hasta = bloques[b].hasta;
      const pedirDias = dias.slice(desde, hasta + 1).filter((x) => !x.libre).map((x) => x.fecha);
      candidatos.push({
        desde: dias[desde].fecha, hasta: dias[hasta].fecha,
        libres: hasta - desde + 1, pedir: pedirDias, festivos: [...new Set(festivos)],
        rendimiento: (hasta - desde + 1) / pedirDias.length,
      });
    }
  }
  candidatos.sort((x, y) => y.rendimiento - x.rendimiento || y.libres - x.libres || x.desde.localeCompare(y.desde));
  return candidatos;
}

// Elige los mejores puentes sin solaparse hasta gastar como mucho 'presupuesto' días.
export function planDePuentes(candidatos, presupuesto) {
  const elegidos = [];
  let usados = 0;
  for (const c of candidatos) {
    if (usados + c.pedir.length > presupuesto) continue;
    if (elegidos.some((e) => !(c.hasta < e.desde || c.desde > e.hasta))) continue;
    elegidos.push(c);
    usados += c.pedir.length;
  }
  elegidos.sort((a, b) => a.desde.localeCompare(b.desde));
  return { elegidos, usados, libresTotales: elegidos.reduce((s, c) => s + c.libres, 0) };
}

// ---------- Recordatorios en el calendario (.ics) ----------
export function crearICS({ titulo, fecha, descripcion, avisarDiasAntes = [2, 1], uid }) {
  const f = fecha.replaceAll('-', '');
  const fin = sumarDias(fecha, 1).replaceAll('-', '');
  const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  const ahora = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const alarmas = avisarDiasAntes.map((d) => [
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(titulo)}`, `TRIGGER:-P${d}DT0H`, 'END:VALARM',
  ].join('\r\n'));
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Dia Habil//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT', `UID:${uid || `${f}-${Math.random().toString(36).slice(2)}`}@diahabil`, `DTSTAMP:${ahora}`,
    `DTSTART;VALUE=DATE:${f}`, `DTEND;VALUE=DATE:${fin}`, `SUMMARY:${esc(titulo)}`, `DESCRIPTION:${esc(descripcion || '')}`,
    ...alarmas, 'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n');
}

export function enlaceGoogleCalendar({ titulo, fecha, descripcion }) {
  const f = fecha.replaceAll('-', '');
  const fin = sumarDias(fecha, 1).replaceAll('-', '');
  const q = new URLSearchParams({ action: 'TEMPLATE', text: titulo, dates: `${f}/${fin}`, details: descripcion || '' });
  return `https://calendar.google.com/calendar/render?${q}`;
}
