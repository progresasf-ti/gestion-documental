# PSF GED — Guía de instalación

Progresa Soluciones Financieras S.A.S. · NIT 900.974.255-5
Sistema de gestión documental ISO 9001:2015, numeral 7.5

---

## Qué hace, en una frase

Usted deja un documento en una carpeta de Drive. Cada 15 minutos el sistema lo lee, propone un nombre técnico y una carpeta, y le pide permiso en una hoja de cálculo. **Nada se mueve ni se renombra hasta que usted escriba APROBADO.**

## Lo que el sistema nunca hace

- No toca ningún archivo que ya exista en su Drive.
- No renombra ni mueve nada sin aprobación humana escrita.
- No borra originales: los guarda en `99_ORIGINALES` (mientras `CONSERVAR_ORIGINAL` esté en `true`).

---

## Instalación — 6 pasos, unos 20 minutos

### Paso 1 — Consiga la clave de la API
Entre a `console.anthropic.com`, cree una cuenta, cargue US$20 de crédito y genere una API Key. Cópiela; sólo se muestra una vez.

> Costo real esperado: con Haiku y un volumen de 100 documentos diarios, entre **US$5 y US$15 al mes**. Es prepago, no suscripción.

### Paso 2 — Cree el proyecto
Vaya a `script.google.com` → **Nuevo proyecto**. Nómbrelo `PSF GED`.

### Paso 3 — Pegue los 8 archivos
En el panel izquierdo, junto a "Archivos", oprima **+** → **Secuencia de comandos** por cada archivo. Use exactamente estos nombres (sin la extensión, Apps Script la pone sola):

| # | Archivo | Qué contiene |
|---|---------|--------------|
| 1 | `Taxonomia` | Los 10 tipos y 10 procesos. **Aquí ajusta la taxonomía.** |
| 2 | `Config` | Correo, modelo, modo seguro. **Único archivo que edita a mano.** |
| 3 | `Nomenclatura` | Construcción de nombres. No tocar. |
| 4 | `Clasificador` | El prompt y el validador. No tocar. |
| 5 | `Indice` | Consecutivos y versiones. No tocar. |
| 6 | `Extractor` | Lectura y OCR. No tocar. |
| 7 | `Motor` | El flujo con aprobación. No tocar. |
| 8 | `Instalador` | Crea todo. No tocar. |

Borre el archivo `Código.gs` que viene por defecto.

### Paso 4 — Active el servicio de Drive
Panel izquierdo → **Servicios** → **+** → busque **Drive API** → **Agregar**.
Sin esto no funciona el OCR de los PDF escaneados.

### Paso 5 — Guarde la clave
Engranaje (**Configuración del proyecto**) → abajo, **Propiedades de la secuencia de comandos** → **Agregar propiedad**:

- Propiedad: `ANTHROPIC_API_KEY`
- Valor: la clave del paso 1

### Paso 6 — Ejecute el instalador
Arriba, en el selector de función, elija **`instalarSistema`** → **Ejecutar**.
Google le pedirá autorización: acepte (verá una advertencia de "app no verificada" porque el script es suyo; entre a *Configuración avanzada* → *Ir a PSF GED*).

Al terminar recibirá un correo con los enlaces a la carpeta y a la hoja.

---

## Cómo se usa cada día

1. Suelte documentos en **`00_BANDEJA_ENTRADA`**.
2. A los 15 minutos aparecen en la hoja **APROBACIONES**, con el nombre propuesto.
3. Revise la columna `NOTAS` y escriba en `SU_DECISION`:
   - **APROBADO** → se archiva con el nombre propuesto.
   - **RECHAZADO** → va a `98_REVISION_MANUAL` sin cambios.
4. Si el nombre no le gusta, **corrija la celda** `TITULO_PROPUESTO`, `TIPO` o `PROCESO` y *después* escriba APROBADO. Su corrección manda sobre la IA.

Los colores de la hoja: amarillo = conviene revisar, verde = ya ejecutado, rojo = hubo novedad.

---

## La convención de nombres

**Documento propio del SGC**
```
PR-OP-003_V02_Compra-De-Cartera-Con-Recurso_20260801.pdf
│  │  │   │   │                             └ fecha del documento
│  │  │   │   └ título
│  │  │   └ versión
│  │  └ consecutivo
│  └ proceso (Operaciones)
└ tipo (Procedimiento)
```

**Documento de un tercero**
```
RG-GC-CLI-9001234561-012_V01_Certificado-Camara-Comercio_20260801.pdf
         │    │
         │    └ NIT del tercero
         └ origen (cliente)
```

Cada tercero tiene su propia numeración desde 001, así se lee de inmediato "el documento 12 de este cliente".

---

## Cuando algo falle

Ejecute la función **`diagnostico`**. Revisa las seis cosas que suelen fallar (clave, IDs, servicio de Drive, disparadores, conexión con la API) y le dice cuál está mal.

---

## Etiquetas de Drive (opcional, recomendado para la auditoría)

Le pegan al archivo metadatos buscables: estado vigente/obsoleto, proceso y año de retención. Es lo que un auditor pide ver bajo el numeral 7.5.3.

1. En la **Consola de Administración** → Seguridad → Etiquetas de clasificación → cree la etiqueta `Documento ISO 9001` con tres campos de texto: `Estado`, `Proceso`, `RetencionHasta`.
2. Copie el ID de la etiqueta y de cada campo.
3. Póngalos en `Config.gs`, en `LABEL_ID` y `LABEL_CAMPOS`.

Si lo deja vacío, el sistema simplemente omite este paso y todo lo demás funciona igual.

---

## Plan de arranque sugerido

| Semana | Qué hacer |
|--------|-----------|
| 1 | 10 documentos variados. Revise cada propuesta y anote los errores de clasificación. |
| 2 | Ajuste las REGLAS DE DECISIÓN en `Clasificador.gs` según lo que falló. |
| 3 | 50 documentos. Mida cuántos aprueba sin corregir. |
| 4+ | Si supera el 90% sin corrección, suba `MAX_LOTE` y abra la bandeja al equipo. |

**No cambie `CONSERVAR_ORIGINAL` a `false` hasta el mes tres.** Mientras esté en `true`, cualquier error es reversible.
