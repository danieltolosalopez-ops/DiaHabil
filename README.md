# Día Hábil · ¿Cuándo vence tu plazo?

Calcula el **último día de un plazo** (multas de tráfico, requerimientos de Hacienda, recursos, juzgados) con los festivos de **tu comunidad autónoma, tu isla y tu municipio**, y busca los **mejores puentes** del año.

- **Web (y app instalable desde el navegador):** https://danieltolosalopez-ops.github.io/DiaHabil/
- **App de Android:** pestaña *Releases* de este repositorio (ver más abajo).
- Sin registro, sin servidor y sin anuncios: todo se calcula y se guarda en el móvil. Coste de funcionamiento: 0 €.

## Qué hace

- **Plazo:** eliges qué te han notificado (10 tipos habituales o uno propio), la fecha y la app te dice el último día, cuántos días hábiles quedan y te lo enseña marcado en el calendario. Aplica las reglas del art. 30 de la Ley 39/2015 (días hábiles, naturales y meses, prórroga al siguiente hábil), las notificaciones electrónicas sin abrir (art. 43.2) y los plazos de los juzgados (agosto y del 24 de diciembre al 6 de enero inhábiles).
- **Fecha prudente:** cuando el plazo acaba en un día inhábil o falta algún dato (fiestas locales, calendario aún sin publicar), la app recomienda la fecha más segura.
- **Mis plazos:** guarda los plazos; en la app de Android te avisa 3 días antes, el día antes y el mismo día. En la web, botón «Añadir al calendario» (.ics) y «Google Calendar».
- **Puentes:** con tus días de vacaciones, propone el plan que más días libres seguidos te da (también si trabajas los sábados).

## Estructura

```
public/            la app (HTML, CSS y JavaScript sin librerías)
  festivos.js      festivos de 2026 y 2027 por comunidad, isla de Canarias y Val d'Aran (BOE)
  core.js          cálculo de plazos y puentes
  app.js           interfaz
  native.js        avisos y archivos en la app de Android
test/              pruebas automáticas (node --test test/*.test.mjs)
android-res/       iconos y pantalla de inicio de Android
ios-res/           pantalla de inicio de iPhone
scripts/           android.mjs e ios.mjs (preparan Android e iPhone en GitHub)
store/             FICHA.md (textos de las tiendas), iconos, imagen destacada y capturas
.github/workflows/ web.yml (pruebas + web), android.yml (APK y AAB) e ios.yml (iPhone)
```

## Puesta en marcha (una sola vez)

1. *Settings → Pages → Build and deployment → Source:* **GitHub Actions**.
2. Cada cambio en `main` publica la web y compila las apps de Android e iPhone automáticamente.

## App de Android (sin Android Studio)

Cada vez que se sube un cambio a `main`, GitHub compila la app solo (workflow **App Android**, pestaña *Actions*). Cuando termina (unos 8-10 minutos), en la pestaña **Releases** del repositorio aparece **«App Android (última versión)»** con:

- `DiaHabil-prueba.apk` (o `DiaHabil.apk` si hay firma): ábrelo desde el móvil para instalar la app y probarla. Android te pedirá permitir «instalar apps de origen desconocido» solo esa vez.
- `DiaHabil-google-play.aab`: el archivo que se sube a Google Play (solo aparece cuando la firma está configurada).

La app usa **Capacitor 8**, que apunta a **Android 16 (API 36)**: lo que Google Play exige desde el 31 de agosto de 2026 para apps nuevas.

### Firma (necesaria para Google Play)

La firma está guardada en los *secrets* del repositorio (*Settings → Secrets and variables → Actions*):

| Secret | Qué es |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | el archivo de firma (`.jks`) en base64 |
| `ANDROID_KEYSTORE_PASSWORD` | contraseña del archivo |
| `ANDROID_KEY_ALIAS` | nombre de la clave |
| `ANDROID_KEY_PASSWORD` | contraseña de la clave |

**Guarda una copia del archivo `.jks` y de sus contraseñas fuera de GitHub** (por ejemplo, en tu gestor de contraseñas). Es tu «clave de subida» a Google Play: si la pierdes, hay que pedir a Google que la cambie.

Para crear una firma nueva: `keytool -genkeypair -v -keystore firma.jks -alias subida -keyalg RSA -keysize 2048 -validity 10000` y `base64 -w0 firma.jks` para el primer secret.

### Publicar en Google Play

