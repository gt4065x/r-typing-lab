import {
  watchAuth, login, logout, signup, loadProfile, loadProgress, saveProgress,
  getEntry, writeEntry, watchBoard,
} from "./firebase.js";
import { initR, runR, grade } from "./r-engine.js";
import { LESSONS, QUIZ_POOL, QUIZ_SIZE, TIME_LIMIT } from "./content.js";

// ---------- 작은 유틸 ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v; // 작성자가 만든 콘텐츠에만 사용
    else if (k.startsWith("on")) el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

let toastTimer;
function toast(msg, kind = "") {
  const t = $("#toast");
  t.textContent = msg;
  t.className = `toast ${kind}`;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 2600);
}

const shuffle = (a) => {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const cleanRoom = (s) => (s || "").toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 20) || "R101";
const lsGet = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch {} };

// ---------- 상태 ----------
const state = {
  user: null,
  name: "",
  progress: {},
  lessonIdx: Number(lsGet("rlab.lesson", 0)) || 0,
  room: cleanRoom(lsGet("rlab.room", "R101")),
  rReady: false,
  boardUnsub: null,
  boardRoom: null,
  board: [],
  quiz: null,
};
let pendingSignupName = "";

// ---------- R 엔진 ----------
const rStatus = $("#rStatus");
initR()
  .then(() => {
    state.rReady = true;
    rStatus.className = "pill ready";
    rStatus.innerHTML = "<i></i>R 준비 완료";
    document.dispatchEvent(new Event("r-ready"));
  })
  .catch((e) => {
    rStatus.className = "pill error";
    rStatus.innerHTML = "<i></i>R 로딩 실패";
    console.error(e);
  });

// ---------- 코드 편집기 ----------
function createEditor({ value = "", rows = 4, onRun, placeholder = "여기에 R 코드를 입력하세요" } = {}) {
  const ta = h("textarea", {
    class: "code-input", spellcheck: "false", autocapitalize: "off",
    autocomplete: "off", rows, placeholder,
  });
  ta.value = value;
  const autosize = () => {
    ta.style.height = "auto";
    ta.style.height = Math.max(ta.scrollHeight, rows * 22 + 20) + "px";
  };
  ta.addEventListener("input", autosize);
  ta.addEventListener("keydown", (e) => {
    const insert = (text) => {
      const { selectionStart: s, selectionEnd: en } = ta;
      ta.setRangeText(text, s, en, "end");
      ta.dispatchEvent(new Event("input"));
    };
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      onRun?.();
    } else if (e.key === "Tab") {
      e.preventDefault();
      insert("  ");
    } else if (e.altKey && e.key === "-") {
      e.preventDefault();
      insert(" <- ");
    } else if (e.key === "Enter" && !e.isComposing) {
      // 이전 줄 들여쓰기 유지
      const before = ta.value.slice(0, ta.selectionStart);
      const indent = before.slice(before.lastIndexOf("\n") + 1).match(/^\s*/)[0];
      const extra = /[{(]\s*$/.test(before) ? "  " : "";
      if (indent || extra) { e.preventDefault(); insert("\n" + indent + extra); }
    }
  });
  const wrap = h("div", { class: "editor" }, h("span", { class: "prompt" }, ">"), ta);
  requestAnimationFrame(autosize);
  return {
    el: wrap, ta,
    get value() { return ta.value; },
    set value(v) { ta.value = v; autosize(); },
    focus() { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); },
  };
}

function renderOutput(box, res, { note } = {}) {
  box.replaceChildren();
  box.classList.add("show");
  const pre = h("pre");
  for (const o of res.output) {
    const cls = o.type !== "stderr" ? "" : res.failed ? "err" : "err-stream";
    pre.append(h("span", { class: cls }, o.text + "\n"));
  }
  if (res.error) pre.append(h("span", { class: "err" }, "오류: " + res.error + "\n"));
  if (!res.output.length && !res.error && !res.images.length) {
    pre.append(h("span", { class: "muted" }, "(출력 없음 — 값을 확인하려면 변수 이름을 입력해 보세요)"));
  }
  if (pre.childNodes.length) box.append(pre);
  for (const img of res.images) {
    const c = h("canvas", { class: "plot" });
    c.width = img.width; c.height = img.height;
    c.getContext("2d").drawImage(img, 0, 0);
    box.append(c);
  }
  if (note) box.append(note);
}

