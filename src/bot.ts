import { NoImageError, NoMarkerError } from './errors'
import { Overlay } from './overlay'
import { Pixels } from './pixels'
import { WorldPosition } from './position'
import { DrawTask, Position, Save, WPlaceColor } from './types'
import { SPACE_EVENT, wait } from './utilities'
import { Widget } from './widget'

/**
 * Main class. Initializes everything.
 * Used to interact with wplace
 * */
export class WPlaceBot {
  /** Pixels left to draw */
  public tasks: DrawTask[] = []

  /** WPlace colors. Update with updateColors() */
  public colors: WPlaceColor[] = []

  /** Image pixels */
  public image?: Pixels

  /** Position of image to draw */
  public startPosition?: WorldPosition

  /** Screen position of starting pixel */
  public startScreenPosition?: Position

  /** Estimated pixel size */
  public pixelSize = 64

  /** Used to wait for pixel data on marker set */
  protected markerPixelDataResolvers: ((position: WorldPosition) => unknown)[] =
    []

  public widget = new Widget(this)

  public overlay = new Overlay(this)

  private canvas?: HTMLCanvasElement

  public constructor() {
    this.registerFetchInterceptor()
    const interval = setInterval(() => {
      this.canvas =
        document.querySelector<HTMLCanvasElement>('.maplibregl-canvas') ??
        undefined
      // Check tfor paint and canvas
      if (
        this.canvas &&
        document.querySelector('.btn.btn-primary.btn-lg.relative.z-30 canvas')
      ) {
        let moving = false
        this.canvas.addEventListener('wheel', () => {
          if (this.image) this.onMove()
        })
        this.canvas.addEventListener('mousedown', (event) => {
          if (event.button === 0) moving = true
        })
        this.canvas.addEventListener('mouseup', (event) => {
          if (event.button === 0) moving = false
        })
        this.canvas.addEventListener('mousemove', () => {
          if (moving) this.onMove()
        })
        void this.load()
        clearInterval(interval)
      }
    }, 100)
  }

  /** Handles selectImage button press */
  public async selectImage() {
    return this.widget.runWithStatusAsync(
      'Selecting image',
      async () => {
        this.widget.setDisabled('select-image', true)
        await this.updateColors()
        this.image = await Pixels.fromSelectImage(
          this,
          this.colors,
          this.widget.element.querySelector<HTMLInputElement>('.scale')!
            .valueAsNumber,
        )
        await this.updatePositionsWithMarker()
        await this.updateTasks()
        this.overlay.update()
        this.widget.updateText()
        this.widget.setDisabled('draw', false)
        this.save()
      },
      () => {
        this.widget.setDisabled('select-image', false)
      },
    )
  }

  /** Start drawing */
  public draw() {
    return this.widget.runWithStatusAsync(
      'Drawing',
      async () => {
        this.widget.disabledScreen = true
        this.widget.setDisabled('draw', true)
        await this.updateColors()
        await this.updateTasks()
        while (this.tasks.length > 0 && !document.querySelector('ol')) {
          const index = (Math.random() * this.tasks.length) | 0
          const task = this.tasks.splice(index, 1)[0]!
          ;(document.getElementById(task.buttonId) as HTMLButtonElement).click()
          await wait(1)
          this.canvas!.dispatchEvent(
            new MouseEvent('mousemove', {
              bubbles: true,
              clientX: task.x,
              clientY: task.y,
            }),
          )
          await wait(1)
          this.canvas!.dispatchEvent(new KeyboardEvent('keydown', SPACE_EVENT))
          await wait(1)
          this.canvas!.dispatchEvent(new KeyboardEvent('keyup', SPACE_EVENT))
          await wait(1)
        }
        this.widget.updateText()
        this.save()
      },
      () => {
        this.widget.disabledScreen = false
        this.widget.setDisabled('draw', false)
      },
    )
  }

  /** Save data to localStorage */
  public save() {
    if (!this.image || !this.startPosition || !this.startScreenPosition) {
      localStorage.removeItem('wbot')
      return
    }
    localStorage.setItem(
      'wbot',
      JSON.stringify({
        image: this.image,
        startScreenPosition: this.startScreenPosition,
        startPosition: this.startPosition,
        pixelSize: this.pixelSize,
        widgetX: this.widget.x,
        widgetY: this.widget.y,
        overlayOpacity: this.overlay.opacity,
        scale: this.image.scale,
      }),
    )
  }

  public async load() {
    const json = localStorage.getItem('wbot')!
    if (!json) return
    const data = JSON.parse(json) as Save
    this.startPosition = new WorldPosition(...data.startPosition)
    this.startScreenPosition = data.startScreenPosition
    this.pixelSize = data.pixelSize
    await this.updateColors()
    this.image = await Pixels.fromURL(data.image, this.colors, data.scale)
    this.widget.element.querySelector<HTMLInputElement>(
      '.scale',
    )!.valueAsNumber = data.scale
    this.overlay.opacity = data.overlayOpacity
    this.widget.element.querySelector<HTMLInputElement>(
      '.scale',
    )!.valueAsNumber = data.overlayOpacity
    this.widget.updateText()
    this.widget.updateColorsToBuy()
    this.overlay.update()
    this.widget.setDisabled('draw', false)
  }

