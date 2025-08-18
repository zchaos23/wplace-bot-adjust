export type WPlaceMe = {
  charges: {
    max: number
    count: number
    cooldownMs: number
  }
}

export type WPlaceColor = {
  r: number
  g: number
  b: number
  a: number
  available: boolean
  buttonId: string
}

export type Position = {
  x: number
  y: number
}

export type DrawTask = Position & {
  buttonId: string
}

export type Save = {
  image: string
  startScreenPosition: Position
  startPosition: [number, number, number, number]
  pixelSize: number
  widgetX: number
  widgetY: number
  overlayOpacity: number
  scale: number
}
