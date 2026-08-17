const { app, BrowserWindow, protocol } = require('electron');
const path = require('path');
const fs = require('fs');

// Отключаем поиск системного прокси (WPAD), вызывающий задержку 15-20 сек при старте на Windows
app.commandLine.appendSwitch('no-proxy-server');
app.commandLine.appendSwitch('disable-http-cache');

// Регистрируем локальную схему app:// до ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: "Генератор Документов на Бланке",
    autoHideMenuBar: true,
    backgroundColor: '#ffffff',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });

  // Горячие клавиши для консоли разработчика (F12 / Ctrl+Shift+I)
  win.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      win.webContents.toggleDevTools();
    }
  });

  // Загружаем приложение через прокси-протокол app:// без сетевых задержек
  win.loadURL('app://localhost/index.html').catch(() => {
    win.loadFile(path.join(__dirname, 'dist', 'index.html')).catch((err) => {
      console.error('Ошибка загрузки index.html:', err);
    });
  });
}

app.whenReady().then(() => {
  // Быстрый локальный обработчик файлов для протокола app:// без сетевых запросов
  protocol.handle('app', (request) => {
    try {
      const parsedUrl = new URL(request.url);
      let pathname = decodeURIComponent(parsedUrl.pathname);
      // Vite собирает с base '/docgen/' (контракт веб-деплоя на портал tmdata).
      // В Electron файлы лежат в корне dist/ — отбрасываем префикс /docgen.
      if (pathname === '/docgen' || pathname.startsWith('/docgen/')) {
        pathname = pathname.slice('/docgen'.length);
      }
      if (pathname === '/' || !pathname) {
        pathname = '/index.html';
      }
      const filePath = path.join(__dirname, 'dist', pathname);

      if (!fs.existsSync(filePath)) {
        return new Response('File Not Found', { status: 404 });
      }

      const content = fs.readFileSync(filePath);
      let mimeType = 'text/html';
      if (filePath.endsWith('.js')) mimeType = 'text/javascript';
      else if (filePath.endsWith('.css')) mimeType = 'text/css';
      else if (filePath.endsWith('.svg')) mimeType = 'image/svg+xml';
      else if (filePath.endsWith('.png')) mimeType = 'image/png';
      else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) mimeType = 'image/jpeg';
      else if (filePath.endsWith('.json')) mimeType = 'application/json';

      return new Response(content, {
        headers: { 'content-type': mimeType },
      });
    } catch (err) {
      console.error('Ошибка в обработчике app://', err);
      return new Response('Error', { status: 500 });
    }
  });

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});



