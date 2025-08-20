// ==UserScript==
// @name         wplace-bot
// @namespace    https://github.com/SoundOfTheSky
// @version      3.0.2
// @description  Bot to automate painting on website https://wplace.live
// @author       SoundOfTheSky
// @license      MPL-2.0
// @homepageURL  https://github.com/SoundOfTheSky/wplace-bot
// @updateURL    https://raw.githubusercontent.com/SoundOfTheSky/wplace-bot/refs/heads/main/dist.user.js
// @downloadURL  https://raw.githubusercontent.com/SoundOfTheSky/wplace-bot/refs/heads/main/dist.user.js
// @run-at       document-start
// @match        *://*.wplace.live/*
// @grant        none
// ==/UserScript==

// Wplace  --> https://wplace.live
// License --> https://www.mozilla.org/en-US/MPL/2.0/

// src/errors.ts
class WPlaceBotError extends Error {
  name = "WPlaceBotError";
  constructor(message, bot) {
    super(message);
    bot.widget.status = message;
  }
}

class NoMarkerError extends WPlaceBotError {
  name = "NoMarkerError";
  constructor(bot) {
    super("❌ Place marker on the map", bot);
  }
}

class NoImageError extends WPlaceBotError {
  name = "NoImageError";
  constructor(bot) {
    super("❌ No image is selected", bot);
  }
}

// src/overlay.ts
class Overlay {
  bot;
  element = document.createElement("canvas");
  context = this.element.getContext("2d");
  opacity = 50;
  constructor(bot) {
    this.bot = bot;
    document.body.append(this.element);
    this.element.classList.add("wbot-overlay");
    this.update();
  }
  update() {
    if (!this.bot.image || this.bot.pixelSize === 0 || !this.bot.startScreenPosition) {
      this.element.classList.add("hidden");
      return;
    }
    this.element.classList.remove("hidden");
    this.element.style.transform = `translate(${this.bot.startScreenPosition.x}px, ${this.bot.startScreenPosition.y}px)`;
    this.element.width = this.bot.pixelSize * this.bot.image.pixels[0].length;
    this.element.height = this.bot.pixelSize * this.bot.image.pixels.length;
    this.context.clearRect(0, 0, this.element.width, this.element.height);
    for (let y = 0;y < this.bot.image.pixels.length; y++) {
      const row = this.bot.image.pixels[y];
      for (let x = 0;x < row.length; x++) {
        const pixel = row[x];
        this.context.fillStyle = `rgb(${pixel.r} ${pixel.g} ${pixel.b})`;
        this.context.globalAlpha = pixel.a / 255 * (this.opacity / 100);
        this.context.fillRect(x * this.bot.pixelSize, y * this.bot.pixelSize, this.bot.pixelSize, this.bot.pixelSize);
      }
    }
  }
}

// src/position.ts
var TILE_SIZE = 1000;

class WorldPosition {
  tileX;
  tileY;
  get globalX() {
    return this.tileX * TILE_SIZE + this.x;
  }
  get globalY() {
    return this.tileY * TILE_SIZE + this.y;
  }
  _x;
  get x() {
    return this._x;
  }
  set x(value) {
    if (value >= TILE_SIZE) {
      this.tileX += value / TILE_SIZE | 0;
      this._x = value % TILE_SIZE;
    } else if (value < 0) {
      this.tileX += value / TILE_SIZE + 1 | 0;
      this._x = value % TILE_SIZE + TILE_SIZE;
    } else
      this._x = value;
  }
  _y;
  get y() {
    return this._y;
  }
  set y(value) {
    if (value >= TILE_SIZE) {
      this.tileY += value / TILE_SIZE | 0;
      this._y = value % TILE_SIZE;
    } else if (value < 0) {
      this.tileY += value / TILE_SIZE + 1 | 0;
      this._y = value % TILE_SIZE + TILE_SIZE;
    } else
      this._y = value;
  }
  constructor(tileX, tileY, x, y) {
    this.tileX = tileX;
    this.tileY = tileY;
    this.x = x;
    this.y = y;
  }
  toScreenPosition(startScreenPosition, startPosition, pixelSize) {
    return {
      x: (this.globalX - startPosition.globalX) * pixelSize + startScreenPosition.x + pixelSize / 2,
      y: (this.globalY - startPosition.globalY) * pixelSize + startScreenPosition.y + pixelSize / 2
    };
  }
  clone() {
    return new WorldPosition(this.tileX, this.tileY, this.x, this.y);
  }
  toJSON() {
    return [this.tileX, this.tileY, this.x, this.y];
  }
}

