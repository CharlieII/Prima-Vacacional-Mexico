/**
 * PRIMA VACACIONAL MÉXICO 2026
 * Google Apps Script + Google Sheets + HtmlService (Vanilla JS)
 *
 * Diseño:
 *  - La hoja "Entrada" captura los datos del trabajador.
 *  - La hoja "Parámetros" contiene las tablas editables y sus fuentes.
 *  - La hoja "Resultados" calcula todo con fórmulas nativas de Sheets.
 *  - Este archivo replica la lógica para la interfaz web (google.script.run),
 *    valida los datos y puede guardar la captura en "Entrada".
 *
 * La fuente de verdad para la hoja es el par Entrada + Parámetros; Resultados
 * se actualiza con fórmulas. El backend lee esos mismos datos, no duplica
 * parámetros en código.
 *
 * Aviso: herramienta informativa. No sustituye asesoría fiscal, laboral o de
 * seguridad social ni la determinación oficial de nómina.
 */

const HOJA_ENTRADA = 'Entrada';
const HOJA_PARAMETROS = 'Parámetros';
const HOJA_RESULTADOS = 'Resultados';

const BASE_DIARIO = 'Salario diario';
const BASE_SDI = 'Salario diario integrado';

const METODO_174 = 'Art. 174 RLISR (recomendado)';
const METODO_DIRECTO = 'Tarifa mensual directa';

const SI = 'Sí';
const NO = 'No';

const FORMATO_MONEDA = '"$"#,##0.00';
const FORMATO_FECHA = 'dd/mm/yyyy';
const FORMATO_PORCENTAJE = '0.0000%';
const FORMATO_PORCENTAJE_2 = '0.00%';
const FORMATO_NUMERO = '#,##0.00';
const FORMATO_ENTERO = '0';
const MS_DIA = 24 * 60 * 60 * 1000;
const PROPIEDAD_ID = 'SPREADSHEET_ID_PRIMA_VACACIONAL';

/* --------------------------------------------------------------------------
 * 0. MENÚ, INSTALACIÓN Y APLICACIÓN WEB
 * ------------------------------------------------------------------------ */

/**
 * Menú de la hoja. No ejecuta servicios que requieran autorización.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Prima Vacacional 2026')
    .addItem('Abrir calculadora', 'mostrarCalculadora')
    .addItem('Instalar / reparar hojas', 'instalar')
    .addItem('Recalcular hoja', 'recalcularHoja')
    .addSeparator()
    .addItem('Ver notas y fuentes', 'abrirNotas')
    .addToUi();
}

/**
 * Punto de entrada de la aplicación web.
 */
function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Prima vacacional 2026')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Instalación inicial. Ejecutar una vez desde el editor para autorizar.
 */
function instalar() {
  const ss = getSpreadsheet_();
  crearEstructura_(ss, true);

  const mensaje =
    'Hojas instaladas o reparadas correctamente.\n\n' +
    'Recarga la hoja y usa el menú "Prima Vacacional 2026" > "Abrir calculadora".\n\n' +
    'También puedes implementarla como aplicación web desde Extensiones > Apps Script > Implementar.\n\n' +
    'Los parámetros y las fuentes están en la hoja "Parámetros".';

  try {
    SpreadsheetApp.getUi().alert(mensaje);
  } catch (error) {
    Logger.log(mensaje);
  }
}

/**
 * Abre la calculadora en una barra lateral.
 */