function waitingOutput(box, text = "실행 중…") {
  box.classList.add("show");
  box.replaceChildren(h("div", { class: "running" }, h("span", { class: "spinner" }), state.rReady ? text : "R 엔진을 불러오는 중… (처음 한 번만 10~20초 걸려요)"));
}

// ---------- 화면 전환 ----------
function show(view) {
  for (const v of $$(".view")) v.hidden = v.id !== `view-${view}`;
  for (const b of $$("#nav button")) b.classList.toggle("active", b.dataset.view === view);
  if (view === "learn") renderLearn();
  if (view === "quiz") { subscribeBoard(state.room); if (!state.quiz) renderLobby(); }
  if (view === "console") renderConsole();
  lsSet("rlab.view", view);
}
$("#nav").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-view]");
  if (!b) return;
  if (state.quiz?.running && b.dataset.view !== "quiz") {
    if (!confirm("퀴즈 진행 중이에요. 다른 화면으로 가면 퀴즈가 종료됩니다. 계속할까요?")) return;
    endQuiz(true);
  }
  show(b.dataset.view);
});

// ---------- 인증 ----------
let mode = "login";
function setMode(m) {
  mode = m;
  $("#tabLogin").classList.toggle("active", m === "login");
  $("#tabSignup").classList.toggle("active", m === "signup");
  for (const el of $$(".signup-only")) el.hidden = m !== "signup";
  $("#authForm [name=name]").required = m === "signup";
  $("#authForm [name=password]").autocomplete = m === "signup" ? "new-password" : "current-password";
  $("#authSubmit").textContent = m === "signup" ? "가입하고 시작하기" : "로그인";
  $("#authError").hidden = true;
}
$("#tabLogin").onclick = () => setMode("login");
$("#tabSignup").onclick = () => setMode("signup");

const AUTH_ERRORS = {
  "auth/invalid-credential": "이메일 또는 비밀번호가 올바르지 않아요.",
  "auth/wrong-password": "이메일 또는 비밀번호가 올바르지 않아요.",
  "auth/user-not-found": "가입되지 않은 이메일이에요.",
  "auth/email-already-in-use": "이미 가입된 이메일이에요. 로그인해 주세요.",
  "auth/weak-password": "비밀번호는 6자 이상이어야 해요.",
  "auth/invalid-email": "이메일 형식이 올바르지 않아요.",
  "auth/too-many-requests": "시도가 너무 많아요. 잠시 후 다시 시도해 주세요.",
  "auth/operation-not-allowed": "Firebase 콘솔에서 '이메일/비밀번호' 로그인을 활성화해야 합니다.",
  "auth/configuration-not-found": "Firebase 콘솔에서 Authentication을 시작하고 '이메일/비밀번호' 로그인을 활성화해 주세요.",
  "auth/network-request-failed": "네트워크 연결을 확인해 주세요.",
};

$("#authForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const btn = $("#authSubmit");
  const err = $("#authError");
  err.hidden = true;
  btn.disabled = true;
  try {
    if (mode === "signup") {
      pendingSignupName = String(f.get("name")).trim();
      await signup({
        email: f.get("email"), password: f.get("password"),
        name: pendingSignupName, studentId: String(f.get("studentId") || "").trim(),
      });
      state.name = pendingSignupName;
      $("#userName").textContent = state.name;
    } else {
      await login(f.get("email"), f.get("password"));
    }
  } catch (ex) {
    err.textContent = AUTH_ERRORS[ex.code] || `오류: ${ex.message}`;
    err.hidden = false;
  } finally {
    btn.disabled = false;
  }
});

$("#logoutBtn").onclick = async () => {
  if (state.quiz?.running && !confirm("퀴즈 진행 중이에요. 로그아웃할까요?")) return;
  endQuiz(true);
  await logout();
};