// src/utilities.ts
function wait(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}
var SPACE_EVENT = {
  key: " ",
  code: "Space",
  keyCode: 32,
  which: 32,
  bubbles: true,
  cancelable: true
};
function promisify(target, resolveEvents, rejectEvents) {
  return new Promise((resolve, reject) => {
    for (let index = 0;index < resolveEvents.length; index++)
      target.addEventListener(resolveEvents[index], resolve);
    for (let index = 0;index < rejectEvents.length; index++)
      target.addEventListener(rejectEvents[index], reject);
  });
}

// src/pixels.ts
class Pixels {
  image;
  colors;
  scale;
  pixels;
  colorsToBuy;
  constructor(image, colors, scale = 100) {
    this.image = image;
    this.colors = colors;
    this.scale = scale;
    this.update();
  }
  static async fromSelectImage(bot, colors, scale) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.click();
    await promisify(input, ["change"], ["cancel", "error"]);
    const file = input.files?.[0];
    if (!file)
      throw new NoImageError(bot);
    const reader = new FileReader;
    reader.readAsDataURL(file);
    await promisify(reader, ["load"], ["error"]);
    const image = new Image;
    image.src = reader.result;
    await promisify(image, ["load"], ["error"]);
    return new Pixels(image, colors, scale);
  }
  static async fromURL(url, colors, scale) {
    const image = new Image;
    image.src = await fetch(url).then((x) => x.blob()).then((x) => URL.createObjectURL(x));
    try {
      await promisify(image, ["load"], ["error"]);
    } catch {
      const canvas = document.createElement("canvas");
      canvas.width = TILE_SIZE;
      canvas.height = TILE_SIZE;
      image.src = canvas.toDataURL("image/png");
    }
    return new Pixels(image, colors, scale);
  }
  update() {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const colorsToBuy = new Map;
    const scale = this.scale / 100;
    canvas.width = this.image.width * scale;
    canvas.height = this.image.height * scale;
    context.drawImage(this.image, 0, 0, canvas.width, canvas.height);
    this.pixels = Array.from({ length: canvas.height }, () => new Array(canvas.width));
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let y = 0;y < canvas.height; y++) {
      for (let x = 0;x < canvas.width; x++) {
        const index = (y * canvas.width + x) * 4;
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        const a = data[index + 3];
        if (a < 100) {
          this.pixels[y][x] = this.colors.at(-1);
          continue;
        }
        let minDelta = Infinity;
        let min;
        let minDeltaReal = Infinity;
        let minReal;
        for (let index2 = 0;index2 < this.colors.length; index2++) {
          const color = this.colors[index2];
          const delta = (color.r - r) ** 2 + (color.g - g) ** 2 + (color.b - b) ** 2;
          if (color.available && delta < minDelta) {
            minDelta = delta;
            min = color;
          }
          if (delta < minDeltaReal) {
            minDeltaReal = delta;
            minReal = color;
          }
        }
        this.pixels[y][x] = min;
        if (minReal.buttonId !== min.buttonId)
          colorsToBuy.set(minReal, (colorsToBuy.get(minReal) ?? 0) + 1);
      }
    }
    this.colorsToBuy = [...colorsToBuy.entries()].sort(([, a], [, b]) => b - a);
  }
  toJSON() {
    const canvas = document.createElement("canvas");
    canvas.width = this.image.naturalWidth;
    canvas.height = this.image.naturalHeight;
    const context = canvas.getContext("2d");
    context.drawImage(this.image, 0, 0);
    return canvas.toDataURL("image/webp", 1);
  }
}

