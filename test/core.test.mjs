// Pruebas del cálculo de plazos y puentes. Ejecuta: node --test test/
import test from 'node:test';
import assert from 'node:assert/strict';
import { crearCalendario, calcularPlazo, buscarPuentes, planDePuentes, habilesRestantes, crearICS, esHabil } from '../public/core.js';
import { festivosDe, pascua } from '../public/festivos.js';

const cal = (region, zona, locales = []) => crearCalendario({ region, zona, locales });

test('10 días hábiles en Madrid saltan el puente de diciembre de 2026', () => {
  const r = calcularPlazo({ notificacion: '2026-11-27', cantidad: 10, unidad: 'habiles' }, cal('MD'));
  assert.equal(r.inicio, '2026-11-28');
  assert.equal(r.fin, '2026-12-15');
  assert.ok(r.saltados.some((s) => s.fecha === '2026-12-07'));
});

test('el mismo plazo en Cataluña vence antes (el 7/12/2026 no es festivo allí)', () => {
  const r = calcularPlazo({ notificacion: '2026-11-27', cantidad: 10, unidad: 'habiles' }, cal('CT'));
  assert.equal(r.fin, '2026-12-14');
});

test('las fiestas locales retrasan el vencimiento', () => {
  const r = calcularPlazo({ notificacion: '2026-11-27', cantidad: 10, unidad: 'habiles' }, cal('CT', null, ['2026-12-01']));
  assert.equal(r.fin, '2026-12-15');
});

test('un mes desde el 31 de enero vence a final de febrero y se prorroga si es inhábil', () => {
  const md = calcularPlazo({ notificacion: '2026-01-31', cantidad: 1, unidad: 'meses' }, cal('MD'));
  assert.equal(md.nominal, '2026-02-28'); // sábado
  assert.equal(md.fin, '2026-03-02');
  assert.equal(md.prorrogado, true);
  assert.equal(md.prudente, '2026-02-27');
  const ib = calcularPlazo({ notificacion: '2026-01-31', cantidad: 1, unidad: 'meses' }, cal('IB'));
  assert.equal(ib.fin, '2026-03-03'); // el 2/3/2026 es festivo en Baleares
});

test('multa: 20 días naturales', () => {
  const r = calcularPlazo({ notificacion: '2026-12-01', cantidad: 20, unidad: 'naturales' }, cal('AN'));
  assert.equal(r.fin, '2026-12-21');
  assert.equal(r.prorrogado, false);
});

test('plazo judicial: agosto no cuenta', () => {
  const md = calcularPlazo({ notificacion: '2026-07-20', cantidad: 20, unidad: 'habiles', regimen: 'judicial' }, cal('MD'));
  assert.equal(md.fin, '2026-09-15');
  const as = calcularPlazo({ notificacion: '2026-07-20', cantidad: 20, unidad: 'habiles', regimen: 'judicial' }, cal('AS'));
  assert.equal(as.fin, '2026-09-16'); // 8 de septiembre, Día de Asturias
});

test('plazo judicial: del 24 de diciembre al 6 de enero no cuenta', () => {
  const r = calcularPlazo({ notificacion: '2026-12-21', cantidad: 5, unidad: 'habiles', regimen: 'judicial' }, cal('MD'));
  assert.equal(r.fin, '2027-01-11');
});

test('notificación electrónica sin abrir: se da por hecha a los 10 días naturales', () => {
  const r = calcularPlazo({ notificacion: '2026-12-01', cantidad: 10, unidad: 'habiles', electronicaSinAbrir: true }, cal('MD'));
  assert.equal(r.notificacion, '2026-12-11');
  assert.equal(r.fin, '2026-12-28');
});

test('festivos de Canarias por isla y de Aran', () => {
  assert.equal(festivosDe(2026, 'CN', 'CN-TF').mapa.has('2026-02-02'), true);
  assert.equal(festivosDe(2026, 'CN', 'CN-GC').mapa.has('2026-02-02'), false);
  const aran = festivosDe(2027, 'CT', 'CT-ARAN').mapa;
  assert.equal(aran.has('2027-03-29'), false);
  assert.equal(aran.has('2027-06-17'), true);
  assert.equal(festivosDe(2027, 'CT', null).mapa.has('2027-03-29'), true);
});

test('años sin calendario: fiestas nacionales y Viernes Santo estimado', () => {
  assert.equal(pascua(2028).toISOString().slice(0, 10), '2028-04-16');
  const f = festivosDe(2028, 'MD');
  assert.equal(f.estimado, true);
  assert.equal(f.mapa.has('2028-04-14'), true);
  const r = calcularPlazo({ notificacion: '2027-12-20', cantidad: 1, unidad: 'meses' }, cal('MD'));
  assert.ok(r.avisos.some((a) => a.includes('2028')));
});

test('todos los festivos guardados caen entre semana', () => {
  for (const y of [2026, 2027]) {
    for (const r of ['AN', 'AR', 'AS', 'IB', 'CN', 'CB', 'CM', 'CL', 'CT', 'EX', 'GA', 'MD', 'MC', 'NC', 'PV', 'RI', 'VC', 'CE', 'ML']) {
      for (const d of festivosDe(y, r).mapa.keys()) {
        const dw = new Date(`${d}T00:00:00Z`).getUTCDay();
        assert.ok(dw >= 1 && dw <= 5, `${d} (${r}) cae en fin de semana`);
      }
    }
  }
});

test('cada comunidad tiene entre 9 y 12 festivos entre semana en 2026 y 2027', () => {
  for (const y of [2026, 2027]) {
    for (const r of ['AN', 'AR', 'AS', 'IB', 'CN', 'CB', 'CM', 'CL', 'CT', 'EX', 'GA', 'MD', 'MC', 'NC', 'PV', 'RI', 'VC', 'CE', 'ML']) {
      const n = festivosDe(y, r).mapa.size;
      assert.ok(n >= 9 && n <= 12, `${r} ${y}: ${n}`);
    }
  }
});

test('puentes de 2027 en Madrid: pedir el 7 de diciembre da 5 días libres', () => {
  const c = buscarPuentes(2027, cal('MD'));
  const dic = c.find((x) => x.pedir.length === 1 && x.pedir[0] === '2027-12-07');
  assert.ok(dic);
  assert.equal(dic.libres, 5);
  const plan = planDePuentes(c, 5);
  assert.ok(plan.usados <= 5);
  assert.ok(plan.libresTotales >= 15);
});

test('puentes de 2027 en el País Vasco: el 7 de octubre', () => {
  const c = buscarPuentes(2027, cal('PV'));
  const oct = c.find((x) => x.pedir.join() === '2027-10-08,2027-10-11');
  assert.ok(oct);
  assert.equal(oct.libres, 6); // del jueves 7 al martes 12
});

test('días hábiles restantes y archivo de calendario', () => {
  const c = cal('MD');
  assert.equal(habilesRestantes('2026-12-04', '2026-12-10', c), 2); // solo 9 y 10: el 7 y el 8 son festivos
  assert.equal(esHabil('2026-12-07', c), false);
  const ics = crearICS({ titulo: 'Vence: recurso', fecha: '2026-12-15', descripcion: 'Prueba, con coma' });
  assert.match(ics, /DTSTART;VALUE=DATE:20261215/);
  assert.match(ics, /TRIGGER:-P2DT0H/);
  assert.match(ics, /Prueba\\, con coma/);
});
