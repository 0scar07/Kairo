# LoLTracker 🗡️

App móvil para ver stats de League of Legends (React Native + Expo)

## Setup rápido

1. Instalar dependencias:
   npm install

2. Agregar tu API key en:
   src/constants/config.js  →  API_KEY = "tu-key-aqui"
   
   Obtén tu key en: https://developer.riotgames.com

3. Cambiar tu región en config.js si es necesario:
   - la1 / la2  → Latinoamérica
   - na1        → Norteamérica  
   - euw1       → Europa Oeste
   - kr         → Corea
   - br1        → Brasil

4. Correr la app:
   npx expo start

5. Escanear el QR con la app Expo Go en tu celular

## Estructura
- src/api/riot.js          → Todas las llamadas a Riot API
- src/components/          → Componentes reutilizables
- src/screens/             → Pantallas de la app
- src/constants/config.js  → Config y constantes
