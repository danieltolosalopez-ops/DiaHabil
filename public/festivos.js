// Festivos que caen en día laborable (lunes a viernes), por año y comunidad.
// Fuentes oficiales (actualizar cada otoño, ver README → "Mantenimiento anual"):
//  - 2026: Resolución de 17/10/2025 de la Dirección General de Trabajo (BOE 28/10/2025) y
//          calendario de días inhábiles de la AGE (Resolución de 18/11/2025, BOE 24/11/2025).
//  - 2027: Resolución de 8/10/2026 de la Dirección General de Trabajo (BOE 13/10/2026) y
//          calendario de días inhábiles de la AGE (Resolución de 5/11/2026, BOE 14/11/2026).
// Los festivos que caen en sábado o domingo no se apuntan: ya son inhábiles.
// Formato de fecha: 'MM-DD'.

export const REGIONES = [
  { id: 'AN', nombre: 'Andalucía' },
  { id: 'AR', nombre: 'Aragón' },
  { id: 'AS', nombre: 'Asturias' },
  { id: 'IB', nombre: 'Illes Balears' },
  { id: 'CN', nombre: 'Canarias', zonas: [
    { id: 'CN-EH', nombre: 'El Hierro' },
    { id: 'CN-FV', nombre: 'Fuerteventura' },
    { id: 'CN-GC', nombre: 'Gran Canaria' },
    { id: 'CN-GO', nombre: 'La Gomera' },
    { id: 'CN-LP', nombre: 'La Palma' },
    { id: 'CN-LZ', nombre: 'Lanzarote y La Graciosa' },
    { id: 'CN-TF', nombre: 'Tenerife' },
  ] },
  { id: 'CB', nombre: 'Cantabria' },
  { id: 'CM', nombre: 'Castilla-La Mancha' },
  { id: 'CL', nombre: 'Castilla y León' },
  { id: 'CT', nombre: 'Cataluña', zonas: [{ id: 'CT-ARAN', nombre: 'Val d’Aran' }] },
  { id: 'EX', nombre: 'Extremadura' },
  { id: 'GA', nombre: 'Galicia' },
  { id: 'MD', nombre: 'Comunidad de Madrid' },
  { id: 'MC', nombre: 'Región de Murcia' },
  { id: 'NC', nombre: 'Navarra' },
  { id: 'PV', nombre: 'País Vasco' },
  { id: 'RI', nombre: 'La Rioja' },
  { id: 'VC', nombre: 'Comunitat Valenciana' },
  { id: 'CE', nombre: 'Ceuta' },
  { id: 'ML', nombre: 'Melilla' },
];

const TODAS = REGIONES.map((r) => r.id);
const salvo = (...ids) => TODAS.filter((id) => !ids.includes(id));

