# Wplace-bot

## Features

1. Image overlay
2. Auto draw (still need to click captcha manually)
3. Auto image convert to available colors
4. Suggests colors to buy
5. Set timer until pixels are restored

## Installation

1. Install TamperMonkey browser extension: [Chrome](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=en)|[Firefox](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
2. [Open this link](https://github.com/SoundOfTheSky/wplace-bot/raw/refs/heads/main/dist.user.js)
3. Press install

## How to use

![Instruction1](https://github.com/SoundOfTheSky/wplace-bot/raw/refs/heads/main/Instruction1.png)
![Instruction2](https://github.com/SoundOfTheSky/wplace-bot/raw/refs/heads/main/Instruction2.png)

## Captcha bypass

I recommend using simple autoclicker like this

1. Click "Draw"
2. Click on URL to unfocus window, wait 5s
3. Click Captcha, wait 5s
4. Click "Paint", wait 5s
5. Repeat every 30 minutes

Yes, it works. But don't forget from time to time to check that you're still logged in.

## Known issues

1. It's not quite clear when to unfocus window
2. Bot doesn't know what colors are already drawn
3. Once your session on wesite ends, bot obviously stops

## Contribution

1. Install [Bun](https://bun.sh/)
2. Install dependencies `bun i`
3. Up version in `sciprt.txt`
4. Lint `bun run lint`
5. Build `bun start`
