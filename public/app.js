import { REGIONES, AÑOS_CON_DATOS, fuenteDe } from './festivos.js';
import {
  TIPOS, crearCalendario, calcularPlazo, motivoInhabil, habilesRestantes, buscarPuentes, planDePuentes,
  crearICS, enlaceGoogleCalendar, hoyISO, fechaLarga, nombreMes, diaSemana, diasDelMes, sumarDias, diasEntre,
} from './core.js';
import { esNativa, permisoAvisos, programarAvisos, compartirArchivo, abrirFuera, registrarSW, alPulsarAtras, cerrarDialogoAbierto } from './native.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const leer = (k, def) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? def; } catch { return def; } };
const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* modo privado */ } };

const estado = {
  ajustes: leer('dh.ajustes', { region: null, zona: null, locales: [] }),
  plazos: leer('dh.plazos', []),
  siguienteId: leer('dh.siguienteId', 1),
  puentes: leer('dh.puentes', { año: null, dias: 6, sabados: false }),
  ultimo: null, // último cálculo mostrado
};
const hoy = () => hoyISO();
const calendario = () => crearCalendario(estado.ajustes);
const region = () => REGIONES.find((r) => r.id === estado.ajustes.region);

function toast(texto) {
  const t = $('#toast');
  t.textContent = texto; t.classList.add('ver');
  clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('ver'), 2800);
}

// ---------------- Navegación ----------------
function irA(vista) {
  for (const s of document.querySelectorAll('.vista')) s.hidden = s.id !== `vista-${vista}`;
  for (const b of document.querySelectorAll('.pestañas button')) {
    if (b.dataset.vista === vista) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  }
  if (vista === 'mis') pintarMisPlazos();
  if (vista === 'puentes') pintarPuentes();
  if (vista === 'ajustes') pintarAjustes();
  scrollTo({ top: 0 });
}
document.querySelectorAll('.pestañas button').forEach((b) => b.addEventListener('click', () => irA(b.dataset.vista)));
$('#btn-region').addEventListener('click', () => irA('ajustes'));

function pintarChipRegion() {
  const r = region();
  const zona = r?.zonas?.find((z) => z.id === estado.ajustes.zona);
  $('#btn-region').textContent = r ? (zona ? zona.nombre : r.nombre) : 'Elige tu comunidad';
}

// ---------------- Calculadora ----------------
const f = { tipo: $('#tipo'), fecha: $('#fecha'), electronica: $('#electronica'), cantidad: $('#cantidad'), unidad: $('#unidad'), regimen: $('#regimen') };
f.tipo.innerHTML = TIPOS.map((t) => `<option value="${t.id}">${esc(t.nombre)}</option>`).join('');
f.fecha.value = hoy();

function aplicarTipo() {
  const t = TIPOS.find((x) => x.id === f.tipo.value);
  f.cantidad.value = t.cantidad; f.unidad.value = t.unidad; f.regimen.value = t.regimen;
  $('#ley').textContent = t.ley;
  $('#campo-regimen').hidden = t.id !== 'otro';
  calcular();
}
f.tipo.addEventListener('change', aplicarTipo);
f.electronica.addEventListener('change', () => {
  $('#etq-fecha').textContent = f.electronica.checked ? 'Día en que la pusieron a tu disposición' : 'Día en que recibiste la notificación';
  calcular();
});
for (const k of ['fecha', 'cantidad', 'unidad', 'regimen']) f[k].addEventListener('input', calcular);

function datosFormulario() {
  return {
    tipo: f.tipo.value, notificacion: f.fecha.value, cantidad: Number(f.cantidad.value),
    unidad: f.unidad.value, regimen: f.regimen.value, electronicaSinAbrir: f.electronica.checked,
  };
}