// src/widget.html
var widget_default = `<div class="move">
  <button class="minimize">🗕</button>
</div>
<div class="content">
  <button class="select-image">Select image</button>
  <button class="draw" disabled>Draw</button>
  <label class="p">Scale:&nbsp;<input class="scale" type="number" >%</label>
  <label class="p">Opacity:&nbsp;<input class="opacity" type="range" min="0" max="100"></label>
  <div class="colors"></div>
  <div class="eta p">ETA: <span class="value"></span></div>
  <div class="progress p">Progress: <span class="value"></span></div>
  <progress max="100"></progress>
  <div class="wstatus p"></div>
</div>

`;

// src/widget.ts
class Widget {
  bot;
  x = 64;
  y = 64;
  get status() {
    return this.element.querySelector(".wstatus").innerHTML;
  }
  set status(value) {
    this.element.querySelector(".wstatus").innerHTML = value;
  }
  element = document.createElement("div");
  moveInfo;
  constructor(bot) {
    this.bot = bot;
    this.element.classList.add("wbot-widget", "hidden");
    document.body.append(this.element);
    this.element.innerHTML = widget_default;
    this.element.querySelector(".minimize").addEventListener("click", () => {
      this.minimize();
    });
    const $move = this.element.querySelector(".move");
    $move.addEventListener("mousedown", (event) => {
      this.moveStart(event.clientX, event.clientY);
    });
    document.addEventListener("mouseup", () => {
      this.moveStop();
    });
    document.addEventListener("mousemove", (event) => {
      if (this.moveInfo)
        this.move(event.clientX, event.clientY);
      this.element.style.transform = `translate(${this.x}px, ${this.y}px)`;
    });
    this.element.style.transform = `translate(${this.x}px, ${this.y}px)`;
    this.element.querySelector(".select-image").addEventListener("click", () => this.bot.selectImage());
    this.element.querySelector(".draw").addEventListener("click", () => this.bot.draw());
    const $scale = this.element.querySelector(".scale");
    $scale.addEventListener("change", () => {
      if (!this.bot.image)
        return;
      this.bot.image.scale = $scale.valueAsNumber;
      this.bot.image.update();
      this.bot.overlay.update();
    });
    const $opacity = this.element.querySelector(".opacity");
    $opacity.addEventListener("input", () => {
      this.bot.overlay.opacity = $opacity.valueAsNumber;
      this.bot.overlay.update();
    });
    this.updateText();
  }
  setDisabled(name, disabled) {
    this.element.querySelector("." + name).disabled = disabled;
  }
  updateColorsToBuy() {
    if (!this.bot.image)
      throw new NoImageError(this.bot);
    let sum = 0;
    for (let index = 0;index < this.bot.image.colorsToBuy.length; index++)
      sum += this.bot.image.colorsToBuy[index][1];
    const $colors = this.element.querySelector(".colors");
    $colors.innerHTML = "";
    for (let index = 0;index < this.bot.image.colorsToBuy.length; index++) {
      const [color, amount] = this.bot.image.colorsToBuy[index];
      const $div = document.createElement("button");
      $colors.append($div);
      $div.style.backgroundColor = `rgb(${color.r} ${color.g} ${color.b})`;
      $div.style.width = amount / sum * 100 + "%";
      $div.addEventListener("click", async () => {
        await this.bot.openColors();
        document.getElementById(color.buttonId)?.click();
      });
    }
  }
  updateText() {
    if (this.bot.image)
      this.updateColorsToBuy();
    const maxTasks = this.bot.image ? this.bot.image.pixels.length * this.bot.image.pixels[0].length : 0;
    this.element.querySelector(".scale").valueAsNumber = this.bot.image?.scale ?? 100;
    const doneTasks = maxTasks - this.bot.tasks.length;
    const percent = doneTasks / maxTasks * 100 | 0;
    this.element.querySelector(".eta .value").textContent = `${this.bot.tasks.length / 120 | 0}h ${this.bot.tasks.length % 120 / 2 | 0}m`;
    this.element.querySelector(".progress .value").textContent = `${percent}% ${doneTasks}/${maxTasks}`;
    this.element.querySelector("progress").value = percent;
  }
  async runWithStatusAsync(status, run, fin, emoji = "⌛") {
    const originalStatus = this.status;
    this.status = `${emoji} ${status}`;
    try {
      const result = await run();
      this.status = originalStatus || `✅ ${status}`;
      return result;
    } catch (error) {
      if (!(error instanceof WPlaceBotError)) {
        console.error(error);
        this.status = `❌ ${status}`;
      }
      throw error;
    } finally {
      await fin?.();
    }
  }
  minimize() {
    this.element.querySelector(".content").classList.toggle("hidden");
  }
  moveStart(x, y) {
    this.moveInfo = {
      x: this.x,
      y: this.y,
      originalX: x,
      originalY: y
    };
  }
  moveStop() {
    this.moveInfo = undefined;
  }
  move(x, y) {
    if (!this.moveInfo)
      return;
    this.x = this.moveInfo.x + x - this.moveInfo.originalX;
    this.y = this.moveInfo.y + y - this.moveInfo.originalY;
  }
}

