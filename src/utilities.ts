/** setTimeout Promisify */
export function wait(time: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, time))
}

export function pixelMapDistance(a: number, b: number) {
  const direct = Math.abs(a - b)
  return Math.min(direct, 4000 - direct)
}

export const SPACE_EVENT = {
  key: ' ',
  code: 'Space',
  keyCode: 32,
  which: 32,
  bubbles: true,
  cancelable: true,
}

export function promisify<T = unknown>(
  target: EventTarget,
  resolveEvents: string[],
  rejectEvents: string[],
): Promise<T> {
  return new Promise((resolve, reject) => {
    for (let index = 0; index < resolveEvents.length; index++)
      // @ts-ignore
      target.addEventListener(resolveEvents[index]!, resolve)
    for (let index = 0; index < rejectEvents.length; index++)
      target.addEventListener(rejectEvents[index]!, reject)
  })
}