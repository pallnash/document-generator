# Инструкция по деплою и интеграции `generator-doc-gost` на портал tmdata (/docgen/)

## 1. Архитектура и Прод-Сервер (tmdata@10.10.0.177)

Микросервис разворачивается на продуктовом сервере портала **tmdata@10.10.0.177**:
- **Рабочий каталог на сервере**: `/opt/tmdata-frontend/docgen` (перенесено сюда из
  `/home/tmdata/develop/frontend/doc-generator` для единообразия с `filter-app-graphs`,
  который живёт там же — `/opt/tmdata-frontend/graphs`; у docgen никогда не было риска
  `rsync --delete` от backend-деплоя, он и раньше был вне `/opt/tmdata`)
- **Системный пользователь**: `tmdata`
- **Vite Base Path**: `/docgen/` (задается в `vite.config.ts`)
- **Express Backend (`server.ts`)**:
  - Слушает `PORT=3000` (по умолчанию).
  - API эндпоинты смонтированы под `/api/` и `/docgen/api/`.
  - Статический клиент раздается Express по пути `/docgen`.
- **Фронтенд вызовы**: `getApiBaseUrl()` динамически вычисляет префикс `/docgen/api`.

---

## 2. Развертывание в systemd

`deploy_docgen.sh` делает всё сам — перенос каталога на `/opt/tmdata-frontend/docgen`
(разово, идемпотентно), сборку, синхронизацию systemd-юнита (копирование в
`/etc/systemd/system/`, `daemon-reload`, `enable`), рестарт сервиса. Вручную нужно
только один раз завести секрет — `.env`, который сборкой/git не тащится:

1. Создайте файл окружения `.env` в `/opt/tmdata-frontend/docgen/.env`
   (или в старом каталоге, если ещё не переехали — скрипт при переносе заберёт его
   вместе со всем остальным):
   ```env
   NODE_ENV=production
   PORT=3000
   ALLOWED_ORIGIN=*
   ```

2. Создайте каталог для логов, если ещё не создан (тоже делает сам скрипт, но можно
   и заранее):
   ```bash
   sudo mkdir -p /var/log/tmdata
   sudo chown -R tmdata:tmdata /var/log/tmdata
   ```

3. Запустите (из старого каталога при самом первом разе, из нового — во всех
   остальных):
   ```bash
   ./deploy_docgen.sh
   ```

---

## 3. Настройка Nginx

Вставьте следующий блок в файл `drf_catalog_service/systemd/nginx.conf` на сервере `10.10.0.177`:

```nginx
location ^~ /docgen/ {
    proxy_pass http://127.0.0.1:3000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 90s;
}
```

Осознанно без `auth_basic` — своей проверки прав у сервиса пока нет, решили оставить
`/docgen/` открытым до реальной интеграции с бэкендом tmdata/RBAC (см. раздел 4).

Выполните перезагрузку конфигурации Nginx:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## 4. Защита доступа и Авторизация (Portal Auth Gate)

Приложение содержит UI-компонент заготовки авторизации:
1. **Уровень Proxy/Nginx**: Могут быть применены базовые ограничения доступа на уровне веб-сервера.
2. **Уровень Фронтенда (`PortalAuthGate` / `usePortalAuth`)**:
   - Заглушка (mock UI), не проверяет токен на сервере и не валидирует JWT-подпись. Служит интерфейсной заготовкой для визуальной проверки и локального тестирования UI.
   - Будет заменена на полноценную валидацию при последующей интеграции с реальным пакетом `portal-core` / бэкендом tmdata и ролевой моделью RBAC.


---

## 5. Пост-сообщения (PostMessage) и Возврат на Портал

Микросервис поддерживает обмен сообщениями:
- **`RETURN_TO_PORTAL`**: Кнопка «Вернуться на портал» отправляет событие `RETURN_TO_PORTAL` в родительское окно через `window.parent.postMessage`, если встроено как iframe; иначе (текущий режим — обычная ссылка из шапки портала на том же origin) просто переходит на `/`.
- **`INIT_DOCUMENT`**: Инициализация данных документа из 1С/Портала.
- **`REGISTER_DOCUMENT`**: Запрос на авто-регистрацию документа в реестре.
