# Wplace-bot

## Features

1. Auto draw (still need to click captcha manually)
2. Image overlay
3. Auto image convert/scale
4. Suggests colors to buy
5. Optional captcha bypass

## Installation

1. Install TamperMonkey browser extension: [Chrome](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=en)|[Firefox](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
2. [Open this link](https://github.com/SoundOfTheSky/wplace-bot/raw/refs/heads/main/dist.user.js)
3. Press install
4. Allow user scripts
   1. Chrome: Settings>Extensions>Manage Extensions>Tampermonkey>Details>Allow User Scripts
   2. Firefox: Settings>Extensions and Themes>Tampermonkey>Allow User Scripts

## How to use

![Instruction1](https://github.com/SoundOfTheSky/wplace-bot/raw/refs/heads/main/Instruction.png)

P.S. Don't worry if overlay is bigger than your screen. It will still work.

## Captcha bypass

I recommend using simple autoclicker like this

1. Click "Draw", wait 1 minute (Reading map may take a long time)
2. Click Captcha, wait 5s
3. Click "Paint", wait 30 minutes
4. Repeat

Yes, it works. But don't forget from time to time to check that you're still logged in.

## Known issues

1. Once your session on wesite ends, bot obviously stops
2. Screen with high DPI are unsupported (for now)

## Contribution

1. Install [Bun](https://bun.sh/)
2. Install dependencies `bun i`
3. Up version in `sciprt.txt`
4. Lint `bun run lint`
5. Build `bun start`
