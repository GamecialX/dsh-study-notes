/* demo.js — HTML 学习库的可操纵演示引擎（F1/F2）
 *
 * 页面里放一块结构固定的 markup，再用 StudyDemo.register(id, cfg) 给出"怎么画"：
 *
 *   <div class="demo" data-demo="grad-lr" data-tier="2">
 *     <div class="dhd"><span>F2 · 可拖演示</span><span class="dout" data-role="readout"></span></div>
 *     <div class="dstage"><canvas width="960" height="620"></canvas>
 *       <noscript><p class="dcap">首帧静帧说明</p></noscript></div>
 *     <div class="dctrl">
 *       <button data-act="play">▶ 播放</button>
 *       <button data-act="back">◀ 上一步</button>
 *       <button data-act="next">下一步 ▶</button>
 *       <label>时间 <input type="range" data-param="t" min="0" max="1" step="0.001" value="0"></label>
 *       <label>步长 <input type="range" data-param="lr" min="0.05" max="1.15" step="0.01" value="0.35"></label>
 *       <label>速度 <select data-param="speed"><option>0.5</option>…</select></label>
 *       <button data-act="reset">重置</button>
 *     </div>
 *   </div>
 *
 *   StudyDemo.register("grad-lr", {
 *     steps: 40,                      // t=0..1 映射到 0..steps 步
 *     state: { t: 0, lr: 0.35, speed: 1 },
 *     frame: function (s, env) { ... env.palette() / env.ctx / env.canvas ... },
 *     readout: function (s) { return "θ = " + ... }        // 可选
 *   });
 *
 * 引擎保证：state 全部可寻址（hash #t=..&lr=..）、frame 是纯函数、空格播放/暂停、
 * ←→ 单步（Shift 5 步）、无脚本时 <noscript> 出静帧。
 */