1. Cuenta de desarrollador de Google Play (25 $, una sola vez; sirve para todas tus apps).
2. *Crear aplicación* → nombre, idioma español, gratuita.
3. **Prueba cerrada** con al menos **12 testers durante 14 días seguidos** (obligatorio en cuentas personales nuevas). Puedes usar el mismo grupo de testers para todas tus apps.
4. Sube el `.aab` de *Releases*. Activa *Firma de apps de Google Play* (Google guarda la clave final; la tuya es solo la de subida).
5. Ficha de la tienda: icono `store/play-icon-512.png`, imagen destacada `store/play-destacada-1024x500.png`, 2-8 capturas hechas con el móvil, y la política de privacidad: `https://danieltolosalopez-ops.github.io/DiaHabil/privacy.html`.
6. Formularios: *Seguridad de los datos* → «No se recoge ni se comparte ningún dato»; *Anuncios* → no; *Clasificación de contenido* → cuestionario (apta para todos).


## App de iPhone (App Store) sin Mac

El workflow **App iPhone** compila la app en un Mac de GitHub (macOS 26 con Xcode 26, lo que exige App Store desde abril de 2026):

- **Sin configurar nada:** en cada cambio comprueba que la app de iPhone compila.
- **Con tu cuenta de Apple configurada:** la firma y la sube a App Store Connect. Aparece en **TestFlight** y desde ahí la envías a revisión.

La app es solo para iPhone y en vertical, así que App Store no pide capturas de iPad.

### Lo que hay que hacer una vez (vale para todas tus apps)

1. Darte de alta en el **Apple Developer Program** (99 $/año) en developer.apple.com.
2. **App Store Connect → Usuarios y acceso → Integraciones → App Store Connect API → Generar clave**, con acceso **Admin** (lo necesita Xcode para crear los certificados él solo). Descarga el archivo `.p8` (solo se puede descargar una vez) y apunta el **Key ID** y el **Issuer ID**.
3. Tu **Team ID**: developer.apple.com → Account → Membership details.
4. En este repositorio, *Settings → Secrets and variables → Actions*:

| Secret | Qué es |
|---|---|
| `APPLE_TEAM_ID` | el Team ID |
| `ASC_KEY_ID` | el Key ID de la clave |
| `ASC_ISSUER_ID` | el Issuer ID |
| `ASC_KEY_P8` | el contenido completo del archivo `.p8` (desde `-----BEGIN PRIVATE KEY-----` hasta el final) |

5. **App Store Connect → Apps → «+» → Nueva app**: iOS, nombre, idioma español, Bundle ID `io.github.danieltolosalopezops.diahabil` y un SKU cualquiera (por ejemplo, `diahabil-ios`). Si el Bundle ID aún no aparece, lanza una vez el workflow *App iPhone*: Xcode lo registra solo.
6. *Actions → App iPhone → Run workflow*. En unos 15-20 minutos la versión aparece en TestFlight. Rellena la ficha con los textos de `store/FICHA.md`, añade las capturas de `store/capturas/iphone-6.9/` y `store/capturas/iphone-6.3/` y envía a revisión.

## Ficha de las tiendas

`store/FICHA.md` tiene todos los textos para Google Play y App Store (nombre, descripciones, palabras clave, categoría, URLs, respuestas de privacidad y notas para la revisión), ya ajustados a los límites de caracteres. Las capturas están en `store/capturas/` a los tamaños que piden las tiendas. Para rehacerlas: `bash test/capturas.sh public test/capturas.pasos.mjs store`.

## Revisión automática

Una tarea programada revisa la app dos veces al día (pruebas, web publicada y compilaciones de Android e iPhone) y corrige los fallos que encuentre. Lo que hace queda anotado en `MANTENIMIENTO.md`.

## Mantenimiento anual (octubre-noviembre)

Cada otoño el BOE publica las fiestas del año siguiente (Resolución de la Dirección General de Trabajo) y, semanas después, el calendario de días inhábiles de la Administración General del Estado. Hay que añadir ese año en `public/festivos.js` (mismo formato que 2027) y comprobar que las pruebas pasan. Mientras tanto, para años sin datos la app usa las fiestas nacionales y avisa de que el cálculo es provisional.

## Aviso legal

Herramienta orientativa: no sustituye el asesoramiento profesional ni es una aplicación oficial. Indica siempre las fuentes (BOE) y que no está vinculada a ninguna administración, como exige Google Play para apps con información de organismos públicos.

Fuentes tipográficas: Bitter y Fira Sans (licencia SIL Open Font License, en `public/fonts`).
