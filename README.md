# Генератор Документов на Бланке (ГОСТ Р 7.0.97–2025)

Офлайн-генератор официальных документов: исходящие письма, служебные записки и бланки по ГОСТ, с автозаполнением реквизитов, склонением ФИО и должностей, единым реестром исходящих и экспортом в PDF/.eml/.doc.

Работает в двух режимах:
- **Web-сервис** на внутреннем портале tmdata (микросервис, раздаётся под префиксом `/docgen/`)
- **Локальное Windows-приложение** (Electron portable `.exe`, без установки и без сети)

---

## Возможности

- **ГОСТ-шапка на фирменном бланке** — официальный логотип, реквизиты, фиксированные поля
- **Типы документов**: письма, служебные записки, приказы, уведомления
- **Авто-реквизиты**: уникальный исходящий номер (`0708/1И`, код отдела + дата + номер), регистрация в реестре
- **Справочник сотрудников** — выбор адресата/составителя, подстановка должности (в дательном падеже) и отдела
- **Автосклонение** ФИО и должностей для русских падежей (offline, без внешних API)
- **Реестр исходящих писем** (localStorage) с защитой целостности **hash-chain**: правка записей в обход приложения обнаруживается и помечается
- **Реестр**: поиск, фильтр по отделу, экспорт CSV, печать, статистика
- **Экспорт**: PDF (jsPDF), `.eml` (готовое письмо для Outlook), печать, копирование текста
- **Штампы и подписи**: SVG-печать, цифровая подпись (ключ + дата), сканы подписей
- **Черновики**: версии `major.minor`, комментарии, история
- **Шаблоны писем**: готовые каркасы (запрос КП, уведомление, приказ...)
- **Роли**: пользователь / администратор (админ-операции: правка реестра, счётчики отделов, настройка оформления). Роль подписана — подделка в devtools не работает
- **Автосохранение** с debounce — не нагружает диски при вводе

---

## Установка и запуск

Требуется Node.js 20+.

```bash
npm install          # могут понадобиться флаги --force --ignore-scripts (см. ниже)
```

> **Windows**: пакет `@tailwindcss/oxide-linux-x64-gnu` в `dependencies` несовместим с Windows (`notsup`). Если `npm install` падает — используйте `npm install --force --ignore-scripts --no-audit --no-fund`.

### Dev-сервер (web)

```bash
npm run dev          # http://localhost:3000 (Vite + Express)
```

### Сборка (web + microservice server)

```bash
npm run build        # vite build + esbuild server.ts → dist/
npm start            # node dist/server.cjs (статик из dist/, API из server.ts)
```

### Сборка Windows .exe (Electron portable)

```bash
npm run dist         # vite build + electron-builder → dist-electron/Генератор Документов 1.0.0.exe
```

Готовый `.exe` копируется на любые машины и работает без установки, интернета и портала.

### Проверка кода и тесты

```bash
npm run lint         # tsc --noEmit
npm test             # vitest run (склонения, hash-chain, валидация, роли)
```

---

## Структура проекта

```
src/
  App.tsx                        — корневой компонент, табы, автосейв (debounce)
  main.tsx                       — вход React
  components/
    DocumentForm.tsx             — форма реквизитов (89KB, кандидат на рефакторинг)
    DocumentPreview.tsx          — live A4-превью (React.memo)
    RegistryModal.tsx            — реестр: поиск/фильтр/CSV/печать/статистика/hash-chain
    SignatureSettings.tsx        — подпись, штамп, ЭП
    TeplomashEmployeeSelectorModal.tsx — справочник сотрудников
    TemplatesModal.tsx, DraftsModal.tsx, ExportModal.tsx, PrintModal.tsx,
    AuthModal.tsx, PortalAuthGate.tsx, ValidationModal.tsx, StyleControls.tsx ...
  constants/
    departmentCodes.ts           — коды отделов, счётчики, РЕЕСТР + hash-chain (FNV-1a 64)
    presets.ts                   — стартовые документы и шаблоны
    teplomashEmployees.ts        — база сотрудников
  utils/
    declensionUtils.ts           — склонение ФИО/должностей (offline)
    validationUtils.ts           — валидация документа + массовые адресаты
    sanitizeUtils.ts             — whitelist XSS-санитайзер (без зависимостей)
    authUtils.ts                 — подписанные роли (deterrent, не криптозащита)
    emlUtils.ts, printUtils.ts, stampUtils.ts
  hooks/
    usePortalAuth.ts             — авторизация: портал (JWT) / локальная (Electron)
    useMicroserviceBridge.ts     — postMessage-мост с порталом/1С
    useDebouncedValue.ts         — debounce
  services/
    documentService.ts, employeeService.ts, microserviceBridge.ts
server.ts                        — Express: API /docgen/api + статика (не менять: микросервис)
main.cjs                         — Electron entry (app:// протокол, local mode)
vite.config.ts                   — base '/docgen/' (контракт веб-деплоя)
```

---

## Реестр и hash-chain

Реестр хранится в `localStorage` (`teplomash_registered_docs_registry_v3`), массив **новые → старые**.

Каждая запись несёт:

```ts
{
  hash: "9f3c...",      // FNV-1a 64(каноническая запись : prevHash)
  prevHash: "8b21...",  // хэш предыдущей по времени записи
}
```

- Цепочка строится от самой старой записи (конец массива) к новой
- Любая правка записи в обход кода (devtools, ручной localStorage) ломает цепочку — `verifyRegistryIntegrity()` это обнаруживает, RegistryModal показывает «Целостность НАРУШЕНА»
- Администратор может перестроить цепочку (эталонное состояние)
- Старые записи без hash мигрируют автоматически при первом открытии

---

## Роли и безопасность

- Роль (`doc_gen_user_role`) хранится **с подписью**: `admin.<fnv1a64(role+salt)>`
  — `localStorage.setItem('doc_gen_user_role','admin')` больше не даёт админа
- ⚠️ Это **deterrent-слой, а не криптозащита**: соль в бандле. Полноценный RBAC — только через серверный портал/RBAC (tmdata)
- В Electron-сборке портальный токен не требуется (локальный режим)

---

## Развёртывание на портал (микросервис)

Документация деплоя — `DEPLOYMENT.md`, скрипт — `deploy_docgen.sh`, systemd — `systemd/`.

**Важно**: `server.ts`, `src/config/microserviceConfig.ts`, `src/services/microserviceBridge.ts`,
`MICROSERVICE.md`, `metadata.json` — инфраструктура внутреннего сайта, их не меняем.

---

## Известные ограничения

- CORS `*` в server.ts — настройка микросервиса внутреннего сайта (по умолчанию `ALLOWED_ORIGIN || '*'`; при желании ограничить — задать `ALLOWED_ORIGIN` в `.env`)
- Иконка Electron — дефолтная (задать `build/icon.ico` + поле `icon` в `package.json > build > win`)
- Склонение — правила + словари, не 100% языковой нормы (несклоняемые фамилии обработаны)
- Пакет `pdf-lib` в `dependencies` фактически не используется

---

## Лицензия

© Внутреннее ПО, не для публичного распространения.