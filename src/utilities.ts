import { Position, Strategy } from './types'

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

export function* strategyPositionIterator(
  height: number,
  width: number,
  strategy: Strategy,
): Generator<Position> {
  switch (strategy) {
    case Strategy.DOWN: {
      for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) yield { x, y }
      break
    }
    case Strategy.UP: {
      for (let y = height - 1; y >= 0; y--)
        for (let x = 0; x < width; x++) yield { x, y }
      break
    }
    case Strategy.LEFT: {
      for (let x = 0; x < width; x++)
        for (let y = 0; y < height; y++) yield { x, y }
      break
    }
    case Strategy.RIGHT: {
      for (let x = width - 1; x >= 0; x--)
        for (let y = 0; y < height; y++) yield { x, y }
      break
    }
    case Strategy.RANDOM: {
      const positions: Position[] = []
      for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) positions.push({ x, y })
      for (let index = positions.length - 1; index >= 0; index--) {
        const index_ = Math.floor(Math.random() * (index + 1))
        const temporary = positions[index]!
        positions[index] = positions[index_]!
        positions[index_] = temporary
      }
      yield* positions
      break
    }

    case Strategy.SPIRAL_FROM_CENTER:
    case Strategy.SPIRAL_TO_CENTER: {
      const visited = new Set<string>()
      const total = width * height
      let x = Math.floor(width / 2)
      let y = Math.floor(height / 2)
      const directories = [
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1],
      ]
      let directionIndex = 0
      let steps = 1
      const inBounds = (x: number, y: number) =>
        x >= 0 && x < width && y >= 0 && y < height
      const emit = function* () {
        let count = 0
        while (count < total) {
          for (let twice = 0; twice < 2; twice++) {
            for (let index = 0; index < steps; index++) {
              if (inBounds(x, y)) {
                const key = `${x},${y}`
                if (!visited.has(key)) {
                  visited.add(key)
                  yield { x, y }
                  count++
                  if (count >= total) return
                }
              }
              x += directories[directionIndex]![0]!
              y += directories[directionIndex]![1]!
            }
            directionIndex = (directionIndex + 1) % 4
          }
          steps++
        }
      }

      if (strategy === Strategy.SPIRAL_FROM_CENTER) yield* emit()
      else {
        const collected = [...emit()]
        for (let index = collected.length - 1; index >= 0; index--)
          yield collected[index]!
      }
      break
    }
  }
}
