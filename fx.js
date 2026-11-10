// uyarid.com — everything that moves.
//
// The light behind the page (a small WebGL shader), the pointer (glow, tilt,
// buttons that lean towards it), what follows scrolling (the train on the
// line, windows that lie down flat, the name in the footer filling up) and
// the reveals. Nothing here is needed to read the page: if this file never
// runs, boot.js and app.js show everything as it is.

(() => {
  const root = document.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  const $ = (sel, scope = document) => scope.querySelector(sel);
  const $$ = (sel, scope = document) => [...scope.querySelectorAll(sel)];

  // ------------------------------------------------------------- reveals

  const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789/#";

  /** Lets a short label settle out of random characters, like a departure board. */
  function decode(el) {
    if (reduce || el.dataset.decoded) return;
    el.dataset.decoded = "1";
    const text = el.textContent;
    // Screen readers get the real words; the flicker is for the eyes only.
    const spoken = document.createElement("span");
    spoken.className = "sr";
    spoken.textContent = text;
    const shown = document.createElement("span");
    shown.setAttribute("aria-hidden", "true");
    shown.textContent = text;
    el.replaceChildren(spoken, shown);

    const started = performance.now();
    const duration = 450 + text.length * 30;
    const tick = (now) => {
      const settled = clamp((now - started) / duration) * text.length;
      let out = "";
      for (let i = 0; i < text.length; i++) {
        out += i < settled || text[i] === " " ? text[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      shown.textContent = out;
      if (settled < text.length) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  const revealer =
    "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue;
              const el = entry.target;
              el.classList.add("in");
              revealer.unobserve(el);
              if (el.matches("[data-decode]")) decode(el);
              for (const label of el.querySelectorAll("[data-decode]")) decode(label);
            }
          },
          { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
        )
      : null;

  /** Everything marked data-reveal comes in when it scrolls into view; siblings one after the other. */
  function watch() {
    for (const group of new Set($$("[data-reveal]").map((el) => el.parentElement))) {
      [...group.children].filter((el) => el.hasAttribute("data-reveal")).forEach((el, i) => el.style.setProperty("--i", String(Math.min(i, 5))));
    }
    for (const el of $$("[data-reveal]:not(.in)")) {
      if (revealer) revealer.observe(el);
      else el.classList.add("in");
    }
  }

  // -------------------------------------------------------------- aurora

  const VERTEX = "attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }";

  // Slow coloured light: noise folded into itself twice, tinted with the
  // three colours of the page, strongest at the top and at the sides so the
  // text in the middle stays easy to read.
  const FRAGMENT = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif
    uniform vec2 u_res;
    uniform float u_time;
    uniform vec2 u_mouse;
    uniform float u_scroll;

    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
      vec2 i = floor(v + dot(v, C.yy));
      vec2 x0 = v - i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289(i);
      vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
      vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
      m = m * m;
      m = m * m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
      vec3 g;
      g.x = a0.x * x0.x + h.x * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    float fbm(vec2 p) {
      float sum = 0.0;
      float amp = 0.55;
      for (int i = 0; i < 3; i++) {
        sum += amp * snoise(p);
        p = p * 1.9 + vec2(17.3, 9.1);
        amp *= 0.42;
      }
      return sum;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_res;
      vec2 c = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
      vec2 p = c;
      p.y += u_scroll * 0.3;
      float t = u_time * 0.028;

      // three big, soft clouds that push each other around
      vec2 w = vec2(fbm(p * 0.55 + vec2(0.0, t)), fbm(p * 0.55 + vec2(4.1, -t)));
      float a = fbm(p * 0.50 + 0.65 * w + vec2(t * 0.7, 0.0)) * 0.5 + 0.5;
      float b = fbm(p * 0.45 - 0.60 * w + vec2(7.7, 3.1 - t * 0.6)) * 0.5 + 0.5;
      float d = fbm(p * 0.62 + 0.50 * w.yx + vec2(-3.3, 5.5 + t * 0.5)) * 0.5 + 0.5;

      vec3 sky = vec3(0.220, 0.741, 0.973);
      vec3 violet = vec3(0.545, 0.361, 0.965);
      vec3 pink = vec3(0.957, 0.447, 0.714);

      vec3 col = vec3(0.0);
      col += sky * smoothstep(0.42, 0.88, a) * 0.60;
      col += violet * smoothstep(0.40, 0.90, b) * 0.62;
      col += pink * smoothstep(0.52, 0.95, d) * 0.40;

      // strongest at the top and towards the sides: the text in the middle stays calm
      float top = smoothstep(-0.2, 1.0, uv.y);
      float sides = 0.45 + 0.55 * smoothstep(0.0, 1.0, abs(uv.x - 0.5) * 2.0);
      col *= mix(0.07, 1.0, top * top) * sides;

      // the pointer carries a little light
      float near = length(c - u_mouse);
      col += mix(sky, violet, 0.4) * 0.07 * exp(-near * near * 5.0);

      col = vec3(0.020, 0.024, 0.035) + col * 0.62;
      float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
      col += (n - 0.5) / 160.0;
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function startAurora() {
    const canvas = $("#aurora");
    if (!canvas || navigator.connection?.saveData) return null;
    let gl = null;
    try {
      gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: "low-power" });
    } catch {
      /* no WebGL */
    }
    if (!gl) return null;

    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
    };
    const vertex = compile(gl.VERTEX_SHADER, VERTEX);
    const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT);
    if (!vertex || !fragment) return null;
    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
    gl.useProgram(program);

    // one triangle that covers the whole view
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const at = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(at);
    gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);

    const uniform = (name) => gl.getUniformLocation(program, name);
    const uRes = uniform("u_res");
    const uTime = uniform("u_time");
    const uMouse = uniform("u_mouse");
    const uScroll = uniform("u_scroll");

    // Soft light needs few pixels: a third of the view, stretched by the browser.
    const resize = () => {
      const width = Math.round(clamp(innerWidth * 0.34, 260, 640));
      const height = Math.max(160, Math.round((width * innerHeight) / Math.max(1, innerWidth)));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    };
    resize();

    let alive = true;
    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      alive = false;
      root.classList.remove("aurora-on");
    });

    const draw = (seconds, mouseX, mouseY, scroll) => {
      if (!alive) return;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, seconds);
      gl.uniform2f(uMouse, mouseX, mouseY);
      gl.uniform1f(uScroll, scroll);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    draw(12, 0, 0.2, 0);
    root.classList.add("aurora-on");
    return { draw, resize };
  }

  // ----------------------------------------------------------- the pointer

  const pointer = { x: innerWidth / 2, y: innerHeight * 0.4, sx: innerWidth / 2, sy: innerHeight * 0.4, seen: false };
  const hot = { tilt: null, magnet: null };
  /** element → where it is tilted to, and where it wants to be */
  const tilts = new Map();

  function grab(el) {
    let state = tilts.get(el);
    if (!state) {
      state = { nx: 0, ny: 0, h: 0, tx: 0, ty: 0, th: 0, max: el.classList.contains("repo") ? 7 : 9 };
      tilts.set(el, state);
    }
    state.th = 1;
    return state;
  }

  function release(el) {
    const state = tilts.get(el);
    if (state) Object.assign(state, { tx: 0, ty: 0, th: 0 });
  }

  function letGo() {
    if (hot.tilt) release(hot.tilt);
    hot.tilt = null;
    if (hot.magnet) {
      hot.magnet.classList.remove("pulled");
      hot.magnet.style.removeProperty("--bx");
      hot.magnet.style.removeProperty("--by");
    }
    hot.magnet = null;
  }

  function onPointerMove(e) {
    if (e.pointerType === "touch") return;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    if (!pointer.seen) {
      pointer.seen = true;
      pointer.sx = pointer.x;
      pointer.sy = pointer.y;
      root.classList.add("pointer-on");
    }
    const target = e.target instanceof Element ? e.target : null;

    // cards light up under the pointer
    const spot = target?.closest(".spot");
    if (spot) {
      const box = spot.getBoundingClientRect();
      spot.style.setProperty("--mx", `${(e.clientX - box.left).toFixed(0)}px`);
      spot.style.setProperty("--my", `${(e.clientY - box.top).toFixed(0)}px`);
    }

    // …and lean towards it
    const tilt = target?.closest("[data-tilt]") ?? null;
    if (tilt !== hot.tilt) {
      if (hot.tilt) release(hot.tilt);
      hot.tilt = tilt;
    }
    if (tilt) {
      const state = grab(tilt);
      const box = tilt.getBoundingClientRect();
      state.tx = clamp((e.clientX - (box.left + box.width / 2)) / (tilt.offsetWidth / 2), -1, 1);
      state.ty = clamp((e.clientY - (box.top + box.height / 2)) / (tilt.offsetHeight / 2), -1, 1);
    }

    // buttons are pulled a little towards the pointer
    const magnet = target?.closest(".magnet") ?? null;
    if (magnet !== hot.magnet) {
      if (hot.magnet) {
        hot.magnet.classList.remove("pulled");
        hot.magnet.style.removeProperty("--bx");
        hot.magnet.style.removeProperty("--by");
      }
      hot.magnet = magnet;
      magnet?.classList.add("pulled");
    }
    if (magnet) {
      const box = magnet.getBoundingClientRect();
      const bx = parseFloat(magnet.style.getPropertyValue("--bx")) || 0;
      const by = parseFloat(magnet.style.getPropertyValue("--by")) || 0;
      const dx = clamp((e.clientX - (box.left - bx + box.width / 2)) * 0.26, -12, 12);
      const dy = clamp((e.clientY - (box.top - by + box.height / 2)) * 0.36, -8, 8);
      magnet.style.setProperty("--bx", `${dx.toFixed(1)}px`);
      magnet.style.setProperty("--by", `${dy.toFixed(1)}px`);
    }
  }

  function tiltFrame() {
    for (const [el, s] of tilts) {
      if (!el.isConnected) {
        tilts.delete(el);
        continue;
      }
      s.nx += (s.tx - s.nx) * 0.13;
      s.ny += (s.ty - s.ny) * 0.13;
      s.h += (s.th - s.h) * 0.13;
      if (s.th === 0 && Math.abs(s.nx) < 0.003 && Math.abs(s.ny) < 0.003 && s.h < 0.003) {
        for (const name of ["--rx", "--ry", "--nx", "--ny", "--sx", "--sy", "--hover"]) el.style.removeProperty(name);
        tilts.delete(el);
        continue;
      }
      el.style.setProperty("--ry", `${(s.nx * s.max).toFixed(2)}deg`);
      el.style.setProperty("--rx", `${(-s.ny * s.max).toFixed(2)}deg`);
      el.style.setProperty("--nx", s.nx.toFixed(3));
      el.style.setProperty("--ny", s.ny.toFixed(3));
      el.style.setProperty("--sx", `${((s.nx + 1) * 50).toFixed(1)}%`);
      el.style.setProperty("--sy", `${((s.ny + 1) * 50).toFixed(1)}%`);
      el.style.setProperty("--hover", s.h.toFixed(3));
    }
  }

  // ------------------------------------------------------------ scrolling

  let els = {};
  let dirty = true;
  let lastY = window.scrollY;
  let velocity = 0;

  /** The page is rebuilt when fresh data arrives: look everything up again. */
  function collect() {
    // an app's stop on the line sits level with its "Stop 01" label
    for (const app of $$(".app.station")) {
      const label = $(".app-stop", app);
      if (!label) continue;
      // layout position, not the drawn one: the label may still be on its way in
      const offset = label.offsetParent === app ? label.offsetTop + label.offsetHeight / 2 : 54;
      app.style.setProperty("--station-y", offset.toFixed(0) + "px");
    }
    els = {
      hero: $(".hero"),
      cursor: $("#cursor"),
      ticker: $(".ticker"),
      rail: $("#rail"),
      stages: $$(".app-stage"),
      stations: $$(".station").map((el) => ({ el, at: getComputedStyle(el).getPropertyValue("--station-y").trim() || "50%" })),
      wordmark: $(".wordmark"),
      links: $$(".nav-links a[data-section]").map((link) => ({ link, section: document.getElementById(link.dataset.section) })),
    };
    dirty = true;
  }

  function scrollFrame() {
    const y = window.scrollY;
    const vh = innerHeight;
    root.style.setProperty("--scroll", (y / Math.max(1, root.scrollHeight - vh)).toFixed(4));
    root.classList.toggle("scrolled", y > 24);

    // the header drifts away
    if (els.hero) {
      const height = els.hero.offsetHeight;
      els.hero.classList.toggle("paused", y > height);
      if (!reduce) els.hero.style.setProperty("--hero", clamp(y / (height * 0.9)).toFixed(4));
    }

    // each window lies down flat as it comes up the screen
    if (!reduce) {
      for (const stage of els.stages) {
        const box = stage.getBoundingClientRect();
        if (box.bottom < -200 || box.top > vh + 200) continue;
        const p = clamp((vh * 0.98 - box.top) / (vh * 0.62));
        stage.style.setProperty("--p", (1 - (1 - p) * (1 - p)).toFixed(4));
      }
    }

    // the train on the line beside the content, and the stops it has passed
    if (els.rail && els.rail.offsetWidth) {
      const box = els.rail.getBoundingClientRect();
      const at = clamp(vh * 0.5 - box.top, 0, box.height);
      els.rail.style.setProperty("--rail", (at / Math.max(1, box.height)).toFixed(4));
      els.rail.style.setProperty("--rail-y", at.toFixed(1));
      for (const { el, at: where } of els.stations) {
        const b = el.getBoundingClientRect();
        const offset = where.endsWith("%") ? (b.height * parseFloat(where)) / 100 : parseFloat(where) || 0;
        el.classList.toggle("passed", b.top + offset <= vh * 0.5 + 6);
      }
    }

    // the name at the bottom fills with colour
    if (els.wordmark && !reduce) {
      const box = els.wordmark.getBoundingClientRect();
      els.wordmark.style.setProperty("--wm", clamp((vh - box.top) / (box.height * 0.95 + vh * 0.12)).toFixed(4));
    }

    // which section the menu points at
    let current = null;
    for (const item of els.links) {
      if (item.section && item.section.getBoundingClientRect().top <= vh * 0.45) current = item;
    }
    for (const item of els.links) item.link.classList.toggle("active", item === current);
  }

  // ------------------------------------------------------------ the frame

  let aurora = null;
  let frame = 0;

  function loop(now) {
    frame++;
    const y = window.scrollY;

    if (finePointer && !reduce && pointer.seen) {
      pointer.sx += (pointer.x - pointer.sx) * 0.14;
      pointer.sy += (pointer.y - pointer.sy) * 0.14;
      if (els.cursor) els.cursor.style.transform = `translate3d(${pointer.sx.toFixed(1)}px, ${pointer.sy.toFixed(1)}px, 0)`;
      // the network and the headline shift against each other
      if (els.hero && !els.hero.classList.contains("paused")) {
        const nx = (pointer.sx / innerWidth - 0.5) * 2;
        const ny = (pointer.sy / innerHeight - 0.5) * 2;
        els.hero.style.setProperty("--px", `${(-nx * 16).toFixed(2)}px`);
        els.hero.style.setProperty("--py", `${(-ny * 12).toFixed(2)}px`);
        els.hero.style.setProperty("--hx", `${(nx * 6).toFixed(2)}px`);
        els.hero.style.setProperty("--hy", `${(ny * 4).toFixed(2)}px`);
      }
      tiltFrame();
    }

    // the ticker leans with the speed of scrolling
    if (!reduce && els.ticker) {
      velocity += (clamp((y - lastY) / 10, -9, 9) - velocity) * 0.12;
      els.ticker.style.setProperty("--vel", Math.abs(velocity) < 0.01 ? "0" : velocity.toFixed(3));
    }
    if (y !== lastY) dirty = true;
    lastY = y;

    if (dirty) {
      dirty = false;
      scrollFrame();
    }

    if (aurora && !reduce && frame % 2 === 0) {
      const aspect = innerWidth / Math.max(1, innerHeight);
      aurora.draw(now / 1000, (pointer.sx / innerWidth - 0.5) * aspect, 0.5 - pointer.sy / innerHeight, y / Math.max(1, innerHeight));
    }
    requestAnimationFrame(loop);
  }

  // ---------------------------------------------------------- small things

  /** "Apps that are small. / fast. / free. / open source." */
  function rotator() {
    const host = $("#rot");
    if (!host) return;
    const words = ["small.", "fast.", "free.", "open source."];
    if (reduce) {
      host.firstElementChild.textContent = words[words.length - 1];
      return;
    }
    let index = 0;
    setInterval(() => {
      if (document.hidden || host.closest(".hero")?.classList.contains("paused")) return;
      index = (index + 1) % words.length;
      const old = host.querySelector(".rot-word.on");
      const next = document.createElement("span");
      next.className = "rot-word";
      next.textContent = words[index];
      host.append(next);
      void next.offsetWidth; // so it starts from below instead of jumping in
      next.classList.add("on");
      if (old) {
        old.classList.remove("on");
        old.classList.add("out");
        setTimeout(() => old.remove(), 900);
      }
    }, 2400);
  }

  /** The ticker needs its content twice to run without a gap. */
  function ticker() {
    for (const track of $$("[data-ticker]")) {
      track.append(...[...track.children].map((node) => node.cloneNode(true)));
    }
  }

  // ----------------------------------------------------------------- start

  ticker();
  rotator();
  collect();
  watch();
  if (!reduce) aurora = startAurora();
  else startAurora(); // one still frame

  if (finePointer && !reduce) {
    document.addEventListener("pointermove", onPointerMove, { passive: true });
    root.addEventListener("pointerleave", letGo);
    window.addEventListener("blur", letGo);
  }
  window.addEventListener("scroll", () => (dirty = true), { passive: true });
  window.addEventListener("resize", () => {
    collect();
    aurora?.resize();
  });
  // pictures arriving move everything below them
  document.addEventListener("load", () => (dirty = true), true);
  document.addEventListener("uyarid:render", () => {
    collect();
    watch();
  });

  window.uyaridFx = true;
  requestAnimationFrame(loop);
})();