watchAuth(async (user) => {
  state.user = user;
  if (!user) {
    state.boardUnsub?.(); state.boardUnsub = null; state.boardRoom = null;
    state.quiz = null;
    $("#nav").hidden = true;
    $("#logoutBtn").hidden = true;
    $("#userName").textContent = "";
    for (const v of $$(".view")) v.hidden = v.id !== "view-auth";
    setMode("login");
    return;
  }
  const [profile, progress] = await Promise.all([
    loadProfile(user.uid).catch(() => null),
    loadProgress(user.uid).catch(() => ({})),
  ]);
  state.name = profile?.name || pendingSignupName || user.displayName || user.email.split("@")[0];
  state.progress = progress;
  $("#userName").textContent = state.name;
  $("#nav").hidden = false;
  $("#logoutBtn").hidden = false;
  show(lsGet("rlab.view", "learn") === "console" ? "console" : lsGet("rlab.view", "learn") === "quiz" ? "quiz" : "learn");
});

// ---------- 학습 ----------
function lessonDone(l) {
  return l.exercises.filter((_, i) => state.progress[`${l.id}_${i}`]).length;
}

function renderLessonNav() {
  const list = $("#lessonList");
  list.replaceChildren(...LESSONS.map((l, i) => {
    const done = lessonDone(l);
    const complete = done === l.exercises.length;
    return h("li", {},
      h("button", {
        class: `lesson-link ${i === state.lessonIdx ? "active" : ""} ${complete ? "complete" : ""}`,
        onclick: () => { state.lessonIdx = i; lsSet("rlab.lesson", i); renderLearn(); window.scrollTo({ top: 0 }); },
      },
      h("span", { class: "num" }, complete ? "✓" : i + 1),
      h("span", { class: "lt" }, h("b", {}, l.title), h("small", {}, `${l.tag} · ${done}/${l.exercises.length}`)),
      ));
  }));
  const total = LESSONS.reduce((a, l) => a + l.exercises.length, 0);
  const done = LESSONS.reduce((a, l) => a + lessonDone(l), 0);
  $("#totalBar").style.width = `${(done / total) * 100}%`;
  $("#totalText").textContent = `${done} / ${total} 문제 완료`;
}

function renderLearn() {
  renderLessonNav();
  const l = LESSONS[state.lessonIdx] || LESSONS[0];
  const art = $("#lesson");
  const examples = l.examples.map((ex) => {
    const out = h("div", { class: "output" });
    return h("div", { class: "example" },
      h("div", { class: "ex-head" },
        h("span", { class: "muted small" }, ex.note),
        h("div", { class: "row" },
          h("button", { class: "ghost small", onclick: () => copyToConsole(ex.code) }, "콘솔로 복사"),
          h("button", {
            class: "small",
            onclick: async () => { waitingOutput(out); renderOutput(out, await runR(ex.code, { fresh: true })); },
          }, "▶ 실행"),
        ),
      ),
      h("pre", { class: "code" }, ex.code),
      out,
    );
  });

  const exercises = l.exercises.map((ex, i) => exerciseCard(l, ex, i));
  const next = LESSONS[state.lessonIdx + 1];
  const prev = LESSONS[state.lessonIdx - 1];

  art.replaceChildren(
    h("div", { class: "lesson-head" },
      h("span", { class: "chip" }, `LESSON ${state.lessonIdx + 1} · ${l.tag}`),
      h("h2", {}, l.title)),
    h("div", { class: "lesson-body", html: l.body }),
    h("h3", { class: "sub" }, "예제 살펴보기"),
    h("div", { class: "examples" }, examples),
    h("h3", { class: "sub" }, "직접 입력해 보기 ", h("span", { class: "muted small" }, "Ctrl+Enter 실행 · Tab 들여쓰기 · Alt+- 는 <-")),
    h("div", { class: "exercises" }, exercises),
    h("div", { class: "pager" },
      prev ? h("button", { class: "ghost", onclick: () => { state.lessonIdx--; lsSet("rlab.lesson", state.lessonIdx); renderLearn(); window.scrollTo({ top: 0 }); } }, `← ${prev.title}`) : h("span"),
      next ? h("button", { class: "primary", onclick: () => { state.lessonIdx++; lsSet("rlab.lesson", state.lessonIdx); renderLearn(); window.scrollTo({ top: 0 }); } }, `${next.title} →`)
        : h("button", { class: "primary", onclick: () => show("quiz") }, "퀴즈 도전하기 →"),
    ),
  );
}