function mostrarCalculadora() {
  const ss = getSpreadsheet_();
  crearEstructura_(ss);
  const html = HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Prima vacacional 2026')
    .setWidth(460);
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Activa la hoja de parámetros y lleva al bloque de fuentes.
 */
function abrirNotas() {
  const ss = getSpreadsheet_();
  crearEstructura_(ss);
  const hoja = ss.getSheetByName(HOJA_PARAMETROS);
  if (hoja) {
    ss.setActiveSheet(hoja);
    hoja.getRange('A59').activate();
  }
}

/**
 * Recalcula desde la hoja y muestra un resumen.
 */
function recalcularHoja() {
  const respuesta = calcularDesdeHoja();
  const mensaje = respuesta.ok
    ? 'Prima neta: ' + respuesta.resultado.formateado.neto + '\n' +
      'Días pagados: ' + respuesta.resultado.dias.pagados + '\n' +
      'ISR: ' + respuesta.resultado.formateado.isr + '\n' +
      'IMSS: ' + respuesta.resultado.formateado.imss
    : 'Revisa los datos:\n' + respuesta.errores.map(function (e) { return '• ' + e.mensaje; }).join('\n');

  try {
    SpreadsheetApp.getUi().alert('Resultado del cálculo', mensaje, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (error) {
    Logger.log(mensaje);
  }
}

/**
 * Obtiene el libro contenedor. En una aplicación web implementada desde una
 * hoja, getActiveSpreadsheet() puede ser null; se usa el ID guardado al instalar.
 */
function getSpreadsheet_() {
  const activo = SpreadsheetApp.getActiveSpreadsheet();
  if (activo) {
    guardarIdSpreadsheet_(activo);
    return activo;
  }

  const id = PropertiesService.getScriptProperties().getProperty(PROPIEDAD_ID);
  if (id) {
    return SpreadsheetApp.openById(id);
  }

  throw new Error(
    'No se encontró la hoja de cálculo. Ejecuta "Instalar / reparar hojas" desde la hoja ' +
    'o vuelve a implementar la aplicación web vinculada al libro.'
  );
}

function guardarIdSpreadsheet_(ss) {
  try {
    PropertiesService.getScriptProperties().setProperty(PROPIEDAD_ID, ss.getId());
  } catch (error) {
    // El ID es una ayuda para la aplicación web; no debe impedir el cálculo.
  }
}

/* --------------------------------------------------------------------------
 * 1. ESTRUCTURA DE HOJAS
 * ------------------------------------------------------------------------ */

/**
 * Crea las hojas que falten y vuelve a escribir fórmulas, nombres y
 * validaciones. No borra los datos capturados en "Entrada" ni los parámetros.
 */
function crearEstructura_(ss, reparar) {
  guardarIdSpreadsheet_(ss);
  let creada = false;

  let entrada = ss.getSheetByName(HOJA_ENTRADA);
  if (!entrada) {
    entrada = crearHojaEntrada_(ss);
    creada = true;
  } else {
    validarHojaPropia_(entrada, 'DATOS DEL TRABAJADOR');
  }

  let parametros = ss.getSheetByName(HOJA_PARAMETROS);
  if (!parametros) {
    parametros = crearHojaParametros_(ss);
    creada = true;
  } else {
    validarHojaPropia_(parametros, 'PARÁMETROS');
  }

  let resultados = ss.getSheetByName(HOJA_RESULTADOS);
  if (!resultados) {
    resultados = crearHojaResultados_(ss);
    creada = true;
  } else {
    validarHojaPropia_(resultados, 'RESULTADOS');
  }

  configurarNombres_(ss);
  if (reparar || creada) {
    escribirFormulas_(ss, reparar && !creada);
  }
  configurarValidaciones_(ss);
  SpreadsheetApp.flush();

  try {
    ss.setRecalculation(SpreadsheetApp.RecalculationInterval.ON_CHANGE);
  } catch (error) {
    // Algunos entornos no permiten modificar la recalculación; no es crítico.
  }

  return { entrada: entrada, parametros: parametros, resultados: resultados };
}

/**
 * Evita escribir sobre una hoja ajena que casualmente tenga el mismo nombre.
 */
function validarHojaPropia_(hoja, prefijo) {
  const titulo = String(hoja.getRange('A1').getValue() || '');
  if (titulo.indexOf(prefijo) !== 0) {
    throw new Error(
      'La hoja "' + hoja.getName() + '" ya existe y no fue creada por esta herramienta. ' +
      'Renómbrala o elimínala antes de continuar.'
    );
  }
}

/**
 * Hoja de captura.
 */
function crearHojaEntrada_(ss) {
  const hoja = ss.insertSheet(HOJA_ENTRADA);
  hoja.setTabColor('#0b4f5c');
  hoja.setHiddenGridlines(true);

  hoja.getRange('A1:F1')
    .merge()
    .setValue('DATOS DEL TRABAJADOR — PRIMA VACACIONAL 2026')
    .setBackground('#0b4f5c')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setFontSize(14)
    .setVerticalAlignment('middle');
  hoja.setRowHeight(1, 36);

  hoja.getRange('A2:F2')
    .merge()
    .setValue('Captura los datos en la columna B. Las celdas calculadas se actualizan solas; el detalle está en la hoja "Resultados".')
    .setFontStyle('italic')
    .setFontColor('#5d7186')
    .setWrap(true);
  hoja.setRowHeight(2, 32);

  hoja.getRange('A3:F3')
    .merge()
    .setValue('DATOS DEL TRABAJADOR')
    .setBackground('#e8eef5')
    .setFontWeight('bold')
    .setFontColor('#0b4f5c');

  const filas = [
    ['Nombre del trabajador', 'María López Hernández', 'Opcional. Sirve para identificar la consulta.'],
    ['Fecha de ingreso', new Date(2019, 2, 15, 12, 0, 0), 'Primer día laborado. Formato dd/mm/aaaa.'],
    ['Fecha de corte', new Date(2026, 10, 20, 12, 0, 0), 'Fecha a la que se calcula la antigüedad.'],
    ['Salario diario', 750.00, 'Salario base diario, antes de prestaciones.'],
    ['Salario diario integrado (SDI)', 875.00, 'Incluye la parte proporcional de prestaciones.'],
    ['Base salarial para la prima', BASE_SDI, 'Elige "Salario diario" o "Salario diario integrado".'],
    ['Días de vacaciones pendientes (opcional)', '', 'Si se capturan, la prima se calcula solo por estos días. Si se deja vacío, se usan los días gozados o el periodo completo.'],
    ['Días de vacaciones ya gozados', 0, 'Días del periodo que ya se disfrutaron. Si no hay pendientes, la prima se calcula sobre estos días.'],
    ['Prima vacacional (%)', 0.25, 'Mínimo legal: 25%. Se puede otorgar un porcentaje mayor.'],
    ['Ingreso mensual ordinario (para ISR)', 22800.00, 'Salario mensual sin la prima. Si se deja vacío se estima como salario diario × 30.4.'],
    ['Método de retención ISR', METODO_174, 'Art. 174 RLISR (recomendado) o tarifa mensual directa.'],
    ['¿Aplicar subsidio al empleo?', NO, 'Solo aplica al método de tarifa mensual directa.'],
    ['¿Deducir cuota obrera IMSS de la prima?', NO, 'Por defecto No: la prima integra el SBC y no se retiene de la prima.'],
    ['Otras deducciones (MXN)', 0.00, 'Préstamos, pensión alimenticia u otros descuentos.'],
    ['Concepto de otras deducciones', '', 'Describe el descuento para la trazabilidad.']
  ];

  filas.forEach(function (fila, indice) {
    const numeroFila = 4 + indice;
    hoja.getRange(numeroFila, 1).setValue(fila[0]).setFontWeight('bold');
    hoja.getRange(numeroFila, 2).setValue(fila[1]);
    hoja.getRange(numeroFila, 3, 1, 4)
      .merge()
      .setValue(fila[2])
      .setFontColor('#5d7186')
      .setWrap(true);
    hoja.getRange(numeroFila, 1, 1, 6).setVerticalAlignment('middle');
  });

  hoja.setRowHeights(4, filas.length, 34);

  hoja.getRange('A20:F20')
    .merge()
    .setValue('CÁLCULOS AUTOMÁTICOS')
    .setBackground('#e8eef5')
    .setFontWeight('bold')
    .setFontColor('#0b4f5c');

  const calculadas = [
    ['Años laborados', 'Se obtienen de la fecha de ingreso y la fecha de corte.'],
    ['Días de vacaciones por tabla', 'Se buscan en la tabla editable de "Parámetros".'],
    ['Días pendientes calculados', 'Días por tabla menos días ya gozados.'],
    ['Días que se pagarán', 'Días pendientes capturados o, si están vacíos, todos los disponibles.'],
    ['Prima bruta estimada', 'Días pagados × salario base × porcentaje de prima.']
  ];

  calculadas.forEach(function (fila, indice) {
    const numeroFila = 21 + indice;
    hoja.getRange(numeroFila, 1).setValue(fila[0]).setFontWeight('bold');
    hoja.getRange(numeroFila, 3, 1, 4)
      .merge()
      .setValue(fila[1])
      .setFontColor('#5d7186')
      .setWrap(true);
  });

  hoja.getRange('A27:F28')
    .merge()
    .setValue(
      'Validaciones: la antigüedad debe estar entre 1 y 35 años; los días gozados y pendientes no pueden exceder los días que corresponden; ' +
      'la prima no puede ser menor al mínimo de "Parámetros"; las fechas y los salarios deben ser válidos. ' +
      'Si necesitas otra antigüedad, actualiza la tabla y el tope en "Parámetros", y ajusta el alcance del proyecto.'
    )
    .setBackground('#fff4d6')
    .setFontColor('#6b4b00')
    .setWrap(true)
    .setVerticalAlignment('top');
  hoja.setRowHeight(27, 34);
  hoja.setRowHeight(28, 34);

  hoja.getRange('B5:B6').setNumberFormat(FORMATO_FECHA);
  hoja.getRange('B7:B8').setNumberFormat(FORMATO_MONEDA);
  hoja.getRange('B10:B11').setNumberFormat(FORMATO_ENTERO);
  hoja.getRange('B12').setNumberFormat(FORMATO_PORCENTAJE_2);
  hoja.getRange('B13').setNumberFormat(FORMATO_MONEDA);
  hoja.getRange('B17').setNumberFormat(FORMATO_MONEDA);
  hoja.getRange('B21').setNumberFormat(FORMATO_ENTERO);
  hoja.getRange('B22:B24').setNumberFormat(FORMATO_ENTERO);
  hoja.getRange('B25').setNumberFormat(FORMATO_MONEDA);

  hoja.setColumnWidth(1, 360);
  hoja.setColumnWidth(2, 240);
  hoja.setColumnWidth(3, 220);
  hoja.setColumnWidth(4, 140);
  hoja.setColumnWidth(5, 140);
  hoja.setColumnWidth(6, 140);
  hoja.setFrozenRows(3);

  return hoja;
}

/**
 * Hoja de parámetros editables, tablas y fuentes.
 */
function crearHojaParametros_(ss) {
  const hoja = ss.insertSheet(HOJA_PARAMETROS);
  hoja.setTabColor('#b45309');
  hoja.setHiddenGridlines(true);

  hoja.getRange('A1:L1')
    .merge()
    .setValue('PARÁMETROS — PRIMA VACACIONAL 2026')
    .setBackground('#0b4f5c')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setFontSize(14)
    .setVerticalAlignment('middle');
  hoja.setRowHeight(1, 36);

  hoja.getRange('A2:L2')
    .merge()
    .setValue('Edita los valores en las celdas blancas. Las fórmulas y los resultados se recalculan automáticamente. Documenta cualquier cambio de fuente.')
    .setFontStyle('italic')
    .setFontColor('#5d7186')
    .setWrap(true);
  hoja.setRowHeight(2, 30);

  hoja.getRange('A3:D3')
    .merge()
    .setValue('PARÁMETROS GENERALES')
    .setBackground('#e8eef5')
    .setFontWeight('bold')
    .setFontColor('#0b4f5c');

  hoja.getRange('A4:D4')
    .setValues([['Concepto', 'Valor 2026', 'Unidad', 'Fuente / nota']])
    .setBackground('#f3f6fa')
    .setFontWeight('bold');

  const parametros = [
    ['Prima vacacional mínima', 0.25, '%', 'LFT art. 80: mínimo 25% sobre el salario de los días de vacaciones.'],
    ['UMA diaria 2026', 117.31, 'MXN/día', 'INEGI. Vigente del 01/02/2026 al 31/01/2027.'],
    ['Días de UMA exentos de ISR', 15, 'días', 'LISR art. 93, fracción XIV: 15 UMA diarias para prima vacacional.'],
    ['Exención máxima de ISR', '=ROUND(B6*B7,2)', 'MXN', 'Fórmula: 15 × UMA diaria.'],
    ['Antigüedad máxima soportada', 35, 'años', 'LFT art. 76: la tabla de este modelo llega a 35 años.'],
    ['Cuota obrera IMSS total', '=L27', '% del SBC', 'LSS arts. 27, 30 y 38. Estimación simplificada: 2.775% del bruto; la cédula oficial aplica 0.40% solo al excedente de 3 UMA.'],
    ['Subsidio al empleo mensual', 535.65, 'MXN', 'Anexo 8 RMF 2026. Uso opcional en el método directo.'],
    ['Tope de ingreso para subsidio', 11492.66, 'MXN/mes', 'Anexo 8 RMF 2026.'],
    ['Método ISR predeterminado', METODO_174, 'texto', 'RLISR art. 174: procedimiento opcional para pagos extraordinarios.'],
    ['Deducir IMSS por defecto', NO, 'Sí/No', 'La prima integra el SBC; normalmente no se retiene de la prima.'],
    ['Aplicar subsidio por defecto', NO, 'Sí/No', 'Solo se usa con la tarifa mensual directa.'],
    ['Año fiscal', 2026, 'año', 'Ejercicio de los parámetros.'],
    ['Fecha de actualización', new Date(2026, 10, 20, 12, 0, 0), 'fecha', 'Última revisión de valores y fuentes.'],
    ['Días base para mensualizar', 30.4, 'días', 'Promedio usado por el art. 174 RLISR (365/12).']
  ];

  hoja.getRange(5, 1, parametros.length, 4).setValues(parametros);
  hoja.getRange(5, 1, parametros.length, 1).setFontWeight('bold');
  hoja.getRange(5, 4, parametros.length, 1).setWrap(true).setFontColor('#5d7186');
  hoja.setRowHeights(5, parametros.length, 32);

  hoja.getRange('B5').setNumberFormat(FORMATO_PORCENTAJE_2);
  hoja.getRange('B6').setNumberFormat(FORMATO_MONEDA);
  hoja.getRange('B7').setNumberFormat(FORMATO_ENTERO);
  hoja.getRange('B8').setNumberFormat(FORMATO_MONEDA);
  hoja.getRange('B9').setNumberFormat(FORMATO_ENTERO);
  hoja.getRange('B10').setNumberFormat(FORMATO_PORCENTAJE);
  hoja.getRange('B11').setNumberFormat(FORMATO_MONEDA);
  hoja.getRange('B12').setNumberFormat(FORMATO_MONEDA);
  hoja.getRange('B16').setNumberFormat(FORMATO_ENTERO);
  hoja.getRange('B17').setNumberFormat(FORMATO_FECHA);
  hoja.getRange('B18').setNumberFormat('#,##0.0');

  hoja.getRange('A21:C21')
    .setValues([['Años cumplidos', 'Días de vacaciones', 'Fundamento']])
    .setBackground('#f3f6fa')
    .setFontWeight('bold');

  const vacaciones = [];
  for (let anio = 1; anio <= 35; anio += 1) {
    let dias;
    if (anio <= 5) {
      dias = 10 + 2 * anio;
    } else if (anio <= 10) {
      dias = 22;
    } else if (anio <= 15) {
      dias = 24;
    } else if (anio <= 20) {
      dias = 26;
    } else if (anio <= 25) {
      dias = 28;
    } else if (anio <= 30) {
      dias = 30;
    } else {
      dias = 32;
    }
    vacaciones.push([anio, dias, 'LFT art. 76 (reforma 2023)']);
  }

  hoja.getRange(22, 1, vacaciones.length, 3).setValues(vacaciones);
  hoja.getRange('A22:B56').setNumberFormat(FORMATO_ENTERO);
  hoja.getRange('C22:C56').setFontColor('#5d7186').setFontSize(9);
  hoja.getRange('A22:A56').setFontWeight('bold');

  hoja.getRange('E20:I20')
    .merge()
    .setValue('TARIFA MENSUAL DEL ISR 2026 — ART. 96 LISR')
    .setBackground('#e8eef5')
    .setFontWeight('bold')
    .setFontColor('#0b4f5c');

  hoja.getRange('E21:I21')
    .setValues([['Límite inferior', 'Límite superior', 'Cuota fija', '% sobre excedente', 'Fuente']])
    .setBackground('#f3f6fa')
    .setFontWeight('bold');

  const tarifaIsr = [
    [0.01, 844.59, 0.00, 0.0192],
    [844.60, 7168.51, 16.22, 0.0640],
    [7168.52, 12598.02, 420.95, 0.1088],
    [12598.03, 14644.64, 1011.68, 0.1600],
    [14644.65, 17533.64, 1339.14, 0.1792],
    [17533.65, 35362.83, 1856.84, 0.2136],
    [35362.84, 55736.68, 5665.16, 0.2352],
    [55736.69, 106410.50, 10457.09, 0.3000],
    [106410.51, 141880.66, 25659.23, 0.3200],
    [141880.67, 425641.99, 37009.69, 0.3400],
    [425642.00, 'En adelante', 133488.54, 0.3500]
  ];

  hoja.getRange(22, 5, tarifaIsr.length, 4).setValues(tarifaIsr);
  hoja.getRange('E22:G32').setNumberFormat(FORMATO_MONEDA);
  hoja.getRange('H22:H32').setNumberFormat(FORMATO_PORCENTAJE);
  hoja.getRange('I22:I32')
    .merge()
    .setValue('Anexo 8 RMF 2026, DOF 28/12/2025')
    .setFontColor('#5d7186')
    .setFontSize(9)
    .setWrap(true);
  hoja.getRange('F32').setHorizontalAlignment('left');

  hoja.getRange('K20:L20')
    .merge()
    .setValue('CUOTAS OBRERAS IMSS 2026')
    .setBackground('#e8eef5')
    .setFontWeight('bold')
    .setFontColor('#0b4f5c');

  hoja.getRange('K21:L21')
    .setValues([['Concepto', 'Tasa obrero']])
    .setBackground('#f3f6fa')
    .setFontWeight('bold');

  const imss = [
    ['Enfermedad y maternidad (excedente 3 UMA)', 0.0040],
    ['Prestaciones en dinero', 0.0025],
    ['Gastos médicos para pensionados', 0.00375],
    ['Invalidez y vida', 0.00625],
    ['Cesantía en edad avanzada y vejez', 0.01125]
  ];

  hoja.getRange(22, 11, imss.length, 2).setValues(imss);
  hoja.getRange('K22:K26').setWrap(true).setVerticalAlignment('middle');
  hoja.setRowHeights(22, imss.length, 30);
  hoja.getRange('L22:L26').setNumberFormat(FORMATO_PORCENTAJE);
  hoja.getRange('K27').setValue('Total').setFontWeight('bold');
  hoja.getRange('L27').setFormula('=SUM(L22:L26)').setNumberFormat(FORMATO_PORCENTAJE).setFontWeight('bold');
  hoja.getRange('K28').setValue('3 UMA (referencia)').setFontWeight('normal');
  hoja.getRange('L28').setFormula('=ROUND(B6*3,2)').setNumberFormat(FORMATO_MONEDA);
  hoja.getRange('K29:L30')
    .merge()
    .setValue('La cuota obrera se descuenta del salario mensual, no de la prima. El interruptor de "Entrada" permite una estimación simplificada (2.775% del bruto); no sustituye la cédula mensual del IMSS.')
    .setFontColor('#5d7186')
    .setFontSize(9)
    .setWrap(true);

  hoja.getRange('A58:L58')
    .merge()
    .setValue('FUENTES, SUPUESTOS Y ADVERTENCIAS')
    .setBackground('#e8eef5')
    .setFontWeight('bold')
    .setFontColor('#0b4f5c');

  const notas = [
    '• Vacaciones: LFT art. 76, reforma publicada en el DOF el 27/12/2022 y vigente desde 2023. La tabla va de 1 a 35 años: 12, 14, 16, 18, 20, 22 (6-10), 24 (11-15), 26 (16-20), 28 (21-25), 30 (26-30) y 32 (31-35) días.',
    '• Prima vacacional: LFT art. 80. Mínimo 25% sobre el salario correspondiente a los días de vacaciones. Si el contrato o la política interna otorgan más, se captura el porcentaje mayor.',
    '• ISR: tarifa mensual del art. 96 LISR, Anexo 8 de la RMF 2026 (DOF 28/12/2025). Son 11 tramos, del 1.92% al 35%.',
    '• Exención: LISR art. 93, fracción XIV. La prima vacacional está exenta hasta 15 UMA diarias por año de calendario. En 2026: 15 × $117.31 = $1,759.65. Si en el año ya se aplicó parte de esta exención, el remanente es menor.',
    '• UMA: INEGI, $117.31 diaria, $3,566.22 mensual y $42,794.64 anual, vigente desde el 01/02/2026.',
    '• ISR de la prima: el art. 174 del Reglamento de la LISR permite un procedimiento opcional para pagos extraordinarios (prima vacacional, aguinaldo, PTU y primas dominicales). La hoja también ofrece la tarifa mensual directa como comparación.',
    '• IMSS: la prima vacacional integra el salario base de cotización (LSS arts. 27 y 30). La cuota obrera se determina en la cédula mensual y no se retiene normalmente del pago de la prima; por eso el interruptor viene en "No". La estimación simplificada usa 2.775% del bruto; la cédula oficial aplica 0.40% solo sobre el excedente de 3 UMA. No sustituye la cédula oficial.',
    '• No se incluye el impuesto sobre nóminas estatal: es una contribución patronal, no una retención al trabajador. Tampoco se incluyen cuotas patronales, INFONAVIT, SAR, riesgos de trabajo ni el ajuste anual del ISR.',
    '• Esta hoja es informativa. Antes de pagar o timbrar, confirma los parámetros vigentes, el tratamiento del trabajador y la normativa estatal aplicable.'
  ];

  notas.forEach(function (texto, indice) {
    const fila = 59 + indice;
    hoja.getRange(fila, 1, 1, 12)
      .merge()
      .setValue(texto)
      .setWrap(true)
      .setVerticalAlignment('top')
      .setFontColor('#3d4f60')
      .setFontSize(10);
    hoja.setRowHeight(fila, 38);
  });

  hoja.setColumnWidth(1, 330);
  hoja.setColumnWidth(2, 240);
  hoja.setColumnWidth(3, 170);
  hoja.setColumnWidth(4, 400);
  hoja.setColumnWidth(5, 150);
  hoja.setColumnWidth(6, 150);
  hoja.setColumnWidth(7, 130);
  hoja.setColumnWidth(8, 160);
  hoja.setColumnWidth(9, 320);
  hoja.setColumnWidth(10, 18);
  hoja.setColumnWidth(11, 320);
  hoja.setColumnWidth(12, 120);
  hoja.setFrozenRows(4);

  return hoja;
}

/**
 * Hoja de resultados con fórmulas nativas.
 */
function crearHojaResultados_(ss) {
  const hoja = ss.insertSheet(HOJA_RESULTADOS);
  hoja.setTabColor('#0a7f5a');
  hoja.setHiddenGridlines(true);

  hoja.getRange('A1:F1')
    .merge()
    .setValue('RESULTADOS — PRIMA VACACIONAL 2026')
    .setBackground('#0b4f5c')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setFontSize(14)
    .setVerticalAlignment('middle');
  hoja.setRowHeight(1, 36);

  hoja.getRange('A2:F2')
    .merge()
    .setValue('Cálculo automático a partir de "Entrada" y "Parámetros". No edites las celdas de resultado; cambia los datos de entrada.')
    .setFontStyle('italic')
    .setFontColor('#5d7186')
    .setWrap(true);
  hoja.setRowHeight(2, 30);

  const secciones = [
    [3, 'RESUMEN DEL TRABAJADOR'],
    [13, 'VACACIONES'],
    [21, 'CÁLCULO DE LA PRIMA'],
    [32, 'DETALLE DE RETENCIÓN DE ISR'],
    [51, 'VALIDACIÓN']
  ];

  secciones.forEach(function (seccion) {
    hoja.getRange(seccion[0], 1, 1, 6)
      .merge()
      .setValue(seccion[1])
      .setBackground('#e8eef5')
      .setFontWeight('bold')
      .setFontColor('#0b4f5c');
  });

  const etiquetas = [
    [4, 'Nombre'],
    [5, 'Fecha de ingreso'],
    [6, 'Fecha de corte'],
    [7, 'Años laborados'],
    [8, 'Salario diario'],
    [9, 'Salario diario integrado'],
    [10, 'Base seleccionada'],
    [11, 'Salario base aplicado'],
    [14, 'Días de vacaciones por tabla'],
    [15, 'Días ya gozados'],
    [16, 'Días pendientes capturados'],
    [17, 'Días que se pagan'],
    [18, 'Porcentaje de prima'],
    [19, 'Días de UMA exentos'],
    [22, 'Prima bruta'],
    [23, 'Exención de ISR (15 UMA)'],
    [24, 'Prima gravable para ISR'],
    [25, 'ISR retenido'],
    [26, 'Cuota obrera IMSS (estimación)'],
    [27, 'Otras deducciones'],
    [28, 'Total de deducciones'],
    [29, 'PRIMA NETA A PAGAR'],
    [30, 'Tasa efectiva de deducción'],
    [33, 'Método aplicado'],
    [34, 'Ingreso mensual ordinario'],
    [35, 'Prima gravable'],
    [36, 'Factor Art. 174 (prima ÷ 365 × 30.4)'],
    [37, 'Base conjunta (ordinario + factor)'],
    [38, 'Límite inferior conjunto'],
    [39, 'Excedente conjunto'],
    [40, 'Cuota fija conjunto'],
    [41, 'Tasa conjunto'],
    [42, 'ISR conjunto'],
    [43, 'ISR ordinario'],
    [44, 'Diferencia de ISR'],
    [45, 'Tasa efectiva Art. 174'],
    [46, 'ISR Art. 174'],
    [47, 'ISR directo atribuible a la prima'],
    [48, 'Subsidio al empleo (referencia del mes)'],
    [49, 'ISR final']
  ];

  etiquetas.forEach(function (fila) {
    hoja.getRange(fila[0], 1).setValue(fila[1]).setFontWeight('bold');
    hoja.getRange(fila[0], 1).setVerticalAlignment('middle');
  });

  hoja.getRange('A29:B29').setBackground('#e6f4ec').setFontColor('#0a5c43');
  hoja.getRange('A29').setFontWeight('bold');
  hoja.getRange('B29').setFontWeight('bold').setFontSize(13);

  hoja.getRange('A52:F52')
    .merge()
    .setBackground('#fff7e6')
    .setFontColor('#7a5200')
    .setFontWeight('bold')
    .setWrap(true)
    .setVerticalAlignment('middle');
  hoja.setRowHeight(52, 36);

  hoja.getRange('A54:F55')
    .merge()
    .setValue(
      'La exención de 15 UMA es anual por trabajador. Si ya se aplicó en otra prima del mismo año, captura solo el remanente. ' +
      'El ISR definitivo se determina en el ajuste anual. La cuota obrera IMSS es una estimación; la prima integra el SBC y la cuota se determina en la cédula mensual.'
    )
    .setFontStyle('italic')
    .setFontColor('#5d7186')
    .setWrap(true)
    .setVerticalAlignment('top');

  hoja.getRange('B5:B6').setNumberFormat(FORMATO_FECHA);
  hoja.getRange('B7').setNumberFormat(FORMATO_ENTERO);
  hoja.getRange('B8:B9').setNumberFormat(FORMATO_MONEDA);
  hoja.getRange('B11').setNumberFormat(FORMATO_MONEDA);
  hoja.getRange('B14:B17').setNumberFormat(FORMATO_ENTERO);
  hoja.getRange('B18').setNumberFormat(FORMATO_PORCENTAJE_2);
  hoja.getRange('B19').setNumberFormat(FORMATO_ENTERO);
  hoja.getRange('B22:B29').setNumberFormat(FORMATO_MONEDA);
  hoja.getRange('B30').setNumberFormat(FORMATO_PORCENTAJE_2);
  hoja.getRange('B34').setNumberFormat(FORMATO_MONEDA);
  hoja.getRange('B36:B40').setNumberFormat(FORMATO_MONEDA);
  hoja.getRange('B41').setNumberFormat(FORMATO_PORCENTAJE);
  hoja.getRange('B42:B44').setNumberFormat(FORMATO_MONEDA);
  hoja.getRange('B45').setNumberFormat(FORMATO_PORCENTAJE);
  hoja.getRange('B46:B49').setNumberFormat(FORMATO_MONEDA);

  hoja.setColumnWidth(1, 390);
  hoja.setColumnWidth(2, 190);
  hoja.setColumnWidth(3, 130);
  hoja.setColumnWidth(4, 130);
  hoja.setColumnWidth(5, 130);
  hoja.setColumnWidth(6, 130);
  hoja.setFrozenRows(3);

  return hoja;
}

/**
 * Registra los rangos con nombre usados por fórmulas y backend.
 */
function configurarNombres_(ss) {
  const hoja = ss.getSheetByName(HOJA_PARAMETROS);
  if (!hoja) return;

  const definiciones = [
    ['Par_Prima_Pct', 'B5'],
    ['Par_UMA_Diaria', 'B6'],
    ['Par_DiasExencionUMA', 'B7'],
    ['Par_ExencionMax', 'B8'],
    ['Par_AntiguedadMax', 'B9'],
    ['Par_Cuota_IMSS', 'B10'],
    ['Par_SubsidioMensual', 'B11'],
    ['Par_SubsidioTope', 'B12'],
    ['Par_MetodoISR', 'B13'],
    ['Par_DeducirIMSS', 'B14'],
    ['Par_AplicarSubsidio', 'B15'],
    ['Par_AnioFiscal', 'B16'],
    ['Par_FechaActualizacion', 'B17'],
    ['Par_DiasBaseMensual', 'B18'],
    ['Tabla_Vacaciones', 'A22:B56'],
    ['Tabla_Vacaciones_Antiguedad', 'A22:A56'],
    ['Tabla_Vacaciones_Dias', 'B22:B56'],
    ['Tabla_ISR', 'E22:H32'],
    ['Tabla_ISR_LimiteInferior', 'E22:E32'],
    ['Tabla_ISR_LimiteSuperior', 'F22:F32'],
    ['Tabla_ISR_CuotaFija', 'G22:G32'],
    ['Tabla_ISR_Tasa', 'H22:H32'],
    ['Tabla_IMSS', 'K22:L27'],
    ['Tabla_IMSS_Tasas', 'L22:L26']
  ];

  definiciones.forEach(function (definicion) {
    definirNombre_(ss, definicion[0], hoja.getRange(definicion[1]));
  });
}

/**
 * Crea o reemplaza un rango con nombre sin duplicarlo.
 */
function definirNombre_(ss, nombre, rango) {
  const existentes = ss.getNamedRanges().filter(function (nr) {
    return nr.getName() === nombre;
  });

  if (existentes.length === 0) {
    ss.setNamedRange(nombre, rango);
    return;
  }

  existentes[0].setRange(rango);
  for (let i = 1; i < existentes.length; i += 1) {
    existentes[i].remove();
  }
}

/**
 * Escribe las fórmulas de Entrada y Resultados. Es idempotente.
 */
function escribirFormulas_(ss, preservarEntrada) {
  const entrada = ss.getSheetByName(HOJA_ENTRADA);
  const resultados = ss.getSheetByName(HOJA_RESULTADOS);
  if (!entrada || !resultados) return;

  // Entrada: cálculos informativos. Al reparar una hoja existente se
  // conservan los valores capturados en B13:B16; solo se rellenan si están
  // vacíos. En una instalación nueva se escriben las fórmulas de enlace.
  if (!preservarEntrada || esVacio_(entrada.getRange('B13').getValue())) {
    entrada.getRange('B13').setFormula('=ROUND(B7*Par_DiasBaseMensual,2)');
  }
  if (!preservarEntrada || esVacio_(entrada.getRange('B14').getValue())) {
    entrada.getRange('B14').setFormula('=Par_MetodoISR');
  }
  if (!preservarEntrada || esVacio_(entrada.getRange('B15').getValue())) {
    entrada.getRange('B15').setFormula('=Par_AplicarSubsidio');
  }
  if (!preservarEntrada || esVacio_(entrada.getRange('B16').getValue())) {
    entrada.getRange('B16').setFormula('=Par_DeducirIMSS');
  }

  entrada.getRange('B21').setFormula(
    '=IF(OR(B5="",B6=""),"",IF(B6<B5,"Fecha inválida",DATEDIF(B5,B6,"Y")))'
  );
  entrada.getRange('B22').setFormula(
    '=IFERROR(IF(OR(B21="",NOT(ISNUMBER(B21)),B21<1,B21>Par_AntiguedadMax),"",' +
    'VLOOKUP(B21,Tabla_Vacaciones,2,1)),"")'
  );
  entrada.getRange('B23').setFormula(
    '=IF(B22="","",MAX(0,B22-IF(ISNUMBER(B11),B11,0)))'
  );
  entrada.getRange('B24').setFormula(
    '=IF(B22="","",IF(B10="",IF(AND(ISNUMBER(B11),B11>0),MIN(B11,B22),B22),MIN(MAX(0,B10),B23)))'
  );
  entrada.getRange('B25').setFormula(
    '=IF(OR(B24="",B9=""),"",ROUND(B24*IF(B9="Salario diario integrado",B8,B7)*B12,2))'
  );

  // Resultados: datos.
  resultados.getRange('B4').setFormula('=IF(Entrada!B4="","Trabajador sin nombre",Entrada!B4)');
  resultados.getRange('B5').setFormula('=Entrada!B5');
  resultados.getRange('B6').setFormula('=Entrada!B6');
  resultados.getRange('B7').setFormula('=Entrada!B21');
  resultados.getRange('B8').setFormula('=Entrada!B7');
  resultados.getRange('B9').setFormula('=Entrada!B8');
  resultados.getRange('B10').setFormula('=Entrada!B9');
  resultados.getRange('B11').setFormula('=IF(B10="Salario diario integrado",B9,B8)');

  resultados.getRange('B14').setFormula('=Entrada!B22');
  resultados.getRange('B15').setFormula('=Entrada!B11');
  resultados.getRange('B16').setFormula('=IF(Entrada!B10="","—",Entrada!B10)');
  resultados.getRange('B17').setFormula('=Entrada!B24');
  resultados.getRange('B18').setFormula('=Entrada!B12');
  resultados.getRange('B19').setFormula('=Par_DiasExencionUMA');

  // Resultados: importes.
  resultados.getRange('B22').setFormula('=ROUND(B17*B11*B18,2)');
  resultados.getRange('B23').setFormula('=ROUND(MIN(B22,Par_ExencionMax),2)');
  resultados.getRange('B24').setFormula('=ROUND(MAX(0,B22-B23),2)');
  resultados.getRange('B25').setFormula('=B49');
  resultados.getRange('B26').setFormula('=IF(Entrada!B16="Sí",ROUND(B22*Par_Cuota_IMSS,2),0)');
  resultados.getRange('B27').setFormula('=IF(ISNUMBER(Entrada!B17),Entrada!B17,0)');
  resultados.getRange('B28').setFormula('=ROUND(B25+B26+B27,2)');
  resultados.getRange('B29').setFormula('=ROUND(B22-B28,2)');
  resultados.getRange('B30').setFormula('=IF(B22=0,0,B28/B22)');

  // Resultados: detalle de ISR.
  resultados.getRange('B33').setFormula('=Entrada!B14');
  resultados.getRange('B34').setFormula('=IF(ISNUMBER(Entrada!B13),Entrada!B13,ROUND(B8*Par_DiasBaseMensual,2))');
  resultados.getRange('B35').setFormula('=B24');
  resultados.getRange('B36').setFormula('=IF(B35<=0,0,B35/365*30.4)');
  resultados.getRange('B37').setFormula('=ROUND(B34+B36,2)');
  resultados.getRange('B38').setFormula('=IFERROR(INDEX(Tabla_ISR_LimiteInferior,MATCH(B37,Tabla_ISR_LimiteInferior,1)),0)');
  resultados.getRange('B39').setFormula('=MAX(0,B37-B38)');
  resultados.getRange('B40').setFormula('=IFERROR(INDEX(Tabla_ISR_CuotaFija,MATCH(B37,Tabla_ISR_LimiteInferior,1)),0)');
  resultados.getRange('B41').setFormula('=IFERROR(INDEX(Tabla_ISR_Tasa,MATCH(B37,Tabla_ISR_LimiteInferior,1)),0)');
  resultados.getRange('B42').setFormula('=ROUND(B40+B39*B41,2)');
  resultados.getRange('B43').setFormula(
    '=IFERROR(ROUND(INDEX(Tabla_ISR_CuotaFija,MATCH(B34,Tabla_ISR_LimiteInferior,1))+' +
    '(B34-INDEX(Tabla_ISR_LimiteInferior,MATCH(B34,Tabla_ISR_LimiteInferior,1)))*' +
    'INDEX(Tabla_ISR_Tasa,MATCH(B34,Tabla_ISR_LimiteInferior,1)),2),0)'
  );
  resultados.getRange('B44').setFormula('=MAX(0,B42-B43)');
  resultados.getRange('B45').setFormula('=IF(B36<=0,0,B44/B36)');
  resultados.getRange('B46').setFormula('=ROUND(B35*B45,2)');
  resultados.getRange('B47').setFormula(
    '=IFERROR(MAX(0,' +
    'MAX(0,ROUND(INDEX(Tabla_ISR_CuotaFija,MATCH(B34+B35,Tabla_ISR_LimiteInferior,1))+' +
    '(B34+B35-INDEX(Tabla_ISR_LimiteInferior,MATCH(B34+B35,Tabla_ISR_LimiteInferior,1)))*' +
    'INDEX(Tabla_ISR_Tasa,MATCH(B34+B35,Tabla_ISR_LimiteInferior,1)),2)-' +
    'IF(AND(Entrada!B15="Sí",B34+B35<=Par_SubsidioTope),Par_SubsidioMensual,0))-' +
    'MAX(0,ROUND(INDEX(Tabla_ISR_CuotaFija,MATCH(B34,Tabla_ISR_LimiteInferior,1))+' +
    '(B34-INDEX(Tabla_ISR_LimiteInferior,MATCH(B34,Tabla_ISR_LimiteInferior,1)))*' +
    'INDEX(Tabla_ISR_Tasa,MATCH(B34,Tabla_ISR_LimiteInferior,1)),2)-' +
    'IF(AND(Entrada!B15="Sí",B34<=Par_SubsidioTope),Par_SubsidioMensual,0))' +
    '),0)'
  );
  resultados.getRange('B48').setFormula(
    '=IF(AND(Entrada!B15="Sí",B34+B35<=Par_SubsidioTope),Par_SubsidioMensual,0)'
  );
  resultados.getRange('B49').setFormula('=IF(LEFT(B33,3)="Art",B46,MAX(0,B47))');

  resultados.getRange('A52').setFormula(
    '=IFERROR(' +
    'IF(OR(B5="",NOT(ISNUMBER(B5)),B8<=0,B11<=0),"⚠ Completa fecha de ingreso, salario diario y SDI.",' +
    'IF(NOT(ISNUMBER(B7)),"⚠ Revisa las fechas de ingreso y corte.",' +
    'IF(B7<1,"⚠ La antigüedad debe ser al menos 1 año.",' +
    'IF(B7>Par_AntiguedadMax,"⚠ La antigüedad excede el máximo permitido.",' +
    'IF(B18<Par_Prima_Pct,"⚠ La prima no puede ser menor al mínimo legal.",' +
    'IF(AND(ISNUMBER(Entrada!B10),ISNUMBER(Entrada!B23),Entrada!B10>Entrada!B23),"⚠ Los días pendientes capturados exceden los días disponibles.","✔ Datos válidos. Revisa el desglose.")' +
    '))))),' +
    '"⚠ Revisa los datos capturados.")'
  );

  // Formatos que dependen de fórmulas.
  entrada.getRange('B13').setNumberFormat(FORMATO_MONEDA);
  entrada.getRange('B21').setNumberFormat(FORMATO_ENTERO);
  entrada.getRange('B22:B24').setNumberFormat(FORMATO_ENTERO);
  entrada.getRange('B25').setNumberFormat(FORMATO_MONEDA);
  resultados.getRange('B29').setNumberFormat(FORMATO_MONEDA);
  resultados.getRange('B30').setNumberFormat(FORMATO_PORCENTAJE_2);
}

/**
 * Validaciones de captura y de parámetros.
 */
function configurarValidaciones_(ss) {
  const entrada = ss.getSheetByName(HOJA_ENTRADA);
  const parametros = ss.getSheetByName(HOJA_PARAMETROS);
  if (!entrada || !parametros) return;

  aplicarLista_(entrada.getRange('B9'), [BASE_DIARIO, BASE_SDI]);
  aplicarLista_(entrada.getRange('B14'), [METODO_174, METODO_DIRECTO]);
  aplicarLista_(entrada.getRange('B15'), [SI, NO]);
  aplicarLista_(entrada.getRange('B16'), [SI, NO]);

  aplicarLista_(parametros.getRange('B13'), [METODO_174, METODO_DIRECTO]);
  aplicarLista_(parametros.getRange('B14'), [SI, NO]);
  aplicarLista_(parametros.getRange('B15'), [SI, NO]);

  aplicarNumero_(entrada.getRange('B7'), 0.01, 1000000);
  aplicarNumero_(entrada.getRange('B8'), 0.01, 1000000);
  aplicarNumero_(entrada.getRange('B10'), 0, 35);
  aplicarNumero_(entrada.getRange('B11'), 0, 35);
  aplicarNumero_(entrada.getRange('B12'), 0.25, 5);
  aplicarNumero_(entrada.getRange('B17'), 0, 1000000);

  aplicarNumero_(parametros.getRange('B5'), 0.25, 5);
  aplicarNumero_(parametros.getRange('B6'), 0.01, 10000);
  aplicarNumero_(parametros.getRange('B7'), 1, 365);
  aplicarNumero_(parametros.getRange('B8'), 0.01, 1000000);
  aplicarNumero_(parametros.getRange('B9'), 1, 35);
  aplicarNumero_(parametros.getRange('B11'), 0, 100000);
  aplicarNumero_(parametros.getRange('B12'), 0, 1000000);
  aplicarNumero_(parametros.getRange('B18'), 1, 365);

  aplicarNumero_(parametros.getRange('B22:B56'), 0, 60);

  // Fechas válidas.
  try {
    entrada.getRange('B5:B6')
      .setDataValidation(SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).build());
  } catch (error) {
    // requireDate no está disponible en algunas versiones; el backend valida igual.
  }

  // Formato condicional para advertir antigüedad fuera de rango.
  try {
    const hoja = entrada;
    const reglas = hoja.getConditionalFormatRules().filter(function (regla) {
      return regla.getRanges().some(function (rango) {
        return rango.getA1Notation() === 'B21';
      });
    });
    if (reglas.length === 0) {
      const regla = SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied('=AND(ISNUMBER($B$21),OR($B$21<1,$B$21>Par_AntiguedadMax))')
        .setBackground('#fde8e6')
        .setFontColor('#b42318')
        .setRanges([hoja.getRange('B21')])
        .build();
      hoja.setConditionalFormatRules(hoja.getConditionalFormatRules().concat([regla]));
    }
  } catch (error) {
    // No es crítico.
  }
}

function aplicarLista_(rango, valores) {
  try {
    rango.setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(valores, true).setAllowInvalid(false).build()
    );
  } catch (error) {
    // La validación visual no debe impedir la instalación.
  }
}

function aplicarNumero_(rango, minimo, maximo) {
  try {
    rango.setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireNumberBetween(minimo, maximo)
        .setAllowInvalid(false)
        .build()
    );
  } catch (error) {
    // La validación visual no debe impedir la instalación.
  }
}