function calcular() {
  const cont = $('#resultado');
  const p = datosFormulario();
  if (!estado.ajustes.region) {
    cont.innerHTML = `<div class="vacio"><p>Los festivos cambian según la comunidad. Dinos dónde vives para calcular el plazo.</p>
      <button class="boton" type="button" id="ir-region">Elegir mi comunidad</button></div>`;
    $('#ir-region').onclick = () => irA('ajustes');
    return;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.notificacion) || !(p.cantidad >= 1)) { cont.innerHTML = ''; return; }
  const cal = calendario();
  const r = calcularPlazo(p, cal);
  estado.ultimo = { p, r };
  cont.innerHTML = htmlResultado(p, r, cal);
  $('#btn-guardar').onclick = abrirGuardar;
  $('#btn-ics').onclick = () => descargarICS(tituloPorDefecto(p), r.fin, p);
  $('#btn-google').onclick = () => abrirFuera(enlaceGoogleCalendar({ titulo: `Vence: ${tituloPorDefecto(p)}`, fecha: r.fin, descripcion: textoDescripcion(p, r) }));
}

function cuentaAtras(fin, cal, regimen) {
  const h = hoy();
  if (fin < h) {
    const d = diasEntre(fin, h);
    return { html: `El plazo terminó hace <strong>${d}</strong> ${d === 1 ? 'día' : 'días'}.`, urgente: true, vencido: true };
  }
  if (fin === h) return { html: '<strong>Hoy</strong> es el último día.', urgente: true };
  const n = habilesRestantes(h, fin, cal, regimen);
  const nat = diasEntre(h, fin);
  return {
    html: `Te quedan <strong>${n}</strong> ${n === 1 ? 'día hábil' : 'días hábiles'} (${nat} ${nat === 1 ? 'día' : 'días'} de calendario).`,
    urgente: n <= 2,
  };
}