function exerciseCard(lesson, ex, i) {
  const key = `${lesson.id}_${i}`;
  let fails = 0;
  const out = h("div", { class: "output" });
  const feedback = h("div", { class: "feedback" });
  const editor = createEditor({ value: ex.starter || "", rows: 3, onRun: () => run() });
  const card = h("div", { class: `exercise ${state.progress[key] ? "done" : ""}` });
  const answerBtn = h("button", { class: "ghost small", hidden: true, onclick: () => {
    feedback.replaceChildren(h("div", { class: "fb info" }, h("b", {}, "정답 예시"), h("pre", { class: "code" }, ex.answer)));
  } }, "정답 보기");

  async function run() {
    waitingOutput(out);
    renderOutput(out, await runR(editor.value));
  }
  async function check() {
    waitingOutput(out, "채점 중…");
    feedback.replaceChildren();
    const g = await grade(editor.value, ex.answer, ex.check);
    renderOutput(out, g.student);
    if (g.ok) {
      card.classList.add("done", "pop");
      feedback.replaceChildren(h("div", { class: "fb ok" }, "정답이에요! 🎉"));
      if (!state.progress[key]) {
        state.progress[key] = true;
        renderLessonNav();
        saveProgress(state.user.uid, key).catch(() => toast("진도 저장에 실패했어요", "bad"));
      }
    } else {
      fails++;
      const parts = [h("b", {}, g.reason)];
      if (g.expected) parts.push(h("div", { class: "muted small" }, "기대 출력:"), h("pre", { class: "code expected" }, g.expected));
      if (fails >= 1 && ex.hint) parts.push(h("div", { class: "hint" }, "💡 힌트: ", ex.hint));
      feedback.replaceChildren(h("div", { class: "fb bad" }, parts));
      if (fails >= 2) answerBtn.hidden = false;
    }
  }

  card.append(
    h("div", { class: "ex-top" },
      h("span", { class: "ex-num" }, `Q${i + 1}`),
      h("p", { class: "ex-prompt" }, ex.prompt),
      h("span", { class: "badge-done" }, "완료")),
    editor.el,
    h("div", { class: "row actions" },
      h("button", { class: "small", onclick: run }, "▶ 실행"),
      h("button", { class: "primary small", onclick: check }, "✓ 정답 확인"),
      answerBtn),
    out,
    feedback,
  );
  return card;
}

// ---------- 자유 콘솔 ----------
let consoleEditor;
const CHIPS = ["summary(mtcars)", "plot(iris$Petal.Length, iris$Petal.Width, col = iris$Species, pch = 19)", "x <- rnorm(100)\nhist(x, col = 'skyblue')", "t.test(extra ~ group, data = sleep)", "cor(mtcars$wt, mtcars$mpg)"];
function renderConsole() {
  if (consoleEditor) return;
  const out = $("#consoleOut");
  const run = async () => { waitingOutput(out); renderOutput(out, await runR(consoleEditor.value)); };
  consoleEditor = createEditor({ rows: 8, onRun: run, placeholder: "예: mean(c(1, 2, 3))" });
  $("#consoleEditor").append(
    consoleEditor.el,
    h("div", { class: "row actions" },
      h("button", { class: "primary small", onclick: run }, "▶ 실행 (Ctrl+Enter)"),
      h("button", { class: "ghost small", onclick: () => { consoleEditor.value = ""; out.replaceChildren(); out.classList.remove("show"); } }, "지우기")),
  );
  $("#consoleChips").append(...CHIPS.map((c) =>
    h("button", { class: "chip-btn", onclick: () => { consoleEditor.value = c; consoleEditor.focus(); } }, c.split("\n")[0])));
}
function copyToConsole(code) {
  show("console");
  consoleEditor.value = code;
  consoleEditor.focus();
}

