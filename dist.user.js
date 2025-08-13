// ==UserScript==
// @name         wplace-bot
// @namespace    https://github.com/SoundOfTheSky
// @version      2.0.0
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

// src/wrapper.html
var wrapper_default = `<div class="move">
  <button class="minimize">🗕</button>
  <div class="resize"></div>
</div>`;

// src/wrapper.ts
class Wrapper {
  element;
  localStoragePrefix;
  moveInfo;
  get x() {
    return +(localStorage.getItem(this.localStoragePrefix + "x") ?? "64");
  }
  set x(value) {
    localStorage.setItem(this.localStoragePrefix + "x", value.toString());
    this.wrapper.style.transform = `translate(${this.x}px, ${this.y}px)`;
  }
  get y() {
    return +(localStorage.getItem(this.localStoragePrefix + "y") ?? "64");
  }
  set y(value) {
    localStorage.setItem(this.localStoragePrefix + "y", value.toString());
    this.wrapper.style.transform = `translate(${this.x}px, ${this.y}px)`;
  }
  get width() {
    return +(localStorage.getItem(this.localStoragePrefix + "width") ?? "256");
  }
  set width(value) {
    localStorage.setItem(this.localStoragePrefix + "width", value.toString());
    this.wrapper.style.width = `${value}px`;
  }
  wrapper = document.createElement("div");
  constructor(element, localStoragePrefix) {
    this.element = element;
    this.localStoragePrefix = localStoragePrefix;
    this.wrapper.classList.add("wbot-wrapper");
    this.wrapper.innerHTML = wrapper_default;
    document.body.append(this.wrapper);
    this.wrapper.append(this.element);
    this.wrapper.style.transform = `translate(${this.x}px, ${this.y}px)`;
    this.wrapper.style.width = `${this.width}px`;
    const $move = this.wrapper.querySelector(".move");
    const $resize = this.wrapper.querySelector(".resize");
    const $minimize = this.wrapper.querySelector(".minimize");
    $move.addEventListener("mousedown", (event) => {
      if (event.target === $move)
        this.moveStart(event.clientX, event.clientY);
    });
    $move.addEventListener("wheel", (event) => {
      this.wheel(event.deltaY);
    });
    $resize.addEventListener("mousedown", (event) => {
      this.moveStart(event.clientX, event.clientY, true);
    });
    $minimize.addEventListener("click", () => {
      this.minimize();
    });
    document.addEventListener("mouseup", () => {
      this.moveStop();
    });
    document.addEventListener("mousemove", (event) => {
      if (this.moveInfo)
        this.move(event.clientX, event.clientY);
    });
  }
  minimize() {
    this.element.classList.toggle("hidden");
  }
  moveStart(x, y, resize) {
    this.moveInfo = {
      x: this.x,
      y: this.y,
      originalX: x,
      originalY: y,
      width: resize ? this.width : undefined
    };
  }
  moveStop() {
    this.moveInfo = undefined;
  }
  move(x, y) {
    if (!this.moveInfo)
      return;
    if (this.moveInfo.width) {
      this.width = this.moveInfo.width + x - this.moveInfo.originalX;
    } else {
      this.x = this.moveInfo.x + x - this.moveInfo.originalX;
      this.y = this.moveInfo.y + y - this.moveInfo.originalY;
    }
  }
  wheel(deltaY) {
    this.width += deltaY < 0 ? 1 : -1;
  }
}

