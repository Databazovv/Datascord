# Messenger MVP (server + web)

Фичи:
- Чат 1:1/группы по ID комнаты (через Socket.IO)
- Групповые аудио/видео звонки (WebRTC, mesh до ~6 чел.)
- Простая демо-верстка

## Быстрый старт (локально)
1) Установи зависимости:
   npm install
   или
   npm run setup

2) Запусти dev (поднимет сервер и веб одновременно):
   npm run dev

3) Открой http://localhost:5173
   - Введи ID беседы (например, test) и «Войти в чат»
   - Открой сайт во второй вкладке — увидишь чат и сможешь созвониться

Сервер: http://localhost:4000 (CORS на фронт http://localhost:5173)

## Переменные окружения
- server/.env:
  PORT=4000
  ORIGIN=http://localhost:5173

- web/.env:
  VITE_SOCKET_URL=http://localhost:4000

## Деплой (в общих чертах)
- Backend: Render/Fly.io/Railway (Node.js). ORIGIN = домен фронта (https).
- Frontend: Vercel/Netlify. VITE_SOCKET_URL = URL бэкенда (https).

Важно: для стабильных звонков в интернете часто нужен TURN-сервер (coturn/LiveKit/Twilio). В демо используется только STUN.

## GitHub
- Создай репозиторий и запушь (см. команды в ответе ассистента).
