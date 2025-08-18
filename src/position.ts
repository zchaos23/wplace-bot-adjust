import { Position } from './types'

export const TILE_SIZE = 1000
export class WorldPosition {
  public get globalX() {
    return this.tileX * TILE_SIZE + this.x
  }

  public get globalY() {
    return this.tileY * TILE_SIZE + this.y
  }

  private _x!: number
  public get x(): number {
    return this._x
  }
  public set x(value: number) {
    if (value >= TILE_SIZE) {
      this.tileX += (value / TILE_SIZE) | 0
      this._x = value % TILE_SIZE
    } else if (value < 0) {
      this.tileX += (value / TILE_SIZE + 1) | 0
      this._x = (value % TILE_SIZE) + TILE_SIZE
    } else this._x = value
  }

  private _y!: number
  public get y(): number {
    return this._y
  }
  public set y(value: number) {
    if (value >= TILE_SIZE) {
      this.tileY += (value / TILE_SIZE) | 0
      this._y = value % TILE_SIZE
    } else if (value < 0) {
      this.tileY += (value / TILE_SIZE + 1) | 0
      this._y = (value % TILE_SIZE) + TILE_SIZE
    } else this._y = value
  }

  public constructor(
    public tileX: number,
    public tileY: number,
    x: number,
    y: number,
  ) {
    this.x = x
    this.y = y
  }

  public toScreenPosition(
    startScreenPosition: Position,
    startPosition: WorldPosition,
    pixelSize: number,
  ): Position {
    return {
      x:
        (this.globalX - startPosition.globalX) * pixelSize +
        startScreenPosition.x +
        pixelSize / 2,
      y:
        (this.globalY - startPosition.globalY) * pixelSize +
        startScreenPosition.y +
        pixelSize / 2,
    }
  }

  public clone() {
    return new WorldPosition(this.tileX, this.tileY, this.x, this.y)
  }

  public toJSON() {
    return [this.tileX, this.tileY, this.x, this.y]
  }
}
