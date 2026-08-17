import express, { Router } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Enable CORS for microservice cross-origin calls
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Create API Router for microservice endpoints
const apiRouter = Router();

// MICROSERVICE REST API v1 ENDPOINTS
apiRouter.get('/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'generator-doc-gost',
    version: '1.0.0',
    mode: 'offline_intranet',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    capabilities: [
      'gost_document_generation',
      'auto_registration',
      'department_code_resolution',
      'employee_database'
    ]
  });
});

apiRouter.get('/v1/spec', (req, res) => {
  res.json({
    service: 'generator-doc-gost microservice',
    description: 'Микросервис автоматического генератора и реестра документов по ГОСТ АО НПО Тепломаш',
    version: '1.0.0',
    mode: 'offline_intranet',
    endpoints: {
      'GET /api/v1/health': 'Проверка работоспособности сервиса',
      'POST /api/ai-text': 'Автономный генератор формулировок официального текста',
      'GET /api/v1/spec': 'Спецификация интеграционного контракта микросервиса'
    },
    microfrontend: {
      postMessageEvents: ['INIT_DOCUMENT', 'GET_DOCUMENT', 'REGISTER_DOCUMENT', 'PING', 'RETURN_TO_PORTAL'],
      emittedEvents: ['MICROSERVICE_READY', 'DOCUMENT_CHANGED', 'DOCUMENT_REGISTERED', 'RETURN_TO_PORTAL', 'PONG']
    }
  });
});

// Offline business document text formulation generator (no external API calls)
apiRouter.post('/ai-text', (req, res) => {
  const { prompt = '', docType = '' } = req.body;
  const rawPrompt = prompt.toLowerCase();

  let text = '';
  if (rawPrompt.includes('закупк') || rawPrompt.includes('оборуд') || rawPrompt.includes('материал')) {
    text = `<p>Настоящим доводят до Вашего сведения необходимость обновления материально-технической базы организации в связи с плановым расширением производственных мощностей.</p>
<p>Просим Вас согласовать закупку специализированного оборудования и выделить необходимые финансовые средства согласно приложенной смете.</p>`;
  } else if (rawPrompt.includes('отпуск') || rawPrompt.includes('заявлен')) {
    text = `<p>Прошу предоставить мне ежегодный оплачиваемый отпуск продолжительностью 14 календарных дней в соответствии с утвержденным графиком отпусков.</p>`;
  } else if (rawPrompt.includes('коммерческ') || rawPrompt.includes('предлож') || rawPrompt.includes('поставк')) {
    text = `<p>Выражаем Вам свое уважение и направляем коммерческое предложение на поставку продукции производства АО «НПО «Тепломаш».</p>
<p>Гарантируем высокое качество оборудования, соблюдение согласованных сроков отгрузки и предоставление полного комплекта технической документации.</p>`;
  } else {
    text = `<p>Довожу до Вашего сведения информацию касательно функционирования профильного подразделения организации. В рамках выполнения поставленных задач просим рассмотреть данные предложения по оптимизации процессов.</p>
<p>Гарантируем соблюдение установленных сроков и стандартов качества при реализации вышеуказанных мероприятий.</p>`;
  }

  res.json({ text });
});

// Mount API router under both /api and /docgen/api (supporting both stripped and non-stripped proxy setups)
app.use('/api', apiRouter);
app.use('/docgen/api', apiRouter);

// Vite Middleware & Production static serving setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use('/docgen', express.static(distPath));
    app.use(express.static(distPath));
    
    app.get(['/docgen*', '*'], (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
