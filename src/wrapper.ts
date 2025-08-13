// @ts-ignore
import html from './wrapper.html' with { type: 'text' }

export class Wrapper {
  /** Moving/resizing overlay */
  public moveInfo?: {
    x: number
    y: number
    originalX: number
    originalY: number
    width?: number
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
    return +(localStorage.getItem(this.localStoragePrefix + 'width') ?? '256')
  }
  public set width(value) {
    localStorage.setItem(this.localStoragePrefix + 'width', value.toString())
    this.wrapper.style.width = `${value}px`
  }

  public wrapper = document.createElement('div')

  public constructor(
    public element: HTMLElement,
    public localStoragePrefix: string,
  ) {
    this.wrapper.classList.add('wbot-wrapper')
    this.wrapper.innerHTML = html as string
    document.body.append(this.wrapper)
    this.wrapper.append(this.element)
    this.wrapper.style.transform = `translate(${this.x}px, ${this.y}px)`
    this.wrapper.style.width = `${this.width}px`

    const $move = this.wrapper.querySelector(
      '.move',
    ) as unknown as HTMLDivElement
    const $resize = this.wrapper.querySelector(
      '.resize',
    ) as unknown as HTMLDivElement
    const $minimize = this.wrapper.querySelector(
      '.minimize',
    ) as unknown as HTMLButtonElement

    $move.addEventListener('mousedown', (event) => {
      if (event.target === $move) this.moveStart(event.clientX, event.clientY)
    })
    $move.addEventListener('wheel', (event) => {
      this.wheel(event.deltaY)
    })
    $resize.addEventListener('mousedown', (event) => {
      this.moveStart(event.clientX, event.clientY, true)
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

  protected moveStart(x: number, y: number, resize?: boolean) {
    this.moveInfo = {
      x: this.x,
      y: this.y,
      originalX: x,
      originalY: y,
      width: resize ? this.width : undefined,
    }
  }

  protected moveStop() {
    this.moveInfo = undefined
  }

  protected move(x: number, y: number) {
    if (!this.moveInfo) return
    if (this.moveInfo.width) {
      this.width = this.moveInfo.width + x - this.moveInfo.originalX
    } else {
      this.x = this.moveInfo.x + x - this.moveInfo.originalX
      this.y = this.moveInfo.y + y - this.moveInfo.originalY
    }
  }

  protected wheel(deltaY: number) {
    this.width += deltaY < 0 ? 1 : -1
  }
}
