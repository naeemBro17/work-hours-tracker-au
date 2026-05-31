#!/usr/bin/env node
/**
 * Icon Generator Script
 * 
 * Run this script once to generate PNG icons from the SVG source.
 * Required only once during setup.
 * 
 * Usage: node scripts/generate-icons.js
 * 
 * Requirements: 
 *   npm install -D sharp  (run once, then remove from devDependencies if desired)
 * 
 * Or alternatively, use any online SVG-to-PNG converter to generate:
 *   - icon-192.png (192x192)
 *   - icon-512.png (512x512)
 *   - icon-maskable-192.png (192x192) 
 *   - icon-maskable-512.png (512x512)
 * 
 * All from: public/icons/icon.svg
 * Place output in: public/icons/
 */

import { createCanvas, loadImage } from 'canvas'
import { writeFileSync, readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicIconsDir = join(__dirname, '../public/icons')

// Inline SVG rendering using canvas
function renderIconCanvas(size, maskable = false) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  const r = maskable ? 0 : size * 0.195 // maskable = square, regular = rounded

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, size, size)
  bgGrad.addColorStop(0, '#1E1E2A')
  bgGrad.addColorStop(1, '#0A0A0F')
  
  if (!maskable) {
    ctx.beginPath()
    ctx.roundRect(0, 0, size, size, r)
    ctx.fillStyle = bgGrad
    ctx.fill()
  } else {
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, size, size)
  }

  const cx = size / 2
  const cy = size * 0.43
  const clockR = size * 0.25
  const lineW = size * 0.039

  // Accent gradient
  const accentGrad = ctx.createLinearGradient(cx - clockR, cy - clockR, cx + clockR, cy + clockR)
  accentGrad.addColorStop(0, '#A78BFA')
  accentGrad.addColorStop(1, '#7C3AED')

  // Clock circle
  ctx.beginPath()
  ctx.arc(cx, cy, clockR, 0, Math.PI * 2)
  ctx.strokeStyle = accentGrad
  ctx.lineWidth = lineW
  ctx.stroke()

  // Hour hand (pointing up)
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(cx, cy - clockR * 0.62)
  ctx.strokeStyle = accentGrad
  ctx.lineWidth = lineW * 0.9
  ctx.lineCap = 'round'
  ctx.stroke()

  // Minute hand (pointing right)
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(cx + clockR * 0.5, cy + clockR * 0.27)
  ctx.strokeStyle = '#A78BFA'
  ctx.lineWidth = lineW * 0.7
  ctx.lineCap = 'round'
  ctx.stroke()

  // Center dot
  ctx.beginPath()
  ctx.arc(cx, cy, size * 0.027, 0, Math.PI * 2)
  ctx.fillStyle = accentGrad
  ctx.fill()

  // AUD text
  ctx.fillStyle = '#A78BFA'
  ctx.font = `bold ${size * 0.14}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('AUD', cx, size * 0.8)

  return canvas.toBuffer('image/png')
}

try {
  const { createCanvas: _cc } = await import('canvas').catch(() => null)
  
  const sizes = [192, 512]
  for (const size of sizes) {
    const regular = renderIconCanvas(size, false)
    const maskable = renderIconCanvas(size, true)
    writeFileSync(join(publicIconsDir, `icon-${size}.png`), regular)
    writeFileSync(join(publicIconsDir, `icon-maskable-${size}.png`), maskable)
    console.log(`✅ Generated ${size}x${size} icons`)
  }
  console.log('🎉 All icons generated successfully!')
} catch (e) {
  console.log('ℹ️  canvas module not available.')
  console.log('')
  console.log('To generate icons, either:')
  console.log('1. npm install canvas && node scripts/generate-icons.js')
  console.log('2. Use https://realfavicongenerator.net/ with public/icons/icon.svg')
  console.log('   Export: icon-192.png, icon-512.png, icon-maskable-192.png, icon-maskable-512.png')
  console.log('   Save to: public/icons/')
  console.log('')
  console.log('The app works without icons - they are only needed for installation prompts.')
}
