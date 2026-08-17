# Микросервис генератора официальных документов по ГОСТ (`generator-doc-gost`)

Микросервис предназначен для встраивания в корпоративные порталы, ERP, CRM, систему 1С и веб-контейнеры (микрофронтенды) в качестве независимого сервиса формирования, автоматической нумерации и ведения реестра исходящих писем АО «НПО «Тепломаш».

---

## 🏗 Архитектура микросервиса

```
generator-doc-gost/
├── src/
│   ├── config/              # Конфигурация контракта микросервиса (microserviceConfig.ts)
│   ├── services/            # Бизнес-логика и сервисы
│   │   ├── documentService.ts      # Сервис работы с документами и нумерацией
│   │   ├── employeeService.ts     # Сервис поиска и автоопределения кодов подразделений
│   │   └── microserviceBridge.ts   # PostMessage bridge для микрофронтенд-интеграций
│   ├── hooks/               # React-хуки микросервиса (useMicroserviceBridge.ts)
│   ├── components/          # Компоненты форм и ГОСТ-предпросмотра
│   ├── utils/               # Утилиты экспорта (PDF, Excel, EML, Печать)
│   ├── constants/           # Справочники подразделений и сотрудников Тепломаш
│   └── exports/             # Публичный SDK (index.ts)
└── server.ts                # REST API endpoints (/api/v1/*)
```

---

## 🔌 REST API Endpoints

### 1. `GET /api/v1/health`
Проверка состояния и способностей микросервиса.
```json
{
  "status": "ok",
  "service": "generator-doc-gost",
  "version": "1.0.0",
  "capabilities": [
    "gost_document_generation",
    "auto_registration",
    "department_code_resolution",
    "employee_database",
    "ai_document_assistant"
  ]
}
```

### 2. `GET /api/v1/spec`
Получение полного описания контракта микросервиса и доступных команд.

### 3. `POST /api/ai-text`
Генерация и деловая корректура текста документа с помощью ИИ.

---

## 📡 Microfrontend (PostMessage Protocol)

Если микросервис встроен в родительский веб-контейнер через `<iframe>` или микрофронтенд:

### Входящие команды (Parent -> Microservice):
- `INIT_DOCUMENT`: Передача первичного заполнения письма (`payload: Partial<DocumentData>`)
- `GET_DOCUMENT`: Запрос текущей модели письма
- `REGISTER_DOCUMENT`: Команда на автоматическую регистрацию и публикацию в базе
- `PING`: Проверка активности микросервиса

### Исходящие события (Microservice -> Parent):
- `MICROSERVICE_READY`: Готовность микросервиса к приему данных
- `DOCUMENT_CHANGED`: Оповещение об изменении модели документа
- `DOCUMENT_REGISTERED`: Фиксация уникального регистрационного номера
- `PONG`: Ответ на PING