/* --------------------------------------------------------------------------
 * 2. LECTURA DE PARÁMETROS Y ENTRADA
 * ------------------------------------------------------------------------ */

/**
 * Lee y valida todos los parámetros de la hoja.
 */
function obtenerParametros_(ss) {
  const primaPct = normalizarPorcentaje_(leerNumeroNombre_(ss, 'Par_Prima_Pct', 'prima vacacional mínima'));
  if (!isFinite(primaPct) || primaPct < 0.25) {
    throw new Error('La prima vacacional mínima debe ser al menos 25% (0.25). Revisa "Parámetros".');
  }

  const umaDiaria = leerNumeroNombre_(ss, 'Par_UMA_Diaria', 'UMA diaria');
  if (!(umaDiaria > 0)) {
    throw new Error('La UMA diaria debe ser mayor a cero. Revisa "Parámetros".');
  }
  const diasExencionUMA = leerEnteroNombre_(ss, 'Par_DiasExencionUMA', 'días de UMA exentos');
  if (diasExencionUMA < 1) {
    throw new Error('Los días de UMA exentos deben ser al menos 1. Revisa "Parámetros".');
  }
  let exencionMax = redondear2_(leerNumeroNombre_(ss, 'Par_ExencionMax', 'exención máxima de ISR'));
  if (!(exencionMax > 0)) {
    exencionMax = redondear2_(umaDiaria * diasExencionUMA);
  }
  if (!(exencionMax > 0)) {
    throw new Error('La exención máxima de ISR debe ser mayor a cero. Revisa "Parámetros".');
  }
  const antiguedadMax = leerEnteroNombre_(ss, 'Par_AntiguedadMax', 'antigüedad máxima');
  if (antiguedadMax < 1 || antiguedadMax > 35) {
    throw new Error('La antigüedad máxima debe estar entre 1 y 35 años.');
  }

  let cuotaIMSS = normalizarPorcentaje_(leerNumeroNombre_(ss, 'Par_Cuota_IMSS', 'cuota obrera IMSS'));
  const conceptosIMSS = leerConceptosIMSS_(ss);
  const sumaIMSS = conceptosIMSS.reduce(function (suma, concepto) {
    return suma + concepto.tasa;
  }, 0);
  if (!isFinite(cuotaIMSS) || cuotaIMSS <= 0) {
    cuotaIMSS = sumaIMSS;
  }
  if (!isFinite(cuotaIMSS) || cuotaIMSS < 0 || cuotaIMSS > 0.20) {
    throw new Error('La cuota obrera del IMSS debe estar entre 0% y 20%. Revisa "Parámetros".');
  }

  const subsidioMensual = leerNumeroNombre_(ss, 'Par_SubsidioMensual', 'subsidio al empleo');
  const subsidioTope = leerNumeroNombre_(ss, 'Par_SubsidioTope', 'tope de ingreso para subsidio');

  const metodoISR = normalizarMetodo_(leerTextoNombre_(ss, 'Par_MetodoISR', 'método ISR'));
  if (!metodoISR) {
    throw new Error('El método ISR debe ser "' + METODO_174 + '" o "' + METODO_DIRECTO + '".');
  }

  const deducirIMSS = normalizarSiNo_(leerTextoNombre_(ss, 'Par_DeducirIMSS', 'deducir IMSS'));
  const aplicarSubsidio = normalizarSiNo_(leerTextoNombre_(ss, 'Par_AplicarSubsidio', 'aplicar subsidio'));
  if (deducirIMSS === null || aplicarSubsidio === null) {
    throw new Error('Los parámetros "Deducir IMSS" y "Aplicar subsidio" deben ser Sí o No.');
  }

  const anioFiscal = leerEnteroNombre_(ss, 'Par_AnioFiscal', 'año fiscal');
  if (anioFiscal < 2020 || anioFiscal > 2100) {
    throw new Error('El año fiscal debe estar entre 2020 y 2100.');
  }

  const diasBaseMensual = leerNumeroNombre_(ss, 'Par_DiasBaseMensual', 'días base para mensualizar');
  if (diasBaseMensual < 28 || diasBaseMensual > 31) {
    throw new Error('Los días base para mensualizar deben estar entre 28 y 31 (se usa 30.4).');
  }

  const fechaActualizacion = leerFechaNombre_(ss, 'Par_FechaActualizacion', 'fecha de actualización');
  const tablaVacaciones = leerTablaVacaciones_(ss);
  const tarifaISR = leerTarifaISR_(ss);

  return {
    primaPct: primaPct,
    umaDiaria: umaDiaria,
    diasExencionUMA: diasExencionUMA,
    exencionMax: exencionMax,
    antiguedadMax: antiguedadMax,
    cuotaIMSS: cuotaIMSS,
    subsidioMensual: subsidioMensual,
    subsidioTope: subsidioTope,
    metodoISR: metodoISR,
    deducirIMSS: deducirIMSS,
    aplicarSubsidio: aplicarSubsidio,
    anioFiscal: anioFiscal,
    diasBaseMensual: diasBaseMensual,
    fechaActualizacion: fechaActualizacion,
    tablaVacaciones: tablaVacaciones,
    tarifaISR: tarifaISR,
    conceptosIMSS: conceptosIMSS
  };
}

