import { WPlaceBot, WPlaceColor } from './bot'
import { ApiError } from './errors'
import { wait } from './utilities'
// @ts-ignore
import html from './widget.html' with { type: 'text' }
import { Wrapper } from './wrapper'

/** Widget UI with buttons */
export class Widget extends Wrapper {
  declare public element: HTMLDivElement

  public constructor(protected bot: WPlaceBot) {
    super(document.createElement('div'), 'wbot_widget_', {
      disabledHeightResize: true,
    })
    this.element.classList.add('wbot-widget')
    this.element.innerHTML = html as string

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
    const $scale = this.element.querySelector(
      '.scale',
    ) as unknown as HTMLInputElement
    $scale.addEventListener('change', () => {
      this.bot.scale = $scale.value as unknown as number
    })
    $scale.value = this.bot.scale as unknown as string
  }

  public get status(): string {
    return this.element.querySelector('.wstatus')!.innerHTML
  }

  public set status(value: string) {
    this.element.querySelector('.wstatus')!.innerHTML = value
  }

  /** Start Timer */
  public async timer() {
    this.status = '⌛ Setting timer...'
    const $timer = this.element.querySelector(
      '.timer',
    ) as unknown as HTMLButtonElement
    try {
      $timer.disabled = true
      const me = (await fetch('https://backend.wplace.live/me', {
        credentials: 'include',
      }).then((x) => x.json())) as {
        charges: {
          max: number
          count: number
          cooldownMs: number
        }
      }
      const time =
        Date.now() + (me.charges.max - me.charges.count) * me.charges.cooldownMs
      this.status = '✅ Timer set!'
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
    } catch {
      throw new ApiError(this.bot)
    } finally {
      $timer.disabled = false
      $timer.textContent = 'Set timer'
    }
  }

  /** Disable/enable element by class name */
  public setDisabled(name: string, disabled: boolean) {
    ;(
      this.element.querySelector('.' + name) as unknown as HTMLButtonElement
    ).disabled = disabled
  }

  /** Draw colors to buy */
  public setColorsToBuy(colorsToBuy: [WPlaceColor, number][]) {
    let sum = 0
    for (let index = 0; index < colorsToBuy.length; index++)
      sum += colorsToBuy[index]![1]
    const $colors = this.element.querySelector('.colors')!
    $colors.innerHTML = ''
    for (let index = 0; index < colorsToBuy.length; index++) {
      const [color, amount] = colorsToBuy[index]!
      const $div = document.createElement('button')
      $colors.append($div)
      $div.style.backgroundColor = `rgb(${color.r} ${color.g} ${color.b})`
      $div.style.width = (amount / sum) * 100 + '%'
      $div.addEventListener('click', () => {
        color.button.click()
      })
    }
  }
}
