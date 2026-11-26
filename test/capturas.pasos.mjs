// Capturas para Google Play y App Store (bash test/capturas.sh public test/capturas.pasos.mjs store).
export default async ({ ir, js, captura, clic, escribir, esperar }) => {
  await ir(''); await js('localStorage.clear(); true'); await ir('');
  await escribir('#a-region', 'MD');
  await esperar(3000); // que desaparezca el aviso flotante
  // 1. Plazo que salta el puente de diciembre
  await escribir('#tipo', 'subsanar');
  await escribir('#fecha', '2026-12-01');
  const alto = await js("document.querySelector('.cabecera').offsetHeight");
  await js(`scrollTo(0, document.querySelector('.resultado').getBoundingClientRect().top + scrollY - ${alto} - 4); true`);
  await esperar(400);
  await captura('01-ultimo-dia');
  // 2. El formulario: qué te han notificado y desde cuándo
  await js('scrollTo(0, 0); true');
  await esperar(300);
  await captura('02-formulario');
  // 3. Mis plazos con avisos
  const guardar = async (tipo, fecha, titulo) => {
    await escribir('#tipo', tipo); await escribir('#fecha', fecha);
    await clic('#btn-guardar'); await escribir('#g-titulo', titulo);
    await js("document.querySelector('#dlg-guardar').close('guardar')"); await esperar(300);
  };
  await guardar('multa-pago', '2026-11-20', 'Multa de aparcamiento');
  await guardar('subsanar', '2026-11-24', 'Documentación de la beca');
  await guardar('alzada', '2026-11-10', 'Recurso contra la sanción');
  await guardar('economico', '2026-11-26', 'Reclamación a Hacienda');
  await esperar(3000);
  await clic('[data-vista="mis"]'); await esperar(400);
  await captura('03-mis-plazos');
  // 4. Puentes de 2027
  await clic('[data-vista="puentes"]');
  await escribir('#p-año', '2027'); await escribir('#p-dias', '6'); await esperar(400);
  await captura('04-puentes');
};