function htmlResultado(p, r, cal) {
  const [y, m, d] = r.fin.split('-').map(Number);
  const ca = cuentaAtras(r.fin, cal, p.regimen);
  const prudente = r.prorrogado
    ? `<p class="prudente">Para ir sobre seguro, preséntalo como muy tarde el <b>${fechaLarga(r.prudente, false)}</b>. Legalmente aún tienes hasta el ${fechaLarga(r.fin, false)}.</p>` : '';
  return `
    <div class="taco${ca.vencido ? ' vencido' : ''}" role="img" aria-label="Último día: ${fechaLarga(r.fin)}">
      <div class="taco-mes">${nombreMes(m)} de ${y}</div>
      <div class="taco-dia">${d}</div>
      <div class="taco-semana">${fechaLarga(r.fin).split(' ')[0]}</div>
      <span class="taco-etiqueta">Último día del plazo</span>
    </div>
    <p class="cuenta-atras${ca.urgente ? ' urgente' : ''}">${ca.html}</p>
    ${prudente}
    ${htmlMeses(r, cal, p.regimen)}
    <ul class="leyenda">
      <li><i style="background:var(--cuenta)"></i>Días que cuentan</li>
      <li><i style="background:var(--rojo)"></i>Festivo</li>
      <li><i style="background:var(--fosforito)"></i>Último día</li>
      <li><i style="box-shadow:inset 0 0 0 1.5px var(--tinta)"></i>Notificación</li>
    </ul>
    ${r.avisos.length ? `<ul class="avisos">${r.avisos.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}
    <div class="acciones">
      <button class="boton" type="button" id="btn-guardar">Guardar y avisarme</button>
      <button class="boton boton-secundario" type="button" id="btn-ics">Añadir al calendario</button>
      <button class="boton boton-secundario" type="button" id="btn-google">Google Calendar</button>
    </div>
    <p class="nota">Orientativo: comprueba siempre el plazo que indica tu notificación.</p>`;
}

function htmlMeses(r, cal, regimen) {
  // Muestra los meses desde la notificación hasta el vencimiento (como mucho los 3 últimos).
  const meses = [];
  let [y, m] = r.notificacion.split('-').map(Number);
  const [yf, mf] = r.fin.split('-').map(Number);
  while (y < yf || (y === yf && m <= mf)) { meses.push([y, m]); m++; if (m > 12) { m = 1; y++; } }
  const h = hoy();
  return `<div class="meses">${meses.slice(-3).map(([yy, mm]) => {
    const primero = `${yy}-${String(mm).padStart(2, '0')}-01`;
    const hueco = (diaSemana(primero) + 6) % 7; // lunes primero
    let celdas = ['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((c) => `<span class="cab">${c}</span>`).join('');
    celdas += '<span class="fuera"></span>'.repeat(hueco);
    for (let dd = 1; dd <= diasDelMes(yy, mm); dd++) {
      const iso = `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
      const mot = motivoInhabil(iso, cal, regimen);
      const clases = [];
      const dentro = iso >= r.inicio && iso <= r.fin;
      if (mot && (mot === 'Sábado' || mot === 'Domingo')) clases.push('finde');
      else if (mot) clases.push('festivo');
      else if (dentro) clases.push('cuenta');
      if (iso === r.notificacion) clases.push('notif');
      if (iso === r.fin) clases.push('vence');
      if (iso === h) clases.push('hoy');
      const titulo = mot ? ` title="${esc(mot)}"` : '';
      celdas += `<span class="${clases.join(' ')}"${titulo}>${dd}</span>`;
    }
    return `<div class="mes"><h4>${nombreMes(mm)} ${yy}</h4><div class="rejilla">${celdas}</div></div>`;
  }).join('')}</div>`;
}

function tituloPorDefecto(p) {
  const t = TIPOS.find((x) => x.id === p.tipo);
  return t && t.id !== 'otro' && t.id !== 'judicial' ? t.nombre : `Plazo de ${p.cantidad} ${({ habiles: 'días hábiles', naturales: 'días naturales', meses: p.cantidad === 1 ? 'mes' : 'meses' })[p.unidad]}`;
}
function textoDescripcion(p, r) {
  return `Notificación: ${fechaLarga(r.notificacion)}. Último día: ${fechaLarga(r.fin)}. Calculado con Día Hábil (orientativo).`;
}
function descargarICS(titulo, fecha, p) {
  const ics = crearICS({ titulo: `Vence: ${titulo}`, fecha, descripcion: estado.ultimo ? textoDescripcion(p, estado.ultimo.r) : '', avisarDiasAntes: [3, 1] });
  compartirArchivo({ nombre: `plazo-${fecha}.ics`, contenido: ics, tipo: 'text/calendar', titulo: 'Añadir al calendario' });
}

// ---------------- Guardar plazos ----------------
const dlg = $('#dlg-guardar');
function abrirGuardar() {
  $('#g-titulo').value = '';
  $('#g-titulo').placeholder = tituloPorDefecto(estado.ultimo.p);
  $('#g-nota').textContent = esNativa
    ? 'Te avisaremos 3 días antes, el día antes y el mismo día a las 9:00.'
    : 'En la web no podemos avisarte: después de guardarlo, pulsa «Añadir al calendario».';
  if (dlg.showModal) dlg.showModal(); else guardarPlazo();
}
dlg.addEventListener('close', () => { if (dlg.returnValue === 'guardar') guardarPlazo(); });

async function guardarPlazo() {
  const { p, r } = estado.ultimo;
  const titulo = $('#g-titulo').value.trim() || tituloPorDefecto(p);
  estado.plazos.push({ id: estado.siguienteId++, titulo, ...p, fin: r.fin, creado: hoy() });
  guardar('dh.plazos', estado.plazos); guardar('dh.siguienteId', estado.siguienteId);
  if (esNativa) await permisoAvisos(true);
  await reprogramarAvisos();
  toast('Plazo guardado');
}

// Vuelve a calcular cada plazo guardado (por si has cambiado de comunidad o añadido fiestas locales).
function recalcularGuardados() {
  const cal = calendario();
  for (const pl of estado.plazos) pl.fin = calcularPlazo(pl, cal).fin;
  guardar('dh.plazos', estado.plazos);
}

async function reprogramarAvisos() {
  if (!esNativa) return;
  const avisos = [];
  for (const pl of estado.plazos) {
    const [y, m, d] = pl.fin.split('-').map(Number);
    const a9 = (dias) => new Date(y, m - 1, d - dias, 9, 0, 0);
    avisos.push({ id: pl.id * 10 + 1, titulo: `Quedan 3 días: ${pl.titulo}`, texto: `Vence el ${fechaLarga(pl.fin)}.`, fecha: a9(3) });
    avisos.push({ id: pl.id * 10 + 2, titulo: `Mañana vence: ${pl.titulo}`, texto: `Último día: ${fechaLarga(pl.fin)}.`, fecha: a9(1) });
    avisos.push({ id: pl.id * 10 + 3, titulo: `Hoy vence: ${pl.titulo}`, texto: 'Es el último día del plazo.', fecha: a9(0) });
  }
  await programarAvisos(avisos);
}

async function pintarMisPlazos() {
  const ul = $('#lista-plazos');
  const cal = calendario();
  const h = hoy();
  const lista = [...estado.plazos].sort((a, b) => (a.fin < h) - (b.fin < h) || a.fin.localeCompare(b.fin));
  if (esNativa) {
    const perm = await permisoAvisos(false);
    $('#nota-avisos').textContent = perm === 'granted' ? 'Te avisamos 3 días antes, el día antes y el mismo día, a las 9:00.'
      : 'Los avisos están desactivados. Actívalos en los ajustes del móvil para que te recordemos cada plazo.';
  } else {
    $('#nota-avisos').textContent = 'En la versión web no podemos enviarte avisos. Usa «Añadir al calendario» en cada plazo, o instala la app.';
  }
  if (!lista.length) {
    ul.innerHTML = `<li class="vacio"><p>Aún no has guardado ningún plazo. Calcula uno y pulsa «Guardar y avisarme».</p>
      <button class="boton" type="button" data-ir="plazo">Calcular un plazo</button></li>`;
    ul.querySelector('[data-ir]').onclick = () => irA('plazo');
    return;
  }
  ul.innerHTML = lista.map((pl) => {
    const [y, m, d] = pl.fin.split('-').map(Number);
    const ca = cuentaAtras(pl.fin, cal, pl.regimen);
    return `<li class="plazo-item${pl.fin < h ? ' pasado' : ''}" data-id="${pl.id}">
      <div class="mini-taco" aria-hidden="true"><b>${nombreMes(m).slice(0, 3)} ${String(y).slice(2)}</b><span>${d}</span></div>
      <div><h3>${esc(pl.titulo)}</h3><p>Vence el ${fechaLarga(pl.fin, y !== Number(h.slice(0, 4)))}</p>
        <p class="quedan${ca.urgente ? ' urgente' : ''}">${ca.html.replace(/<\/?strong>/g, '')}</p></div>
      <div>
        <button class="icono" type="button" data-accion="ver" aria-label="Ver el detalle"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></button>
        <button class="icono" type="button" data-accion="borrar" aria-label="Borrar"><svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/></svg></button>
      </div></li>`;
  }).join('');
  ul.querySelectorAll('[data-accion]').forEach((b) => b.addEventListener('click', async () => {
    const id = Number(b.closest('li').dataset.id);
    const pl = estado.plazos.find((x) => x.id === id);
    if (b.dataset.accion === 'borrar') {
      if (!confirm(`¿Borrar «${pl.titulo}»?`)) return;
      estado.plazos = estado.plazos.filter((x) => x.id !== id);
      guardar('dh.plazos', estado.plazos);
      await reprogramarAvisos();
      pintarMisPlazos();
      toast('Plazo borrado');
    } else {
      f.tipo.value = pl.tipo; $('#ley').textContent = TIPOS.find((t) => t.id === pl.tipo)?.ley || '';
      $('#campo-regimen').hidden = pl.tipo !== 'otro';
      f.fecha.value = pl.notificacion; f.cantidad.value = pl.cantidad; f.unidad.value = pl.unidad; f.regimen.value = pl.regimen;
      f.electronica.checked = !!pl.electronicaSinAbrir;
      irA('plazo'); calcular();
    }
  }));
}

// ---------------- Puentes ----------------
const pf = { año: $('#p-año'), dias: $('#p-dias'), sabados: $('#p-sabados') };
{
  const actual = Number(hoy().slice(0, 4));
  const años = [...new Set([...AÑOS_CON_DATOS.filter((y) => y >= actual), actual + 1])].sort();
  pf.año.innerHTML = años.map((y) => `<option value="${y}">${y}</option>`).join('');
  const preferido = estado.puentes.año && años.includes(estado.puentes.año) ? estado.puentes.año
    : (new Date().getMonth() >= 9 && años.includes(actual + 1) ? actual + 1 : años[0]);
  pf.año.value = preferido; pf.dias.value = estado.puentes.dias; pf.sabados.checked = estado.puentes.sabados;
  for (const el of Object.values(pf)) el.addEventListener('input', () => {
    estado.puentes = { año: Number(pf.año.value), dias: Number(pf.dias.value) || 1, sabados: pf.sabados.checked };
    guardar('dh.puentes', estado.puentes); pintarPuentes();
  });
}

function tiraDias(c, cal, libres) {
  const out = [];
  for (let d = c.desde; d <= c.hasta; d = sumarDias(d, 1)) {
    const dw = diaSemana(d);
    const fest = cal.festivo(d) && !libres.includes(dw);
    const cls = c.pedir.includes(d) ? 't-pedir' : fest ? 't-fest' : '';
    out.push(`<span class="${cls}" title="${esc(fest ? cal.festivo(d) : '')}">${Number(d.slice(8))}<small>${'DLMXJVS'[dw]}</small></span>`);
  }
  return `<div class="tira" aria-hidden="true">${out.join('')}</div>`;
}

// "del viernes 19 al domingo 28 de marzo" (o con los dos meses si cambian).
function rango(desde, hasta) {
  const mismoMes = desde.slice(0, 7) === hasta.slice(0, 7);
  const a = mismoMes ? `${fechaLarga(desde).split(' ')[0]} ${Number(desde.slice(8))}` : fechaLarga(desde, false);
  return `del ${a} al ${fechaLarga(hasta, false)}`;
}
function listaDias(dias) {
  const seguidos = dias.every((d, i) => i === 0 || sumarDias(dias[i - 1], 1) === d);
  if (dias.length > 1 && seguidos) return rango(dias[0], dias.at(-1));
  const t = dias.map((d) => `el ${fechaLarga(d, false)}`);
  return t.length > 1 ? `${t.slice(0, -1).join(', ')} y ${t.at(-1)}` : t[0];
}

function htmlPuente(c, cal, libres) {
  const n = c.pedir.length;
  return `<li class="puente">
    <h3>${c.libres} días libres pidiendo ${n} ${n === 1 ? 'día' : 'días'}</h3>
    <p>Pide ${listaDias(c.pedir)}. Libre ${rango(c.desde, c.hasta)} (${esc(c.festivos.join(', '))}).</p>
    ${tiraDias(c, cal, libres)}
  </li>`;
}

function pintarPuentes() {
  const cont = $('#puentes');
  if (!estado.ajustes.region) {
    cont.innerHTML = `<div class="vacio"><p>Elige tu comunidad para ver sus festivos y tus mejores puentes.</p><button class="boton" type="button" id="ir-reg2">Elegir mi comunidad</button></div>`;
    $('#ir-reg2').onclick = () => irA('ajustes');
    return;
  }
  const año = Number(pf.año.value), dias = Math.max(1, Number(pf.dias.value) || 1);
  const libres = pf.sabados.checked ? [0] : [0, 6];
  const cal = calendario();
  const candidatos = buscarPuentes(año, cal, { libres, maxDias: 4 });
  const plan = planDePuentes(candidatos, dias);
  const avisos = [];
  if (cal.estimado(año)) avisos.push(`El calendario de ${año} aún no está publicado: solo tenemos en cuenta las fiestas nacionales.`);
  if (!cal.tieneLocales(año)) avisos.push('Añade tus dos fiestas locales en «Dónde vivo» para encontrar más puentes.');
  const restantes = candidatos.filter((c) => !plan.elegidos.includes(c)).slice(0, 12);
  cont.innerHTML = `
    <p class="resumen-puentes">Con <strong>${plan.usados}</strong> ${plan.usados === 1 ? 'día' : 'días'} de vacaciones tienes <strong>${plan.libresTotales}</strong> días libres seguidos en puentes.</p>
    ${avisos.length ? `<ul class="avisos">${avisos.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}
    ${plan.elegidos.length ? `<ul class="lista-puentes">${plan.elegidos.map((c) => htmlPuente(c, cal, libres)).join('')}</ul>`
      : '<p class="vacio">No hay puentes que aprovechar con esos días. Prueba con más días de vacaciones.</p>'}
    ${restantes.length ? `<details class="mas"><summary>Otras opciones (${restantes.length})</summary><ul class="lista-puentes">${restantes.map((c) => htmlPuente(c, cal, libres)).join('')}</ul></details>` : ''}
    <p class="nota">Pregunta en tu empresa: tu convenio puede tener otros días libres (como el 24 y el 31 de diciembre).</p>`;
}

// ---------------- Ajustes ----------------
const af = { region: $('#a-region'), zona: $('#a-zona') };
af.region.innerHTML = '<option value="">Elige tu comunidad</option>' + REGIONES.map((r) => `<option value="${r.id}">${esc(r.nombre)}</option>`).join('');

function pintarAjustes() {
  af.region.value = estado.ajustes.region || '';
  const r = region();
  $('#campo-zona').hidden = !r?.zonas;
  if (r?.zonas) {
    $('#etq-zona').textContent = r.id === 'CN' ? 'Isla' : 'Zona';
    const ninguna = r.id === 'CN' ? 'Elige tu isla' : 'Resto de Cataluña';
    af.zona.innerHTML = `<option value="">${ninguna}</option>` + r.zonas.map((z) => `<option value="${z.id}">${esc(z.nombre)}</option>`).join('');
    af.zona.value = estado.ajustes.zona || '';
  }
  const locales = [...estado.ajustes.locales].sort();
  $('#lista-locales').innerHTML = locales.length ? locales.map((d) => `<li><span>${fechaLarga(d)}</span>
      <button class="icono" type="button" data-borrar="${d}" aria-label="Quitar ${fechaLarga(d)}"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></li>`).join('')
    : '<li class="nota">Aún no has añadido fiestas locales.</li>';
  $('#lista-locales').querySelectorAll('[data-borrar]').forEach((b) => b.addEventListener('click', () => {
    estado.ajustes.locales = estado.ajustes.locales.filter((x) => x !== b.dataset.borrar);
    cambiarAjustes();
  }));
  $('#fuentes').textContent = `Festivos nacionales y de cada comunidad: ${AÑOS_CON_DATOS.map((y) => `${y} (${fuenteDe(y)})`).join('; ')}. Plazos: Ley 39/2015 (art. 30), Ley Orgánica del Poder Judicial (arts. 182-185) y Ley de Enjuiciamiento Civil (arts. 130-135).`;
}
af.region.addEventListener('change', async () => {
  const primeraVez = !estado.ajustes.region;
  estado.ajustes.region = af.region.value || null; estado.ajustes.zona = null;
  await cambiarAjustes();
  if (primeraVez && region() && !region().zonas) { irA('plazo'); toast(`Festivos de ${region().nombre} cargados`); }
});
af.zona.addEventListener('change', () => { estado.ajustes.zona = af.zona.value || null; cambiarAjustes(); });
$('#form-local').addEventListener('submit', (e) => {
  e.preventDefault();
  const v = $('#nueva-local').value;
  if (!v) return;
  if (!estado.ajustes.locales.includes(v)) estado.ajustes.locales.push(v);
  $('#nueva-local').value = '';
  cambiarAjustes();
  toast('Fiesta local añadida');
});

async function cambiarAjustes() {
  guardar('dh.ajustes', estado.ajustes);
  pintarChipRegion(); pintarAjustes();
  recalcularGuardados();
  await reprogramarAvisos();
  calcular();
}

// ---------------- Arranque ----------------
// Botón Atrás de Android: cierra el diálogo abierto o vuelve a la calculadora; en la calculadora, sale.
alPulsarAtras(() => {
  if (cerrarDialogoAbierto()) return true;
  if (document.querySelector('#vista-plazo').hidden) { irA('plazo'); return true; }
  return false;
});
pintarChipRegion();
aplicarTipo();
recalcularGuardados();
reprogramarAvisos();
if (!estado.ajustes.region) irA('ajustes');
registrarSW();