// ---------- 실시간 순위표 ----------
function subscribeBoard(room) {
  if (state.boardRoom === room && state.boardUnsub) return;
  state.boardUnsub?.();
  state.boardRoom = room;
  state.board = [];
  $("#board").replaceChildren();
  $("#roomLabel").textContent = `방 ${room}`;
  state.boardUnsub = watchBoard(room, (rows, err) => {
    if (err) {
      $("#boardEmpty").hidden = false;
      $("#boardEmpty").textContent = "순위표를 불러올 수 없어요. (Realtime Database 보안 규칙을 확인하세요)";
      console.error(err);
      return;
    }
    state.board = rows;
    renderBoard(rows);
    if (state.quiz) { updateMyRank(); state.quiz.onBoard?.(); }
  });
}

const prevRanks = new Map();
function renderBoard(rows) {
  const list = $("#board");
  $("#boardEmpty").hidden = rows.length > 0;
  $("#boardEmpty").textContent = "아직 참가자가 없어요. 첫 번째 도전자가 되어 보세요!";

  // FLIP: 이전 위치 기록
  const before = new Map($$("li", list).map((li) => [li.dataset.uid, li.getBoundingClientRect().top]));
  const existing = new Map($$("li", list).map((li) => [li.dataset.uid, li]));

  rows.forEach((r, idx) => {
    const rank = idx + 1;
    let li = existing.get(r.uid);
    if (!li) {
      li = h("li", { "data-uid": r.uid },
        h("span", { class: "rank" }), h("span", { class: "who" }, h("b"), h("small")),
        h("span", { class: "delta" }), h("span", { class: "score" }));
    }
    existing.delete(r.uid);
    li.classList.toggle("me", r.uid === state.user?.uid);
    li.classList.toggle("top1", rank === 1);
    li.classList.toggle("top2", rank === 2);
    li.classList.toggle("top3", rank === 3);
    $(".rank", li).textContent = rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : rank;
    $(".who b", li).textContent = r.name || "익명";
    $(".who small", li).textContent = r.status === "playing"
      ? `풀이 중 ${r.answered || 0}/${r.total || 10} · 정답 ${r.correct || 0}`
      : `완료 · 정답 ${r.correct || 0}/${r.total || 10}`;
    li.classList.toggle("playing", r.status === "playing");

    const scoreEl = $(".score", li);
    const oldScore = Number(scoreEl.dataset.v || 0);
    if (oldScore !== (r.score || 0)) {
      animateNumber(scoreEl, oldScore, r.score || 0);
      if (scoreEl.dataset.v) li.animate([{ background: "var(--flash)" }, { background: "transparent" }], { duration: 900 });
    }
    scoreEl.dataset.v = r.score || 0;

    const prev = prevRanks.get(r.uid);
    const d = $(".delta", li);
    if (prev && prev !== rank) {
      d.textContent = prev > rank ? `▲${prev - rank}` : `▼${rank - prev}`;
      d.className = `delta ${prev > rank ? "up" : "down"} flash`;
      clearTimeout(d._t);
      d._t = setTimeout(() => (d.className = "delta"), 2500);
    }
    prevRanks.set(r.uid, rank);
    list.append(li); // 순서대로 재배치
  });
  existing.forEach((li) => li.remove());

  // FLIP: 새 위치로 애니메이션
  for (const li of $$("li", list)) {
    const top = before.get(li.dataset.uid);
    if (top == null) {
      li.animate([{ opacity: 0, transform: "translateX(-12px)" }, { opacity: 1, transform: "none" }], { duration: 350, easing: "ease-out" });
      continue;
    }
    const dy = top - li.getBoundingClientRect().top;
    if (Math.abs(dy) > 1) {
      li.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], { duration: 550, easing: "cubic-bezier(.2,.8,.2,1)" });
    }
  }
}

