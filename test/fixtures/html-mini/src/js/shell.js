/* shell.js — HTML 学习库的宿主外壳：导航、进度、主题、批注、判分、复制
 *
 * 依赖页面上的固定结构（见 references/html-line.md 的"宿主协议"）：
 *   <body data-lesson="ch01/sec01" data-chapter="ch01" data-track="practice"
 *         data-title="第 1 节：…" data-root="../">
 *   <div class="track" id="track"><div class="in"></div></div>   <!-- 上方章节轨道 -->
 *   <div class="pager" id="pager"></div>                        <!-- 页脚上一节/下一节 -->
 *   <button id="theme-btn"> · <button id="done-btn"> · <button id="notes-btn"> + <span id="notes-count">
 *
 * 导航数据来自 src/js/nav-data.js（生成物，不许手改）：window.STUDY_NAV
 */
(function (global) {
  "use strict";

  var body = document.body;
  var root = body.getAttribute("data-root") || "";
  var lesson = body.getAttribute("data-lesson") || "";
  var NAV = global.STUDY_NAV || { chapters: [] };
  var html = document.documentElement;

  var K_DONE = "study:progress:";
  var K_SCORE = "study:scores:";
  var K_THEME = "study:theme";
  var K_NOTES = "study:notes";
  var K_LAST = "study:last";

  function store(fn, fb) { try { return fn(); } catch (e) { return fb; } }
  function lsGet(k) { return store(function () { return localStorage.getItem(k); }, null); }
  function lsSet(k, v) { store(function () { localStorage.setItem(k, v); }, null); }
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  /* ---------- 导航数据 ---------- */
  function chapters() { return NAV.chapters || []; }
  function sectionsOf(ch) { return ch.sections || []; }
  function lessonId(ch, s) { return s.lesson || (ch.id + "/" + s.id); }
  function flat() {
    var out = [];
    chapters().forEach(function (ch) {
      sectionsOf(ch).forEach(function (s) { out.push({ chapter: ch, section: s, lesson: lessonId(ch, s) }); });
    });
    return out;
  }
  function chapterOf(id) {
    var c = chapters().filter(function (x) { return x.id === id; });
    return c[0] || null;
  }
  function href(file) { return root + file; }

  /* ---------- 进度 ---------- */
  function isDone(id) { return lsGet(K_DONE + id) === "1"; }
  function score(id) {
    var raw = lsGet(K_SCORE + id);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }
  function stats(onlyChapter) {
    var total = 0, done = 0, sum = 0, n = 0;
    flat().forEach(function (f) {
      if (onlyChapter && f.chapter.id !== onlyChapter) return;
      total++;
      if (isDone(f.lesson)) done++;
      var s = score(f.lesson);
      if (s && s.total) { sum += s.score / s.total; n++; }
    });
    return { total: total, done: done, avg: n ? sum / n : null, scored: n };
  }
  function emit(detail) {
    detail.lesson = detail.lesson || lesson;
    document.dispatchEvent(new CustomEvent("study-progress", { detail: detail }));
  }

  /* ---------- 轨道（.track > .in > .b / .nodes > .n / .pct） ---------- */
  function renderTrack() {
    var nav = document.getElementById("track");
    if (!nav) return;
    var box = nav.querySelector(".in") || nav.appendChild(document.createElement("div"));
    box.className = "in";
    var scope = nav.getAttribute("data-scope") || "chapter";
    var label = "", nodes = [], right = "";
    var curLesson = lesson, curCh = body.getAttribute("data-chapter") || "";

    if (scope === "library") {
      label = (NAV.title || "课程") + " · 课程地图";
      chapters().forEach(function (ch) {
        nodes.push('<a class="n' + (ch.id === curCh ? " cur" : "") + '" href="' + esc(href(ch.file || ch.id + "/index.html")) + '" title="' + esc(ch.title) + '">' + esc(ch.num || ch.id.replace(/^ch/, "")) + '</a>');
      });
      right = chapters().length + " 章";
    } else {
      var ch = chapterOf(curCh);
      if (!ch) return;
      label = (NAV.title || "") + " · " + (ch.title || curCh);
      var idx = 0;
      sectionsOf(ch).forEach(function (s) {
        idx++;
        var lid = lessonId(ch, s);
        var cls = "n" + (lid === curLesson ? " cur" : "") + (isDone(lid) ? " done" : "");
        nodes.push('<a class="' + cls + '" href="' + esc(href(s.file)) + '" title="' + esc(s.title) + '">' + pad2(idx) + '</a>');
      });
      var pos = (flat().filter(function (f) { return f.lesson === curLesson; })[0] || {});
      var all = flat();
      var i = all.indexOf(pos);
      right = (i >= 0 ? pad2(i + 1) : "--") + " / " + pad2(all.length);
    }
    box.innerHTML = '<div class="b">' + esc(label) + '</div><div class="nodes">' + nodes.join("") +
      '</div><div class="pct">' + esc(right) + '</div>';
  }

  /* ---------- 上一节 / 下一节 ---------- */
  function renderPager() {
    var box = document.getElementById("pager");
    if (!box) return;
    var all = flat(), i = -1;
    for (var k = 0; k < all.length; k++) if (all[k].lesson === lesson) i = k;
    var prev = i > 0 ? all[i - 1] : null;
    var next = i >= 0 && i < all.length - 1 ? all[i + 1] : null;
    var ch = chapterOf(body.getAttribute("data-chapter") || "");
    var a = [];
    if (prev) a.push('<a class="pg-prev" href="' + esc(href(prev.section.file)) + '"><span>← 上一节</span><b>' + esc(prev.section.title) + '</b></a>');
    else if (ch) a.push('<a class="pg-prev" href="' + esc(href(ch.file || ch.id + "/index.html")) + '"><span>← 本章目录</span><b>' + esc(ch.title) + '</b></a>');
    else a.push('<span class="pg-prev empty"></span>');
    if (next) a.push('<a class="pg-next" href="' + esc(href(next.section.file)) + '"><span>下一节 →</span><b>' + esc(next.section.title) + '</b></a>');
    else a.push('<a class="pg-next" href="' + esc(href("index.html")) + '"><span>回库首页 →</span><b>' + esc(NAV.title || "课程地图") + '</b></a>');
    box.innerHTML = a.join("");
  }

  /* ---------- 顶栏 ---------- */
  function initTheme() {
    var btn = document.getElementById("theme-btn");
    if (lsGet(K_THEME) === "dark") html.setAttribute("data-theme", "dark");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var dark = html.getAttribute("data-theme") === "dark";
      html.setAttribute("data-theme", dark ? "" : "dark");
      lsSet(K_THEME, dark ? "light" : "dark");
      if (global.StudyDemo && global.StudyDemo.repaint) global.StudyDemo.repaint();
    });
  }

  function initDone() {
    var btn = document.getElementById("done-btn");
    if (!btn || !lesson) return;
    function paint(on) {
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.textContent = on ? "✔ 已完成" : "✓ 标记本节完成";
    }
    paint(isDone(lesson));
    btn.addEventListener("click", function () {
      var on = btn.getAttribute("aria-pressed") !== "true";
      paint(on); lsSet(K_DONE + lesson, on ? "1" : "0");
      renderTrack();
      emit({ kind: "done", done: on });
    });
  }

  function initNotes() {
    var btn = document.getElementById("notes-btn");
    var cnt = document.getElementById("notes-count");
    var side = document.getElementById("side-notes");
    if (!btn || !side) return;
    var notes = side.querySelectorAll(".n");
    if (cnt) cnt.textContent = String(notes.length);
    if (!notes.length) { btn.style.display = "none"; return; }
    function paint(on) {
      body.setAttribute("data-notes", on ? "on" : "off");
      btn.setAttribute("aria-expanded", on ? "true" : "false");
    }
    paint(lsGet(K_NOTES) === "on");
    function toggle() {
      var on = body.getAttribute("data-notes") !== "on";
      paint(on); lsSet(K_NOTES, on ? "on" : "off");
    }
    btn.addEventListener("click", toggle);
    document.addEventListener("keydown", function (e) {
      if (e.key !== "n" && e.key !== "N") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var t = e.target;
      if (t && (/^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName) || t.isContentEditable)) return;
      toggle();
    });
  }

  /* ---------- 判分 ---------- */
  function gradeQuiz(quiz) {
    var got = 0, total = 0, lines = [];
    var self = quiz.querySelector(".self-scale [aria-pressed='true']");
    var selfScore = self ? parseInt(self.getAttribute("data-score"), 10) : null;

    Array.prototype.forEach.call(quiz.querySelectorAll(".q[data-qid]"), function (q) {
      var pts = parseInt(q.getAttribute("data-points") || "0", 10);
      var type = q.getAttribute("data-type") || (q.querySelector(".fill") ? "fill" : (q.querySelector(".self-scale") ? "self" : "choice"));
      if (type === "self" || !pts) return;
      total += pts;
      var ok = false;
      if (type === "fill") {
        var val = parseFloat((q.querySelector(".fill") || {}).value);
        var ans = parseFloat(q.getAttribute("data-answer"));
        var tol = parseFloat(q.getAttribute("data-tol") || "0");
        ok = !isNaN(val) && Math.abs(val - ans) <= tol;
      } else {
        var sel = q.querySelector("input:checked");
        ok = !!sel && sel.value === q.getAttribute("data-answer");
      }
      if (ok) got += pts;
      lines.push((q.getAttribute("data-label") || q.getAttribute("data-qid")) + " " + (ok ? pts : 0) + "/" + pts);
      var mk = q.querySelector(".mark") || q.appendChild(document.createElement("p"));
      mk.className = "mark " + (ok ? "ok" : "no");
      mk.textContent = ok ? "答对了" : ("答错了" + (q.getAttribute("data-why") ? "：" + q.getAttribute("data-why") : ""));
    });

    var res = quiz.querySelector('[data-role="quiz-result"]');
    var txt = "客观题 " + got + "/" + total + "　·　" + lines.join("；") +
      (selfScore !== null ? "　·　自评 " + selfScore + "/3" : "　·　自评题未选");
    if (res) res.textContent = txt;
    if (total && lesson) {
      var prev = score(lesson) || { score: 0 };
      lsSet(K_SCORE + lesson, JSON.stringify({
        score: Math.max(got, prev.score || 0), total: total,
        at: new Date().toISOString().slice(0, 16)
      }));
      emit({ kind: "score", score: got, total: total });
    }
  }

  function initQuiz() {
    Array.prototype.forEach.call(document.querySelectorAll(".quiz"), function (quiz) {
      Array.prototype.forEach.call(quiz.querySelectorAll(".self-scale button"), function (b) {
        b.addEventListener("click", function () {
          Array.prototype.forEach.call(quiz.querySelectorAll(".self-scale button"), function (o) {
            o.setAttribute("aria-pressed", o === b ? "true" : "false");
          });
        });
      });
      var btn = quiz.querySelector('[data-act="grade"]');
      if (btn) btn.addEventListener("click", function () { gradeQuiz(quiz); });
    });
  }

  /* ---------- 代码复制 ---------- */
  function initCopy() {
    Array.prototype.forEach.call(document.querySelectorAll(".code"), function (box) {
      var btn = box.querySelector(".copy"), code = box.querySelector("code");
      if (!btn || !code) return;
      btn.addEventListener("click", function () {
        var text = code.textContent;
        var done = function () { btn.textContent = "已复制"; setTimeout(function () { btn.textContent = "复制"; }, 1200); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, done);
        else {
          var ta = document.createElement("textarea");
          ta.value = text; document.body.appendChild(ta); ta.select();
          try { document.execCommand("copy"); } catch (e) {}
          document.body.removeChild(ta); done();
        }
      });
    });
  }

  /* ---------- 目录页 / 章首页 ---------- */
  function chapterStats(ch) {
    var secs = sectionsOf(ch), done = 0, sum = 0, n = 0;
    secs.forEach(function (s) {
      var lid = lessonId(ch, s);
      if (isDone(lid)) done++;
      var sc = score(lid);
      if (sc && sc.total) { sum += sc.score / sc.total; n++; }
    });
    return { total: secs.length, done: done, avg: n ? sum / n : null, scored: n };
  }

  function chapterCard(ch) {
    var st = chapterStats(ch);
    var pct = st.total ? Math.round(st.done / st.total * 100) : 0;
    var avg = st.avg === null ? "未测" : Math.round(st.avg * 100) + " 分";
    return '<a class="chcard" href="' + esc(href(ch.file || ch.id + "/index.html")) + '">' +
      '<div class="cnum">' + esc(ch.num || ch.id.replace(/^ch/, "")) + '</div>' +
      '<div class="cinfo"><h3>' + esc(ch.title) + '</h3>' +
      (ch.summary ? '<p>' + esc(ch.summary) + '</p>' : '') +
      '<div class="cbar"><i style="width:' + pct + '%"></i></div>' +
      '<div class="cmeta"><span>' + st.done + ' / ' + st.total + ' 节</span><span>' + avg + '</span></div>' +
      '</div></a>';
  }

  function sectionCard(ch, s, idx) {
    var lid = lessonId(ch, s), sc = score(lid);
    var mark = isDone(lid) ? "✔" : (idx + 1 < 10 ? "0" : "") + (idx + 1);
    var meta = [];
    if (s.minutes) meta.push(s.minutes + " 分钟");
    if (s.product) meta.push(s.product);
    return '<a class="seccard" href="' + esc(href(s.file)) + '" data-done="' + (isDone(lid) ? "1" : "0") + '">' +
      '<span class="snum">' + mark + '</span><span class="stitle">' + esc(s.title) + '</span>' +
      (meta.length ? '<span class="smeta">' + esc(meta.join(" · ")) + '</span>' : '') +
      (sc && sc.total ? '<span class="sscore">' + Math.round(sc.score / sc.total * 100) + '</span>' : '') + '</a>';
  }

  function initOverview() {
    // 章首页的进度只算本章；库首页（无 data-chapter）算全库
    var onlyChapter = document.querySelector('[data-role="section-list"]') ? (body.getAttribute("data-chapter") || "") : "";
    var st = stats(onlyChapter);
    Array.prototype.forEach.call(document.querySelectorAll('[data-role="progress"]'), function (el) {
      el.textContent = st.total ? (st.done + " / " + st.total + " 节完成") : "";
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-role="score-avg"]'), function (el) {
      el.textContent = st.avg === null ? "还没有交过卷" : "平均 " + Math.round(st.avg * 100) + " 分（" + st.scored + " 次）";
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-role="progress-bar"]'), function (el) {
      el.style.width = (st.total ? Math.round(st.done / st.total * 100) : 0) + "%";
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-role="chapter-list"]'), function (el) {
      el.innerHTML = chapters().map(chapterCard).join("");
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-role="section-list"]'), function (el) {
      var ch = chapterOf(el.getAttribute("data-chapter") || body.getAttribute("data-chapter") || "");
      if (ch) el.innerHTML = sectionsOf(ch).map(function (s, i) { return sectionCard(ch, s, i); }).join("");
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-role="chapter-title"]'), function (el) {
      var ch = chapterOf(body.getAttribute("data-chapter") || "");
      if (ch) el.textContent = ch.title;
    });
  }

  /* ---------- 标签页（A 阅读类） ---------- */
  function initTabs() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-tabs]"), function (box) {
      var tabs = Array.prototype.slice.call(box.querySelectorAll('[role="tab"]'));
      if (!tabs.length) return;
      function show(i) {
        tabs.forEach(function (t, k) {
          t.setAttribute("aria-selected", k === i ? "true" : "false");
          t.setAttribute("tabindex", k === i ? "0" : "-1");
          var id = t.getAttribute("data-tab") || t.getAttribute("aria-controls");
          var panel = id ? document.getElementById(id) : null;
          if (panel) panel.hidden = k !== i;
        });
      }
      tabs.forEach(function (t, i) {
        t.addEventListener("click", function () { show(i); });
        t.addEventListener("keydown", function (e) {
          var d = e.key === "ArrowRight" ? 1 : (e.key === "ArrowLeft" ? -1 : 0);
          if (!d) return;
          e.preventDefault();
          var n = (i + d + tabs.length) % tabs.length;
          tabs[n].focus(); show(n);
        });
      });
      var cur = -1;
      tabs.forEach(function (t, i) { if (t.getAttribute("aria-selected") === "true") cur = i; });
      show(cur < 0 ? 0 : cur);
    });
  }

  /* ---------- 页内计算器（E 工具类） ----------
   * 支持 + - * / ( )、变量名与 ceil/floor/round/abs/sqrt/min/max，自己写解析器，不碰 eval。
   * markup: <div class="calc" data-calc data-expr="eta * 2 / k"> 里放 <input data-var="eta"> 与
   *         <output data-role="calc-out">，可选 <span data-role="calc-err">。 */
  var FNS = {
    ceil: Math.ceil, floor: Math.floor, round: Math.round,
    abs: Math.abs, sqrt: Math.sqrt,
    min: function () { return Math.min.apply(null, arguments); },
    max: function () { return Math.max.apply(null, arguments); }
  };

  function evalExpr(src, vars) {
    var s = String(src), i = 0;
    function ws() { while (i < s.length && /\s/.test(s.charAt(i))) i++; }
    function primary() {
      ws();
      var c = s.charAt(i);
      if (c === "(") { i++; var v = expr(); ws(); if (s.charAt(i) === ")") i++; return v; }
      if (c === "-") { i++; return -primary(); }
      if (c === "+") { i++; return primary(); }
      if (/[0-9.]/.test(c)) {
        var b = i;
        while (i < s.length && /[0-9.]/.test(s.charAt(i))) i++;
        return parseFloat(s.slice(b, i));
      }
      var a = i;
      if (!/[A-Za-z_]/.test(c)) throw new Error("表达式有误");
      while (i < s.length && /[A-Za-z0-9_]/.test(s.charAt(i))) i++;
      var name = s.slice(a, i);
      ws();
      if (s.charAt(i) === "(") {
        i++;
        var args = [];
        ws();
        if (s.charAt(i) === ")") { i++; }
        else {
          for (;;) {
            args.push(expr());
            ws();
            if (s.charAt(i) === ",") { i++; continue; }
            if (s.charAt(i) === ")") { i++; break; }
            throw new Error("函数调用的括号不匹配");
          }
        }
        var fn = FNS[name.toLowerCase()];
        if (!fn) throw new Error("不支持的函数 " + name);
        return fn.apply(null, args);
      }
      if (!Object.prototype.hasOwnProperty.call(vars, name)) throw new Error("未知变量 " + name);
      return vars[name];
    }
    function term() {
      var v = primary(), c;
      for (;;) {
        ws(); c = s.charAt(i);
        if (c === "*" || c === "/") { i++; var r = primary(); v = c === "*" ? v * r : v / r; }
        else return v;
      }
    }
    function expr() {
      var v = term(), c;
      for (;;) {
        ws(); c = s.charAt(i);
        if (c === "+" || c === "-") { i++; var r = term(); v = c === "+" ? v + r : v - r; }
        else return v;
      }
    }
    var out = expr(); ws();
    if (i < s.length) throw new Error("表达式有误");
    if (!isFinite(out)) throw new Error("结果不是有限数");
    return out;
  }

  function initCalc() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-calc]"), function (box) {
      var expr = box.getAttribute("data-expr") || "";
      var inputs = Array.prototype.slice.call(box.querySelectorAll("[data-var]"));
      var out = box.querySelector('[data-role="calc-out"]');
      var errEl = box.querySelector('[data-role="calc-err"]');
      if (!expr || !out) return;
      function calc() {
        var vars = {}, missing = "";
        inputs.forEach(function (inp) {
          var k = inp.getAttribute("data-var"), raw = String(inp.value).trim(), v = parseFloat(raw);
          if (!raw || isNaN(v)) { missing = missing || k; return; }
          vars[k] = v;
        });
        try {
          if (missing) throw new Error("变量 " + missing + " 没填数字");
          var v = evalExpr(expr, vars);
          out.textContent = String(Number(v.toPrecision(6)));
          box.setAttribute("data-ok", "1");
          if (errEl) errEl.textContent = "";
        } catch (e) {
          out.textContent = "—";
          box.setAttribute("data-ok", "0");
          if (errEl) errEl.textContent = e.message;
        }
      }
      inputs.forEach(function (inp) { inp.addEventListener("input", calc); });
      calc();
    });
  }

  /* ---------- F3 帧序列（预渲染帧，拖动条逐帧看） ----------
   * markup: <div class="demo frames" data-frames="pend" data-count="12" data-dir="../src/media/frames/"
   *         data-ext="svg"> 里面放 <img data-frame>、[data-role="frame-range"]、[data-role="frame-out"]。 */
  function initFrames() {
    Array.prototype.forEach.call(document.querySelectorAll(".frames[data-frames]"), function (box) {
      var name = box.getAttribute("data-frames");
      var count = parseInt(box.getAttribute("data-count") || "0", 10);
      var dir = box.getAttribute("data-dir") || "";
      var ext = box.getAttribute("data-ext") || "svg";
      var img = box.querySelector("img[data-frame]");
      var range = box.querySelector('[data-role="frame-range"]');
      var out = box.querySelector('[data-role="frame-out"]');
      if (!img || !(count > 0)) return;
      var cur = 1;
      function paint(n) {
        cur = Math.max(1, Math.min(count, n));
        img.src = dir + name + "-" + cur + "." + ext;
        img.setAttribute("alt", name + " 第 " + cur + " 帧");
        if (range) range.value = String(cur);
        if (out) out.textContent = cur + " / " + count;
      }
      box.addEventListener("click", function (e) {
        var b = e.target.closest ? e.target.closest("[data-act]") : null;
        if (!b) return;
        var act = b.getAttribute("data-act");
        if (act === "prev") paint(cur - 1);
        else if (act === "next") paint(cur + 1);
      });
      box.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft") { e.preventDefault(); paint(cur - 1); }
        else if (e.key === "ArrowRight") { e.preventDefault(); paint(cur + 1); }
      });
      if (range) range.addEventListener("input", function () { paint(parseInt(range.value, 10)); });
      paint(1);
    });
  }

  /* ---------- 库首页：继续上次 ---------- */
  function initContinue() {
    var box = document.querySelector('[data-role="continue"]');
    if (!box) return;
    var scopeCh = box.getAttribute("data-scope") === "chapter" ? (body.getAttribute("data-chapter") || "") : "";
    var all = flat(), last = lsGet(K_LAST), hit = null;
    if (scopeCh) all = all.filter(function (f) { return f.chapter.id === scopeCh; });
    all.forEach(function (f) { if (f.lesson === last) hit = f; });
    var fresh = !hit;
    if (!hit) hit = all[0] || null;
    if (!hit) return;
    var st = stats();
    box.innerHTML = '<a class="cont" href="' + esc(href(hit.section.file)) + '">' +
      '<span class="k">' + (fresh ? "从这里开始" : "继续上次") + '</span>' +
      '<b>' + esc(hit.section.title) + '</b>' +
      '<span class="cmeta">' + esc(hit.chapter.title) + ' · ' + st.done + ' / ' + st.total + ' 完成</span></a>';
  }

  function init() {
    if (lesson) lsSet(K_LAST, lesson);
    renderTrack();
    renderPager();
    initTheme();
    initDone();
    initNotes();
    initQuiz();
    initCopy();
    initTabs();
    initCalc();
    initFrames();
    initOverview();
    initContinue();
    global.StudyShell = { stats: stats, isDone: isDone, score: score, nav: NAV };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(window);
