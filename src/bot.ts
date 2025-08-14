import { Overlay } from './overlay'
import { wait } from './utilities'
import { Widget } from './widget'

type Color = {
  r: number
  g: number
  b: number
  a: number
}

type WPlaceColor = Color & {
  available: boolean
  button: HTMLButtonElement
}

export class WPlaceBot {
  /** Original image to rescale */
  public image?: HTMLImageElement
  /** WPlace colors. Update with updateColors() */
  public colors: WPlaceColor[] = []
  /** Image pixels */
  public pixels: Color[][] = [[]]
  /** Moving/resizing overlay */
  public overlayEdit?: {
    x: number
    y: number
    originalX: number
    originalY: number
    width?: number
  }
  /** Moving widget */
  public widgetEdit?: {
    x: number
    y: number
    originalX: number
    originalY: number
  }

  public widget = new Widget(this)

  public overlay = new Overlay(this)

  /** Scale up/down image */
  public get scale() {
    return +(localStorage.getItem('wbot_scale') ?? '100')
  }
  public set scale(value) {
    localStorage.setItem('wbot_scale', value.toString())
  }

  /** Open select image popup */
  public selectImage() {
    if (
      !(document.querySelector('.maplibregl-marker.z-20') as unknown as
        | undefined
        | HTMLDivElement)
    )
      return
    this.widget.setDisabled('select-image', true)
    return new Promise<void>((resolve, reject) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.addEventListener('change', () => {
        const file = input.files?.[0]
        if (!file) {
          reject(new Error('NO_FILE'))
          this.widget.setDisabled('select-image', false)
          return
        }
        const reader = new FileReader()
        reader.addEventListener('load', () => {
          this.image = new Image()
          this.image.src = reader.result as string
          this.image.addEventListener('load', async () => {
            try {
              this.processImage()
              await this.widget.align()
              await this.updateColors()
              this.widget.status = 'Ready to draw!'
              resolve()
            } catch (error) {
              reject(error as Error)
            } finally {
              this.widget.setDisabled('select-image', false)
            }
          })
          this.image.addEventListener('error', reject)
        })
        reader.addEventListener('error', reject)
        reader.readAsDataURL(file)
      })
      input.click()
    })
  }

  /** Start drawing */
  public async draw() {
    this.widget.status = 'Drawing'
    try {
      await this.updateColors()
      this.overlay.element.classList.add('disabled')
      this.widget.setDisabled('draw', true)
      for (; this.overlay.cy < this.pixels.length; this.overlay.cy++) {
        for (; this.overlay.cx < this.pixels[0]!.length; this.overlay.cx++) {
          const pixel = this.getClosestColor(
            this.pixels[this.overlay.cy]![this.overlay.cx]!,
          )
          if (pixel.a === 0) continue
          pixel.button.click()
          await wait(1)
          const pixelSize = this.overlay.getPixelSize()
          await this.clickCanvas(
            this.overlay.x + this.overlay.cx * pixelSize + pixelSize / 2,
            this.overlay.y + 16 + this.overlay.cy * pixelSize + pixelSize / 2,
          )
          if (document.querySelector('ol')) return
        }
        this.overlay.cx = 0
      }
    } finally {
      this.overlay.element.classList.remove('disabled')
      this.widget.setDisabled('draw', false)
      this.widget.status = 'Press "Paint" and "Set timer"'
    }
  }

  public async clickCanvas(clientX: number, clientY: number) {
    await this.waitForUnfocus()
    ;(
      document.querySelector(
        '.maplibregl-canvas',
      ) as unknown as HTMLCanvasElement
    ).dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX,
        clientY,
        button: 0,
      }),
    )
    await wait(1)
  }

  /** Read colors, update available and colors to buy */
  private async updateColors() {
    ;(
      document.querySelector('.flex.gap-2.px-3 > .btn-circle') as unknown as
        | HTMLButtonElement
        | undefined
    )?.click()
    await wait(1)
    ;(
      document.querySelector(
        '.btn.btn-primary.btn-lg.relative.z-30',
      ) as unknown as HTMLButtonElement | undefined
    )?.click()
    await wait(1)
    const unfoldColors = document.querySelector(
      'button.bottom-0',
    ) as unknown as HTMLButtonElement
    if (
      unfoldColors.innerHTML ===
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor" class="size-5"><path d="M480-120 300-300l58-58 122 122 122-122 58 58-180 180ZM358-598l-58-58 180-180 180 180-58 58-122-122-122 122Z"></path></svg><!---->'
    ) {
      unfoldColors.click()
      await wait(1)
    }
    this.colors = (
      [
        ...document.querySelectorAll('button.btn.relative.w-full'),
      ] as HTMLButtonElement[]
    ).map((button, index, array) => {
      if (index === array.length - 1)
        return {
          r: 255,
          g: 255,
          b: 255,
          a: 0,
          available: true,
          button,
        } satisfies WPlaceColor
      const rgb = button.style.background
        .slice(4, -1)
        .split(', ')
        .map((x) => +x)
      return {
        r: rgb[0]!,
        g: rgb[1]!,
        b: rgb[2]!,
        a: 255,
        available: button.children.length === 0,
        button: button,
      }
    })
    // Colors to buy
    const colorsToBuy = new Set<WPlaceColor>()
    for (let y = 0; y < this.pixels.length; y++) {
      for (let x = 0; x < this.pixels[y]!.length; x++) {
        const color = this.getClosestColor(this.pixels[y]![x]!, true)
        if (!color.available) colorsToBuy.add(color)
      }
    }
    const $colors = this.widget.element.querySelector('.colors')!
    $colors.innerHTML = ''
    for (const color of colorsToBuy) {
      const $div = document.createElement('button')
      $colors.append($div)
      $div.style.backgroundColor = `rgb(${color.r} ${color.g} ${color.b})`
      $div.addEventListener('click', () => {
        color.button.click()
      })
    }
  }

  protected waitForUnfocus() {
    return new Promise<void>((resolve) => {
      if (!document.hasFocus()) resolve()
      const origStatus = this.widget.status
      this.widget.status = 'Unfocus window!'
      document.addEventListener(
        'blur',
        () => {
          this.widget.status = origStatus
          setTimeout(resolve, 1)
        },
        {
          once: true,
        },
      )
    })
  }

  /** Process image into pixels array */
  private processImage() {
    if (!this.image) throw new Error('NO_IMAGE')
    const imageCanvas = document.createElement('canvas')
    const imageContext = imageCanvas.getContext('2d')!
    imageCanvas.width = (this.image.width * this.scale) / 100
    imageCanvas.height = (this.image.height * this.scale) / 100
    imageContext.drawImage(
      this.image,
      0,
      0,
      imageCanvas.width,
      imageCanvas.height,
    )
    this.pixels = Array.from(
      { length: imageCanvas.height },
      () => new Array(imageCanvas.width) as WPlaceColor[],
    )
    const data = imageContext.getImageData(
      0,
      0,
      imageCanvas.width,
      imageCanvas.height,
    ).data
    for (let y = 0; y < imageCanvas.height; y++) {
      for (let x = 0; x < imageCanvas.width; x++) {
        const index = (y * imageCanvas.width + x) * 4
        this.pixels[y]![x] = {
          r: data[index]!,
          g: data[index + 1]!,
          b: data[index + 2]!,
          a: data[index + 3]!,
        }
      }
    }
    this.overlay.update()
    this.widget.setDisabled('select-image', false)
    this.widget.setDisabled('draw', false)
    this.overlay.wrapper.classList.remove('hidden')
  }

  /** Get closest available (or unavailable) color */
  private getClosestColor({ r, g, b, a }: Color, allowNotAvailable?: boolean) {
    if (this.colors.length === 0) throw new Error('NO_COLORS')
    if (a < 100) return this.colors.at(-1)!
    let minDelta = Infinity
    let min: WPlaceColor | undefined
    for (let index = 0; index < this.colors.length; index++) {
      const color = this.colors[index]!
      if (!allowNotAvailable && !color.available) continue
      const delta =
        Math.abs(color.r - r) + Math.abs(color.g - g) + Math.abs(color.b - b)
      if (delta < minDelta) {
        minDelta = delta
        min = color
      }
    }
    return min!
  }
}