function animateNumber(el, from, to) {
  const start = performance.now();
  const dur = 600;
  const step = (t) => {
    const p = Math.min(1, (t - start) / dur);
    el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))).toLocaleString();
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ---------- 퀴즈 ----------
function renderLobby() {
  const main = $("#quizMain");
  const roomInput = h("input", { value: state.room, maxlength: 20, class: "room-input", "aria-label": "방 코드" });
  const startBtn = h("button", { class: "primary big", disabled: !state.rReady, onclick: () => startQuiz() },
    state.rReady ? "퀴즈 시작 🚀" : "R 엔진 준비 중…");
  if (!state.rReady) document.addEventListener("r-ready", () => { startBtn.disabled = false; startBtn.textContent = "퀴즈 시작 🚀"; }, { once: true });

  roomInput.addEventListener("change", () => {
    state.room = cleanRoom(roomInput.value);
    roomInput.value = state.room;
    lsSet("rlab.room", state.room);
    subscribeBoard(state.room);
  });

  main.replaceChildren(h("div", { class: "card lobby" },
    h("span", { class: "chip" }, "QUIZ"),
    h("h2", {}, "R 스피드 퀴즈"),
    h("p", { class: "muted" }, `객관식 ${QUIZ_SIZE.mc}문제 + 코드 작성 ${QUIZ_SIZE.code}문제. 정답을 맞힐 때마다 점수가 올라가고, 같은 방 친구들의 순위가 오른쪽에 실시간으로 바뀝니다.`),
    h("ul", { class: "rules" },
      h("li", {}, h("b", {}, "정답 100점"), " + 빨리 맞힐수록 속도 보너스 최대 50점"),
      h("li", {}, h("b", {}, "연속 정답 콤보"), " 2연속부터 +10점씩 (최대 +50)"),
      h("li", {}, `제한 시간: 객관식 ${TIME_LIMIT.mc}초, 코드 ${TIME_LIMIT.code}초 — 코드 문제는 ▶ 실행으로 먼저 확인해 볼 수 있어요`),
      h("li", {}, "다시 도전하면 이번 판 점수로 순위가 갱신되고, 최고 점수는 따로 기록돼요")),
    h("label", { class: "room-label" }, "방 코드 ", h("span", { class: "muted small" }, "(선생님이 알려준 코드를 입력하세요)"), roomInput),
    startBtn,
  ));
}

function pickQuestions() {
  const mc = shuffle(QUIZ_POOL.filter((q) => q.type === "mc")).slice(0, QUIZ_SIZE.mc);
  const code = shuffle(QUIZ_POOL.filter((q) => q.type === "code")).slice(0, QUIZ_SIZE.code);
  return shuffle([...mc, ...code]).map((q) => {
    if (q.type !== "mc") return q;
    // 보기 순서도 섞기
    const order = shuffle(q.options.map((_, i) => i));
    return { ...q, options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer) };
  });
}

async function startQuiz() {
  const room = state.room;
  subscribeBoard(room);
  const prev = await getEntry(room, state.user.uid).catch(() => null);
  const qs = pickQuestions();
  state.quiz = { room, qs, i: 0, score: 0, correct: 0, streak: 0, best: prev?.best || 0, running: true, locked: false, timer: null };
  try {
    await writeEntry(room, state.user.uid, {
      name: state.name, score: 0, correct: 0, answered: 0, total: qs.length, status: "playing", best: state.quiz.best,
    });
  } catch (e) {
    toast("순위 저장 실패: DB 보안 규칙을 확인하세요", "bad");
    console.error(e);
  }
  showQuestion();
}

function quizHeader(q) {
  const quiz = state.quiz;
  return h("div", { class: "quiz-top" },
    h("div", { class: "qprogress" }, quiz.qs.map((_, i) =>
      h("i", { class: i < quiz.i ? (quiz.results?.[i] ? "ok" : "bad") : i === quiz.i ? "cur" : "" }))),
    h("div", { class: "quiz-stats" },
      h("span", {}, `문제 ${quiz.i + 1}/${quiz.qs.length}`),
      h("span", { id: "myRank", class: "my-rank" }),
      h("span", { class: "my-score" }, h("small", {}, "점수 "), h("b", { id: "myScore" }, quiz.score.toLocaleString())),
      quiz.streak >= 2 ? h("span", { class: "combo" }, `🔥 ${quiz.streak} 콤보`) : null,
    ),
    h("div", { class: "timer" }, h("i", { id: "timerBar" }), h("span", { id: "timerText" })),
    h("span", { class: `qtype ${q.type}` }, q.type === "mc" ? "객관식" : "코드 작성"),
  );
}