(function (global) {
  "use strict";

  var registry = [];
  var instances = [];
  var root = document.documentElement;

  function palette() {
    var cs = getComputedStyle(root);
    function g(n, fb) { var v = cs.getPropertyValue(n).trim(); return v || fb; }
    return {
      line: g("--line", "#d8c9ab"), ink2: g("--ink-2", "#3d4a63"),
      ink: g("--ink", "#17233a"), blue: g("--blue", "#1d3f6b"), red: g("--red", "#d0452c"),
      paper: g("--paper", "#fbf9f4"), kraft: g("--kraft", "#e8dcc4")
    };
  }

  function clone(o) {
    var r = {}, k;
    for (k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = o[k];
    return r;
  }

  function findDef(id) {
    for (var i = 0; i < registry.length; i++) if (registry[i].id === id) return registry[i];
    return null;
  }

  var StudyDemo = global.StudyDemo = {
    version: "3.0.0",
    register: function (id, cfg) {
      var d = findDef(id);
      if (d) { d.cfg = cfg; if (d.inst) bind(d.inst, cfg); }
      else registry.push({ id: id, cfg: cfg, inst: null });
      return StudyDemo;
    },
    repaint: function () {
      instances.forEach(function (it) { draw(it); });
    }
  };

  function paramsKeys(cfg) {
    var ks = [];
    for (var k in cfg.state) if (typeof cfg.state[k] === "number") ks.push(k);
    return ks;
  }

  function readHash(it) {
    var m, parts = (location.hash || "").replace(/^#/, "").split("&");
    parts.forEach(function (p) {
      m = /^([a-zA-Z0-9_]+)=(-?[0-9.]+)$/.exec(p);
      if (m && typeof it.state[m[1]] === "number") it.state[m[1]] = parseFloat(m[2]);
    });
    if (it.def.steps) it.state.t = Math.max(0, Math.min(1, it.state.t || 0));
  }

  function writeHash(it) {
    var ks = paramsKeys(it.def), out = [];
    ks.forEach(function (k) {
      var v = it.state[k];
      if (k === "t") out.push("t=" + v.toFixed(3));
      else if (k === "speed") return;
      else out.push(k + "=" + v.toFixed(2));
    });
    try { history.replaceState(null, "", "#" + out.join("&")); } catch (e) {}
  }

  function step(s) { return Math.round((s.t || 0) * (s.__steps || 0)); }

  function draw(it) {
    var cv = it.canvas, env = { canvas: cv, ctx: it.ctx, palette: palette };
    it.ctx.clearRect(0, 0, cv.width, cv.height);
    it.state.__step = step(it.state);
    try { it.def.frame(it.state, env); } catch (e) {
      if (global.console) console.error("[StudyDemo] frame 出错：", it.id, e);
    }
    if (it.out) {
      var txt = "";
      try { txt = it.def.readout ? it.def.readout(it.state) : (it.state.__steps ? "第 " + it.state.__step + " 步" : ""); } catch (e) {}
      it.out.textContent = txt;
    }
    syncInputs(it);
  }

  function syncInputs(it) {
    it.inputs.forEach(function (el) {
      var k = el.getAttribute("data-param");
      if (!(k in it.state)) return;
      var v = String(it.state[k]);
      if (el.type === "range") { if (el.value !== v) el.value = v; }
      else if (el.value !== v) el.value = v;
    });
    if (it.play) it.play.textContent = it.playing ? "⏸ 暂停" : "▶ 播放";
  }

  function stop(it) {
    it.playing = false;
    if (it.raf) { cancelAnimationFrame(it.raf); it.raf = 0; }
    it.last = 0;
  }

  function loop(it, ts) {
    if (!it.playing) { it.raf = 0; return; }
    if (!it.last) it.last = ts;
    var dt = (ts - it.last) / 1000;
    it.last = ts;
    var rate = it.def.rate || 0.35;
    it.state.t = (it.state.t || 0) + dt * (it.state.speed || 1) * rate;
    if (it.state.t >= 1) { it.state.t = 1; it.playing = false; }
    draw(it); writeHash(it);
    if (it.playing) it.raf = requestAnimationFrame(function (t) { loop(it, t); });
    else { it.raf = 0; it.last = 0; }
  }

  function play(it) {
    if (it.playing) { stop(it); syncInputs(it); return; }
    if ((it.state.t || 0) >= 1) it.state.t = 0;
    it.playing = true; it.last = 0;
    it.raf = requestAnimationFrame(function (t) { loop(it, t); });
    syncInputs(it);
  }

  function stepBy(it, d) {
    var n = it.def.steps || 0;
    stop(it);
    var s = Math.max(0, Math.min(n, step(it.state) + d));
    it.state.t = n ? s / n : 0;
    draw(it); writeHash(it);
  }

  function bind(it, cfg) {
    it.def = cfg;
    it.state = clone(cfg.state || {});
    it.state.__steps = cfg.steps || 0;
    it.initial = clone(cfg.state || {});
  }

  function bootOne(el) {
    var id = el.getAttribute("data-demo");
    var def = findDef(id);
    var canvas = el.querySelector("canvas");
    var it = {
      id: id, el: el, canvas: canvas, ctx: canvas ? canvas.getContext("2d") : null,
      out: el.querySelector('[data-role="readout"]'),
      play: el.querySelector('[data-act="play"]'),
      inputs: Array.prototype.slice.call(el.querySelectorAll("[data-param]")),
      playing: false, raf: 0, last: 0, def: null, state: {}
    };
    if (!def) {
      if (global.console) console.warn("[StudyDemo] 没有 register 的演示：" + id);
      return null;
    }
    bind(it, def.cfg);
    if (it.def.tier) el.setAttribute("data-tier", String(it.def.tier));

    el.addEventListener("click", function (ev) {
      var b = ev.target.closest ? ev.target.closest("[data-act]") : null;
      if (!b || !el.contains(b)) return;
      var act = b.getAttribute("data-act");
      if (act === "play") play(it);
      else if (act === "back") stepBy(it, -1);
      else if (act === "next") stepBy(it, 1);
      else if (act === "reset") {
        stop(it);
        it.state = clone(it.initial);
        it.state.__steps = it.def.steps || 0;
        it.state.t = 0;
        draw(it); writeHash(it);
      }
    });
    it.inputs.forEach(function (inp) {
      var k = inp.getAttribute("data-param");
      var ev = (inp.tagName === "SELECT") ? "change" : "input";
      inp.addEventListener(ev, function () {
        var v = parseFloat(inp.value);
        if (isNaN(v)) return;
        it.state[k] = v;
        if (k === "t") stop(it);
        else { stop(it); if (it.def.steps) it.state.t = 0; }
        draw(it); writeHash(it);
      });
    });

    readHash(it);
    draw(it);
    return it;
  }

  function boot() {
    Array.prototype.forEach.call(document.querySelectorAll(".demo[data-demo]"), function (el) {
      var it = bootOne(el);
      if (it) instances.push(it);
    });
    document.addEventListener("keydown", function (ev) {
      var t = ev.target;
      if (t && (/^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName) || t.isContentEditable)) return;
      if (ev.key === "n" || ev.key === "N") return; // 留给 shell.js 的批注开关
      var it = instances[0];
      if (!it) return;
      if (ev.code === "Space") { ev.preventDefault(); play(it); }
      else if (ev.key === "ArrowLeft") { ev.preventDefault(); stepBy(it, ev.shiftKey ? -5 : -1); }
      else if (ev.key === "ArrowRight") { ev.preventDefault(); stepBy(it, ev.shiftKey ? 5 : 1); }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})(window);