// src/overlay.ts
class Overlay extends Wrapper {
  parent;
  get x() {
    return +(localStorage.getItem(this.localStoragePrefix + "x") ?? "64");
  }
  set x(value) {
    localStorage.setItem(this.localStoragePrefix + "x", value.toString());
    this.update();
  }
  get y() {
    return +(localStorage.getItem(this.localStoragePrefix + "y") ?? "64");
  }
  set y(value) {
    localStorage.setItem(this.localStoragePrefix + "y", value.toString());
    this.update();
  }
  get width() {
    return +(localStorage.getItem(this.localStoragePrefix + "width") ?? "256");
  }
  set width(value) {
    localStorage.setItem(this.localStoragePrefix + "width", value.toString());
    this.update();
  }
  get cx() {
    return +(localStorage.getItem("wbot_cx") ?? "0");
  }
  set cx(value) {
    localStorage.setItem("wbot_cx", value.toString());
    this.update();
  }
  get cy() {
    return +(localStorage.getItem("wbot_cy") ?? "0");
  }
  set cy(value) {
    localStorage.setItem("wbot_cy", value.toString());
    this.update();
  }
  constructor(parent) {
    super(document.createElement("canvas"), "wbot_overlay_");
    this.parent = parent;
    this.element.classList.add("wbot-overlay");
    this.wrapper.classList.add("hidden");
    this.element.addEventListener("click", (event) => {
      this.click(event.clientX, event.clientY);
    });
  }
  getPixelSize() {
    return this.parent.pixels.length === 0 ? 0 : this.width / this.parent.pixels[0].length;
  }
  update() {
    this.wrapper.style.width = `${this.width}px`;
    this.wrapper.style.transform = `translate(${this.x}px, ${this.y}px)`;
    const context = this.element.getContext("2d");
    context.clearRect(0, 0, this.element.width, this.element.height);
    const pixelSize = this.getPixelSize();
    if (pixelSize === 0)
      return;
    this.element.width = pixelSize * this.parent.pixels[0].length;
    this.element.height = pixelSize * this.parent.pixels.length;
    context.strokeStyle = `red`;
    for (let y = 0;y < this.parent.pixels.length; y++) {
      const row = this.parent.pixels[y];
      for (let x = 0;x < row.length; x++) {
        const pixel = row[x];
        context.fillStyle = `rgb(${pixel.r} ${pixel.g} ${pixel.b})`;
        context.globalAlpha = pixel.a / 510;
        context.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      }
    }
    context.globalAlpha = 0.8;
    context.fillStyle = `cyan`;
    context.fillRect(this.cx * pixelSize, 0, pixelSize, this.element.height);
    context.fillRect(0, this.cy * pixelSize, this.element.width, pixelSize);
  }
  click(x, y) {
    const pixelSize = this.getPixelSize();
    this.cx = (x - this.x) / pixelSize | 0;
    this.cy = (y - (this.y + 16)) / pixelSize | 0;
  }
}

