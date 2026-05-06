"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// electron/main.ts
const electron_1 = require("electron");
const path_1 = require("path");
const child_process_1 = require("child_process");
const net_1 = require("net");
const fs_1 = require("fs");
let mainWindow = null;
let serverProcess = null;
let activePort = null;
// Find a free TCP port
function getFreePort() {
    return new Promise((resolve, reject) => {
        const srv = (0, net_1.createServer)();
        srv.listen(0, '127.0.0.1', () => {
            const addr = srv.address();
            if (!addr || typeof addr === 'string') {
                srv.close(() => reject(new Error('Failed to get free port')));
                return;
            }
            srv.close(() => resolve(addr.port));
        });
        srv.on('error', reject);
    });
}
// Poll until the server responds on root
function waitForServer(port, attempts = 40) {
    return new Promise((resolve, reject) => {
        let tries = 0;
        const check = () => {
            const req = require('http').get(`http://127.0.0.1:${port}/`, (res) => {
                res.resume();
                resolve();
            });
            req.on('error', () => {
                tries++;
                if (tries >= attempts)
                    return reject(new Error('Server did not start in time'));
                setTimeout(check, 500);
            });
            req.end();
        };
        check();
    });
}
async function startServer() {
    // In development, use the running nuxt dev server
    if (!electron_1.app.isPackaged) {
        return 3000;
    }
    const port = await getFreePort();
    const serverPath = (0, path_1.join)(process.resourcesPath, 'app', '.output', 'server', 'index.mjs');
    if (!(0, fs_1.existsSync)(serverPath)) {
        throw new Error(`Nitro server not found at: ${serverPath}`);
    }
    const userDataPath = electron_1.app.getPath('userData');
    const dbPath = (0, path_1.join)(userDataPath, 'katerina.db');
    serverProcess = (0, child_process_1.fork)(serverPath, [], {
        env: {
            ...process.env,
            PORT: String(port),
            HOST: '127.0.0.1',
            DATABASE_PATH: dbPath,
            MIGRATIONS_PATH: (0, path_1.join)(process.resourcesPath, 'app', 'migrations'),
            BETTER_AUTH_SECRET: 'katerina-desktop-secret-change-in-prod',
            BETTER_AUTH_URL: `http://127.0.0.1:${port}`,
            NODE_ENV: 'production',
        },
        silent: false,
    });
    serverProcess.on('error', (err) => {
        electron_1.dialog.showErrorBox('Server Error', err.message);
    });
    await waitForServer(port);
    return port;
}
async function createWindow(port) {
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error(`Cannot open window: invalid port ${port}`);
    }
    mainWindow = new electron_1.BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        title: 'Katerina',
        webPreferences: {
            preload: (0, path_1.join)(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    await mainWindow.loadURL(`http://127.0.0.1:${port}/`);
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
electron_1.app.whenReady().then(async () => {
    try {
        activePort = await startServer();
        await createWindow(activePort);
    }
    catch (err) {
        electron_1.dialog.showErrorBox('Startup Error', err.message);
        electron_1.app.quit();
    }
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
electron_1.app.on('activate', async () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        try {
            if (activePort === null) {
                activePort = await startServer();
            }
            await createWindow(activePort);
        }
        catch (err) {
            electron_1.dialog.showErrorBox('Startup Error', err.message);
        }
    }
});
electron_1.app.on('before-quit', () => {
    serverProcess?.kill();
});
