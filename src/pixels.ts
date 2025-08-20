import { WPlaceBot } from './bot'
import { NoImageError } from './errors'
import { TILE_SIZE } from './position'
import { WPlaceColor } from './types'
import { promisify } from './utilities'

export class Pixels {
  /** Pixels of image. Use update() after changing variables */
  public pixels!: WPlaceColor[][]

  /** Colors that are recommended to buy with amount of pixels affected. Sorted. */
  public colorsToBuy!: [WPlaceColor, number][]

  public constructor(
    /** Image element */
    public image: HTMLImageElement,
    /** WPlace colors */
    public colors: WPlaceColor[],
    /** Change scale of image pixels */
    public scale = 100,
  ) {
    this.update()
  }

  /** Open select image dialog and create */
  public static async fromSelectImage(
    bot: WPlaceBot,
    colors: WPlaceColor[],
    scale?: number,
  ) {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.click()
    await promisify(input, ['change'], ['cancel', 'error'])
    const file = input.files?.[0]
    if (!file) throw new NoImageError(bot)
    const reader = new FileReader()
    reader.readAsDataURL(file)
    await promisify(reader, ['load'], ['error'])
    const image = new Image()
    image.src = reader.result as string
    await promisify(image, ['load'], ['error'])
    return new Pixels(image, colors, scale)
  }

  /** Create from url */
  public static async fromURL(
    url: string,
    colors: WPlaceColor[],
    scale?: number,
  ) {
    const image = new Image()
    image.src = await fetch(url)
      .then((x) => x.blob())
      .then((x) => URL.createObjectURL(x))
    try {
      await promisify(image, ['load'], ['error'])
    } catch {
      const canvas = document.createElement('canvas')
      canvas.width = TILE_SIZE
      canvas.height = TILE_SIZE
      image.src = canvas.toDataURL('image/png')
    }
    return new Pixels(image, colors, scale)
  }

  /** Update pixels of image. Heavy operation! */
  public update() {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')!
    const colorsToBuy = new Map<WPlaceColor, number>()
    const scale = this.scale / 100
    canvas.width = this.image.width * scale
    canvas.height = this.image.height * scale
    context.drawImage(this.image, 0, 0, canvas.width, canvas.height)
    this.pixels = Array.from(
      { length: canvas.height },
      () => new Array(canvas.width) as WPlaceColor[],
    )
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const index = (y * canvas.width + x) * 4
        const r = data[index]!
        const g = data[index + 1]!
        const b = data[index + 2]!
        const a = data[index + 3]!
        // Find best Wplace color color
        if (a < 100) {
          this.pixels[y]![x] = this.colors.at(-1)!
          continue
        }
        let minDelta = Infinity
        let min: WPlaceColor | undefined
        let minDeltaReal = Infinity
        let minReal: WPlaceColor | undefined
        for (let index = 0; index < this.colors.length; index++) {
          const color = this.colors[index]!
          const delta =
            (color.r - r) ** 2 + (color.g - g) ** 2 + (color.b - b) ** 2
          if (color.available && delta < minDelta) {
            minDelta = delta
            min = color
          }
          if (delta < minDeltaReal) {
            minDeltaReal = delta
            minReal = color
          }
        }
        this.pixels[y]![x] = min!
        if (minReal!.buttonId !== min!.buttonId)
          colorsToBuy.set(minReal!, (colorsToBuy.get(minReal!) ?? 0) + 1)
      }
    }
    this.colorsToBuy = [...colorsToBuy.entries()].sort(([, a], [, b]) => b - a)
  }

  public toJSON() {
    const canvas = document.createElement('canvas')
    canvas.width = this.image.naturalWidth
    canvas.height = this.image.naturalHeight
    const context = canvas.getContext('2d')!
    context.drawImage(this.image, 0, 0)
    return canvas.toDataURL('image/webp', 1)
  }
}