// Cada entrada: [fecha, nombre, comunidades]
const DATOS = {
  2026: {
    fuente: 'BOE 28/10/2025 y BOE 24/11/2025',
    dias: [
      ['01-01', 'Año Nuevo', TODAS],
      ['01-06', 'Epifanía del Señor', TODAS],
      ['03-02', 'Lunes siguiente al Día de las Illes Balears', ['IB']],
      ['03-19', 'San José', ['GA', 'MC', 'PV', 'VC', 'NC']],
      ['03-20', 'Fiesta del Eid Fitr', ['ML']],
      ['04-02', 'Jueves Santo', salvo('CT', 'VC')],
      ['04-03', 'Viernes Santo', TODAS],
      ['04-06', 'Lunes de Pascua', ['IB', 'CM', 'CT', 'PV', 'RI', 'NC', 'VC']],
      ['04-23', 'San Jorge / Día de Castilla y León', ['AR', 'CL']],
      ['05-01', 'Fiesta del Trabajo', TODAS],
      ['05-27', 'Fiesta del Sacrificio (Eid al-Adha)', ['CE', 'ML']],
      ['06-04', 'Corpus Christi', ['CM']],
      ['06-09', 'Día de La Rioja / Día de la Región de Murcia', ['RI', 'MC']],
      ['06-24', 'San Juan', ['CT', 'GA', 'VC']],
      ['07-28', 'Día de las Instituciones de Cantabria', ['CB']],
      ['08-05', 'Nuestra Señora de África', ['CE']],
      ['09-02', 'Día de Ceuta', ['CE']],
      ['09-08', 'Día de Asturias / Día de Extremadura', ['AS', 'EX']],
      ['09-11', 'Fiesta Nacional de Cataluña', ['CT']],
      ['09-15', 'La Bien Aparecida', ['CB']],
      ['10-09', 'Día de la Comunitat Valenciana', ['VC']],
      ['10-12', 'Fiesta Nacional de España', TODAS],
      ['11-02', 'Lunes siguiente a Todos los Santos', ['AN', 'AR', 'AS', 'CN', 'CM', 'EX', 'CL', 'MD', 'NC']],
      ['12-07', 'Lunes siguiente al Día de la Constitución', ['AN', 'AR', 'AS', 'CB', 'EX', 'MC', 'RI', 'CL', 'MD', 'ML']],
      ['12-08', 'Inmaculada Concepción', TODAS],
      ['12-25', 'Natividad del Señor', TODAS],
    ],
    // Fiestas insulares de Canarias (Decreto 61/2025) y Val d'Aran (sustituye el 26/12, que cae en sábado).
    zonas: {
      'CN-TF': [['02-02', 'Virgen de la Candelaria']],
      'CN-LP': [['08-05', 'Nuestra Señora de las Nieves']],
      'CN-GC': [['09-08', 'Nuestra Señora del Pino']],
      'CN-LZ': [['09-15', 'Nuestra Señora de los Volcanes']],
      'CN-FV': [['09-18', 'Nuestra Señora de la Peña']],
      'CN-EH': [['09-24', 'Nuestra Señora de los Reyes']],
      'CN-GO': [['10-05', 'Nuestra Señora de Guadalupe']],
      'CT-ARAN': [['06-17', 'Fiesta de Aran']],
    },
    quitarEnZona: {},
  },
  2027: {
    fuente: 'BOE 13/10/2026 y BOE 14/11/2026',
    dias: [
      ['01-01', 'Año Nuevo', TODAS],
      ['01-06', 'Epifanía del Señor', TODAS],
      ['03-01', 'Lunes siguiente al Día de Andalucía / Día de las Illes Balears', ['AN', 'IB']],
      ['03-10', 'Fiesta del Eid Fitr', ['ML']],
      ['03-19', 'San José', ['GA', 'MD', 'MC', 'VC', 'NC']],
      ['03-25', 'Jueves Santo', salvo('CT', 'VC')],
      ['03-26', 'Viernes Santo', TODAS],
      ['03-29', 'Lunes de Pascua', ['IB', 'CT', 'PV', 'RI', 'NC', 'VC']],
      ['04-23', 'San Jorge / Día de Castilla y León', ['AR', 'CL']],
      ['05-17', 'Día de las Letras Gallegas / Fiesta del Sacrificio', ['GA', 'CE', 'ML']],
      ['05-27', 'Corpus Christi', ['CM']],
      ['05-31', 'Día de Castilla-La Mancha', ['CM']],
      ['06-09', 'Día de La Rioja / Día de la Región de Murcia', ['RI', 'MC']],
      ['06-24', 'San Juan', ['CT']],
      ['07-28', 'Día de las Instituciones de Cantabria', ['CB']],
      ['08-05', 'Nuestra Señora de África', ['CE']],
      ['08-16', 'Lunes siguiente a la Asunción', ['AN', 'AR', 'AS', 'CN', 'CL', 'MD']],
      ['09-08', 'Día de Asturias / Día de Extremadura', ['AS', 'EX']],
      ['09-15', 'La Bien Aparecida', ['CB']],
      ['10-07', 'Aniversario del primer Gobierno de Euskadi', ['PV']],
      ['10-11', 'Traslado de la Asunción', ['EX']],
      ['10-12', 'Fiesta Nacional de España', TODAS],
      ['11-01', 'Todos los Santos', TODAS],
      ['12-06', 'Día de la Constitución Española', TODAS],
      ['12-08', 'Inmaculada Concepción', TODAS],
    ],
    // Fiestas insulares de Canarias (Decreto 115/2026) y Val d'Aran (Orden EMT/52/2026: el 17/6 sustituye al 29/3).
    zonas: {
      'CN-TF': [['02-02', 'Virgen de la Candelaria']],
      'CN-LP': [['08-05', 'Nuestra Señora de las Nieves']],
      'CN-GC': [['09-08', 'Nuestra Señora del Pino']],
      'CN-LZ': [['09-15', 'Nuestra Señora de los Volcanes']],
      'CN-FV': [['09-17', 'Nuestra Señora de la Peña']],
      'CN-EH': [['09-24', 'Nuestra Señora de los Reyes']],
      'CN-GO': [['10-04', 'Nuestra Señora de Guadalupe']],
      'CT-ARAN': [['06-17', 'Fiesta de Aran']],
    },
    quitarEnZona: { 'CT-ARAN': ['03-29'] },
  },
};

export const AÑOS_CON_DATOS = Object.keys(DATOS).map(Number);

export function fuenteDe(año) {
  return DATOS[año]?.fuente || null;
}

// Domingo de Pascua (algoritmo de Meeus/Jones/Butcher) para estimar años sin calendario publicado.
export function pascua(año) {
  const a = año % 19, b = Math.floor(año / 100), c = año % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(año, mes - 1, dia));
}

const pad = (n) => String(n).padStart(2, '0');

// Devuelve un Map 'YYYY-MM-DD' -> nombre con los festivos del año para la comunidad y zona elegidas.
// Si el año no tiene calendario publicado, usa solo las fiestas nacionales fijas (estimado = true).
export function festivosDe(año, region, zona) {
  const out = new Map();
  const datos = DATOS[año];
  if (!datos) {
    const fijas = [['01-01', 'Año Nuevo'], ['01-06', 'Epifanía del Señor'], ['05-01', 'Fiesta del Trabajo'], ['08-15', 'Asunción de la Virgen'],
      ['10-12', 'Fiesta Nacional de España'], ['11-01', 'Todos los Santos'], ['12-06', 'Día de la Constitución Española'],
      ['12-08', 'Inmaculada Concepción'], ['12-25', 'Natividad del Señor']];
    for (const [md, n] of fijas) out.set(`${año}-${md}`, n);
    const vs = pascua(año); vs.setUTCDate(vs.getUTCDate() - 2);
    out.set(`${año}-${pad(vs.getUTCMonth() + 1)}-${pad(vs.getUTCDate())}`, 'Viernes Santo');
    return { mapa: out, estimado: true };
  }
  const quitar = new Set(datos.quitarEnZona[zona] || []);
  for (const [md, n, regiones] of datos.dias) {
    if (regiones.includes(region) && !quitar.has(md)) out.set(`${año}-${md}`, n);
  }
  for (const [md, n] of datos.zonas[zona] || []) out.set(`${año}-${md}`, n);
  return { mapa: out, estimado: false };
}
