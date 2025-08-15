import { WPlaceBot } from './bot'
import { NoImageError, NoMarkerError } from './errors'
import { wait, waitForUnfocus } from './utilities'
import { Wrapper } from './wrapper'

/** Overlay UI with image and cursor. Used to position drawing. */
export class Overlay extends Wrapper {
  declare public element: HTMLCanvasElement

  /** Overlay position */
  public get x() {
    return +(localStorage.getItem(this.localStoragePrefix + 'x') ?? '64')
  }
  public set x(value) {
    localStorage.setItem(this.localStoragePrefix + 'x', value.toString())
    this.update()
  }

  /** Overlay position */
  public get y() {
    return +(localStorage.getItem(this.localStoragePrefix + 'y') ?? '64')
  }
  public set y(value) {
    localStorage.setItem(this.localStoragePrefix + 'y', value.toString())
    this.update()
  }

  /** Overlay width */
  public get width() {
    return +(localStorage.getItem(this.localStoragePrefix + 'width') ?? '256')
  }
  public set width(value) {
    localStorage.setItem(this.localStoragePrefix + 'width', value.toString())
    this.update()
  }

  /** Overlay height */
  public get height() {
    return this.wrapper.clientHeight
  }
  public set height(value) {
    this.width = (this.width / this.height) * value
  }

  /** Cursor position */
  public get cx() {
    return +(localStorage.getItem('wbot_cx') ?? '0')
  }
  public set cx(value) {
    localStorage.setItem('wbot_cx', value.toString())
    this.update()
  }

  /** Cursor position */
  public get cy() {
    return +(localStorage.getItem('wbot_cy') ?? '0')
  }
  public set cy(value) {
    localStorage.setItem('wbot_cy', value.toString())
    this.update()
  }

  public constructor(protected bot: WPlaceBot) {
    super(document.createElement('canvas'), 'wbot_overlay_')
    this.wrapper.style.removeProperty('height')
    this.element.classList.add('wbot-overlay')
    this.wrapper.classList.add('hidden')
    this.element.addEventListener('click', (event) => {
      this.setCursor(event.clientX, event.clientY)
    })
  }

  /** Get pixel size on window */
  public getPixelSize() {
    if (this.bot.pixels.length === 0) throw new NoImageError(this.bot)
    return this.width / this.bot.pixels[0]!.length
  }

  /** Update canvas */
  public update() {
    this.wrapper.style.width = `${this.width}px`
    this.wrapper.style.transform = `translate(${this.x}px, ${this.y}px)`
    const context = this.element.getContext('2d')!
    context.clearRect(0, 0, this.element.width, this.element.height)
    const pixelSize = this.getPixelSize()
    if (pixelSize === 0) return
    this.element.width = pixelSize * this.bot.pixels[0]!.length
    this.element.height = pixelSize * this.bot.pixels.length
    context.strokeStyle = `red`
    for (let y = 0; y < this.bot.pixels.length; y++) {
      const row = this.bot.pixels[y]!
      for (let x = 0; x < row.length; x++) {
        const pixel = row[x]!
        context.fillStyle = `rgb(${pixel.r} ${pixel.g} ${pixel.b})`
        context.globalAlpha = pixel.a / 510 // Double 255 to make it more transparent
        context.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize)
      }
    }
    context.globalAlpha = 0.8
    context.fillStyle = `cyan`
    context.fillRect(this.cx * pixelSize, 0, pixelSize, this.element.height)
    context.fillRect(0, this.cy * pixelSize, this.element.width, pixelSize)
  }

  /** Aligns image to pixel size and marker point */
  public async align() {
    const pixelsWidth = this.bot.pixels[0]?.length
    if (!pixelsWidth) return
    const getPixelPosition = () => {
      const data = (
        document.querySelector(
          '.whitespace-nowrap',
        ) as unknown as HTMLDivElement
      ).textContent
        .slice(7)
        .split(', ')
      return {
        x: +data[0]!,
        y: +data[1]!,
      }
    }
    const getMarkerPosition = () => {
      const marker = document.querySelector(
        '.maplibregl-marker.z-20',
      ) as unknown as undefined | HTMLDivElement
      if (!marker) throw new NoMarkerError(this.bot)
      const rect = marker.getBoundingClientRect()
      return {
        x: rect.width / 2 + rect.left,
        y: rect.bottom,
      }
    }
    const distance = (a: number, b: number) => {
      const direct = Math.abs(a - b)
      return Math.min(direct, 4000 - direct)
    }
    const markerPos1 = getMarkerPosition()
    const pixelPos1 = getPixelPosition()

    // Click
    this.bot.widget.status = '❌ Unfocus window!'
    await waitForUnfocus()
    this.bot.widget.status = '⌛ Aligning...'
    this.bot.canvas.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: window.innerWidth - 1,
        clientY: markerPos1.y,
        button: 0,
      }),
    )
    await wait(1)

    const markerPos2 = getMarkerPosition()
    const pixelPos2 = getPixelPosition()
    const pixelSize =
      (markerPos2.x - markerPos1.x) / distance(pixelPos2.x, pixelPos1.x)
    this.bot.overlay.x = markerPos1.x - pixelSize / 2
    this.bot.overlay.y = markerPos1.y - 16 - 7 // I don't know why it always 6-8 pixels lower than it should be
    this.bot.overlay.width = pixelsWidth * pixelSize
  }

  /** Set drawing cursor */
  protected setCursor(x: number, y: number) {
    const pixelSize = this.getPixelSize()
    this.cx = ((x - this.x) / pixelSize) | 0
    this.cy = ((y - (this.y + 16)) / pixelSize) | 0
  }
}