// src/bot.ts
class WPlaceBot {
  tasks = [];
  colors = [];
  image;
  startPosition;
  startScreenPosition;
  pixelSize = 64;
  markerPixelDataResolvers = [];
  widget = new Widget(this);
  overlay = new Overlay(this);
  canvas;
  constructor() {
    this.registerFetchInterceptor();
    const interval = setInterval(async () => {
      this.canvas = document.querySelector(".maplibregl-canvas") ?? undefined;
      if (this.canvas && document.querySelector(".btn.btn-primary.btn-lg.relative.z-30 canvas") && document.querySelector(".avatar.center-absolute.absolute")) {
        clearInterval(interval);
        let moving = false;
        this.canvas.addEventListener("wheel", () => {
          if (this.image)
            this.onMove();
        });
        this.canvas.addEventListener("mousedown", (event) => {
          if (event.button === 0)
            moving = true;
        });
        this.canvas.addEventListener("mouseup", (event) => {
          if (event.button === 0)
            moving = false;
        });
        this.canvas.addEventListener("mousemove", () => {
          if (moving)
            this.onMove();
        });
        await this.load();
        this.widget.element.classList.remove("hidden");
      }
    }, 500);
  }
  async selectImage() {
    this.widget.status = "";
    return this.widget.runWithStatusAsync("Selecting image", async () => {
      this.widget.setDisabled("select-image", true);
      await this.updateColors();
      this.image = await Pixels.fromSelectImage(this, this.colors, this.widget.element.querySelector(".scale").valueAsNumber);
      await this.updatePositionsWithMarker();
      await this.updateTasks();
      this.overlay.update();
      this.widget.updateText();
      this.widget.setDisabled("draw", false);
      this.save();
    }, () => {
      this.widget.setDisabled("select-image", false);
    });
  }
  draw() {
    this.widget.status = "";
    const prevent = (event) => {
      if (!event.shiftKey)
        event.stopPropagation();
    };
    globalThis.addEventListener("mousemove", prevent, true);
    return this.widget.runWithStatusAsync("Drawing", async () => {
      this.widget.setDisabled("draw", true);
      await this.updateColors();
      await this.updateTasks();
      while (this.tasks.length > 0 && !document.querySelector("ol")) {
        const index = Math.random() * this.tasks.length | 0;
        const task = this.tasks.splice(index, 1)[0];
        document.getElementById(task.buttonId).click();
        document.documentElement.dispatchEvent(new MouseEvent("mousemove", {
          bubbles: true,
          clientX: task.x,
          clientY: task.y,
          shiftKey: true
        }));
        document.documentElement.dispatchEvent(new KeyboardEvent("keydown", SPACE_EVENT));
        document.documentElement.dispatchEvent(new KeyboardEvent("keyup", SPACE_EVENT));
        await wait(1);
      }
      this.widget.updateText();
      this.save();
    }, () => {
      globalThis.removeEventListener("mousemove", prevent, true);
      this.widget.setDisabled("draw", false);
    });
  }
  save() {
    if (!this.image || !this.startPosition || !this.startScreenPosition) {
      localStorage.removeItem("wbot");
      return;
    }
    localStorage.setItem("wbot", JSON.stringify({
      image: this.image,
      startScreenPosition: this.startScreenPosition,
      startPosition: this.startPosition,
      pixelSize: this.pixelSize,
      widgetX: this.widget.x,
      widgetY: this.widget.y,
      overlayOpacity: this.overlay.opacity,
      scale: this.image.scale
    }));
  }
  async load() {
    const json = localStorage.getItem("wbot");
    if (!json)
      return;
    try {
      const data = JSON.parse(json);
      this.startPosition = new WorldPosition(...data.startPosition);
      this.startScreenPosition = data.startScreenPosition;
      this.pixelSize = data.pixelSize;
      await this.updateColors();
      this.image = await Pixels.fromURL(data.image, this.colors, data.scale);
      this.widget.element.querySelector(".scale").valueAsNumber = data.scale;
      this.overlay.opacity = data.overlayOpacity;
      this.widget.element.querySelector(".scale").valueAsNumber = data.overlayOpacity;
      await this.updateTasks();
      this.widget.updateText();
      this.widget.updateColorsToBuy();
      this.overlay.update();
      this.widget.setDisabled("draw", false);
    } catch {
      localStorage.removeItem("wbot");
      this.widget.status = "❌ Failed to load save";
    }
  }
  async openColors() {
    document.querySelector(".flex.gap-2.px-3 > .btn-circle")?.click();
    await wait(1);
    document.querySelector(".btn.btn-primary.btn-lg.relative.z-30")?.click();
    await wait(1);
    const unfoldColors = document.querySelector("button.bottom-0");
    if (unfoldColors?.innerHTML === '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor" class="size-5"><path d="M480-120 300-300l58-58 122 122 122-122 58 58-180 180ZM358-598l-58-58 180-180 180 180-58 58-122-122-122 122Z"></path></svg><!---->') {
      unfoldColors.click();
      await wait(1);
    }
  }
  updatePositionsWithMarker() {
    return this.widget.runWithStatusAsync("Aligning", async () => {
      document.querySelector(".flex.items-center .btn.btn-circle.btn-sm:nth-child(3)")?.click();
      this.startPosition = await this.widget.runWithStatusAsync("Place marker", async () => new Promise((resolve) => this.markerPixelDataResolvers.push(resolve)), undefined, "\uD83D\uDDB1️");
      this.startScreenPosition = this.getMarkerScreenPosition();
      const markerPosition2Promise = new Promise((resolve) => {
        this.markerPixelDataResolvers.push(resolve);
      });
      await this.clickMapAtPosition({
        x: this.canvas.width - 1,
        y: this.canvas.height - 1
      });
      const markerPosition2 = await markerPosition2Promise;
      const markerScreenPosition2 = this.getMarkerScreenPosition();
      this.pixelSize = (markerScreenPosition2.x - this.startScreenPosition.x) / (markerPosition2.globalX - this.startPosition.globalX);
      this.startScreenPosition.x -= this.pixelSize / 2;
    });
  }
  updateTasks() {
    return this.widget.runWithStatusAsync("Map reading", async () => {
      if (!this.startPosition || !this.startScreenPosition)
        throw new NoMarkerError(this);
      if (!this.image)
        throw new NoImageError(this);
      this.tasks = [];
      const maps = new Map;
      for (let y = 0;y < this.image.pixels.length; y++) {
        for (let x = 0;x < this.image.pixels[0].length; x++) {
          const color = this.image.pixels[y][x];
          const position = this.startPosition.clone();
          position.x += x;
          position.y += y;
          let map = maps.get(position.tileX + "/" + position.tileY);
          if (!map) {
            map = await Pixels.fromURL(`https://backend.wplace.live/files/s0/tiles/${position.tileX}/${position.tileY}.png`, this.colors);
            maps.set(position.tileX + "/" + position.tileY, map);
          }
          const colorOnMap = map.pixels[position.y][position.x];
          if (color.buttonId !== colorOnMap.buttonId)
            this.tasks.push({
              ...position.toScreenPosition(this.startScreenPosition, this.startPosition, this.pixelSize),
              buttonId: color.buttonId
            });
        }
      }
    });
  }
  async clickMapAtPosition(screenPosition) {
    await this.waitForUnfocus();
    this.canvas?.dispatchEvent(new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      clientX: screenPosition.x,
      clientY: screenPosition.y,
      button: 0
    }));
    await wait(1);
  }
  updateColors() {
    return this.widget.runWithStatusAsync("Colors update", async () => {
      await this.openColors();
      this.colors = [
        ...document.querySelectorAll("button.btn.relative.w-full")
      ].map((button, index, array) => {
        if (index === array.length - 1)
          return {
            r: 255,
            g: 255,
            b: 255,
            a: 0,
            available: true,
            buttonId: button.id
          };
        const rgb = button.style.background.slice(4, -1).split(", ").map((x) => +x);
        return {
          r: rgb[0],
          g: rgb[1],
          b: rgb[2],
          a: 255,
          available: button.children.length === 0,
          buttonId: button.id
        };
      });
    });
  }
  waitForUnfocus() {
    return this.widget.runWithStatusAsync("Unfocus window!", () => new Promise((resolve) => {
      if (!document.hasFocus())
        resolve();
      window.addEventListener("blur", () => {
        setTimeout(resolve, 1);
      }, {
        once: true
      });
    }), undefined, "\uD83D\uDDB1️");
  }
  registerFetchInterceptor() {
    const originalFetch = globalThis.fetch;
    const pixelRegExp = /https:\/\/backend.wplace.live\/s\d+\/pixel\/(\d+)\/(\d+)\?x=(\d+)&y=(\d+)/;
    globalThis.fetch = async (...arguments_) => {
      const response = await originalFetch(...arguments_);
      const url = typeof arguments_[0] === "string" ? arguments_[0] : arguments_[0].url;
      setTimeout(() => {
        const pixelMatch = pixelRegExp.exec(url);
        if (pixelMatch) {
          for (let index = 0;index < this.markerPixelDataResolvers.length; index++)
            this.markerPixelDataResolvers[index](new WorldPosition(+pixelMatch[1], +pixelMatch[2], +pixelMatch[3], +pixelMatch[4]));
          this.markerPixelDataResolvers.length = 0;
          return;
        }
      }, 0);
      return response;
    };
  }
  getMarkerScreenPosition() {
    const marker = document.querySelector(".maplibregl-marker.z-20");
    if (!marker)
      throw new NoMarkerError(this);
    const rect = marker.getBoundingClientRect();
    return {
      x: rect.width / 2 + rect.left,
      y: rect.bottom - 7
    };
  }
  onMove() {
    if (!this.image || !this.startPosition)
      return;
    this.startPosition = undefined;
    this.startScreenPosition = undefined;
    this.pixelSize = 0;
    this.image = undefined;
    this.tasks.length = 0;
    this.overlay.update();
    this.widget.updateText();
    this.widget.setDisabled("draw", true);
  }
}

