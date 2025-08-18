import { WPlaceBot } from './bot'

/** Overlay UI with image and cursor. Used to position drawing. */
export class Overlay {
  public readonly element = document.createElement('canvas')
  public readonly context = this.element.getContext('2d')!
  public opacity = 50

  public constructor(protected bot: WPlaceBot) {
    document.body.append(this.element)
    this.element.classList.add('wbot-overlay')
    this.update()
  }

  /** Update canvas */
  public update() {
    if (
      !this.bot.image ||
      this.bot.pixelSize === 0 ||
      !this.bot.startScreenPosition
    ) {
      this.element.classList.add('hidden')
      return
    }
    this.element.classList.remove('hidden')
    this.element.style.transform = `translate(${this.bot.startScreenPosition.x}px, ${this.bot.startScreenPosition.y}px)`
    this.element.width = this.bot.pixelSize * this.bot.image.pixels[0]!.length
    this.element.height = this.bot.pixelSize * this.bot.image.pixels.length
    this.context.clearRect(0, 0, this.element.width, this.element.height)
    for (let y = 0; y < this.bot.image.pixels.length; y++) {
      const row = this.bot.image.pixels[y]!
      for (let x = 0; x < row.length; x++) {
        const pixel = row[x]!
        this.context.fillStyle = `rgb(${pixel.r} ${pixel.g} ${pixel.b})`
        this.context.globalAlpha = (pixel.a / 255) * (this.opacity / 100)
        this.context.fillRect(
          x * this.bot.pixelSize,
          y * this.bot.pixelSize,
          this.bot.pixelSize,
          this.bot.pixelSize,
        )
      }
    }
  }
}
