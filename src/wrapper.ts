// @ts-ignore
import html from './wrapper.html' with { type: 'text' }

/**
 * This class creates a common wrapper for UI.
 * Allows moving/minimizing/resizing etc.
 * */
export class Wrapper {
  /** Moving/resizing overlay */
  public moveInfo?: {
    x: number
    y: number
    originalX: number
    originalY: number
    width: number
    height: number
    resize?: string
  }

  /** Overlay position */
  public get x() {
    return +(localStorage.getItem(this.localStoragePrefix + 'x') ?? '64')
  }
  public set x(value) {
    localStorage.setItem(this.localStoragePrefix + 'x', value.toString())
    this.wrapper.style.transform = `translate(${this.x}px, ${this.y}px)`
  }

  /** Overlay position */
  public get y() {
    return +(localStorage.getItem(this.localStoragePrefix + 'y') ?? '64')
  }
  public set y(value) {
    localStorage.setItem(this.localStoragePrefix + 'y', value.toString())
    this.wrapper.style.transform = `translate(${this.x}px, ${this.y}px)`
  }

  /** Overlay width */
  public get width() {
    if (this.options.disabledWidthResize) return this.wrapper.clientWidth
    return +(localStorage.getItem(this.localStoragePrefix + 'width') ?? '256')
  }
  public set width(value) {
    if (this.options.disabledWidthResize) return
    localStorage.setItem(this.localStoragePrefix + 'width', value.toString())
    this.wrapper.style.width = `${value}px`
  }

  /** Overlay height */
  public get height() {
    if (this.options.disabledHeightResize) return this.wrapper.clientHeight
    return +(localStorage.getItem(this.localStoragePrefix + 'height') ?? '256')
  }
  public set height(value) {
    if (this.options.disabledHeightResize) return
    localStorage.setItem(this.localStoragePrefix + 'height', value.toString())
    this.wrapper.style.height = `${value}px`
  }

  public wrapper = document.createElement('div')

  public constructor(
    public element: HTMLElement,
    public localStoragePrefix: string,
    protected options: {
      disabledWidthResize?: boolean
      disabledHeightResize?: boolean
    } = {},
  ) {
    this.wrapper.classList.add('wbot-wrapper')
    this.wrapper.innerHTML = html as string
    document.body.append(this.wrapper)
    this.wrapper.append(this.element)
    this.wrapper.style.transform = `translate(${this.x}px, ${this.y}px)`

    if (this.options.disabledWidthResize) {
      this.wrapper.querySelector('.resize.ne')?.remove()
      this.wrapper.querySelector('.resize.e')?.remove()
      this.wrapper.querySelector('.resize.se')?.remove()
      this.wrapper.querySelector('.resize.w')?.remove()
      this.wrapper.querySelector('.resize.sw')?.remove()
      this.wrapper.querySelector('.resize.nw')?.remove()
    } else this.wrapper.style.width = `${this.width}px`
    if (this.options.disabledHeightResize) {
      this.wrapper.querySelector('.resize.ne')?.remove()
      this.wrapper.querySelector('.resize.n')?.remove()
      this.wrapper.querySelector('.resize.se')?.remove()
      this.wrapper.querySelector('.resize.s')?.remove()
      this.wrapper.querySelector('.resize.sw')?.remove()
      this.wrapper.querySelector('.resize.nw')?.remove()
    } else this.wrapper.style.height = `${this.height}px`

    const $move = this.wrapper.querySelector(
      '.move',
    ) as unknown as HTMLDivElement
    const $resizes = this.wrapper.querySelectorAll(
      '.resize',
    ) as unknown as HTMLDivElement[]
    const $minimize = this.wrapper.querySelector(
      '.minimize',
    ) as unknown as HTMLButtonElement

    $move.addEventListener('mousedown', (event) => {
      if (event.target === $move) this.moveStart(event.clientX, event.clientY)
    })
    $move.addEventListener('wheel', (event) => {
      this.wheel(event.deltaY)
    })
    for (const $resize of $resizes)
      $resize.addEventListener('mousedown', (event) => {
        this.moveStart(
          event.clientX,
          event.clientY,
          $resize.className.split(' ').at(-1),
        )
      })
    $minimize.addEventListener('click', () => {
      this.minimize()
    })
    document.addEventListener('mouseup', () => {
      this.moveStop()
    })
    document.addEventListener('mousemove', (event) => {
      if (this.moveInfo) this.move(event.clientX, event.clientY)
    })
  }

  public minimize() {
    this.element.classList.toggle('hidden')
  }

  protected moveStart(x: number, y: number, resize?: string) {
    this.moveInfo = {
      x: this.x,
      y: this.y,
      originalX: x,
      originalY: y,
      width: this.width,
      height: this.height,
      resize,
    }
  }

  protected moveStop() {
    this.moveInfo = undefined
  }

  protected move(x: number, y: number) {
    if (!this.moveInfo) return
    if (this.moveInfo.resize) {
      if (this.moveInfo.resize.includes('w')) {
        this.x = this.moveInfo.x + x - this.moveInfo.originalX
        this.width = this.moveInfo.width - this.x + this.moveInfo.x
      }
      if (this.moveInfo.resize.includes('n')) {
        this.y = this.moveInfo.y + y - this.moveInfo.originalY
        this.height = this.moveInfo.height - this.y + this.moveInfo.y
      }
      if (this.moveInfo.resize.includes('e'))
        this.width = this.moveInfo.width + x - this.moveInfo.originalX
      if (this.moveInfo.resize.includes('s'))
        this.height = this.moveInfo.height + y - this.moveInfo.originalY
    } else {
      this.x = this.moveInfo.x + x - this.moveInfo.originalX
      this.y = this.moveInfo.y + y - this.moveInfo.originalY
    }
  }

  protected wheel(deltaY: number) {
    this.width += deltaY < 0 ? 1 : -1
  }
}
