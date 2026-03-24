/**
 * Visual Diff Comparison
 *
 * Compares screenshots against reference images from Figma.
 * Run: node tests/visual/compare.js
 *
 * Place your Figma export PNGs in tests/visual/reference/ with matching names:
 *   - dashboard-day.png
 *   - dashboard-exhibition.png
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const referenceDir = path.join(__dirname, 'reference')
const screenshotsDir = path.join(__dirname, 'screenshots')
const diffsDir = path.join(__dirname, 'diffs')

function compareImages(referencePath, screenshotPath, diffPath) {
  const refImg = PNG.sync.read(fs.readFileSync(referencePath))
  const scrImg = PNG.sync.read(fs.readFileSync(screenshotPath))

  // Resize to match if dimensions differ
  const width = Math.min(refImg.width, scrImg.width)
  const height = Math.min(refImg.height, scrImg.height)

  const diff = new PNG({ width, height })

  const mismatchedPixels = pixelmatch(refImg.data, scrImg.data, diff.data, width, height, {
    threshold: 0.1,
    includeAA: false,
  })

  const totalPixels = width * height
  const mismatchPercent = ((mismatchedPixels / totalPixels) * 100).toFixed(2)

  fs.writeFileSync(diffPath, PNG.sync.write(diff))

  return { mismatchedPixels, totalPixels, mismatchPercent }
}

function run() {
  const referenceFiles = fs.readdirSync(referenceDir).filter((f) => f.endsWith('.png'))

  if (referenceFiles.length === 0) {
    console.log('No reference images found in tests/visual/reference/')
    console.log('Drop your Figma export PNGs there with names like:')
    console.log('  - dashboard-day.png')
    console.log('  - dashboard-exhibition.png')
    process.exit(0)
  }

  console.log('Visual Diff Report')
  console.log('==================\n')

  let hasFailures = false

  for (const file of referenceFiles) {
    const referencePath = path.join(referenceDir, file)
    const screenshotPath = path.join(screenshotsDir, file)
    const diffPath = path.join(diffsDir, `diff-${file}`)

    if (!fs.existsSync(screenshotPath)) {
      console.log(`SKIP  ${file} — no matching screenshot (run npm run screenshot first)`)
      continue
    }

    const result = compareImages(referencePath, screenshotPath, diffPath)
    const status = parseFloat(result.mismatchPercent) < 5 ? 'PASS' : 'FAIL'

    if (status === 'FAIL') hasFailures = true

    console.log(`${status}  ${file}`)
    console.log(`       ${result.mismatchPercent}% different (${result.mismatchedPixels}/${result.totalPixels} pixels)`)
    console.log(`       Diff saved: ${diffPath}\n`)
  }

  if (hasFailures) {
    console.log('Some visual comparisons exceeded the 5% threshold.')
    process.exit(1)
  } else {
    console.log('All visual comparisons passed!')
  }
}

run()
