import { WPlaceBot } from './bot'

export class WPlaceBotError extends Error {
  public name = 'ValidationError'
  public constructor(message: string, bot: WPlaceBot) {
    super(message)
    bot.widget.status = message
  }
}

export class NoMarkerError extends WPlaceBotError {
  public name = 'NoMarkerError'
  public constructor(bot: WPlaceBot) {
    super('❌ Place marker on the map', bot)
  }
}

export class NoImageError extends WPlaceBotError {
  public name = 'NoImageError'
  public constructor(bot: WPlaceBot) {
    super('❌ No image is selected', bot)
  }
}

export class NoColorsError extends WPlaceBotError {
  public name = 'NoColorsError'
  public constructor(bot: WPlaceBot) {
    super('❌ Can not read colors panel', bot)
  }
}

export class ApiError extends WPlaceBotError {
  public name = 'ApiError'
  public constructor(bot: WPlaceBot) {
    super('❌ Can not connect to server', bot)
  }
}
