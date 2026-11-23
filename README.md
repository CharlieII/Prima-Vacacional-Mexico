# Prima vacacional México 2026 — Google Sheets + Apps Script

[![Licencia: GPL v3](https://img.shields.io/badge/licencia-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0.html)
[![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-V8-4285F4.svg)](https://developers.google.com/apps-script)
[![Estado: herramienta informativa](https://img.shields.io/badge/estado-herramienta%20informativa-yellow.svg)](#limitaciones-y-descargo)

> **Aviso importante**
>
> Este proyecto es una herramienta **informativa** de apoyo para estimar la prima vacacional en México. **No sustituye** la asesoría de un contador público, un abogado laboral ni la determinación oficial de nómina. Los cálculos dependen de los datos capturados y de los parámetros vigentes; antes de pagar, timbrar o declarar, verifica el caso con un profesional.

---

## Índice de contenido

1. [Descripción general](#descripcion-general)
2. [Características](#caracteristicas)
3. [Arquitectura y tecnologías](#arquitectura-y-tecnologias)
4. [Requisitos](#requisitos)
5. [Instalación](#instalacion)
6. [Uso](#uso)
7. [Estructura de hojas](#estructura-de-hojas)
8. [Fórmulas y método de cálculo](#formulas-y-metodo-de-calculo)
9. [Ejemplo verificable](#ejemplo-verificable)
10. [Marco legal y tratamiento fiscal](#marco-legal-y-tratamiento-fiscal)
11. [Actualización anual](#actualizacion-anual)
12. [Limitaciones y descargo](#limitaciones-y-descargo)
13. [Solución de problemas](#solucion-de-problemas)
14. [Fuentes](#fuentes)
15. [Licencia](#licencia)

---

<a id="descripcion-general"></a>
## 1. Descripción general

**Prima vacacional México 2026** es una aplicación de Google Sheets construida con **Google Apps Script** y una interfaz **HTML5 + JavaScript Vanilla**. Calcula la prima vacacional a partir de:

- la fecha de ingreso y la fecha de corte,
- los años laborados,
- el salario diario y el salario diario integrado (SDI),
- la base salarial elegida,
- los días de vacaciones pendientes o ya gozados,
- el porcentaje de prima,
- el método de retención de ISR,
- y las deducciones capturadas por el usuario.

El proyecto entrega **dos archivos**: `Code.gs` y `Index.html`. No requiere bibliotecas externas ni un servidor propio. Al ejecutar `instalar` desde Apps Script, el propio código crea las hojas `Entrada`, `Parámetros` y `Resultados`, escribe las fórmulas, registra los rangos con nombre y configura las validaciones.

La hoja `Resultados` calcula con fórmulas nativas de Google Sheets. La interfaz usa `google.script.run` para leer los parámetros, validar la captura, calcular y, si el usuario lo solicita, guardar los datos en `Entrada`.

---

<a id="caracteristicas"></a>
## 2. Características

- **Tabla de vacaciones de 1 a 35 años**, con 12, 14, 16, 18, 20, 22, 24, 26, 28, 30 y 32 días según la antigüedad.
- **Prima mínima del 25%**, editable y validada.
- **Selector de base salarial** entre `Salario diario` y `Salario diario integrado`.
- **Días pendientes por pagar** y **días ya gozados**, con reglas explícitas de cálculo.
- **ISR 2026** con dos métodos:
  - `Art. 174 RLISR (recomendado)`, procedimiento opcional para pagos extraordinarios.
  - `Tarifa mensual directa`, que suma la prima gravable al ingreso ordinario y resta el ISR ordinario.
- **Exención de ISR de 15 UMA** por año de calendario, con el tope calculado en `Parámetros`.
- **Subsidio al empleo opcional** para el método de tarifa directa, con monto y tope editables.
- **Estimación opcional de cuota obrera del IMSS** sobre la prima; por defecto está desactivada.
- **Otras deducciones** y su concepto.
- **Validaciones** de fechas, antigüedad, salarios, días, prima, método y deducciones.
- **Interfaz web** y **barra lateral** en Google Sheets.
- **Guardado en la hoja** `Entrada` con bloqueo para evitar escrituras simultáneas.
- **Resultados con fórmulas nativas** en la hoja, no solo en el backend.

---

<a id="arquitectura-y-tecnologias"></a>
## 3. Arquitectura y tecnologías

### 3.1 Componentes

| Componente | Tecnología | Responsabilidad |
|---|---|---|
| `Code.gs` | Google Apps Script (V8) | Servidor: instalación de hojas, lectura de parámetros, validación, cálculo, guardado y `doGet` de la aplicación web. |
| `Index.html` | HTML5, CSS y JavaScript Vanilla | Cliente: formulario, validación local, llamadas a `google.script.run` y presentación del desglose. |
| Google Sheets | Fórmulas nativas y rangos con nombre | Cálculo visible y editable en `Entrada`, `Parámetros` y `Resultados`. |

No se usan frameworks de frontend, Node.js, npm ni servicios externos.

### 3.2 Flujo de la aplicación

1. El usuario abre la hoja y el menú **Prima Vacacional 2026**, o abre la aplicación web publicada.
2. `Index.html` carga y llama a `obtenerDatosIniciales()` mediante `google.script.run`.
3. `Code.gs` lee la hoja `Parámetros` y los datos actuales de `Entrada`.
4. El usuario captura o modifica los datos y presiona **Calcular prima**.
5. `Index.html` envía el objeto a `calcularPrimaVacacional(payload)`.
6. `Code.gs` valida, calcula y devuelve un resultado estructurado.
7. Si el usuario presiona **Guardar en hoja**, `Index.html` llama a `guardarYCalcular(payload)`; el backend escribe en `Entrada` y la hoja `Resultados` se actualiza con sus fórmulas.

### 3.3 Funciones principales de `Code.gs`

| Función | Uso |
|---|---|
| `onOpen()` | Crea el menú de la hoja. |
| `doGet()` | Publica `Index.html` como aplicación web. |
| `instalar()` | Crea o repara las hojas, fórmulas, nombres y validaciones. |
| `mostrarCalculadora()` | Abre `Index.html` en la barra lateral. |
| `abrirNotas()` | Activa `Parámetros` y lleva al bloque de fuentes. |
| `recalcularHoja()` | Ejecuta `calcularDesdeHoja()` y muestra un resumen. |
| `obtenerDatosIniciales()` | Devuelve parámetros y datos actuales a la interfaz. |
| `calcularPrimaVacacional(datos)` | Calcula desde el formulario sin guardar. |
| `guardarYCalcular(datos)` | Valida, guarda en `Entrada` y devuelve el cálculo. |
| `calcularDesdeHoja()` | Calcula leyendo directamente `Entrada` y `Parámetros`. |
| `obtenerParametros_(ss)` | Lee y valida los parámetros y las tablas. |
| `obtenerEntrada_(ss)` | Lee los campos capturados en `Entrada`. |
| `validarEntrada_(datos, p)` | Valida y normaliza la captura. |
| `calcular_(d, p)` | Cálculo central de días, importes, ISR, IMSS y neto. |

El backend usa `SpreadsheetApp`, `HtmlService`, `PropertiesService` y `LockService`. El ID del libro se guarda en las propiedades del script para que la aplicación web pueda localizar la hoja contenedora cuando no haya una hoja activa.

---

<a id="requisitos"></a>
## 4. Requisitos

- Una cuenta de Google con acceso a **Google Sheets**.
- Permiso para crear y editar una hoja de cálculo.
- Permiso para abrir **Extensiones > Apps Script** y autorizar el script.
- Un navegador web actualizado.
- Runtime **V8** de Apps Script (el valor predeterminado en proyectos nuevos).
- No se requiere instalar nada en el equipo ni ejecutar un servidor local.

Para publicar la aplicación web se necesita, además, permiso para implementar aplicaciones en el proyecto de Apps Script.

---

<a id="instalacion"></a>
## 5. Instalación

### 5.1 Crear la hoja de cálculo

1. Abre <https://sheets.new>.
2. Crea una hoja de cálculo en blanco.
3. Ponle un nombre, por ejemplo **Prima vacacional 2026**.

No crees las hojas `Entrada`, `Parámetros` ni `Resultados` manualmente: `instalar` las construye.

### 5.2 Abrir el editor de Apps Script

1. En la hoja, ve a **Extensiones > Apps Script**.
2. Se abrirá el editor del proyecto vinculado a la hoja.
3. Si el editor muestra un archivo `Código.gs` vacío, selecciónalo.

### 5.3 Pegar `Code.gs`

1. Borra el contenido de `Código.gs`.
2. Pega todo el contenido de `Code.gs`.
3. Guarda el proyecto.

### 5.4 Agregar `Index.html`

1. En la barra lateral de archivos del editor, haz clic en **+ > HTML**.
2. Escribe el nombre exactamente como **`Index`**. Apps Script agregará la extensión `.html`.
3. Pega todo el contenido de `Index.html`.
4. Guarda el proyecto.

El nombre `Index` es obligatorio porque `doGet()` y `mostrarCalculadora()` llaman a `HtmlService` con ese nombre.

### 5.5 Ejecutar `instalar`

1. En el selector de funciones del editor, elige **`instalar`**.
2. Haz clic en **Ejecutar**.
3. Autoriza los permisos que solicite Google. Acepta los permisos necesarios para que el script acceda a la hoja y pueda ejecutarse.
4. Espera a que termine la ejecución.

`instalar` hace lo siguiente:

- Crea `Entrada`, `Parámetros` y `Resultados` si no existen.
- Escribe las fórmulas de `Entrada` y `Resultados`.
- Registra los rangos con nombre.
- Configura las listas y validaciones.
- Carga datos de ejemplo para probar la herramienta.

Si ejecutas `instalar` sobre una hoja que ya tiene las tres hojas, repara fórmulas, nombres y validaciones, y conserva los datos capturados en `Entrada` y los parámetros.

### 5.6 Volver a la hoja

1. Cierra o minimiza el editor de Apps Script.
2. Recarga la hoja de cálculo.
3. Aparecerá el menú **Prima Vacacional 2026**.
4. Usa **Prima Vacacional 2026 > Abrir calculadora**.

### 5.7 Implementar como aplicación web

1. En Apps Script, haz clic en **Implementar > Nueva implementación**.
2. En **Tipo**, elige **Aplicación web**.
3. Escribe una descripción, por ejemplo `Prima vacacional 2026`.
4. En **Ejecutar como**, elige **Yo**. La aplicación debe ejecutarse con la cuenta propietaria del script para que acceda a la hoja contenedora.
5. En **Quién tiene acceso**, elige la opción que corresponda:
   - **Solo yo**, si la usarás únicamente con tu cuenta.
   - **Cualquier persona con cuenta de Google**, si la compartirás con personas de tu organización.
   - **Cualquier persona**, solo si aceptas que cualquiera con la URL pueda abrirla.
6. En **Versión**, selecciona la versión que contiene el código actual. Si es la primera implementación, Apps Script crea una versión nueva.
7. Haz clic en **Implementar**.
8. Copia la URL que termina en `/exec`.

La URL `/exec` es la que debes usar. La URL `/dev` es de desarrollo y no es la recomendada para producción.

### 5.8 Actualizar una implementación existente

Cada vez que modifiques `Code.gs` o `Index.html`:

1. Guarda el proyecto.
2. Ve a **Implementar > Gestionar implementaciones**.
3. Edita la implementación activa.
4. En **Versión**, elige **Nueva versión**.
5. Implementa de nuevo.

Si no creas una versión nueva, la URL `/exec` puede seguir mostrando el código anterior.

---

<a id="uso"></a>
## 6. Uso

### 6.1 Abrir la calculadora

- Desde la hoja: **Prima Vacacional 2026 > Abrir calculadora**.
- Desde la aplicación web: abre la URL `/exec` de la implementación.

### 6.2 Capturar los datos

En el formulario:

1. **Nombre**: opcional; sirve para identificar la consulta.
2. **Fecha de ingreso** y **fecha de corte**: obligatorias. La fecha de corte no puede ser anterior a la de ingreso.
3. **Salario diario** y **SDI**: ambos deben ser mayores a cero.
4. **Base salarial**: elige `Salario diario` o `Salario diario integrado` con las tarjetas de selección.
5. **Días pendientes por pagar**: opcional.
   - Si capturas un número, la prima se calcula solo por esos días, limitados a los disponibles.
   - Si lo dejas vacío y hay días gozados, la prima se calcula sobre los gozados.
   - Si lo dejas vacío y no hay días gozados, se calcula sobre el periodo completo.
6. **Días ya gozados**: días del periodo que ya se disfrutaron.
7. **Porcentaje de prima**: mínimo 25%; puedes capturar uno mayor.
8. **Ingreso mensual ordinario**: si lo dejas vacío, se estima como salario diario × 30.4.
9. **Método de retención de ISR**: art. 174 RLISR o tarifa mensual directa.
10. **Aplicar subsidio al empleo**: solo se habilita con la tarifa directa.
11. **Deducir cuota obrera IMSS de la prima**: por defecto está desactivado.
12. **Otras deducciones** y su concepto: opcionales.

### 6.3 Calcular y guardar

- **Calcular prima**: valida y muestra el resultado; no modifica la hoja.
- **Guardar en hoja**: valida, escribe los datos en `Entrada` y devuelve el resultado. La hoja `Resultados` se actualiza con sus fórmulas.
- **Limpiar**: restablece el formulario y borra el resultado visible.

### 6.4 Resultado

La interfaz muestra:

- prima bruta,
- exención de ISR,
- prima gravable,
- ISR retenido,
- cuota obrera IMSS estimada,
- otras deducciones,
- prima neta,
- días pagados y base aplicada,
- desglose del ISR por el método elegido,
- advertencias y parámetros utilizados.

### 6.5 Menú de la hoja

| Opción | Acción |
|---|---|
| **Abrir calculadora** | Abre la barra lateral con `Index.html`. |
| **Instalar / reparar hojas** | Ejecuta `instalar`. |
| **Recalcular hoja** | Ejecuta `calcularDesdeHoja` y muestra un resumen. |
| **Ver notas y fuentes** | Activa `Parámetros` y lleva al bloque de fuentes. |

---

<a id="estructura-de-hojas"></a>
## 7. Estructura de hojas

`instalar` crea tres hojas. No cambies sus nombres ni los títulos de la fila 1: el código las valida con `validarHojaPropia_`.

### 7.1 Hoja `Entrada`

| Celda | Campo | Tipo / regla |
|---|---|---|
| `B4` | Nombre del trabajador | Texto opcional |
| `B5` | Fecha de ingreso | Fecha |
| `B6` | Fecha de corte | Fecha |
| `B7` | Salario diario | Número > 0 |
| `B8` | Salario diario integrado (SDI) | Número > 0 |
| `B9` | Base salarial | `Salario diario` o `Salario diario integrado` |
| `B10` | Días pendientes por pagar | Entero ≥ 0; puede quedar vacío |
| `B11` | Días ya gozados | Entero ≥ 0 |
| `B12` | Prima vacacional | Porcentaje; mínimo 25% |
| `B13` | Ingreso mensual ordinario | MXN; si está vacío se estima |
| `B14` | Método de ISR | `Art. 174 RLISR (recomendado)` o `Tarifa mensual directa` |
| `B15` | ¿Aplicar subsidio al empleo? | `Sí` o `No` |
| `B16` | ¿Deducir cuota obrera IMSS? | `Sí` o `No` |
| `B17` | Otras deducciones | MXN ≥ 0 |
| `B18` | Concepto de otras deducciones | Texto |

Celdas calculadas:

| Celda | Cálculo |
|---|---|
| `B21` | Años laborados |
| `B22` | Días de vacaciones por tabla |
| `B23` | Días disponibles después de restar los gozados |
| `B24` | Días que se pagarán |
| `B25` | Prima bruta estimada |

La hoja incluye una nota en `A27:F28` con las reglas de validación.

### 7.2 Hoja `Parámetros`

Parámetros generales:

| Celda | Parámetro | Valor inicial |
|---|---|---|
| `B5` | Prima vacacional mínima | `25.00%` |
| `B6` | UMA diaria 2026 | `$117.31` |
| `B7` | Días de UMA exentos de ISR | `15` |
| `B8` | Exención máxima de ISR | `=ROUND(B6*B7,2)` |
| `B9` | Antigüedad máxima soportada | `35` |
| `B10` | Cuota obrera IMSS total | `=L27` |
| `B11` | Subsidio al empleo mensual | `$535.65` |
| `B12` | Tope de ingreso para subsidio | `$11,492.66` |
| `B13` | Método ISR predeterminado | `Art. 174 RLISR (recomendado)` |
| `B14` | Deducir IMSS por defecto | `No` |
| `B15` | Aplicar subsidio por defecto | `No` |
| `B16` | Año fiscal | `2026` |
| `B17` | Fecha de actualización | `20/11/2026` |
| `B18` | Días base para mensualizar | `30.4` |

Tablas:

| Rango | Contenido |
|---|---|
| `A22:C56` | Tabla de vacaciones: años cumplidos, días y fundamento. |
| `E22:H32` | Tarifa mensual de ISR 2026: límite inferior, límite superior, cuota fija y tasa. |
| `K22:L27` | Cuotas obreras del IMSS: conceptos, tasas y total. |

El bloque de fuentes y notas está en `A58:L58` y en las filas `59` a `67`.

### 7.3 Hoja `Resultados`

| Bloque | Filas | Contenido |
|---|---|---|
| Resumen del trabajador | `4–11` | Nombre, fechas, antigüedad, salarios y base aplicada. |
| Vacaciones | `14–19` | Días por tabla, gozados, pendientes, pagados, porcentaje y días de UMA exentos. |
| Cálculo de la prima | `22–30` | Prima bruta, exención, gravable, ISR, IMSS, otras deducciones, total y neto. |
| Detalle del ISR | `33–49` | Método, factor, base conjunta, tramo, ISR 174, ISR directo, subsidio e ISR final. |
| Validación | `A52:F52` | Mensaje de datos válidos o error. |

Las celdas `A54:F55` contienen notas sobre la exención anual, el ajuste anual y la estimación del IMSS.

### 7.4 Rangos con nombre

`instalar` registra:

```text
Par_Prima_Pct
Par_UMA_Diaria
Par_DiasExencionUMA
Par_ExencionMax
Par_AntiguedadMax
Par_Cuota_IMSS
Par_SubsidioMensual
Par_SubsidioTope
Par_MetodoISR
Par_DeducirIMSS
Par_AplicarSubsidio
Par_AnioFiscal
Par_FechaActualizacion
Par_DiasBaseMensual
Tabla_Vacaciones
Tabla_Vacaciones_Antiguedad
Tabla_Vacaciones_Dias
Tabla_ISR
Tabla_ISR_LimiteInferior
Tabla_ISR_LimiteSuperior
Tabla_ISR_CuotaFija
Tabla_ISR_Tasa
Tabla_IMSS
Tabla_IMSS_Tasas
```

Si borras o mueves filas, los rangos con nombre pueden quedar desalineados. Ejecuta `instalar` para repararlos.

---

<a id="formulas-y-metodo-de-calculo"></a>
## 8. Fórmulas y método de cálculo

Las fórmulas se escriben con nombres de función en inglés y comas porque `setFormula()` las envía así. La interfaz de Google Sheets las muestra localizadas.

### 8.1 Entrada

```gs
B13: =ROUND(B7*Par_DiasBaseMensual,2)
B14: =Par_MetodoISR
B15: =Par_AplicarSubsidio
B16: =Par_DeducirIMSS
```

Antigüedad y vacaciones:

```gs
B21: =IF(OR(B5="",B6=""),"",IF(B6<B5,"Fecha inválida",DATEDIF(B5,B6,"Y")))
B22: =IFERROR(IF(OR(B21="",NOT(ISNUMBER(B21)),B21<1,B21>Par_AntiguedadMax),"",VLOOKUP(B21,Tabla_Vacaciones,2,1)),"")
B23: =IF(B22="","",MAX(0,B22-IF(ISNUMBER(B11),B11,0)))
B24: =IF(B22="","",IF(B10="",IF(AND(ISNUMBER(B11),B11>0),MIN(B11,B22),B22),MIN(MAX(0,B10),B23)))
B25: =IF(OR(B24="",B9=""),"",ROUND(B24*IF(B9="Salario diario integrado",B8,B7)*B12,2))
```

Regla de `B24`:

- Si `B10` tiene días pendientes, se pagan esos días, limitados por `B23`.
- Si `B10` está vacío y `B11` es mayor que cero, se pagan los días gozados, limitados por `B22`.
- Si `B10` está vacío y `B11` es cero, se paga el periodo completo `B22`.

### 8.2 Resultados

Enlace con la entrada:

```gs
B4:  =IF(Entrada!B4="","Trabajador sin nombre",Entrada!B4)
B5:  =Entrada!B5
B6:  =Entrada!B6
B7:  =Entrada!B21
B8:  =Entrada!B7
B9:  =Entrada!B8
B10: =Entrada!B9
B11: =IF(B10="Salario diario integrado",B9,B8)
B14: =Entrada!B22
B15: =Entrada!B11
B16: =IF(Entrada!B10="","—",Entrada!B10)
B17: =Entrada!B24
B18: =Entrada!B12
B19: =Par_DiasExencionUMA
```

Importes:

```gs
B22: =ROUND(B17*B11*B18,2)
B23: =ROUND(MIN(B22,Par_ExencionMax),2)
B24: =ROUND(MAX(0,B22-B23),2)
B25: =B49
B26: =IF(Entrada!B16="Sí",ROUND(B22*Par_Cuota_IMSS,2),0)
B27: =IF(ISNUMBER(Entrada!B17),Entrada!B17,0)
B28: =ROUND(B25+B26+B27,2)
B29: =ROUND(B22-B28,2)
B30: =IF(B22=0,0,B28/B22)
```

`B23` aplica el tope de exención `Par_ExencionMax`. `B26` solo calcula IMSS si `Entrada!B16` es `Sí`.

### 8.3 ISR por el art. 174 RLISR

```gs
B33: =Entrada!B14
B34: =IF(ISNUMBER(Entrada!B13),Entrada!B13,ROUND(B8*Par_DiasBaseMensual,2))
B35: =B24
B36: =IF(B35<=0,0,B35/365*30.4)
B37: =ROUND(B34+B36,2)
B38: =IFERROR(INDEX(Tabla_ISR_LimiteInferior,MATCH(B37,Tabla_ISR_LimiteInferior,1)),0)
B39: =MAX(0,B37-B38)
B40: =IFERROR(INDEX(Tabla_ISR_CuotaFija,MATCH(B37,Tabla_ISR_LimiteInferior,1)),0)
B41: =IFERROR(INDEX(Tabla_ISR_Tasa,MATCH(B37,Tabla_ISR_LimiteInferior,1)),0)
B42: =ROUND(B40+B39*B41,2)
B43: =IFERROR(ROUND(INDEX(Tabla_ISR_CuotaFija,MATCH(B34,Tabla_ISR_LimiteInferior,1))+(B34-INDEX(Tabla_ISR_LimiteInferior,MATCH(B34,Tabla_ISR_LimiteInferior,1)))*INDEX(Tabla_ISR_Tasa,MATCH(B34,Tabla_ISR_LimiteInferior,1)),2),0)
B44: =MAX(0,B42-B43)
B45: =IF(B36<=0,0,B44/B36)
B46: =ROUND(B35*B45,2)
```

Método:

1. `B36` calcula el factor mensual de la prima gravable: prima ÷ 365 × 30.4.
2. `B37` suma el ingreso ordinario y el factor.
3. `B42` aplica la tarifa mensual a la base conjunta.
4. `B43` aplica la tarifa al ingreso ordinario.
5. `B44` obtiene la diferencia y `B45` la tasa efectiva.
6. `B46` aplica esa tasa a la prima gravable.

### 8.4 ISR por tarifa mensual directa

```gs
B47: =IFERROR(MAX(0,MAX(0,ROUND(INDEX(Tabla_ISR_CuotaFija,MATCH(B34+B35,Tabla_ISR_LimiteInferior,1))+(B34+B35-INDEX(Tabla_ISR_LimiteInferior,MATCH(B34+B35,Tabla_ISR_LimiteInferior,1)))*INDEX(Tabla_ISR_Tasa,MATCH(B34+B35,Tabla_ISR_LimiteInferior,1)),2)-IF(AND(Entrada!B15="Sí",B34+B35<=Par_SubsidioTope),Par_SubsidioMensual,0))-MAX(0,ROUND(INDEX(Tabla_ISR_CuotaFija,MATCH(B34,Tabla_ISR_LimiteInferior,1))+(B34-INDEX(Tabla_ISR_LimiteInferior,MATCH(B34,Tabla_ISR_LimiteInferior,1)))*INDEX(Tabla_ISR_Tasa,MATCH(B34,Tabla_ISR_LimiteInferior,1)),2)-IF(AND(Entrada!B15="Sí",B34<=Par_SubsidioTope),Par_SubsidioMensual,0))),0)
B48: =IF(AND(Entrada!B15="Sí",B34+B35<=Par_SubsidioTope),Par_SubsidioMensual,0)
B49: =IF(LEFT(B33,3)="Art",B46,MAX(0,B47))
```

`B47` suma la prima gravable al ingreso ordinario, aplica la tarifa al total y resta el ISR ordinario. Si el subsidio está activo, se aplica al ISR del mes completo; `B48` muestra el subsidio de referencia. `B49` elige `B46` cuando el método empieza con `Art` y `B47` en los demás casos.

### 8.5 Validación de la hoja

La celda fusionada `A52:F52` contiene una fórmula que muestra:

- `⚠ Completa fecha de ingreso, salario diario y SDI.`
- `⚠ Revisa las fechas de ingreso y corte.`
- `⚠ La antigüedad debe ser al menos 1 año.`
- `⚠ La antigüedad excede el máximo permitido.`
- `⚠ La prima no puede ser menor al mínimo legal.`
- `⚠ Los días pendientes capturados exceden los días disponibles.`
- `✔ Datos válidos. Revisa el desglose.`

---

<a id="ejemplo-verificable"></a>
## 9. Ejemplo verificable

Los datos de ejemplo que carga `instalar` son:

| Campo | Valor |
|---|---|
| Nombre | María López Hernández |
| Fecha de ingreso | `15/03/2019` |
| Fecha de corte | `20/11/2026` |
| Salario diario | `$750.00` |
| SDI | `$875.00` |
| Base salarial | `Salario diario integrado` |
| Días pendientes | vacío |
| Días gozados | `0` |
| Prima vacacional | `25.00%` |
| Ingreso mensual ordinario | `$22,800.00` |
| Método ISR | `Art. 174 RLISR (recomendado)` |
| Aplicar subsidio | `No` |
| Deducir IMSS | `No` |
| Otras deducciones | `$0.00` |

Resultado esperado en `Resultados`:

| Celda | Concepto | Valor |
|---|---|---|
| `B7` | Años laborados | `7` |
| `B14` | Días por tabla | `22` |
| `B15` | Días gozados | `0` |
| `B16` | Días pendientes capturados | `—` |
| `B17` | Días que se pagan | `22` |
| `B18` | Porcentaje de prima | `25.00%` |
| `B22` | Prima bruta | `$4,812.50` |
| `B23` | Exención de ISR | `$1,759.65` |
| `B24` | Prima gravable | `$3,052.85` |
| `B25` | ISR retenido | `$652.08` |
| `B26` | IMSS | `$0.00` |
| `B27` | Otras deducciones | `$0.00` |
| `B28` | Total de deducciones | `$652.08` |
| `B29` | Prima neta | `$4,160.42` |

Comprobación aritmética:

```text
Antigüedad: 15/03/2019 a 20/11/2026 = 7 años cumplidos.
Días por tabla para 7 años = 22.
Prima bruta = 22 × $875.00 × 25% = $4,812.50.
Exención = mínimo($4,812.50, 15 × $117.31) = $1,759.65.
Prima gravable = $4,812.50 − $1,759.65 = $3,052.85.
Factor art. 174 = $3,052.85 ÷ 365 × 30.4 = 254.264767...
Base conjunta = $22,800.00 + 254.264767... = $23,054.264767...
ISR conjunto ≈ $1,856.84 + ($23,054.264767... − $17,533.65) × 21.36% = $3,036.04.
ISR ordinario ≈ $1,856.84 + ($22,800.00 − $17,533.65) × 21.36% = $2,981.73.
Diferencia = $3,036.04 − $2,981.73 = $54.31.
Tasa efectiva = $54.31 ÷ 254.264767... = 21.3596...%.
ISR de la prima = $3,052.85 × 21.3596...% = $652.08.
Prima neta = $4,812.50 − $652.08 = $4,160.42.
```

Los importes se redondean a dos decimales; pueden existir diferencias de un centavo por el orden de redondeo.

---

<a id="marco-legal-y-tratamiento-fiscal"></a>
## 10. Marco legal y tratamiento fiscal

### 10.1 Normativa considerada

El proyecto se apoya en las referencias que aparecen en `Code.gs` y en la hoja `Parámetros`:

- **Ley Federal del Trabajo, artículo 76**: días de vacaciones según la antigüedad. La tabla implementada va de 1 a 35 años con 12, 14, 16, 18, 20, 22, 24, 26, 28, 30 y 32 días.
- **Ley Federal del Trabajo, artículo 80**: prima vacacional mínima del **25%** sobre el salario correspondiente a los días de vacaciones.
- **Ley del Impuesto sobre la Renta, artículo 93, fracción XIV**: exención de la prima vacacional hasta **15 UMA** por año de calendario.
- **Ley del Impuesto sobre la Renta, artículo 96**: tarifa mensual de retenciones por salarios. La tabla de 2026 está en `Parámetros!E22:H32`.
- **Reglamento de la Ley del Impuesto sobre la Renta, artículo 174**: procedimiento opcional para la retención de ISR sobre prima vacacional, aguinaldo, PTU y primas dominicales.
- **Ley del Seguro Social, artículos 27, 30 y 38**: integración de la prima vacacional al salario base de cotización y cuotas obreras.
- **Anexo 8 de la RMF 2026, DOF 28/12/2025**: tarifa mensual de ISR.
- **UMA 2026**: `$117.31` diaria, valor incluido en `Parámetros!B6`.
- **Subsidio al empleo 2026**: `$535.65` mensual y tope de `$11,492.66`, incluidos en `Parámetros!B11:B12`.

### 10.2 Cómo trata el proyecto estos conceptos

- La **exención** se aplica una sola vez por cálculo: `MIN(prima bruta, 15 × UMA)`. No se multiplica por años de servicio.
- El **art. 174** se ofrece como método opcional. La hoja también incluye el método de tarifa directa.
- La **prima vacacional integra el SBC**, pero la cuota obrera del IMSS no se retiene del pago de la prima. El interruptor de IMSS está en `No` por defecto; si se activa, se usa una estimación simplificada del **2.775%** del bruto.
- El **subsidio al empleo** solo se aplica con el método de tarifa directa y se calcula sobre el ISR del mes completo.
- El **ISR definitivo** se determina en el ajuste anual; la herramienta estima la retención del pago.

### 10.3 Fuera del alcance

El proyecto no calcula ni determina:

- el impuesto sobre nóminas estatal (ISN),
- cuotas patronales del IMSS,
- INFONAVIT, SAR o riesgos de trabajo,
- el ajuste anual del ISR,
- finiquitos, liquidaciones, indemnizaciones o prima de antigüedad,
- salario variable, comisiones, PTU, bonos u otros ingresos,
- tratamientos especiales por convenio, contrato colectivo o legislación estatal.

El usuario debe verificar con su asesor:

- la vigencia y aplicación de la UMA y de la tarifa de ISR,
- la exención anual acumulada de 15 UMA,
- el método de retención elegido y su documentación,
- la integración de la prima al SBC y la cédula mensual del IMSS,
- la normativa estatal y las políticas internas de nómina.

---

<a id="actualizacion-anual"></a>
## 11. Actualización anual

Cada año deben revisarse los parámetros de la hoja `Parámetros` y, si se desea que las **nuevas instalaciones** nazcan con los valores actualizados, los arreglos de `crearHojaParametros_` en `Code.gs`.

### 11.1 Qué revisar en `Parámetros`

| Celda / rango | Dato |
|---|---|
| `B5` | Prima vacacional mínima. |
| `B6` | UMA diaria del ejercicio. |
| `B7` | Días de UMA exentos de ISR. |
| `B8` | Fórmula de exención máxima. |
| `B9` | Antigüedad máxima soportada. |
| `B10` | Cuota obrera IMSS total; enlaza a `L27`. |
| `B11` | Subsidio al empleo mensual. |
| `B12` | Tope de ingreso para el subsidio. |
| `B13` | Método ISR predeterminado. |
| `B14` | Valor predeterminado de deducir IMSS. |
| `B15` | Valor predeterminado de aplicar subsidio. |
| `B16` | Año fiscal. |
| `B17` | Fecha de actualización. |
| `B18` | Días base para mensualizar. |
| `A22:C56` | Tabla de vacaciones. |
| `E22:H32` | Tarifa mensual de ISR. |
| `K22:L27` | Cuotas obreras del IMSS. |

### 11.2 Qué revisar en `Code.gs`

- `crearHojaParametros_`: arreglo `parametros`, arreglo `vacaciones`, arreglo `tarifaIsr` y arreglo `imss`.
- `obtenerParametros_`: lectura y validación de los parámetros.
- `leerTablaVacaciones_`: validación de la tabla de vacaciones.
- `leerTarifaISR_`: validación de la tarifa de ISR.
- `leerConceptosIMSS_`: lectura del desglose de cuotas.
- `calcular_` y `calcularISR_`: lógica de cálculo.

### 11.3 Consideraciones

- La UMA cambia el 1 de febrero. La hoja tiene un solo valor en `B6`; si se pagan primas de enero y de febrero en el mismo ejercicio, revisa cuál UMA corresponde a cada pago.
- Si actualizas solo la hoja, las instalaciones nuevas seguirán usando los valores de ejemplo de `crearHojaParametros_`. Actualiza también el código si quieres cambiar el valor inicial.
- No renombres las hojas ni los rangos con nombre. Si los alteras, ejecuta `instalar` para repararlos.
- Documenta la fuente y la fecha del cambio en `B17` y en el bloque de notas de `Parámetros`.

---

<a id="limitaciones-y-descargo"></a>
## 12. Limitaciones y descargo

### 12.1 Limitaciones

- El alcance de antigüedad es de **1 a 35 años**. El código muestra error si la antigüedad es menor a 1 o mayor a 35.
- La tabla de vacaciones es la derivación usada por el proyecto para 1–35 años; no pretende resolver antigüedades superiores.
- La exención de ISR se aplica por cálculo. Si el trabajador recibe varias primas en el mismo año, el control del remanente anual de 15 UMA queda fuera de la herramienta.
- La hoja usa un solo valor de UMA (`B6`). No distingue automáticamente entre la UMA de enero y la de febrero.
- El IMSS es una **estimación simplificada** al 2.775% del bruto. No sustituye la cédula mensual del IMSS.
- No se incluyen ISN, cuotas patronales, INFONAVIT, SAR, riesgos de trabajo ni ajuste anual.
- No se modelan salario variable, comisiones, PTU, bonos, finiquitos, liquidaciones ni prestaciones especiales.
- Los resultados se redondean a dos decimales; pueden existir diferencias de centavos.
- La aplicación web depende de la disponibilidad de Google Apps Script y de que la implementación esté actualizada.

### 12.2 Descargo de responsabilidad

**El autor y los colaboradores del proyecto no garantizan la exactitud, integridad ni vigencia de los cálculos, parámetros o referencias legales.** La herramienta se proporciona “tal cual”, sin garantías de ningún tipo. **No responden por decisiones laborales, fiscales, contables o de seguridad social tomadas con base en los resultados.** El uso es bajo responsabilidad exclusiva del usuario.

Esta herramienta no constituye asesoría legal, fiscal, contable ni de nómina. Antes de pagar, timbrar, declarar o modificar una nómina, consulta a un profesional y verifica la normativa aplicable.

---

<a id="solucion-de-problemas"></a>
## 13. Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| No aparece el menú **Prima Vacacional 2026** | La hoja no se recargó o el script no está vinculado a ella | Recarga la hoja; confirma que abriste **Extensiones > Apps Script** desde esa misma hoja. |
| Aparece un error de autorización | El script no tiene permisos para acceder a la hoja | Ejecuta `instalar` de nuevo y acepta los permisos. |
| `No se encontró la hoja de cálculo` en la aplicación web | No se ejecutó `instalar` o el proyecto no está vinculado al libro | Ejecuta `instalar` desde la hoja contenedora y vuelve a implementar. |
| `Falta la hoja "Entrada"` o `Falta la hoja "Parámetros"` | Se borraron o renombraron hojas | Ejecuta `instalar` para recrearlas. |
| `La hoja "X" ya existe y no fue creada por esta herramienta` | Hay una hoja con el mismo nombre y otro título en `A1` | Renombra o elimina esa hoja; después ejecuta `instalar`. |
| `Falta el parámetro "..."` | Se borró un valor o un rango con nombre | Ejecuta `instalar` para reparar los parámetros y nombres. |
| `La tabla de vacaciones debe cubrir de 1 a 35 años` | Se borraron filas o se desordenó la tabla | Restaura la tabla `A22:C56` y ejecuta `instalar`. |
| `Los tramos de ISR deben estar ordenados...` | La tarifa `E22:H32` se editó con valores fuera de orden | Restaura la tarifa y ejecuta `instalar`. |
| El HTML no carga o la calculadora se queda cargando | El archivo no se llama exactamente `Index` o el proyecto no tiene `Index.html` | Renombra el archivo a `Index` y guarda. |
| `google.script.run` no está disponible | Abriste `Index.html` como archivo local | Abre la calculadora desde Google Sheets o desde la URL `/exec`. |
| La aplicación web muestra código viejo | No se creó una nueva versión de la implementación | **Implementar > Gestionar implementaciones > Editar > Nueva versión**. |
| La aplicación web no permite el acceso | La opción **Quién tiene acceso** no incluye al usuario | Edita la implementación y ajusta el acceso; comparte la URL `/exec`. |
| Los resultados no cambian al editar `Entrada` | La hoja no recalculó o se editaron celdas de `Resultados` | Presiona **Recalcular hoja** o recarga; no edites las celdas de resultado. |
| El IMSS aparece en cero | El interruptor **Deducir cuota obrera IMSS** está en `No` | Actívalo solo si quieres una estimación; la prima integra el SBC y no se retiene normalmente del pago. |
| El ISR no cambia al alternar el método | El método no se guardó o la implementación es antigua | Verifica `Entrada!B14`, guarda y crea una nueva versión si usas la web app. |

---

<a id="fuentes"></a>
## 14. Fuentes

Las siguientes fuentes corresponden a los parámetros y referencias utilizadas en el código y en la hoja `Parámetros`:

- **Ley Federal del Trabajo**, Cámara de Diputados: <https://www.diputados.gob.mx/LeyesBiblio/pdf/LFT.pdf>
- **Tabla de vacaciones**, PROFEDET: <https://www.gob.mx/profedet/es/articulos/sabias-que-una-de-las-prestaciones-que-tienes-como-trabajador-es-tu-derecho-a-vacaciones>
- **LISR artículo 93**: <https://mley.mx/LISR/articulo/93/>
- **LISR artículo 96**: <https://mley.mx/LISR/articulo/96/>
- **Reglamento de la LISR, artículo 174**: <https://mley.mx/Reg_LISR/articulo/174/>
- **Anexo 8 de la RMF 2026**, DOF 28/12/2025: <https://www.dof.gob.mx/nota_detalle.php?codigo=5777219&fecha=28/12/2025>
- **UMA 2026**, INEGI: <https://www.inegi.org.mx/app/saladeprensa/noticia/10533>
- **Ley del Seguro Social, artículos 27–40**: <https://mexico.justia.com/federales/leyes/ley-del-seguro-social/titulo-segundo/capitulo-ii/>
- **Decreto de subsidio al empleo 2026**, SIDOF: <https://sidof.segob.gob.mx/notas/docFuente/5777649>

Las referencias se incluyen para documentar los valores iniciales del proyecto. No sustituyen la consulta de las publicaciones oficiales vigentes ni el análisis del caso concreto.

---

## ☕ Apoya el Proyecto

Consultar leyes y normas vigentes en el territorio mexicano, toma tiempo y café. Si te ha sido útil este proyecto y quieres apoyar, ¡será muy bienvenido!

<div align="center">
  <a href="https://ko-fi.com/charlieii" target="_blank">
    <img src="https://storage.ko-fi.com/cdn/kofi2.png?v=3" alt="Buy Me a Coffee at ko-fi.com" height="40">
  </a>
</div>

---


<a id="licencia"></a>
## 15. Licencia

Este proyecto se distribuye bajo la **GNU General Public License, versión 3 (GPL v3)**.

- Texto completo en inglés: <https://www.gnu.org/licenses/gpl-3.0.html>
- Texto de referencia en español: <https://www.gnu.org/licenses/gpl-3.0.es.html>

GPL v3 es una licencia **copyleft**: si redistribuyes el proyecto o una versión modificada, debes mantener la misma licencia y poner a disposición el código fuente correspondiente. El software se proporciona **sin garantía**, tal como se describe en la licencia.

El código fuente de este proyecto está en `Code.gs` e `Index.html`.
