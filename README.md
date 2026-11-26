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
scripts/android.mjs  prepara el proyecto Android en GitHub
store/             imágenes para la ficha de Google Play
.github/workflows/ web.yml (pruebas + web) y android.yml (APK y AAB)
```

## Puesta en marcha (una sola vez)

1. *Settings → Pages → Build and deployment → Source:* **GitHub Actions**.
2. Cada cambio en `main` publica la web y compila la app de Android automáticamente.

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


## Mantenimiento anual (octubre-noviembre)

Cada otoño el BOE publica las fiestas del año siguiente (Resolución de la Dirección General de Trabajo) y, semanas después, el calendario de días inhábiles de la Administración General del Estado. Hay que añadir ese año en `public/festivos.js` (mismo formato que 2027) y comprobar que las pruebas pasan. Mientras tanto, para años sin datos la app usa las fiestas nacionales y avisa de que el cálculo es provisional.

## Aviso legal

Herramienta orientativa: no sustituye el asesoramiento profesional ni es una aplicación oficial. Indica siempre las fuentes (BOE) y que no está vinculada a ninguna administración, como exige Google Play para apps con información de organismos públicos.

Fuentes tipográficas: Bitter y Fira Sans (licencia SIL Open Font License, en `public/fonts`).
