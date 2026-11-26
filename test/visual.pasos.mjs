// Recorrido de la app en un móvil simulado. Se usa con tools/probar.mjs (no hace falta en GitHub).
export default async ({ ir, js, captura, clic, escribir, esperar }) => {
  await ir('');
  await js("localStorage.clear()");
  await ir('');
  await captura('01-inicio');
  await escribir('#a-region', 'MD');
  await esperar(400);
  const visible = await js("!document.querySelector('#vista-plazo').hidden");
  if (!visible) throw new Error('No vuelve a la calculadora tras elegir comunidad');
  await escribir('#tipo', 'subsanar');
  await escribir('#fecha', '2026-11-27');
  await captura('02-plazo', true);
  const fin = await js("document.querySelector('.taco-dia').textContent");
  if (fin !== '15') throw new Error('Esperaba 15 de diciembre y sale ' + fin);
  // Multa con vencimiento en sábado → prórroga y fecha prudente
  await escribir('#tipo', 'reposicion');
  await escribir('#fecha', '2026-01-31');
  await captura('03-prorroga', true);
  if (!(await js("!!document.querySelector('.prudente')"))) throw new Error('Falta el aviso de fecha prudente');
  // Guardar
  await clic('#btn-guardar');
  await escribir('#g-titulo', 'Recurso contra la sanción');
  await js("document.querySelector('#dlg-guardar').close('guardar')");
  await esperar(400);
  await clic('[data-vista="mis"]');
  await captura('04-mis-plazos', true);
  const n = await js("document.querySelectorAll('.plazo-item').length");
  if (n !== 1) throw new Error('Debería haber 1 plazo guardado y hay ' + n);
  // Puentes
  await clic('[data-vista="puentes"]');
  await escribir('#p-año', '2027');
  await captura('05-puentes', true);
  // Ajustes con fiesta local
  await clic('[data-vista="ajustes"]');
  await escribir('#nueva-local', '2027-05-15');
  await js("document.querySelector('#form-local').requestSubmit()");
  await esperar(300);
  await captura('06-ajustes', true);
  // Canarias pide isla
  await escribir('#a-region', 'CN');
  await esperar(300);
  if (await js("document.querySelector('#campo-zona').hidden")) throw new Error('Canarias debería pedir isla');
};
