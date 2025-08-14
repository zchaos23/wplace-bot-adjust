import { WPlaceBot } from './bot'
import { wait } from './utilities'
// @ts-ignore
import html from './widget.html' with { type: 'text' }
import { Wrapper } from './wrapper'

export class Widget extends Wrapper {
  declare public element: HTMLDivElement

  public constructor(protected parent: WPlaceBot) {
    super(document.createElement('div'), 'wbot_widget_')
    this.element.classList.add('wbot-widget')
    this.element.innerHTML = html as string

    // Button actions
    this.element
      .querySelector('.select-image')!
      .addEventListener('click', () => this.parent.selectImage())
    this.element
      .querySelector('.draw')!
      .addEventListener('click', () => this.parent.draw())
    this.element
      .querySelector('.timer')!
      .addEventListener('click', () => this.timer())
  }

  public get status(): string {
    return this.element.querySelector('.wstatus')!.innerHTML
  }

  public set status(value: string) {
    this.element.querySelector('.wstatus')!.innerHTML = value
  }

  /** Start Timer */
  public async timer() {
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
      while (true) {
        const left = time - Date.now()
        if (left <= 0) {
          void new Audio(
            'https://www.myinstants.com/media/sounds/winnerchickendinner.mp3',
          ).play()
          void this.parent.draw()
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

  public setDisabled(name: string, disabled: boolean) {
    ;(
      this.element.querySelector('.' + name) as unknown as HTMLButtonElement
    ).disabled = disabled
  }

  public async align() {
    const pixelsWidth = this.parent.pixels[0]?.length
    if (!pixelsWidth) return
    function getPixelPosition() {
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
    function getMarkerPosition() {
      const marker = document.querySelector(
        '.maplibregl-marker.z-20',
      ) as unknown as undefined | HTMLDivElement
      if (!marker) throw new Error('NO_MARKER')
      const rect = marker.getBoundingClientRect()
      return {
        x: rect.width / 2 + rect.left,
        y: rect.bottom,
      }
    }
    function distance(a: number, b: number) {
      const direct = Math.abs(a - b)
      return Math.min(direct, 4000 - direct)
    }
    const markerPos1 = getMarkerPosition()
    const pixelPos1 = getPixelPosition()
    await this.parent.clickCanvas(window.innerWidth - 1, markerPos1.y)
    const markerPos2 = getMarkerPosition()
    const pixelPos2 = getPixelPosition()
    const pixelSize =
      (markerPos2.x - markerPos1.x) / distance(pixelPos2.x, pixelPos1.x)
    this.parent.overlay.x = markerPos1.x - pixelSize / 2
    this.parent.overlay.y = markerPos1.y - 16 - 7 // I don't know why it always 6-8 pixels lower when it should be
    this.parent.overlay.width = pixelsWidth * pixelSize
  }
}