// src/utilities.ts
function wait(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

// src/widget.html
var widget_default = `<button class="select-image">Select image</button>
<button class="draw" disabled>Draw</button>
<button class="timer">Set timer</button>
<div class="colors"></div>
<marquee class="wstatus">Set marker and select image</marquee>
`;

// src/widget.ts
class Widget extends Wrapper {
  parent;
  constructor(parent) {
    super(document.createElement("div"), "wbot_widget_");
    this.parent = parent;
    this.element.classList.add("wbot-widget");
    this.element.innerHTML = widget_default;
    this.element.querySelector(".select-image").addEventListener("click", () => this.parent.selectImage());
    this.element.querySelector(".draw").addEventListener("click", () => this.parent.draw());
    this.element.querySelector(".timer").addEventListener("click", () => this.timer());
  }
  get status() {
    return this.element.querySelector(".wstatus").innerHTML;
  }
  set status(value) {
    this.element.querySelector(".wstatus").innerHTML = value;
  }
  async timer() {
    const $timer = this.element.querySelector(".timer");
    try {
      $timer.disabled = true;
      const me = await fetch("https://backend.wplace.live/me", {
        credentials: "include"
      }).then((x) => x.json());
      const time = Date.now() + (me.charges.max - me.charges.count) * me.charges.cooldownMs;
      while (true) {
        const left = time - Date.now();
        if (left <= 0) {
          new Audio("https://www.myinstants.com/media/sounds/winnerchickendinner.mp3").play();
          this.parent.draw();
          break;
        }
        $timer.textContent = `${left / 60000 | 0}:${left % 60000 / 1000 | 0}`;
        await wait(1000);
      }
    } finally {
      $timer.disabled = false;
      $timer.textContent = "Set timer";
    }
  }
  setDisabled(name, disabled) {
    this.element.querySelector("." + name).disabled = disabled;
  }
  async align() {
    const pixelsWidth = this.parent.pixels[0]?.length;
    if (!pixelsWidth)
      return;
    function getPixelPosition() {
      const data = document.querySelector(".whitespace-nowrap").textContent.slice(7).split(", ");
      return {
        x: +data[0],
        y: +data[1]
      };
    }
    function getMarkerPosition() {
      const marker = document.querySelector(".maplibregl-marker.z-20");
      if (!marker)
        throw new Error("NO_MARKER");
      const rect = marker.getBoundingClientRect();
      return {
        x: rect.width / 2 + rect.left,
        y: rect.bottom
      };
    }
    function distance(a, b) {
      const direct = Math.abs(a - b);
      return Math.min(direct, 4000 - direct);
    }
    const markerPos1 = getMarkerPosition();
    const pixelPos1 = getPixelPosition();
    await this.parent.clickCanvas(window.innerWidth - 1, markerPos1.y);
    const markerPos2 = getMarkerPosition();
    const pixelPos2 = getPixelPosition();
    const pixelSize = (markerPos2.x - markerPos1.x) / distance(pixelPos2.x, pixelPos1.x);
    this.parent.overlay.x = markerPos1.x - pixelSize / 2;
    this.parent.overlay.y = markerPos1.y - 16 - 7;
    this.parent.overlay.width = pixelsWidth * pixelSize;
  }
}

// src/bot.ts
class WPlaceBot {
  image;
  colors = [];
  pixels = [[]];
  overlayEdit;
  widgetEdit;
  widget = new Widget(this);
  overlay = new Overlay(this);
  get scale() {
    return +(localStorage.getItem("wbot_scale") ?? "100");
  }
  set scale(value) {
    localStorage.setItem("wbot_scale", value.toString());
  }
  selectImage() {
    if (!document.querySelector(".maplibregl-marker.z-20"))
      return;
    this.widget.setDisabled("select-image", true);
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.addEventListener("change", () => {
        const file = input.files?.[0];
        if (!file) {
          reject(new Error("NO_FILE"));
          this.widget.setDisabled("select-image", false);
          return;
        }
        const reader = new FileReader;
        reader.addEventListener("load", () => {
          this.image = new Image;
          this.image.src = reader.result;
          this.image.addEventListener("load", async () => {
            try {
              this.processImage();
              await this.widget.align();
              await this.updateColors();
              this.widget.status = "Ready to draw!";
              resolve();
            } catch (error) {
              reject(error);
            } finally {
              this.widget.setDisabled("select-image", false);
            }
          });
          this.image.addEventListener("error", reject);
        });
        reader.addEventListener("error", reject);
        reader.readAsDataURL(file);
      });
      input.click();
    });
  }
  async draw() {
    this.widget.status = "Drawing";
    try {
      await this.updateColors();
      this.overlay.element.classList.add("disabled");
      this.widget.setDisabled("draw", true);
      for (;this.overlay.cy < this.pixels.length; this.overlay.cy++) {
        for (;this.overlay.cx < this.pixels[0].length; this.overlay.cx++) {
          const pixel = this.getClosestColor(this.pixels[this.overlay.cy][this.overlay.cx]);
          if (pixel.a === 0)
            continue;
          pixel.button.click();
          await wait(1);
          const pixelSize = this.overlay.getPixelSize();
          await this.clickCanvas(this.overlay.x + this.overlay.cx * pixelSize + pixelSize / 2, this.overlay.y + 16 + this.overlay.cy * pixelSize + pixelSize / 2);
          if (document.querySelector("ol"))
            return;
        }
        this.overlay.cx = 0;
      }
    } finally {
      this.overlay.element.classList.remove("disabled");
      this.widget.setDisabled("draw", false);
      this.widget.status = 'Press "Paint" and "Set timer"';
    }
  }
  async clickCanvas(clientX, clientY) {
    await this.waitForUnfocus();
    document.querySelector(".maplibregl-canvas").dispatchEvent(new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
      button: 0
    }));
    await wait(1);
  }
  async updateColors() {
    document.querySelector(".flex.gap-2.px-3 > .btn-circle")?.click();
    await wait(1);
    document.querySelector(".btn.btn-primary.btn-lg.relative.z-30")?.click();
    await wait(1);
    const unfoldColors = document.querySelector("button.bottom-0");
    if (unfoldColors.innerHTML === '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor" class="size-5"><path d="M480-120 300-300l58-58 122 122 122-122 58 58-180 180ZM358-598l-58-58 180-180 180 180-58 58-122-122-122 122Z"></path></svg><!---->') {
      unfoldColors.click();
      await wait(1);
    }
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
          button
        };
      const rgb = button.style.background.slice(4, -1).split(", ").map((x) => +x);
      return {
        r: rgb[0],
        g: rgb[1],
        b: rgb[2],
        a: 255,
        available: button.children.length === 0,
        button
      };
    });
    const colorsToBuy = new Set;
    for (let y = 0;y < this.pixels.length; y++) {
      for (let x = 0;x < this.pixels[y].length; x++) {
        const color = this.getClosestColor(this.pixels[y][x], true);
        if (!color.available)
          colorsToBuy.add(color);
      }
    }
    const $colors = this.widget.element.querySelector(".colors");
    $colors.innerHTML = "";
    for (const color of colorsToBuy) {
      const $div = document.createElement("button");
      $colors.append($div);
      $div.style.backgroundColor = `rgb(${color.r} ${color.g} ${color.b})`;
      $div.addEventListener("click", () => {
        color.button.click();
      });
    }
  }
  waitForUnfocus() {
    return new Promise((resolve) => {
      if (!document.hasFocus())
        resolve();
      const origStatus = this.widget.status;
      this.widget.status = "Unfocus window!";
      document.addEventListener("blur", () => {
        this.widget.status = origStatus;
        setTimeout(resolve, 1);
      }, {
        once: true
      });
    });
  }
  processImage() {
    if (!this.image)
      throw new Error("NO_IMAGE");
    const imageCanvas = document.createElement("canvas");
    const imageContext = imageCanvas.getContext("2d");
    imageCanvas.width = this.image.width * this.scale / 100;
    imageCanvas.height = this.image.height * this.scale / 100;
    imageContext.drawImage(this.image, 0, 0, imageCanvas.width, imageCanvas.height);
    this.pixels = Array.from({ length: imageCanvas.height }, () => new Array(imageCanvas.width));
    const data = imageContext.getImageData(0, 0, imageCanvas.width, imageCanvas.height).data;
    for (let y = 0;y < imageCanvas.height; y++) {
      for (let x = 0;x < imageCanvas.width; x++) {
        const index = (y * imageCanvas.width + x) * 4;
        this.pixels[y][x] = {
          r: data[index],
          g: data[index + 1],
          b: data[index + 2],
          a: data[index + 3]
        };
      }
    }
    this.overlay.update();
    this.widget.setDisabled("select-image", false);
    this.widget.setDisabled("draw", false);
    this.overlay.wrapper.classList.remove("hidden");
  }
  getClosestColor({ r, g, b, a }, allowNotAvailable) {
    if (this.colors.length === 0)
      throw new Error("NO_COLORS");
    if (a < 100)
      return this.colors.at(-1);
    let minDelta = Infinity;
    let min;
    for (let index = 0;index < this.colors.length; index++) {
      const color = this.colors[index];
      if (!allowNotAvailable && !color.available)
        continue;
      const delta = Math.abs(color.r - r) + Math.abs(color.g - g) + Math.abs(color.b - b);
      if (delta < minDelta) {
        minDelta = delta;
        min = color;
      }
    }
    return min;
  }
}