function leerNumeroNombre_(ss, nombre, etiqueta) {
  const rango = ss.getRangeByName(nombre);
  if (!rango) {
    throw new Error('Falta el parámetro "' + etiqueta + '" (' + nombre + '). Ejecuta "Instalar / reparar hojas".');
  }
  const numero = aNumero_(rango.getValue());
  if (!isFinite(numero) || numero < 0) {
    throw new Error('El parámetro "' + etiqueta + '" debe ser un número mayor o igual a cero. Revisa "Parámetros".');
  }
  return numero;
}

function leerEnteroNombre_(ss, nombre, etiqueta) {
  const numero = leerNumeroNombre_(ss, nombre, etiqueta);
  if (Math.abs(numero - Math.round(numero)) > 0.000001) {
    throw new Error('El parámetro "' + etiqueta + '" debe ser un número entero.');
  }
  return Math.round(numero);
}

function leerTextoNombre_(ss, nombre, etiqueta) {
  const rango = ss.getRangeByName(nombre);
  if (!rango) {
    throw new Error('Falta el parámetro "' + etiqueta + '" (' + nombre + '). Ejecuta "Instalar / reparar hojas".');
  }
  return String(rango.getDisplayValue() || rango.getValue() || '').trim();
}

function leerFechaNombre_(ss, nombre, etiqueta) {
  const rango = ss.getRangeByName(nombre);
  if (!rango) {
    throw new Error('Falta el parámetro "' + etiqueta + '" (' + nombre + '). Ejecuta "Instalar / reparar hojas".');
  }
  const valor = rango.getValue();
  if (valor instanceof Date && !isNaN(valor.getTime())) {
    return Utilities.formatDate(valor, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  const fecha = parseFecha_(valor);
  return fecha ? fecha.iso : String(valor || '').trim();
}

/**
 * Lee la tabla de vacaciones de 1 a 35 años.
 */
function leerTablaVacaciones_(ss) {
  const rango = ss.getRangeByName('Tabla_Vacaciones');
  if (!rango || rango.getNumColumns() < 2) {
    throw new Error('Falta la tabla de vacaciones o no tiene dos columnas. Ejecuta "Instalar / reparar hojas".');
  }

  const valores = rango.getValues();
  const tabla = [];

  for (const fila of valores) {
    if (fila[0] === '' && fila[1] === '') continue;
    const antiguedad = Number(fila[0]);
    const dias = Number(fila[1]);

    if (!isFinite(antiguedad) || !isFinite(dias)) {
      throw new Error('La tabla de vacaciones contiene valores no numéricos. Revisa "Parámetros".');
    }
    if (Math.abs(antiguedad - Math.round(antiguedad)) > 0.000001) {
      throw new Error('Los años de la tabla de vacaciones deben ser enteros.');
    }
    if (Math.abs(dias - Math.round(dias)) > 0.000001 || dias < 0) {
      throw new Error('Los días de vacaciones deben ser enteros mayores o iguales a cero.');
    }

    tabla.push({ antiguedad: Math.round(antiguedad), dias: Math.round(dias) });
  }

  if (tabla.length < 35 || tabla[0].antiguedad !== 1 || tabla[tabla.length - 1].antiguedad !== 35) {
    throw new Error('La tabla de vacaciones debe cubrir de 1 a 35 años, sin huecos. Revisa "Parámetros".');
  }

  for (let i = 0; i < tabla.length; i += 1) {
    if (tabla[i].antiguedad !== i + 1) {
      throw new Error('La tabla de vacaciones debe tener años consecutivos del 1 al 35.');
    }
  }

  return tabla;
}

/**
 * Lee la tarifa mensual del ISR.
 */
function leerTarifaISR_(ss) {
  const rango = ss.getRangeByName('Tabla_ISR');
  if (!rango || rango.getNumColumns() < 4) {
    throw new Error('Falta la tabla de ISR o no tiene cuatro columnas. Ejecuta "Instalar / reparar hojas".');
  }

  const valores = rango.getValues();
  const tarifa = [];

  for (const fila of valores) {
    if (fila.every(function (valor) { return valor === '' || valor === null; })) continue;

    const limiteInferior = Number(fila[0]);
    const cuotaFija = Number(fila[2]);
    let tasa = normalizarPorcentaje_(fila[3]);

    if (!isFinite(limiteInferior) || !isFinite(cuotaFija) || !isFinite(tasa)) {
      throw new Error('La tabla de ISR contiene valores no numéricos. Revisa "Parámetros".');
    }
    if (tasa < 0 || tasa > 1) {
      throw new Error('Las tasas de la tabla de ISR deben estar entre 0% y 100%.');
    }

    tarifa.push({
      limiteInferior: limiteInferior,
      cuotaFija: cuotaFija,
      tasa: tasa
    });
  }

  if (tarifa.length < 2) {
    throw new Error('La tabla de ISR debe tener al menos dos tramos.');
  }

  for (let i = 0; i < tarifa.length; i += 1) {
    if (i > 0 && tarifa[i].limiteInferior <= tarifa[i - 1].limiteInferior) {
      throw new Error('Los tramos de ISR deben estar ordenados de menor a mayor y sin traslapes.');
    }
  }

  return tarifa;
}

/**
 * Lee el desglose de cuotas obreras del IMSS.
 */
function leerConceptosIMSS_(ss) {
  const rango = ss.getRangeByName('Tabla_IMSS');
  if (!rango) return [];

  const valores = rango.getValues();
  const conceptos = [];

  for (let i = 0; i < valores.length; i += 1) {
    const nombre = String(valores[i][0] || '').trim();
    if (!nombre || /^total$/i.test(nombre)) continue;
    const tasa = normalizarPorcentaje_(valores[i][1]);
    if (isFinite(tasa)) {
      conceptos.push({ concepto: nombre, tasa: tasa });
    }
  }

  return conceptos;
}

/**
 * Lee los datos capturados en "Entrada".
 */
function obtenerEntrada_(ss) {
  const hoja = ss.getSheetByName(HOJA_ENTRADA);
  if (!hoja) {
    throw new Error('Falta la hoja "Entrada". Ejecuta "Instalar / reparar hojas".');
  }

  const pendientes = hoja.getRange('B10').getValue();
  const ingresoMensual = hoja.getRange('B13').getValue();

  return {
    nombre: String(hoja.getRange('B4').getDisplayValue() || '').trim(),
    fechaIngreso: fechaISODeCelda_(hoja.getRange('B5').getValue()),
    fechaCorte: fechaISODeCelda_(hoja.getRange('B6').getValue()),
    salarioDiario: aNumero_(hoja.getRange('B7').getValue()),
    salarioDiarioIntegrado: aNumero_(hoja.getRange('B8').getValue()),
    baseSalarial: String(hoja.getRange('B9').getDisplayValue() || '').trim(),
    diasPendientes: esVacio_(pendientes) ? null : aNumero_(pendientes),
    diasGozados: esVacio_(hoja.getRange('B11').getValue()) ? 0 : aNumero_(hoja.getRange('B11').getValue()),
    primaPct: normalizarPorcentaje_(hoja.getRange('B12').getValue()),
    ingresoMensual: esVacio_(ingresoMensual) ? null : aNumero_(ingresoMensual),
    metodoISR: String(hoja.getRange('B14').getDisplayValue() || '').trim(),
    aplicarSubsidio: String(hoja.getRange('B15').getDisplayValue() || '').trim(),
    deducirIMSS: String(hoja.getRange('B16').getDisplayValue() || '').trim(),
    otrasDeducciones: esVacio_(hoja.getRange('B17').getValue()) ? 0 : aNumero_(hoja.getRange('B17').getValue()),
    conceptoOtras: String(hoja.getRange('B18').getDisplayValue() || '').trim()
  };
}

/**
 * Datos iniciales para la interfaz.
 */
function obtenerDatosIniciales() {
  const ss = getSpreadsheet_();
  crearEstructura_(ss);
  const p = obtenerParametros_(ss);
  const e = obtenerEntrada_(ss);

  return {
    ok: true,
    anioFiscal: p.anioFiscal,
    fechaActualizacion: p.fechaActualizacion,
    fechaCorteSugerida: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    umaDiaria: p.umaDiaria,
    umaDiariaFormateada: formatearMoneda_(p.umaDiaria),
    diasExencionUMA: p.diasExencionUMA,
    exencionMaxima: p.exencionMax,
    exencionMaximaFormateada: formatearMoneda_(p.exencionMax),
    primaMinima: p.primaPct,
    primaMinimaFormateada: formatearPorcentaje_(p.primaPct * 100, 2),
    metodo174: METODO_174,
    metodoDirecto: METODO_DIRECTO,
    baseDiario: BASE_DIARIO,
    baseSDI: BASE_SDI,
    tablaVacaciones: p.tablaVacaciones,
    entrada: e,
    entradaFormateada: {
      fechaIngreso: formatearFechaISO_(e.fechaIngreso),
      fechaCorte: formatearFechaISO_(e.fechaCorte),
      salarioDiario: formatearMoneda_(e.salarioDiario),
      salarioDiarioIntegrado: formatearMoneda_(e.salarioDiarioIntegrado),
      primaPct: formatearPorcentaje_(e.primaPct * 100, 2),
      ingresoMensual: formatearMoneda_(e.ingresoMensual),
      otrasDeducciones: formatearMoneda_(e.otrasDeducciones)
    }
  };
}

/* --------------------------------------------------------------------------
 * 3. ENTRADA DEL FRONTEND Y CÁLCULO
 * ------------------------------------------------------------------------ */

/**
 * Calcula desde los datos enviados por la interfaz. No guarda en la hoja.
 */
function calcularPrimaVacacional(datos) {
  const ss = getSpreadsheet_();
  crearEstructura_(ss);
  const p = obtenerParametros_(ss);
  const validacion = validarEntrada_(datos, p);

  if (!validacion.ok) {
    return { ok: false, errores: validacion.errores };
  }

  const resultado = calcular_(validacion.datos, p);
  return { ok: true, resultado: resultado, advertencias: resultado.advertencias };
}

/**
 * Calcula usando los datos actuales de la hoja "Entrada".
 */
function calcularDesdeHoja() {
  const ss = getSpreadsheet_();
  crearEstructura_(ss);
  const p = obtenerParametros_(ss);
  const e = obtenerEntrada_(ss);
  const validacion = validarEntrada_(e, p);

  if (!validacion.ok) {
    return { ok: false, errores: validacion.errores };
  }

  const resultado = calcular_(validacion.datos, p);
  return { ok: true, resultado: resultado, advertencias: resultado.advertencias };
}

/**
 * Guarda los datos en "Entrada" y devuelve el cálculo. La hoja "Resultados" se
 * actualiza por fórmulas.
 */
function guardarYCalcular(datos) {
  const ss = getSpreadsheet_();
  crearEstructura_(ss);
  const p = obtenerParametros_(ss);
  const validacion = validarEntrada_(datos, p);

  if (!validacion.ok) {
    return { ok: false, errores: validacion.errores };
  }

  const lock = LockService.getDocumentLock();
  let bloqueado = false;

  try {
    bloqueado = lock.tryLock(15000);
    if (!bloqueado) {
      return {
        ok: false,
        errores: [{ campo: '', mensaje: 'La hoja está ocupada por otro cálculo. Intenta de nuevo en unos segundos.' }]
      };
    }

    escribirEntrada_(ss, validacion.datos, p);
    SpreadsheetApp.flush();
    const resultado = calcular_(validacion.datos, p);
    return { ok: true, resultado: resultado, advertencias: resultado.advertencias, guardado: true };
  } finally {
    if (bloqueado) lock.releaseLock();
  }
}

/**
 * Escribe la captura validada en "Entrada".
 */
function escribirEntrada_(ss, datos, p) {
  const hoja = ss.getSheetByName(HOJA_ENTRADA);
  if (!hoja) throw new Error('Falta la hoja "Entrada".');

  const ingresoMensual = datos.ingresoMensual == null
    ? redondear2_(datos.salarioDiario * p.diasBaseMensual)
    : datos.ingresoMensual;

  hoja.getRange('B4').setValue(datos.nombre || '');
  hoja.getRange('B5').setValue(fechaLocalDesdeISO_(datos.fechaIngreso));
  hoja.getRange('B6').setValue(fechaLocalDesdeISO_(datos.fechaCorte));
  hoja.getRange('B7').setValue(datos.salarioDiario);
  hoja.getRange('B8').setValue(datos.salarioDiarioIntegrado);
  hoja.getRange('B9').setValue(datos.baseSalarial);
  hoja.getRange('B10').setValue(datos.diasPendientes == null ? '' : datos.diasPendientes);
  hoja.getRange('B11').setValue(datos.diasGozados);
  hoja.getRange('B12').setValue(datos.primaPct);
  hoja.getRange('B13').setValue(ingresoMensual);
  hoja.getRange('B14').setValue(datos.metodoISR);
  hoja.getRange('B15').setValue(datos.aplicarSubsidio ? SI : NO);
  hoja.getRange('B16').setValue(datos.deducirIMSS ? SI : NO);
  hoja.getRange('B17').setValue(datos.otrasDeducciones);
  hoja.getRange('B18').setValue(datos.conceptoOtras || '');

  hoja.getRange('B5:B6').setNumberFormat(FORMATO_FECHA);
  hoja.getRange('B7:B8').setNumberFormat(FORMATO_MONEDA);
  hoja.getRange('B10:B11').setNumberFormat(FORMATO_ENTERO);
  hoja.getRange('B12').setNumberFormat(FORMATO_PORCENTAJE_2);
  hoja.getRange('B13').setNumberFormat(FORMATO_MONEDA);
  hoja.getRange('B17').setNumberFormat(FORMATO_MONEDA);
}

/**
 * Valida y normaliza los datos. Devuelve errores por campo para la interfaz.
 */
function validarEntrada_(datos, p) {
  const errores = [];
  const advertencias = [];
  const e = datos && typeof datos === 'object' ? datos : {};

  const nombre = String(e.nombre || '').trim().slice(0, 120) || 'Trabajador sin nombre';

  const fechaIngreso = parseFecha_(e.fechaIngreso);
  if (!fechaIngreso) {
    errores.push({ campo: 'fechaIngreso', mensaje: 'Selecciona una fecha de ingreso válida (dd/mm/aaaa).' });
  }

  const fechaCorte = parseFecha_(e.fechaCorte);
  if (!fechaCorte) {
    errores.push({ campo: 'fechaCorte', mensaje: 'Selecciona una fecha de corte válida (dd/mm/aaaa).' });
  }

  if (fechaIngreso && fechaCorte && fechaCorte.utc < fechaIngreso.utc) {
    errores.push({ campo: 'fechaCorte', mensaje: 'La fecha de corte no puede ser anterior a la fecha de ingreso.' });
  }

  let antiguedad = null;
  let diasCorresponden = 0;
  if (fechaIngreso && fechaCorte && fechaCorte.utc >= fechaIngreso.utc) {
    antiguedad = calcularAntiguedad_(fechaIngreso, fechaCorte);
    if (antiguedad < 1) {
      errores.push({ campo: 'fechaIngreso', mensaje: 'La antigüedad debe ser de al menos 1 año cumplido.' });
    } else if (antiguedad > p.antiguedadMax) {
      errores.push({
        campo: 'fechaIngreso',
        mensaje: 'La antigüedad es de ' + antiguedad + ' años y excede el máximo de ' + p.antiguedadMax + ' años.'
      });
    } else {
      diasCorresponden = buscarDiasVacaciones_(antiguedad, p.tablaVacaciones);
    }
  }

  const salarioDiario = aNumero_(e.salarioDiario);
  if (!isFinite(salarioDiario) || salarioDiario <= 0) {
    errores.push({ campo: 'salarioDiario', mensaje: 'Captura un salario diario mayor a cero.' });
  }

  const sdi = aNumero_(e.salarioDiarioIntegrado);
  if (!isFinite(sdi) || sdi <= 0) {
    errores.push({ campo: 'salarioDiarioIntegrado', mensaje: 'Captura un salario diario integrado mayor a cero.' });
  }

  if (isFinite(salarioDiario) && isFinite(sdi) && sdi < salarioDiario) {
    advertencias.push('El SDI es menor que el salario diario. Revisa la integración de prestaciones.');
  }

  const baseSalarial = normalizarBase_(e.baseSalarial);
  if (!baseSalarial) {
    errores.push({ campo: 'baseSalarial', mensaje: 'Elige "Salario diario" o "Salario diario integrado".' });
  }

  let diasGozados = e.diasGozados;
  if (esVacio_(diasGozados)) diasGozados = 0;
  diasGozados = aNumero_(diasGozados);
  if (!isFinite(diasGozados) || diasGozados < 0 || Math.abs(diasGozados - Math.round(diasGozados)) > 0.000001) {
    errores.push({ campo: 'diasGozados', mensaje: 'Los días gozados deben ser un entero mayor o igual a cero.' });
  } else {
    diasGozados = Math.round(diasGozados);
  }

  let diasPendientes = e.diasPendientes;
  if (esVacio_(diasPendientes)) {
    diasPendientes = null;
  } else {
    diasPendientes = aNumero_(diasPendientes);
    if (!isFinite(diasPendientes) || diasPendientes < 0 || Math.abs(diasPendientes - Math.round(diasPendientes)) > 0.000001) {
      errores.push({ campo: 'diasPendientes', mensaje: 'Los días pendientes deben ser un entero mayor o igual a cero.' });
    } else {
      diasPendientes = Math.round(diasPendientes);
    }
  }

  let diasDisponibles = Math.max(0, diasCorresponden - (isFinite(diasGozados) ? diasGozados : 0));
  if (isFinite(diasGozados) && diasGozados > diasCorresponden && diasCorresponden > 0) {
    errores.push({
      campo: 'diasGozados',
      mensaje: 'Los días gozados (' + diasGozados + ') exceden los días que corresponden (' + diasCorresponden + ').'
    });
  }
  if (diasPendientes !== null && diasPendientes > diasDisponibles && diasCorresponden > 0) {
    errores.push({
      campo: 'diasPendientes',
      mensaje: 'Los días pendientes (' + diasPendientes + ') exceden los días disponibles (' + diasDisponibles + ').'
    });
  }

  let primaPct = normalizarPorcentaje_(e.primaPct);
  if (!isFinite(primaPct)) primaPct = p.primaPct;
  if (primaPct < p.primaPct) {
    errores.push({
      campo: 'primaPct',
      mensaje: 'La prima no puede ser menor al mínimo de ' + formatearPorcentaje_(p.primaPct * 100, 2) + '.'
    });
  }
  if (primaPct > 5) {
    errores.push({ campo: 'primaPct', mensaje: 'La prima no puede exceder 500%. Revisa el porcentaje.' });
  }

  let ingresoMensual = e.ingresoMensual;
  if (esVacio_(ingresoMensual)) {
    ingresoMensual = isFinite(salarioDiario) ? redondear2_(salarioDiario * p.diasBaseMensual) : null;
  } else {
    ingresoMensual = aNumero_(ingresoMensual);
    if (!isFinite(ingresoMensual) || ingresoMensual < 0) {
      errores.push({ campo: 'ingresoMensual', mensaje: 'El ingreso mensual ordinario debe ser mayor o igual a cero.' });
    }
  }

  let metodoISR;
  if (esVacio_(e.metodoISR)) {
    metodoISR = p.metodoISR;
  } else {
    metodoISR = normalizarMetodo_(e.metodoISR);
    if (!metodoISR) {
      errores.push({ campo: 'metodoISR', mensaje: 'Selecciona un método de retención de ISR válido.' });
      metodoISR = p.metodoISR;
    }
  }

  let aplicarSubsidio;
  if (esVacio_(e.aplicarSubsidio)) {
    aplicarSubsidio = p.aplicarSubsidio;
  } else {
    aplicarSubsidio = normalizarSiNo_(e.aplicarSubsidio);
    if (aplicarSubsidio === null) {
      advertencias.push('El valor de "Aplicar subsidio" no es válido; se usó el parámetro predeterminado.');
      aplicarSubsidio = p.aplicarSubsidio;
    }
  }

  let deducirIMSS;
  if (esVacio_(e.deducirIMSS)) {
    deducirIMSS = p.deducirIMSS;
  } else {
    deducirIMSS = normalizarSiNo_(e.deducirIMSS);
    if (deducirIMSS === null) {
      advertencias.push('El valor de "Deducir IMSS" no es válido; se usó el parámetro predeterminado.');
      deducirIMSS = p.deducirIMSS;
    }
  }

  let otrasDeducciones = e.otrasDeducciones;
  if (esVacio_(otrasDeducciones)) otrasDeducciones = 0;
  otrasDeducciones = aNumero_(otrasDeducciones);
  if (!isFinite(otrasDeducciones) || otrasDeducciones < 0) {
    errores.push({ campo: 'otrasDeducciones', mensaje: 'Las otras deducciones deben ser un número mayor o igual a cero.' });
  }

  if (metodoISR === METODO_174 && aplicarSubsidio) {
    advertencias.push('El subsidio al empleo no se aplica con el procedimiento del art. 174; se ignora en el cálculo.');
  }
  if (metodoISR === METODO_174 && (!isFinite(ingresoMensual) || ingresoMensual <= 0)) {
    advertencias.push('Sin ingreso mensual ordinario, el ISR del art. 174 será cero. Captura el salario mensual para una mejor estimación.');
  }
  if (deducirIMSS) {
    advertencias.push('La prima vacacional integra el SBC y la cuota obrera no se retiene normalmente de la prima. La deducción de IMSS es una estimación opcional.');
  }
  if (primaPct > p.primaPct) {
    advertencias.push('La prima capturada (' + formatearPorcentaje_(primaPct * 100, 2) + ') es superior al mínimo legal; confirma que sea la política aplicable.');
  }
  if (diasPendientes !== null && isFinite(diasGozados) && diasGozados > 0) {
    advertencias.push('Se capturaron días pendientes y gozados: la prima se calcula solo por los pendientes; los gozados quedan como referencia.');
  } else if (diasPendientes === null && isFinite(diasGozados) && diasGozados > 0) {
    advertencias.push('Sin días pendientes capturados: la prima se calcula sobre los ' + diasGozados + ' días gozados.');
  } else if (diasPendientes === null && diasCorresponden > 0) {
    advertencias.push('No se capturaron días pendientes ni gozados: la prima se calcula sobre el periodo completo (' + diasCorresponden + ' días).');
  }

  const datosNormalizados = {
    nombre: nombre,
    fechaIngreso: fechaIngreso ? fechaIngreso.iso : '',
    fechaCorte: fechaCorte ? fechaCorte.iso : '',
    antiguedad: antiguedad,
    diasCorresponden: diasCorresponden,
    diasGozados: isFinite(diasGozados) ? diasGozados : 0,
    diasPendientes: diasPendientes,
    diasDisponibles: diasDisponibles,
    salarioDiario: salarioDiario,
    salarioDiarioIntegrado: sdi,
    baseSalarial: baseSalarial,
    primaPct: primaPct,
    ingresoMensual: ingresoMensual,
    metodoISR: metodoISR,
    aplicarSubsidio: aplicarSubsidio,
    deducirIMSS: deducirIMSS,
    otrasDeducciones: otrasDeducciones,
    conceptoOtras: String(e.conceptoOtras || '').trim().slice(0, 160),
    advertencias: advertencias
  };

  return {
    ok: errores.length === 0,
    errores: errores,
    datos: datosNormalizados
  };
}

/* --------------------------------------------------------------------------
 * 4. CÁLCULO
 * ------------------------------------------------------------------------ */

/**
 * Cálculo central. Los importes se redondean a dos decimales.
 */
function calcular_(d, p) {
  const advertencias = (d.advertencias || []).slice();

  // Si se capturan días pendientes, la prima se paga solo por esos días.
  // Si no, se usan los días gozados (prima ya causada) o, si no hay,
  // el periodo completo que corresponde por tabla.
  const diasPagar = d.diasPendientes !== null
    ? Math.min(d.diasPendientes, d.diasDisponibles)
    : (d.diasGozados > 0
      ? Math.min(d.diasGozados, d.diasCorresponden)
      : d.diasCorresponden);

  const salarioBase = d.baseSalarial === BASE_SDI
    ? d.salarioDiarioIntegrado
    : d.salarioDiario;

  const primaBruta = redondear2_(diasPagar * salarioBase * d.primaPct);
  const exencion = redondear2_(Math.min(primaBruta, p.exencionMax));
  const gravable = redondear2_(Math.max(0, primaBruta - exencion));

  const isr = calcularISR_(gravable, d.ingresoMensual, d.metodoISR, d.aplicarSubsidio, p);

  const imss = d.deducirIMSS
    ? redondear2_(primaBruta * p.cuotaIMSS)
    : 0;

  const totalDeducciones = redondear2_(isr.total + imss + d.otrasDeducciones);
  const neto = redondear2_(primaBruta - totalDeducciones);

  if (diasPagar === 0) {
    advertencias.push('No hay días pagaderos: la prima bruta es cero. Revisa los días pendientes o gozados.');
  }
  if (primaBruta > 0 && exencion === primaBruta) {
    advertencias.push('La prima quedó totalmente exenta de ISR: no se retuvo impuesto sobre la prima.');
  }
  if (isr.total > 0 && isr.metodo === METODO_DIRECTO && isr.subsidio > 0) {
    advertencias.push('Se consideró el subsidio al empleo mensual de ' + formatearMoneda_(isr.subsidio) + '; el ISR mostrado es el incremental atribuible a la prima.');
  }
  if (neto < 0) {
    advertencias.push('Las deducciones superan la prima bruta; el neto es negativo. Revisa las otras deducciones y la retención.');
  }

  const resultado = {
    entradas: {
      nombre: d.nombre,
      fechaIngreso: d.fechaIngreso,
      fechaCorte: d.fechaCorte,
      salarioDiario: d.salarioDiario,
      salarioDiarioIntegrado: d.salarioDiarioIntegrado,
      baseSalarial: d.baseSalarial,
      diasPendientes: d.diasPendientes,
      diasGozados: d.diasGozados,
      primaPct: d.primaPct,
      ingresoMensual: d.ingresoMensual,
      metodoISR: d.metodoISR,
      aplicarSubsidio: d.aplicarSubsidio,
      deducirIMSS: d.deducirIMSS,
      otrasDeducciones: d.otrasDeducciones,
      conceptoOtras: d.conceptoOtras
    },
    dias: {
      antiguedad: d.antiguedad,
      corresponden: d.diasCorresponden,
      gozados: d.diasGozados,
      disponibles: d.diasDisponibles,
      pendientesCapturados: d.diasPendientes,
      pagados: diasPagar
    },
    importes: {
      baseSalarial: redondear2_(salarioBase),
      primaBruta: primaBruta,
      exencion: exencion,
      gravable: gravable,
      isr: isr.total,
      imss: imss,
      otrasDeducciones: redondear2_(d.otrasDeducciones),
      totalDeducciones: totalDeducciones,
      neto: neto
    },
    isr: {
      metodo: isr.metodo,
      ingresoOrdinario: redondear2_(d.ingresoMensual || 0),
      factor: isr.factor,
      baseConjunta: isr.baseConjunta,
      limiteInferior: isr.limiteInferior,
      excedente: isr.excedente,
      cuotaFija: isr.cuotaFija,
      tasa: isr.tasa,
      isrConjunto: isr.isrConjunto,
      isrOrdinario: isr.isrOrdinario,
      diferencia: isr.diferencia,
      tasaEfectiva: isr.tasaEfectiva,
      isr174: isr.isr174,
      isrDirecto: isr.isrDirecto,
      subsidio: isr.subsidio,
      total: isr.total,
      tramo: isr.tramo
    },
    imss: {
      aplicado: d.deducirIMSS,
      tasa: p.cuotaIMSS,
      monto: imss
    },
    parametros: {
      primaPct: p.primaPct,
      umaDiaria: p.umaDiaria,
      diasExencionUMA: p.diasExencionUMA,
      exencionMax: p.exencionMax,
      antiguedadMax: p.antiguedadMax,
      cuotaIMSS: p.cuotaIMSS,
      subsidioMensual: p.subsidioMensual,
      subsidioTope: p.subsidioTope,
      anioFiscal: p.anioFiscal,
      fechaActualizacion: p.fechaActualizacion,
      diasBaseMensual: p.diasBaseMensual
    },
    formulaDias: d.diasCorresponden + ' días por ' + d.antiguedad + ' años cumplidos',
    advertencias: advertencias
  };

  resultado.formateado = formatearResultado_(resultado);
  return resultado;
}

/**
 * Calcula ISR por art. 174 RLISR y por tarifa mensual directa.
 */
function calcularISR_(gravable, ingresoOrdinario, metodo, aplicarSubsidio, p) {
  const ordinario = isFinite(ingresoOrdinario) ? Math.max(0, ingresoOrdinario) : 0;

  const factorExacto = gravable > 0 ? gravable / 365 * 30.4 : 0;
  const baseConjunta = ordinario + factorExacto;

  const isrConjunto = calcularTarifa_(baseConjunta, p.tarifaISR);
  const isrOrdinario = calcularTarifa_(ordinario, p.tarifaISR);
  const diferencia = Math.max(0, redondear2_(isrConjunto - isrOrdinario));
  const tasaEfectiva = factorExacto > 0 ? diferencia / factorExacto : 0;
  const isr174 = redondear2_(gravable * tasaEfectiva);

  // Método general sin art. 174: se suma la prima gravable al ingreso
  // ordinario, se aplica la tarifa al total y se resta el ISR ordinario.
  // El subsidio se aplica al ISR del mes, no de forma aislada a la prima.
  const baseDirecta = ordinario + gravable;
  const isrDirectoTotal = calcularTarifa_(baseDirecta, p.tarifaISR);
  const subsidioTotal = (
    aplicarSubsidio &&
    baseDirecta <= p.subsidioTope &&
    isrDirectoTotal > 0
  )
    ? Math.min(p.subsidioMensual, isrDirectoTotal)
    : 0;
  const subsidioOrdinario = (
    aplicarSubsidio &&
    ordinario <= p.subsidioTope &&
    isrOrdinario > 0
  )
    ? Math.min(p.subsidioMensual, isrOrdinario)
    : 0;

  const isrDirecto = Math.max(
    0,
    redondear2_(
      Math.max(0, isrDirectoTotal - subsidioTotal) -
      Math.max(0, isrOrdinario - subsidioOrdinario)
    )
  );

  const total = metodo === METODO_174
    ? isr174
    : isrDirecto;

  return {
    metodo: metodo,
    factor: redondear2_(factorExacto),
    baseConjunta: redondear2_(baseConjunta),
    limiteInferior: redondear2_(obtenerTramo_(baseConjunta, p.tarifaISR).limiteInferior),
    excedente: redondear2_(Math.max(0, baseConjunta - obtenerTramo_(baseConjunta, p.tarifaISR).limiteInferior)),
    cuotaFija: redondear2_(obtenerTramo_(baseConjunta, p.tarifaISR).cuotaFija),
    tasa: obtenerTramo_(baseConjunta, p.tarifaISR).tasa,
    isrConjunto: isrConjunto,
    isrOrdinario: isrOrdinario,
    diferencia: diferencia,
    tasaEfectiva: tasaEfectiva,
    isr174: isr174,
    isrDirecto: isrDirecto,
    subsidio: redondear2_(metodo === METODO_DIRECTO ? subsidioTotal : 0),
    total: total,
    tramo: obtenerTramo_(baseConjunta, p.tarifaISR)
  };
}

/**
 * Aplica la tarifa mensual a una base.
 */
function calcularTarifa_(base, tarifa) {
  if (!isFinite(base) || base <= 0) return 0;
  const tramo = obtenerTramo_(base, tarifa);
  if (!tramo) {
    throw new Error('No se pudo ubicar la base en la tarifa de ISR. Revisa "Parámetros".');
  }
  return redondear2_(Math.max(0, tramo.cuotaFija + (base - tramo.limiteInferior) * tramo.tasa));
}

/**
 * Devuelve el tramo cuya límite inferior es el mayor que no excede la base.
 */
function obtenerTramo_(base, tarifa) {
  if (!tarifa || tarifa.length === 0) {
    throw new Error('La tarifa de ISR está vacía. Revisa "Parámetros".');
  }
  if (!isFinite(base) || base <= 0) return tarifa[0];

  let tramo = tarifa[0];
  for (const actual of tarifa) {
    if (base >= actual.limiteInferior) {
      tramo = actual;
    } else {
      break;
    }
  }
  return tramo;
}

/**
 * Busca los días de vacaciones para una antigüedad.
 */
function buscarDiasVacaciones_(antiguedad, tabla) {
  let dias = 0;
  for (const fila of tabla) {
    if (antiguedad >= fila.antiguedad) {
      dias = fila.dias;
    } else {
      break;
    }
  }
  return dias;
}

/**
 * Años cumplidos entre dos fechas.
 */
function calcularAntiguedad_(ingreso, corte) {
  let anios = corte.anio - ingreso.anio;
  if (corte.mes < ingreso.mes || (corte.mes === ingreso.mes && corte.dia < ingreso.dia)) {
    anios -= 1;
  }
  return anios;
}

/* --------------------------------------------------------------------------
 * 5. FECHAS, NÚMEROS Y FORMATO
 * ------------------------------------------------------------------------ */

function parseFecha_(valor) {
  if (valor instanceof Date && !isNaN(valor.getTime())) {
    return {
      anio: valor.getFullYear(),
      mes: valor.getMonth() + 1,
      dia: valor.getDate(),
      iso: Utilities.formatDate(valor, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
      utc: Date.UTC(valor.getFullYear(), valor.getMonth(), valor.getDate())
    };
  }

  if (typeof valor === 'number' && isFinite(valor)) {
    const fecha = new Date(valor);
    if (!isNaN(fecha.getTime())) {
      return {
        anio: fecha.getFullYear(),
        mes: fecha.getMonth() + 1,
        dia: fecha.getDate(),
        iso: Utilities.formatDate(fecha, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
        utc: Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
      };
    }
  }

  if (typeof valor !== 'string') return null;
  const texto = valor.trim();

  let anio;
  let mes;
  let dia;

  let match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (match) {
    anio = Number(match[1]);
    mes = Number(match[2]);
    dia = Number(match[3]);
  } else {
    match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(texto);
    if (!match) return null;
    dia = Number(match[1]);
    mes = Number(match[2]);
    anio = Number(match[3]);
  }

  if (anio < 1900 || anio > 2100 || mes < 1 || mes > 12 || dia < 1 || dia > 31) {
    return null;
  }

  const utc = Date.UTC(anio, mes - 1, dia);
  const fecha = new Date(utc);
  if (fecha.getUTCFullYear() !== anio || fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia) {
    return null;
  }

  return {
    anio: anio,
    mes: mes,
    dia: dia,
    iso: String(anio) + '-' + String(mes).padStart(2, '0') + '-' + String(dia).padStart(2, '0'),
    utc: utc
  };
}

function fechaISODeCelda_(valor) {
  const fecha = parseFecha_(valor);
  return fecha ? fecha.iso : '';
}

function fechaLocalDesdeISO_(iso) {
  const fecha = parseFecha_(iso);
  if (!fecha) return '';
  return new Date(fecha.anio, fecha.mes - 1, fecha.dia, 12, 0, 0);
}

function formatearFechaISO_(iso) {
  const fecha = parseFecha_(iso);
  if (!fecha) return '';
  return String(fecha.dia).padStart(2, '0') + '/' + String(fecha.mes).padStart(2, '0') + '/' + fecha.anio;
}

function esVacio_(valor) {
  return valor === '' || valor === null || valor === undefined;
}

function aNumero_(valor) {
  if (typeof valor === 'number') return valor;
  if (valor === null || valor === undefined) return NaN;
  const texto = String(valor).trim().replace(/\s/g, '').replace(/,/g, '');
  if (texto === '') return NaN;
  return Number(texto);
}

function normalizarPorcentaje_(valor) {
  let numero = aNumero_(valor);
  if (!isFinite(numero)) return NaN;
  if (numero > 1 && numero <= 100) numero = numero / 100;
  return numero;
}

function normalizarBase_(valor) {
  const texto = quitarAcentos_(String(valor || '').trim().toLowerCase());
  if (!texto) return null;
  if (texto.indexOf('integrado') !== -1 || texto === 'sdi') return BASE_SDI;
  if (texto.indexOf('diario') !== -1 || texto === 'base') return BASE_DIARIO;
  return null;
}

function normalizarMetodo_(valor) {
  const texto = quitarAcentos_(String(valor || '').trim().toLowerCase());
  if (!texto) return null;
  if (texto.indexOf('174') !== -1) return METODO_174;
  if (texto.indexOf('direct') !== -1 || texto.indexOf('tarifa') !== -1) return METODO_DIRECTO;
  return null;
}

function normalizarSiNo_(valor) {
  if (typeof valor === 'boolean') return valor;
  const texto = quitarAcentos_(String(valor || '').trim().toLowerCase());
  if (texto === '') return null;
  if (texto === 'si' || texto === 'sí' || texto === 'true' || texto === '1') return true;
  if (texto === 'no' || texto === 'false' || texto === '0') return false;
  return null;
}

function quitarAcentos_(texto) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function formatearResultado_(r) {
  const tramo = r.isr.tramo || { limiteInferior: 0, cuotaFija: 0, tasa: 0 };

  return {
    nombre: r.entradas.nombre,
    fechaIngreso: formatearFechaISO_(r.entradas.fechaIngreso),
    fechaCorte: formatearFechaISO_(r.entradas.fechaCorte),
    antiguedad: formatearNumero_(r.dias.antiguedad, 0),
    diasCorresponden: formatearNumero_(r.dias.corresponden, 0),
    diasGozados: formatearNumero_(r.dias.gozados, 0),
    diasDisponibles: formatearNumero_(r.dias.disponibles, 0),
    diasPendientes: r.dias.pendientesCapturados === null
      ? (r.dias.gozados > 0 ? 'No capturados' : 'Periodo completo')
      : formatearNumero_(r.dias.pendientesCapturados, 0),
    diasPagados: formatearNumero_(r.dias.pagados, 0),
    formulaDias: r.formulaDias,
    baseSalarial: r.entradas.baseSalarial,
    salarioBase: formatearMoneda_(r.importes.baseSalarial),
    salarioDiario: formatearMoneda_(r.entradas.salarioDiario),
    salarioDiarioIntegrado: formatearMoneda_(r.entradas.salarioDiarioIntegrado),
    primaPct: formatearPorcentaje_(r.entradas.primaPct * 100, 2),
    primaBruta: formatearMoneda_(r.importes.primaBruta),
    exencion: formatearMoneda_(r.importes.exencion),
    gravable: formatearMoneda_(r.importes.gravable),
    isr: formatearMoneda_(r.importes.isr),
    imss: formatearMoneda_(r.importes.imss),
    otrasDeducciones: formatearMoneda_(r.importes.otrasDeducciones),
    totalDeducciones: formatearMoneda_(r.importes.totalDeducciones),
    neto: formatearMoneda_(r.importes.neto),
    metodoISR: r.isr.metodo,
    ingresoOrdinario: formatearMoneda_(r.isr.ingresoOrdinario),
    factor: formatearMoneda_(r.isr.factor),
    baseConjunta: formatearMoneda_(r.isr.baseConjunta),
    limiteInferior: formatearMoneda_(r.isr.limiteInferior),
    excedente: formatearMoneda_(r.isr.excedente),
    cuotaFija: formatearMoneda_(r.isr.cuotaFija),
    tasa: formatearPorcentaje_(r.isr.tasa * 100, 2),
    isrConjunto: formatearMoneda_(r.isr.isrConjunto),
    isrOrdinario: formatearMoneda_(r.isr.isrOrdinario),
    diferenciaISR: formatearMoneda_(r.isr.diferencia),
    tasaEfectiva: formatearPorcentaje_(r.isr.tasaEfectiva * 100, 2),
    isr174: formatearMoneda_(r.isr.isr174),
    isrDirecto: formatearMoneda_(r.isr.isrDirecto),
    subsidio: formatearMoneda_(r.isr.subsidio),
    tramoISR: 'Límite inferior ' + formatearMoneda_(tramo.limiteInferior) +
      '; cuota fija ' + formatearMoneda_(tramo.cuotaFija) +
      '; ' + formatearPorcentaje_(tramo.tasa * 100, 2) + ' sobre el excedente.',
    imssTasa: formatearPorcentaje_(r.imss.tasa * 100, 3),
    umaDiaria: formatearMoneda_(r.parametros.umaDiaria),
    diasExencionUMA: formatearNumero_(r.parametros.diasExencionUMA, 0),
    exencionMaxima: formatearMoneda_(r.parametros.exencionMax),
    actualizacion: r.parametros.fechaActualizacion,
    anioFiscal: r.parametros.anioFiscal,
    advertencias: r.advertencias
  };
}

function formatearMoneda_(valor) {
  if (valor === null || valor === undefined || valor === '') return '';
  const numero = Number(valor);
  if (!isFinite(numero)) return '';
  const negativo = numero < 0;
  return (negativo ? '-$' : '$') + formatearNumero_(Math.abs(numero), 2);
}

function formatearNumero_(valor, decimales) {
  const numero = Number(valor);
  if (!isFinite(numero)) return '';
  const lugares = typeof decimales === 'number' ? decimales : 2;
  const partes = numero.toFixed(lugares).split('.');
  const enteros = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return partes.length > 1 ? enteros + '.' + partes[1] : enteros;
}

function formatearPorcentaje_(valor, decimales) {
  return formatearNumero_(valor, decimales) + '%';
}

function redondear2_(valor) {
  const numero = Number(valor);
  if (!isFinite(numero)) return 0;
  return Math.round((numero + Number.EPSILON) * 100) / 100;
}

/* --------------------------------------------------------------------------
 * 6. PRUEBAS Y DIAGNÓSTICO
 * ------------------------------------------------------------------------ */

/**
 * Prueba de humo con el ejemplo de la hoja. Ejecutar desde el editor.
 */
function probarCalculo() {
  const ss = getSpreadsheet_();
  crearEstructura_(ss);
  const p = obtenerParametros_(ss);
  const datos = {
    nombre: 'Prueba',
    fechaIngreso: '2019-03-15',
    fechaCorte: '2026-11-20',
    salarioDiario: 750,
    salarioDiarioIntegrado: 875,
    baseSalarial: BASE_SDI,
    diasPendientes: null,
    diasGozados: 0,
    primaPct: 25,
    ingresoMensual: 22800,
    metodoISR: METODO_174,
    aplicarSubsidio: false,
    deducirIMSS: false,
    otrasDeducciones: 0
  };

  const validacion = validarEntrada_(datos, p);
  if (!validacion.ok) {
    Logger.log(JSON.stringify(validacion.errores, null, 2));
    return;
  }

  const r = calcular_(validacion.datos, p);
  Logger.log(JSON.stringify({
    dias: r.dias,
    importes: r.importes,
    isr: r.isr,
    formateado: r.formateado
  }, null, 2));
}

/**
 * Diagnóstico de parámetros y entrada actuales.
 */
function diagnosticar() {
  const ss = getSpreadsheet_();
  crearEstructura_(ss);
  const p = obtenerParametros_(ss);
  const e = obtenerEntrada_(ss);
  Logger.log(JSON.stringify({ parametros: p, entrada: e }, null, 2));
}