  /** Estimates map position, pixels and aligns overlay */
  protected updatePositionsWithMarker() {
    return this.widget.runWithStatusAsync(
      'Aligning',
      async () => {
        // Close colors for easy marker placement
        document
          .querySelector<HTMLButtonElement>(
            '.flex.items-center .btn.btn-circle.btn-sm:nth-child(3)',
          )
          ?.click()
        // Wait for user to place marker
        this.startPosition = await this.widget.runWithStatusAsync(
          'Place marker',
          async () =>
            new Promise<WorldPosition>((resolve) =>
              this.markerPixelDataResolvers.push(resolve),
            ),
          undefined,
          '🖱️',
        )
        this.widget.disabledScreen = true
        this.startScreenPosition = this.getMarkerScreenPosition()

        // Point 2
        const markerPosition2Promise = new Promise<WorldPosition>((resolve) => {
          this.markerPixelDataResolvers.push(resolve)
        })
        await this.clickMapAtPosition({
          x: this.canvas!.width - 1,
          y: this.canvas!.height - 1,
        })
        const markerPosition2 = await markerPosition2Promise
        const markerScreenPosition2 = this.getMarkerScreenPosition()
        // Point 1 again
        this.pixelSize =
          (markerScreenPosition2.x - this.startScreenPosition.x) /
          (markerPosition2.globalX - this.startPosition.globalX)
        this.startScreenPosition.x -= this.pixelSize / 2
      },
      () => {
        this.widget.disabledScreen = false
      },
    )
  }

  /** Calculates everything we need to do. Very expensive task! */
  protected updateTasks() {
    return this.widget.runWithStatusAsync('Map reading', async () => {
      if (!this.startPosition || !this.startScreenPosition)
        throw new NoMarkerError(this)
      if (!this.image) throw new NoImageError(this)
      this.tasks = []
      const maps = new Map<string, Pixels>()
      for (let y = 0; y < this.image.pixels.length; y++) {
        for (let x = 0; x < this.image.pixels[0]!.length; x++) {
          const color = this.image.pixels[y]![x]!
          const position = this.startPosition.clone()
          position.x += x
          position.y += y
          let map = maps.get(position.tileX + '/' + position.tileY)
          if (!map) {
            map = await Pixels.fromURL(
              `https://backend.wplace.live/files/s0/tiles/${position.tileX}/${position.tileY}.png`,
              this.colors,
            )
            maps.set(position.tileX + '/' + position.tileY, map)
          }
          const colorOnMap = map.pixels[position.y]![position.x]!
          if (color.buttonId !== colorOnMap.buttonId)
            this.tasks.push({
              ...position.toScreenPosition(
                this.startScreenPosition,
                this.startPosition,
                this.pixelSize,
              ),
              buttonId: color.buttonId,
            })
        }
      }
    })
  }

  /** Click map at the screen position */
  protected async clickMapAtPosition(screenPosition: Position) {
    await this.waitForUnfocus()
    this.canvas?.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: screenPosition.x,
        clientY: screenPosition.y,
        button: 0,
      }),
    )
    await wait(1)
  }

  /** Read colors */
  protected updateColors() {
    return this.widget.runWithStatusAsync('Colors update', async () => {
      // Click close marker
      document
        .querySelector<HTMLButtonElement>('.flex.gap-2.px-3 > .btn-circle')
        ?.click()
      await wait(1)
      // Click "Paint"
      document
        .querySelector<HTMLButtonElement>(
          '.btn.btn-primary.btn-lg.relative.z-30',
        )
        ?.click()
      await wait(1)
      // Click Unfold colors if folded
      const unfoldColors =
        document.querySelector<HTMLButtonElement>('button.bottom-0')
      if (
        unfoldColors?.innerHTML ===
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
            buttonId: button.id,
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
          buttonId: button.id,
        } satisfies WPlaceColor
      })
    })
  }

  /** Wait until window is unfocused */
  protected waitForUnfocus() {
    return this.widget.runWithStatusAsync(
      'Unfocus window!',
      () =>
        new Promise<void>((resolve) => {
          if (!document.hasFocus()) resolve()
          window.addEventListener(
            'blur',
            () => {
              setTimeout(resolve, 1)
            },
            {
              once: true,
            },
          )
        }),
      undefined,
      '🖱️',
    )
  }

  /** Start listening to fetch requests */
  protected registerFetchInterceptor() {
    const originalFetch = globalThis.fetch
    const pixelRegExp =
      /https:\/\/backend.wplace.live\/s\d+\/pixel\/(\d+)\/(\d+)\?x=(\d+)&y=(\d+)/
    globalThis.fetch = async (...arguments_) => {
      const response = await originalFetch(...arguments_)
      const url =
        typeof arguments_[0] === 'string'
          ? arguments_[0]
          : (arguments_[0] as Request).url
      setTimeout(() => {
        const pixelMatch = pixelRegExp.exec(url)
        if (pixelMatch) {
          for (
            let index = 0;
            index < this.markerPixelDataResolvers.length;
            index++
          )
            this.markerPixelDataResolvers[index]!(
              new WorldPosition(
                +pixelMatch[1]!,
                +pixelMatch[2]!,
                +pixelMatch[3]!,
                +pixelMatch[4]!,
              ),
            )
          this.markerPixelDataResolvers.length = 0
          return
        }
      }, 0)
      return response
    }
  }

  /** Get position of marker on screen */
  protected getMarkerScreenPosition() {
    const marker = document.querySelector<HTMLDivElement>(
      '.maplibregl-marker.z-20',
    )
    if (!marker) throw new NoMarkerError(this)
    const rect = marker.getBoundingClientRect()
    return {
      x: rect.width / 2 + rect.left,
      y: rect.bottom - 7,
    }
  }

  /** Clear data on move */
  protected onMove() {
    if (!this.image || !this.startPosition) return
    this.startPosition = undefined
    this.startScreenPosition = undefined
    this.pixelSize = 0
    this.image = undefined
    this.tasks.length = 0
    this.overlay.update()
    this.widget.updateText()
  }
}
