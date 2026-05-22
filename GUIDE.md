# 🌿 Eco Expert Voice — Руководство по эксплуатации

## Требования
- **Docker Desktop** установлен и запущен
- **Интернет** — для работы API (Google Gemini / Azure AI Speech)

---

## 🚀 Быстрый запуск

1. Перейдите в папку проекта:
   ```powershell
   cd C:\Project\eco_voice_web
   ```

2. Запустите проект (автоматическая сборка):
   ```powershell
   docker compose up -d --build
   ```

3. **Готово!** Проект доступен по адресам ниже.

---

## 🌐 Доступы

| Сервис | Локальный адрес | Публичный адрес (Cloudflare) | Описание |
|--------|-----------------|------------------------------|----------|
| **Frontend** | [http://localhost:5174](http://localhost:5174) | `https://*.trycloudflare.com` | Основной веб-интерфейс |
| **Admin Panel** | [http://localhost:5174/admin](http://localhost:5174/admin) | `.../admin` | Панель мониторинга и статистики |
| **Backend API** | [http://localhost:8002/docs](http://localhost:8002/docs) | — | Документация API (Swagger) |
| **Database** | `localhost:5434` | — | PostgreSQL (user: `ecovoice`) |

> 🔗 **Как получить ссылку Cloudflare?**
> Выполните команду:
> ```powershell
> docker logs eco-voice-tunnel
> ```
> Ищи строку `https://....trycloudflare.com`

---

## 🛠️ Управление

### Основные команды

| Действие | Команда (PowerShell) |
|----------|---------|
| **Запустить** | `docker compose up -d` |
| **Остановить** | `docker compose down` |
| **Пересобрать** (после изменений кода) | `docker compose up -d --build` |
| **Посмотреть логи** | `docker compose logs -f` |
| **Логи Backend** | `docker logs -f eco-voice-api` |
| **Логи Frontend** | `docker logs -f eco-voice-web` |
| **Логи Tunnel** | `docker logs -f eco-voice-tunnel` |

### Обновление конфигурации
Все настройки находятся в файле `.env` в корне проекта.
Если вы изменили `.env`, перезапустите контейнеры:
```powershell
docker compose up -d
```

---

## 🐛 Устранение проблем

### 1. Контейнер падает или не запускается
Посмотрите логи конкретного контейнера:
```powershell
docker logs eco-voice-api
```
*(Замените `eco-voice-api` на имя нужного контейнера)*

### 2. "Port already allocated" (Порт занят)
Если порты 5174 или 8002 заняты, измените их в `docker-compose.yml` (раздел `ports`), затем:
```powershell
docker compose up -d
```

### 3. База данных не подключается
Убедитесь, что `DATABASE_URL` в `.env` использует хост `postgres` (внутри Docker):
```
DATABASE_URL=postgresql://ecovoice:ecovoice_password@postgres:5432/ecovoice_analytics
```
*(Для локального подключения используйте `localhost:5434`)*

### 4. Полный сброс (если ничего не помогает)
Удалит все контейнеры и пересоздаст их заново:
```powershell
docker compose down
docker compose up -d --build
```
