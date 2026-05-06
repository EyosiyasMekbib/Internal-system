// electron/main.ts
import { app, BrowserWindow, dialog } from 'electron'
import { join } from 'path'
import { fork, ChildProcess } from 'child_process'
import { createServer } from 'net'
import { existsSync } from 'fs'

let mainWindow: BrowserWindow | null = null
let serverProcess: ChildProcess | null = null
let activePort: number | null = null

// Find a free TCP port
function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer()
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address()
      if (!addr || typeof addr === 'string') {
        srv.close(() => reject(new Error('Failed to get free port')))
        return
      }
      srv.close(() => resolve(addr.port))
    })
    srv.on('error', reject)
  })
}

// Poll until the server responds on root
function waitForServer(port: number, attempts = 40): Promise<void> {
  return new Promise((resolve, reject) => {
    let tries = 0
    const check = () => {
      const req = require('http').get(`http://127.0.0.1:${port}/`, (res: any) => {
        res.resume()
        resolve()
      })
      req.on('error', () => {
        tries++
        if (tries >= attempts) return reject(new Error('Server did not start in time'))
        setTimeout(check, 500)
      })
      req.end()
    }
    check()
  })
}

async function startServer(): Promise<number> {
  // In development, use the running nuxt dev server
  if (!app.isPackaged) {
    return 3000
  }

  const port = await getFreePort()

  const serverPath = join(process.resourcesPath, 'app', '.output', 'server', 'index.mjs')
  if (!existsSync(serverPath)) {
    throw new Error(`Nitro server not found at: ${serverPath}`)
  }

  const userDataPath = app.getPath('userData')
  const dbPath = join(userDataPath, 'katerina.db')

  serverProcess = fork(serverPath, [], {
    env: {
      ...process.env,
      PORT: String(port),
      HOST: '127.0.0.1',
      DATABASE_PATH: dbPath,
      MIGRATIONS_PATH: join(process.resourcesPath, 'app', 'migrations'),
      BETTER_AUTH_SECRET: 'katerina-desktop-secret-change-in-prod',
      BETTER_AUTH_URL: `http://127.0.0.1:${port}`,
      NODE_ENV: 'production',
    },
    silent: false,
  })

  serverProcess.on('error', (err) => {
    dialog.showErrorBox('Server Error', err.message)
  })

  await waitForServer(port)
  return port
}

async function createWindow(port: number) {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Cannot open window: invalid port ${port}`)
  }

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Katerina',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  await mainWindow.loadURL(`http://127.0.0.1:${port}/`)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  try {
    activePort = await startServer()
    await createWindow(activePort)
  } catch (err: any) {
    dialog.showErrorBox('Startup Error', err.message)
    app.quit()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    try {
      if (activePort === null) {
        activePort = await startServer()
      }
      await createWindow(activePort)
    } catch (err: any) {
      dialog.showErrorBox('Startup Error', err.message)
    }
  }
})

app.on('before-quit', () => {
  serverProcess?.kill()
})
