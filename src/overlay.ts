import { WPlaceBot } from './bot'
import { Wrapper } from './wrapper'

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

  public constructor(protected parent: WPlaceBot) {
    super(document.createElement('canvas'), 'wbot_overlay_')
    this.element.classList.add('wbot-overlay')
    this.wrapper.classList.add('hidden')
    this.element.addEventListener('click', (event) => {
      this.click(event.clientX, event.clientY)
    })
  }

  public getPixelSize() {
    return this.parent.pixels.length === 0
      ? 0
      : this.width / this.parent.pixels[0]!.length
  }

  public update() {
    this.wrapper.style.width = `${this.width}px`
    this.wrapper.style.transform = `translate(${this.x}px, ${this.y}px)`
    const context = this.element.getContext('2d')!
    context.clearRect(0, 0, this.element.width, this.element.height)
    const pixelSize = this.getPixelSize()
    if (pixelSize === 0) return
    this.element.width = pixelSize * this.parent.pixels[0]!.length
    this.element.height = pixelSize * this.parent.pixels.length
    context.strokeStyle = `red`
    for (let y = 0; y < this.parent.pixels.length; y++) {
      const row = this.parent.pixels[y]!
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

  protected click(x: number, y: number) {
    const pixelSize = this.getPixelSize()
    this.cx = ((x - this.x) / pixelSize) | 0
    this.cy = ((y - (this.y + 16)) / pixelSize) | 0
  }
}
