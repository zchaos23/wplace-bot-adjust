/** setTimeout Promisify */
export function wait(time: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, time))
}

export const SPACE_EVENT = {
  key: ' ',
  code: 'Space',
  keyCode: 32,
  which: 32,
  bubbles: true,
  cancelable: true,
}

/** Wait until window is unfocused */
export function waitForUnfocus() {
  return new Promise<void>((resolve) => {
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
  })
}
