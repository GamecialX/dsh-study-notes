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
  function stats() {
    var total = 0, done = 0, sum = 0, n = 0;
    flat().forEach(function (f) {
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
  function chapterCard(ch) {
    var secs = sectionsOf(ch), done = 0;
    secs.forEach(function (s) { if (isDone(lessonId(ch, s))) done++; });
    return '<a class="chcard" href="' + esc(href(ch.file || ch.id + "/index.html")) + '">' +
      '<div class="cnum">' + esc(ch.num || ch.id.replace(/^ch/, "")) + '</div>' +
      '<div class="cbody"><h3>' + esc(ch.title) + '</h3>' +
      (ch.summary ? '<p>' + esc(ch.summary) + '</p>' : '') +
      '<div class="cmeta">' + secs.length + ' 节 · ' + done + ' 节完成</div></div></a>';
  }

  function sectionCard(ch, s, idx) {
    var lid = lessonId(ch, s), sc = score(lid);
    var mark = isDone(lid) ? "✔" : (idx + 1 < 10 ? "0" : "") + (idx + 1);
    return '<a class="seccard" href="' + esc(href(s.file)) + '" data-done="' + (isDone(lid) ? "1" : "0") + '">' +
      '<span class="snum">' + mark + '</span><span class="stitle">' + esc(s.title) + '</span>' +
      (sc && sc.total ? '<span class="sscore">' + Math.round(sc.score / sc.total * 100) + '</span>' : '') + '</a>';
  }

  function initOverview() {
    var st = stats();
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

  function init() {
    renderTrack();
    renderPager();
    initTheme();
    initDone();
    initNotes();
    initQuiz();
    initCopy();
    initOverview();
    global.StudyShell = { stats: stats, isDone: isDone, score: score, nav: NAV };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(window);