function showQuestion() {
  const quiz = state.quiz;
  const q = quiz.qs[quiz.i];
  const limit = TIME_LIMIT[q.type];
  quiz.locked = false;
  quiz.results ||= [];
  const main = $("#quizMain");
  let body;
  let editor;

  if (q.type === "mc") {
    body = h("div", { class: "options" }, q.options.map((opt, idx) =>
      h("button", { class: "option", "data-idx": idx, onclick: () => submit(idx) },
        h("span", { class: "key" }, "ABCD"[idx]), h("code", {}, opt))));
  } else {
    const out = h("div", { class: "output" });
    editor = createEditor({ rows: 3, onRun: () => submit(editor.value) });
    body = h("div", {},
      editor.el,
      h("div", { class: "row actions" },
        h("button", { class: "small", onclick: async () => { waitingOutput(out); renderOutput(out, await runR(editor.value, { fresh: true })); } }, "▶ 실행해 보기"),
        h("button", { class: "primary small", onclick: () => submit(editor.value) }, "제출 (Ctrl+Enter)")),
      out);
  }

  main.replaceChildren(h("div", { class: "card question" },
    quizHeader(q),
    h("h2", { class: "qtext" }, q.q),
    body,
    h("div", { id: "qFeedback" }),
  ));
  updateMyRank();
  editor?.focus();

  // 타이머
  quiz.qStart = performance.now();
  quiz.limit = limit;
  const bar = $("#timerBar");
  const txt = $("#timerText");
  clearInterval(quiz.timer);
  const tick = () => {
    const left = Math.max(0, limit - (performance.now() - quiz.qStart) / 1000);
    bar.style.width = `${(left / limit) * 100}%`;
    bar.classList.toggle("warn", left < limit * 0.3);
    txt.textContent = `${Math.ceil(left)}초`;
    if (left <= 0) submit(q.type === "mc" ? null : editor.value, true);
  };
  tick();
  quiz.timer = setInterval(tick, 100);

  if (q.type === "mc") {
    main._keys?.();
    const onKey = (e) => {
      const idx = "abcd".indexOf(e.key.toLowerCase());
      const n = "1234".indexOf(e.key);
      const pick = idx >= 0 ? idx : n;
      if (pick >= 0 && pick < q.options.length && !quiz.locked) submit(pick);
    };
    document.addEventListener("keydown", onKey);
    main._keys = () => document.removeEventListener("keydown", onKey);
  }
}

async function submit(answer, timedOut = false) {
  const quiz = state.quiz;
  if (!quiz || quiz.locked) return;
  quiz.locked = true;
  clearInterval(quiz.timer);
  $("#quizMain")._keys?.();
  const q = quiz.qs[quiz.i];
  const left = Math.max(0, quiz.limit - (performance.now() - quiz.qStart) / 1000);
  const fb = $("#qFeedback");

  let ok = false;
  let detail = null;
  if (q.type === "mc") {
    ok = answer === q.answer;
    $$(".option").forEach((b, idx) => {
      b.disabled = true;
      if (idx === q.answer) b.classList.add("correct");
      else if (idx === answer) b.classList.add("wrong");
    });
  } else {
    $$("#quizMain button").forEach((b) => (b.disabled = true));
    $("#quizMain textarea").readOnly = true;
    fb.replaceChildren(h("div", { class: "running" }, h("span", { class: "spinner" }), "채점 중…"));
    const g = await grade(answer || "", q.answer);
    ok = g.ok;
    detail = g;
  }

  let gained = 0;
  if (ok) {
    quiz.streak++;
    quiz.correct++;
    const speed = Math.round(50 * (left / quiz.limit));
    const combo = quiz.streak >= 2 ? Math.min(50, (quiz.streak - 1) * 10) : 0;
    gained = 100 + speed + combo;
    quiz.score += gained;
  } else {
    quiz.streak = 0;
  }
  quiz.results[quiz.i] = ok;
  const answered = quiz.i + 1;
  const finished = answered === quiz.qs.length;
  if (finished) quiz.best = Math.max(quiz.best, quiz.score);

  writeEntry(quiz.room, state.user.uid, {
    name: state.name, score: quiz.score, correct: quiz.correct, answered,
    total: quiz.qs.length, status: finished ? "finished" : "playing", best: quiz.best,
  }).catch((e) => console.error(e));

  animateNumber($("#myScore"), quiz.score - gained, quiz.score);

  const parts = [
    h("div", { class: `verdict ${ok ? "ok" : "bad"}` },
      ok ? `정답! +${gained}점` : timedOut ? "⏰ 시간 초과" : "오답",
      ok && quiz.streak >= 2 ? h("span", { class: "combo" }, ` 🔥 ${quiz.streak} 콤보`) : null),
  ];
  if (q.type === "code") {
    if (detail?.student && (detail.student.output.length || detail.student.error)) {
      const out = h("div", { class: "output" });
      renderOutput(out, detail.student);
      parts.push(h("div", { class: "muted small" }, "내 코드 출력"), out);
    }
    if (!ok && detail?.expected) parts.push(h("div", { class: "muted small" }, "기대 출력"), h("pre", { class: "code expected" }, detail.expected));
    parts.push(h("div", { class: "muted small" }, "정답 예시"), h("pre", { class: "code" }, q.answer));
  }
  if (q.explain && q.explain !== q.answer) parts.push(h("p", { class: "explain" }, "💡 ", q.explain));
  const nextBtn = h("button", { class: "primary", onclick: () => next() }, finished ? "결과 보기" : "다음 문제 →");
  parts.push(h("div", { class: "row end" }, nextBtn));
  fb.replaceChildren(h("div", { class: `fb-card ${ok ? "ok" : "bad"}` }, parts));
  nextBtn.focus();
}

