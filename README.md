# ☀️ Summer Tier List

Bot de Discord para una tier list competitiva de Minecraft PvP.

## Arquitectura

### Waitlists
Cada modalidad tiene un canal independiente:

- #netpot-waitlist
- #uhc-waitlist
- #sword-waitlist
- #boxpvp-waitlist
- #crystalpvp-waitlist

Cada una tiene su propia cola y cooldown.

### High Test
NO existe una waitlist High Test.

El jugador debe ir a `#support` y pulsar:

`🔥 High Test`

Esto crea un ticket privado. El staff/tester gestiona el High Test desde ese ticket.

Cuando termina, el staff usa `/result ... high:true` dentro del ticket. El resultado aparece en `#high-results`.

### Resultados normales
Los resultados normales se publican en `#results`.

### Cooldown
El cooldown es independiente por modalidad y solo se activa cuando se registra un resultado oficial con `/result`.

Cerrar un ticket, cancelar una solicitud o salir de una waitlist NO activa cooldown.

## Instalación

1. Instala Node.js.
2. Ejecuta `npm install`.
3. Copia `.env.example` a `.env`.
4. Coloca TOKEN, CLIENT_ID y GUILD_ID.
5. Ejecuta `npm run deploy`.
6. Ejecuta `npm start`.
7. En Discord ejecuta `/setup`.

## Comandos incluidos

- `/setup`
- `/setupwaitlist`
- `/ping`
- `/profile`
- `/queue`
- `/cooldown`
- `/results`
- `/highresults`
- `/support`
- `/apply`
- `/result`

El sistema está preparado para ampliar después con moderación, gestión avanzada de testers, logs y más comandos.
