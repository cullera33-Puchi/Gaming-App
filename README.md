# Gaming-App

App personal de backlog de videojuegos: PWA para móvil con backlog, juegos en curso, histórico y deseados. El diseño funcional está en [DISENO_FUNCIONAL.md](DISENO_FUNCIONAL.md).

Estado: **fase 1 (Base)** construida.

## Qué incluye la fase 1

- Biblioteca con filtros por estado, plataforma, género y año, y orden por título, nota o fecha.
- Ficha de juego con partidas separadas (un juego puede tener varias), nota de 1 a 10 en pasos de 0,25, reseña, motivo de abandono y enlaces a Deku Deals y a seis medios.
- Abandonar en un toque desde Inicio y desde la ficha; se graba al momento y lo demás es opcional.
- Alta de juegos con búsqueda en IGDB o alta manual con portada opcional.
- Carga inicial del histórico (106 partidas) y del backlog (100 juegos) desde `data/`.
- Revisión de la carga: búsqueda masiva en IGDB, títulos sin coincidencia clara, avisos por confirmar y asignación de plataforma por lotes.
- Exportación e importación de una copia JSON.
- Funciona sin conexión; las portadas quedan en caché.
- Diseño visual de iOS 26 y 27 (Liquid Glass): barra de pestañas flotante de cristal, títulos grandes que se pliegan al hacer scroll, listas agrupadas, hojas inferiores con ✕ y ✓, colores del sistema y modo claro y oscuro automático.

## Puesta en marcha

### 1. Publicar la app (GitHub Pages)

1. En GitHub: **Settings, Pages, Source: GitHub Actions**.
2. Cada push a `main` ejecuta las pruebas, compila y publica en `https://cullera33-puchi.github.io/Gaming-App/`.
3. En el iPhone: abrir la dirección en Safari, **Compartir, Añadir a pantalla de inicio**.

El repositorio y la app publicada son públicos con GitHub gratuito, y los JSON de `data/` van incluidos en la app. Si no quieres que el histórico sea público, dímelo y lo cambiamos a carga desde fichero.

### 2. Intermediario para IGDB (Cloudflare Worker, gratuito)

1. Crear una aplicación en [dev.twitch.tv/console](https://dev.twitch.tv/console) (categoría *Application Integration*, URL de redirección `http://localhost`). Anotar el **Client ID** y generar un **Client Secret**.
2. Con una cuenta gratuita de Cloudflare:

   ```bash
   cd worker
   npx wrangler login
   npx wrangler secret put TWITCH_CLIENT_ID
   npx wrangler secret put TWITCH_CLIENT_SECRET
   npx wrangler secret put APP_TOKEN      # cualquier texto largo inventado
   npx wrangler deploy
   ```

3. En la app, **Ajustes, Intermediario**: pegar la dirección `https://backlog-juegos.<cuenta>.workers.dev` y el mismo `APP_TOKEN`. Pulsar **Guardar y probar**.

Las claves de Twitch solo viven en Cloudflare. El token de la app se guarda en el dispositivo y evita que terceros usen el intermediario.

### 3. Carga inicial

1. **Inicio, Cargar histórico y backlog.**
2. **Ajustes, Revisión de la carga, Buscar todos en IGDB.** Vincula solo las coincidencias claras; el resto queda en la lista para elegir a mano.
3. Resolver los avisos **Por confirmar** (los 16 del backlog y los 2 del histórico).
4. **Completar plataformas**: en la biblioteca, seleccionar varias partidas y asignarles plataforma.

La fase 1 se cierra cuando la carga tiene portadas y plataforma completada.

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # pruebas de la lógica y del intermediario
npm run build
```

| Pieza | Tecnología |
| --- | --- |
| App | React, Vite, vite-plugin-pwa |
| Datos locales | IndexedDB con Dexie |
| Intermediario | Cloudflare Worker (`worker/`) |
| Publicación | GitHub Pages (`.github/workflows/deploy.yml`) |