// src/style.css
var style_default = `:root {
  --background: #ffffff;
  --disabled: #c2c2c2;
  --hover: #dfdfdf;
  --main-hover: #2580ff;
  --main: #0069ff;
  --text-invert: #ffffff;
  --text: #394e6a;
}

.wbot-widget {
  background-color: var(--background);
  color: var(--text);
  left: 0;
  position: fixed;
  top: 0;
  width: 256px;
  z-index: 9998;
}
.wbot-widget .content > * {
  align-items: center;
  display: flex;
  height: 24px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  width: 100%;
}
.wbot-widget button,
.wbot-widget input {
  align-items: center;
  cursor: pointer;
  display: flex;
  height: 24px;
  justify-content: center;
  padding: 0 4px;
  width: 100%;
}
.wbot-widget button:hover,
.wbot-widget input:hover {
  background-color: var(--hover);
  transition: background-color 0.5s;
}
.wbot-widget button:disabled,
.wbot-widget input:disabled {
  background-color: var(--disabled);
  cursor: no-drop;
}
.wbot-widget .p {
  padding: 0 8px;
}
.wbot-widget .move {
  background-color: var(--main);
  color: var(--text-invert);
  cursor: all-scroll;
  width: 100%;
}
.wbot-widget .move .minimize {
  margin-left: auto;
  width: 24px;
}
.wbot-widget .move .minimize:hover {
  background-color: var(--main-hover);
}
.wbot-widget .scale {
  width: 80px;
}


.hidden {
  display: none;
}

.wbot-overlay {
  border: 1px solid var(--main);
  left: 0;
  pointer-events: none;
  position: fixed;
  top: 0;
  z-index: 9998;
}`;

// src/index.ts
var style = document.createElement("style");
style.textContent = style_default;
document.head.append(style);
new WPlaceBot;
