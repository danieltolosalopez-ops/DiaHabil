// Comportamiento de la app nativa (NATIVO=1 node test/probar.mjs public test/nativo.pasos.mjs /tmp/capturas).
export default async ({ ir, js, clic, escribir, esperar }) => {
  await ir(''); await js('localStorage.clear(); true'); await ir('');
  await escribir('#a-region', 'MD');
  await escribir('#tipo', 'subsanar');
  await escribir('#fecha', '2027-03-01');
  await clic('#btn-guardar');
  if (!(await js("document.querySelector('#g-nota').textContent.includes('9:00')"))) throw new Error('La nota de avisos nativos no aparece');
  await js("document.querySelector('#dlg-guardar').close('guardar')");
  await esperar(500);
  const avisos = await js("JSON.parse(localStorage.getItem('__avisos') || '[]').length");
  if (avisos !== 3) throw new Error('Esperaba 3 avisos programados y hay ' + avisos);
  // Botón Atrás: cierra diálogo, vuelve a la calculadora y por último sale.
  await clic('#btn-guardar');
  await js('window.__atras()'); await esperar(200);
  if (await js("document.querySelector('#dlg-guardar').open")) throw new Error('Atrás no cierra el diálogo');
  await clic('[data-vista="puentes"]');
  await js('window.__atras()'); await esperar(200);
  if (await js("document.querySelector('#vista-plazo').hidden")) throw new Error('Atrás no vuelve a la calculadora');
  await js('window.__atras()'); await esperar(200);
  if (!(await js("JSON.parse(localStorage.getItem('__llamadas')).some(l => l[1] === 'exitApp')"))) throw new Error('Atrás no sale de la app');
  // Al borrar el plazo se cancelan sus avisos
  await clic('[data-vista="mis"]');
  await js("window.confirm = () => true; true");
  await clic('[data-accion="borrar"]');
  await esperar(400);
  const quedan = await js("JSON.parse(localStorage.getItem('__avisos') || '[]').length");
  if (quedan !== 0) throw new Error('Quedan avisos de un plazo borrado: ' + quedan);
};