// src/style.css
var style_default = `:root {
  --main: #0069ff;
  --main-hover: #2580ff;
  --text-invert: #ffffff;
  --background: #ffffff;
  --hover: #dfdfdf;
  --disabled: #c2c2c2;
  --text: #394e6a;
}

.wbot-wrapper {
  position: fixed;
  z-index: 9999;
  top: 0;
  left: 0;
  color: var(--text);
}
.wbot-wrapper input, button {
  cursor: pointer;
  transition: background-color 0.5s;
}
.wbot-wrapper input:hover,
.wbot-wrapper button:hover {
  background-color: var(--hover);
}
.wbot-wrapper input:disabled,
.wbot-wrapper button:disabled {
  background-color: var(--disabled);
  cursor: not-allowed;
}
.wbot-wrapper .move {
  align-items: center;
  color: var(--text-invert);
  background-color: var(--main);
  cursor: move;
  display: flex;
  height: 16px;
  overflow: hidden;
  width: 100%;
}
.wbot-wrapper .minimize {
  cursor: pointer;
  height: 100%;
  margin-left: auto;
  display: flex;
  align-items: center;
  padding: 0 4px;
}
.wbot-wrapper .minimize:hover {
  background-color: var(--main-hover);
}
.wbot-wrapper .resize {
  cursor: e-resize;
  height: 100%;
  width: 16px;
  background-image: repeating-linear-gradient(
    315deg,
    var(--main),
    var(--main) 4px,
    var(--background) 1px,
    var(--background) 5px
  );
}

.wbot-overlay {
  box-shadow: 0px 0px 0px 1px var(--main) inset;
}

.wbot-widget {
  width: 100%;
  background-color: var(--background);
}
.wbot-widget input,
.wbot-widget button {
  width: 100%;
}
.wbot-widget .colors {
  display: flex;
}
.wbot-widget .colors button {
  width: 100%;
  height: 32px;
  cursor: pointer;
}
.wbot-widget .wstatus {
  width: 100%;
}

.hidden {
  display: none;
}
`;

// src/index.ts
var style = document.createElement("style");
style.textContent = style_default;
document.head.append(style);
new WPlaceBot;
