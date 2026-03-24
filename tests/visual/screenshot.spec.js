/**
 * Visual Screenshot Capture
 *
 * Captures screenshots of the WATCHLIGHT dashboard at different states.
 * Run: node tests/visual/screenshot.spec.js
 *
 * Prerequisites:
 *   npx playwright install chromium
 *   npm run build
 *   (preview server will be started automatically)
 */

import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const screenshotsDir = path.join(__dirname, 'screenshots')

const VIEWPORT = { width: 1440, height: 900 }
const BASE_URL = 'http://localhost:4173'

async function startPreviewServer() {
  return new Promise((resolve, reject) => {
    const server = spawn('npx', ['vite', 'preview', '--port', '4173'], {
      cwd: path.join(__dirname, '..', '..'),
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    const timeout = setTimeout(() => {
      reject(new Error('Preview server failed to start within 15s'))
    }, 15000)

    server.stdout.on('data', (data) => {
      const output = data.toString()
      if (output.includes('Local:') || output.includes('4173')) {
        clearTimeout(timeout)
        // Give it a moment to fully bind
        setTimeout(() => resolve(server), 1000)
      }
    })

    server.stderr.on('data', (data) => {
      console.error('[preview]', data.toString())
    })

    server.on('error', (err) => {
      clearTimeout(timeout)
      reject(err)
    })
  })
}

async function captureScreenshots() {
  console.log('Building project...')
  const build = spawn('npm', ['run', 'build'], {
    cwd: path.join(__dirname, '..', '..'),
    stdio: 'inherit',
  })
  await new Promise((resolve, reject) => {
    build.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`Build failed with code ${code}`))))
  })

  console.log('Starting preview server...')
  const server = await startPreviewServer()

  try {
    const browser = await chromium.launch()
    const context = await browser.newContext({ viewport: VIEWPORT })

    // Capture default state (intro/day)
    console.log('Capturing: default state...')
    const page = await context.newPage()
    await page.goto(BASE_URL, { waitUntil: 'networkidle' })
    // Wait for intro sequence to complete + dashboard to render
    await page.waitForTimeout(8000)
    await page.screenshot({
      path: path.join(screenshotsDir, 'dashboard-day.png'),
      fullPage: false,
    })
    console.log('  -> dashboard-day.png')

    // Capture exhibition mode (accelerated timeline)
    console.log('Capturing: exhibition mode...')
    const exhibitionPage = await context.newPage()
    await exhibitionPage.goto(`${BASE_URL}?exhibition`, { waitUntil: 'networkidle' })
    await exhibitionPage.waitForTimeout(8000)
    await exhibitionPage.screenshot({
      path: path.join(screenshotsDir, 'dashboard-exhibition.png'),
      fullPage: false,
    })
    console.log('  -> dashboard-exhibition.png')

    await browser.close()
    console.log('Screenshots saved to tests/visual/screenshots/')
  } finally {
    server.kill()
  }
}

captureScreenshots().catch((err) => {
  console.error('Screenshot capture failed:', err.message)
  process.exit(1)
})
