# Historial de cambios

Todos los cambios de Kairo, de lo más nuevo a lo más viejo. Las versiones con número traen un APK nuevo; lo que dice
**por aire** llega solo al abrir la app, sin reinstalar (solo a quien ya tiene esa versión instalada).

Las descargas están en [GitHub Releases](https://github.com/0scar07/Kairo/releases).

## v1.5.0 · por aire

### 2026-10-21
- **Objetivo de la semana** en Mi perfil (LoL): «Sube 50 LP», «Gana 5 de 10» o «KDA de 3 o más», con barra que se
  llena con brillo, los días jugados de lunes a domingo y confeti al cumplirlo. Se elige cuál destacar y la meta.
- **Tu semana en LoL**, tipo Wrapped: historia de 4 páginas (LP, tu campeón, tu mejor partida y el resumen) que se
  pasa sola y se comparte como imagen.
- **Comparar** con más vida: cada jugador sobre el arte de su campeón, barras dorado contra azul, quién va por
  delante y nuevos rivales con un toque (Faker y el top 5 de Challenger de la región).
- **Clips → Siguiendo:** sigue pros y streamers por su @ o enlace de YouTube (hasta 12) y mira sus Shorts.
- **Modo espectador** en Valorant: el partido en vivo se actualiza solo cada 30 segundos, el mapa en juego late y
  «Lo último» cuenta qué pasó. Botón **Seguir** en cada equipo, con aviso 15 minutos antes de sus partidos.
- **Avisos de parches nuevos** de los juegos que elijas (LoL, TFT, Valorant, Wild Rift, Dota 2, Apex y PUBG).
- **4 idiomas nuevos:** italiano, turco, polaco y coreano (9 en total).

### 2026-10-19
- **Clips** en Explorar, tipo TikTok: los Shorts oficiales de YouTube de 9 juegos en un visor a pantalla completa;
  deslizas hacia abajo y el siguiente arranca solo. Para ti / Esports, filtro por juego, sonido que se recuerda, tocar
  para pausar, doble toque para guardar en Mi lista, compartir y lo más visto de la semana. Para verlos dentro de
  Kairo hace falta el próximo APK (trae `react-native-webview`); hasta entonces cada clip se abre en YouTube.
- **Noticias PRO:** carrusel con zoom lento sobre el arte, parallax en capas y luz ambiental del color de cada
  noticia; chips con pastilla deslizante, Top 5 del parche al estilo Netflix, Seguir leyendo, Mi lista, vista previa
  al mantener presionado y carga con el logo de Kairo. El lector suma cabecera que se vuelve barra de vidrio con las
  pestañas, barra de lectura, contadores, «Lo esencial en 10 segundos», tamaño de letra, cada campeón apareciendo al
  llegar a él y compartir el Top 5 como historia.
- **Noticias** en Explorar, al estilo Netflix: un carrusel que pasa solo con lo más importante de todos los juegos
  (parches, el último campeón de esports y eventos), filas por tipo y, al elegir un juego, el arte de sus campeones y
  los que cambiaron en su último parche. Las **notas del parche se leen dentro de la app**: cada campeón con su
  splash, el porqué de Riot y cada cambio antes → ahora con sube / baja (LoL, TFT, Valorant y Wild Rift).
- Arreglo: el brillo del juego elegido ya no deja una mancha negra en Android.
- **Wild Rift:** nuevo juego, sin buscador (Wild Rift no publica perfiles). Tier list S+ a D por carril y rango que
  se ordena por victorias, elección o baneo y se comparte como imagen; ficha de cada campeón con su winrate por
  rango; buscador A-Z y comparador de dos campeones; **Mis mains**; los que suben y bajan hoy y las últimas notas
  del parche. Datos públicos del servidor de China; los esports solo aparecen si hubo partidos en los últimos 30 días.
- **Valorant:** deja de estar «Próximamente» con su apartado de **esports**: el último campeón (o el partido en vivo),
  la cuenta atrás del próximo partido, calendario por día, resultados, torneos con su premio y el detalle de cada
  partido. Los perfiles de jugador siguen esperando la aprobación de Riot.
- Íconos del selector de juego con el degradado de marca de cada juego (también los no elegidos) y emblema propio
  de Wild Rift. Fondo de Inicio con el arte oficial del último parche en Wild Rift y un agente distinto cada día en
  Valorant.
- Servidor: rutas de Wild Rift y Valorant, y PandaScore para sus esports (`PANDASCORE_TOKEN`).

### 2026-10-18
- **Enfrentamientos (LoL):** nueva pestaña en la lupa. Eliges tu campeón y tu rival, y ves la build que más gana
  contra él, la runa principal y los hechizos, el orden de habilidades, sus counters en la línea y las habilidades
  del rival con su enfriamiento y tipo de daño. Todo sale de partidas de Challenger, y cada dato dice cuántas
  partidas lo respaldan.
- **«Cómo jugar contra X»** en Partida en vivo: atajo a Enfrentamientos con tu rival de línea.
- **Progreso de LP:** al tocar Solo/Dúo o Flex en el perfil se abre su gráfico de 7 días, 30 días o la temporada.
- **Detalle de partida minuto a minuto:** diferencia de oro y orden de compra de los objetos.
- **Seguir a un pro:** su próxima partida oficial y un aviso 15 minutos antes; aparece en Favoritos.
- **Sugeridos del ranking** cuando todavía no tienes favoritos.
- La carga del perfil tiene la forma exacta del perfil y un brillo.
- Liquid Glass más fino: canto de luz, sombra suave, pestaña activa con el acento del juego y el contenido se funde
  bajo las barras.
- Novedades con Enfrentamientos; en pantallas bajas la lista se desplaza y el botón siempre se ve.
- Servidor: datos de enfrentamientos por cruce de campeones y avisos de seguridad de dependencias resueltos.

### 2026-10-17
- Inicio con arte de cada juego y splash de tu campeón principal en el perfil.
- Resultados recientes con campeones, «Jugó con» y animaciones con más vida.
- Perfil con más jerarquía, **Explorar** (ranking y favoritos en vivo) y **jugadores profesionales**.

### 2026-10-11
- Partida en vivo: cronómetro grande con cifras tabulares, y cabecera y equipos que entran en cascada.
- Ajustes al estilo iOS, con íconos blancos sobre cuadrados de color.
- Las filas de partidas entran en cascada y el detalle se abre con un muelle suave.
- «Actualizado hace X» bajo la cabecera del perfil.
- Recientes: menú al mantener pulsado (abrir perfil o quitar).

## v1.5.0 · 2026-10-11

Rediseño con las guías de Apple. Las notas completas están en la [versión v1.5.0](https://github.com/0scar07/Kairo/releases/tag/v1.5.0).

- Textos más grandes y con mejor contraste, y títulos grandes que se compactan al hacer scroll.
- Arranque al instante, sin esperar al servidor, y tirar para actualizar en Inicio y Favoritos.
- Mantener pulsado un favorito para abrirlo, activar sus alertas o quitarlo.
- Buscador renovado, hojas inferiores con asa y volver deslizando desde cualquier punto.
- Barras de cristal, perfil con el color de tu rango y pantalla de novedades al actualizar.
- Lectores de pantalla, «Reducir movimiento» y «Reducir transparencia».

## v1.4.0 · 2026-09-25

- **Historial de rango:** fotos diarias del rango, gráfico de LP, resumen semanal y cambios de rango.
- **Comparar** dos jugadores de LoL cara a cara.
- **Perfiles sin conexión** y **compartir el perfil como imagen**.
- **Récords de trofeos** en Brawl Stars y Clash Royale.
- **Actualizaciones por aire** (EAS Update): los cambios de pantallas y textos llegan sin reinstalar.

## v1.3.0 · 2026-09-25

- Notificaciones premium: sonidos propios, ícono de escudo, banner de inicio y de resultado, y canales por tipo de aviso.
- Descarga directa del APK con nombre fijo (`Kairo.apk`).

## v1.2.0 · 2026-09-25

- **Notificaciones de partida en vivo:** campanita por favorito, aviso al empezar y al terminar con el resultado, y
  horario silencioso.
- Banner fluido dibujado con Skia, indicador «N en vivo» y pantalla de partida con el splash art del campeón.
- Servidor: vigilante de partidas, envío por Expo Push y registro de dispositivos sin cuentas.

## v1.1.0 · 2026-09-25

- Expo SDK 57 (React Native 0.86).
- Versión web instalable en iPhone desde Safari.
- El APK de prueba se puede instalar encima del anterior.

## v1.0.0 · 2026-09-25

Primera versión pública.

- League of Legends y Teamfight Tactics completos: rango con emblemas oficiales, historial, detalle de partida con
  runas, maestría, rotación gratuita y estado del servidor.
- **Partida en vivo de LoL:** los dos equipos con hechizos, runas, rangos, baneos y cronómetro.
- Brawl Stars, Clash Royale y Clash of Clans (API de Supercell); Dota 2, Fortnite, Apex Legends y PUBG.
- Cinco idiomas: español, English, Português, Français y Deutsch.
- Favoritos y recientes en todos los juegos, selector de región y pantalla de carga animada.
- Diseño propio con acento por juego, íconos vectoriales y cero emojis.
- Servidor en la nube con caché, cola hacia Riot que respeta el cupo, límite de peticiones y errores traducidos.