function next() {
  const quiz = state.quiz;
  quiz.i++;
  if (quiz.i >= quiz.qs.length) return showResult();
  showQuestion();
}

function updateMyRank() {
  const el = $("#myRank");
  if (!el || !state.user) return;
  const idx = state.board.findIndex((r) => r.uid === state.user.uid);
  el.textContent = idx >= 0 ? `현재 ${idx + 1}위 / ${state.board.length}명` : "";
}

function showResult() {
  const quiz = state.quiz;
  quiz.running = false;
  const idx = state.board.findIndex((r) => r.uid === state.user.uid);
  const rankText = h("span", { id: "resultRank" }, idx >= 0 ? `${idx + 1}위` : "-");
  $("#quizMain").replaceChildren(h("div", { class: "card result" },
    h("span", { class: "chip" }, "RESULT"),
    h("h2", {}, quiz.correct === quiz.qs.length ? "완벽해요! 🏆" : quiz.correct >= 7 ? "훌륭해요! 🎉" : quiz.correct >= 4 ? "잘했어요! 👍" : "다음엔 더 잘할 수 있어요 💪"),
    h("div", { class: "result-grid" },
      h("div", {}, h("small", {}, "점수"), h("b", {}, quiz.score.toLocaleString())),
      h("div", {}, h("small", {}, "정답"), h("b", {}, `${quiz.correct}/${quiz.qs.length}`)),
      h("div", {}, h("small", {}, "현재 순위"), h("b", {}, rankText)),
      h("div", {}, h("small", {}, "최고 점수"), h("b", {}, quiz.best.toLocaleString()))),
    h("div", { class: "row center" },
      h("button", { class: "ghost", onclick: () => { state.quiz = null; show("learn"); } }, "학습으로 돌아가기"),
      h("button", { class: "primary", onclick: () => startQuiz() }, "다시 도전 🔁")),
  ));
  // 결과 화면에서도 순위가 실시간 갱신되도록
  quiz.onBoard = () => {
    const i = state.board.findIndex((r) => r.uid === state.user.uid);
    const el = $("#resultRank");
    if (el) el.textContent = i >= 0 ? `${i + 1}위` : "-";
  };
}

function endQuiz(abandon) {
  const quiz = state.quiz;
  if (!quiz) return;
  clearInterval(quiz.timer);
  $("#quizMain")._keys?.();
  if (abandon && quiz.running && state.user) {
    writeEntry(quiz.room, state.user.uid, { status: "finished" }).catch(() => {});
  }
  state.quiz = null;
}
