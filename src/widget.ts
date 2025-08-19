import { WPlaceBot } from './bot'
import { NoImageError, WPlaceBotError } from './errors'
import { wait } from './utilities'
// @ts-ignore
import html from './widget.html' with { type: 'text' }

/** Widget UI with buttons */
export class Widget {
  public x = 64

  public y = 64

  public get status(): string {
    return this.element.querySelector('.wstatus')!.innerHTML
  }

  public set status(value: string) {
    this.element.querySelector('.wstatus')!.innerHTML = value
  }

  public get disabledScreen() {
    return this.disableScreenElement.classList.contains('hidden')
  }
  public set disabledScreen(value: boolean) {
    if (value) this.disableScreenElement.classList.remove('hidden')
    else this.disableScreenElement.classList.add('hidden')
  }

  public element = document.createElement('div')

  protected disableScreenElement = document.createElement('div')

  /** Moving/resizing overlay */
  protected moveInfo?: {
    x: number
    y: number
    originalX: number
    originalY: number
  }

  public constructor(protected bot: WPlaceBot) {
    this.element.classList.add('wbot-widget')
    this.disableScreenElement.classList.add('wbot-disable-screen', 'hidden')
    document.body.append(this.element)
    document.body.append(this.disableScreenElement)
    this.element.innerHTML = html as string
    // Move/minimize
    this.element
      .querySelector<HTMLButtonElement>('.minimize')!
      .addEventListener('click', () => {
        this.minimize()
      })
    const $move = this.element.querySelector<HTMLDivElement>('.move')!
    $move.addEventListener('mousedown', (event) => {
      this.moveStart(event.clientX, event.clientY)
    })
    document.addEventListener('mouseup', () => {
      this.moveStop()
    })
    document.addEventListener('mousemove', (event) => {
      if (this.moveInfo) this.move(event.clientX, event.clientY)
      this.element.style.transform = `translate(${this.x}px, ${this.y}px)`
    })
    this.element.style.transform = `translate(${this.x}px, ${this.y}px)`

    // Button actions
    this.element
      .querySelector('.select-image')!
      .addEventListener('click', () => this.bot.selectImage())
    this.element
      .querySelector('.draw')!
      .addEventListener('click', () => this.bot.draw())
    this.element
      .querySelector('.timer')!
      .addEventListener('click', () => this.timer())
    const $scale = this.element.querySelector<HTMLInputElement>('.scale')!
    $scale.addEventListener('change', () => {
      if (!this.bot.image) return
      this.bot.image.scale = $scale.valueAsNumber
      this.bot.image.update()
      this.bot.overlay.update()
    })
    const $opacity = this.element.querySelector<HTMLInputElement>('.opacity')!
    $opacity.addEventListener('input', () => {
      this.bot.overlay.opacity = $opacity.valueAsNumber
      this.bot.overlay.update()
    })
    this.updateText()
  }

  /** Start Timer */
  public async timer() {
    const $timer = this.element.querySelector<HTMLButtonElement>('.timer')!
    $timer.disabled = true
    try {
      const time = Date.now() + 1000 * 60 * 29
      while (true) {
        const left = time - Date.now()
        if (left <= 0) {
          void new Audio(
            'https://www.myinstants.com/media/sounds/winnerchickendinner.mp3',
          ).play()
          void this.bot.draw()
          break
        }
        $timer.textContent = `${(left / 60_000) | 0}:${((left % 60_000) / 1000) | 0}`
        await wait(1000)
      }
    } finally {
      $timer.disabled = false
      $timer.textContent = 'Set timer'
    }
  }

  /** Disable/enable element by class name */
  public setDisabled(name: string, disabled: boolean) {
    this.element.querySelector<HTMLButtonElement>('.' + name)!.disabled =
      disabled
  }

  /** Draw colors to buy */
  public updateColorsToBuy() {
    if (!this.bot.image) throw new NoImageError(this.bot)
    let sum = 0
    for (let index = 0; index < this.bot.image.colorsToBuy.length; index++)
      sum += this.bot.image.colorsToBuy[index]![1]
    const $colors = this.element.querySelector('.colors')!
    $colors.innerHTML = ''
    for (let index = 0; index < this.bot.image.colorsToBuy.length; index++) {
      const [color, amount] = this.bot.image.colorsToBuy[index]!
      const $div = document.createElement('button')
      $colors.append($div)
      $div.style.backgroundColor = `rgb(${color.r} ${color.g} ${color.b})`
      $div.style.width = (amount / sum) * 100 + '%'
      $div.addEventListener('click', () => {
        document.getElementById(color.buttonId)?.click()
      })
    }
  }

  /** Update values in widget */
  public updateText() {
    if (this.bot.image) this.updateColorsToBuy()
    const maxTasks = this.bot.image
      ? this.bot.image.pixels.length * this.bot.image.pixels[0]!.length
      : 0
    this.element.querySelector<HTMLInputElement>('.scale')!.valueAsNumber =
      this.bot.image?.scale ?? 100
    const doneTasks = maxTasks - this.bot.tasks.length
    const percent = ((doneTasks / maxTasks) * 100) | 0
    this.element.querySelector<HTMLSpanElement>('.eta .value')!.textContent =
      `${(this.bot.tasks.length / 120) | 0}h ${((this.bot.tasks.length % 120) / 2) | 0}m`
    this.element.querySelector<HTMLSpanElement>(
      '.progress .value',
    )!.textContent = `${percent}% ${doneTasks}/${maxTasks}`
    this.element.querySelector<HTMLProgressElement>('progress')!.value = percent
  }

  /** Show status of running task */
  public async runWithStatusAsync<T>(
    status: string,
    run: () => Promise<T>,
    fin?: () => unknown,
    emoji = '⌛',
  ): Promise<T> {
    const originalStatus = this.status
    this.status = `${emoji} ${status}`
    try {
      const result = await run()
      this.status = originalStatus || `✅ ${status}`
      return result
    } catch (error) {
      if (!(error instanceof WPlaceBotError)) {
        console.error(error)
        this.status = `❌ ${status}`
      }
      throw error
    } finally {
      await fin?.()
    }
  }

  protected minimize() {
    this.element.querySelector('.content')!.classList.toggle('hidden')
  }

  protected moveStart(x: number, y: number) {
    this.moveInfo = {
      x: this.x,
      y: this.y,
      originalX: x,
      originalY: y,
    }
  }

  protected moveStop() {
    this.moveInfo = undefined
  }

  protected move(x: number, y: number) {
    if (!this.moveInfo) return
    this.x = this.moveInfo.x + x - this.moveInfo.originalX
    this.y = this.moveInfo.y + y - this.moveInfo.originalY
  }
}
