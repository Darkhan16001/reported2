"use strict";

const D = window.LESSON;
if (!D) throw new Error("index.html: LESSON мәліметтері жоқ");

const PAGES = [
  ["home", "Басты бет"],
  ["lesson", "Түсіндірмелер"],
  ["video", "Қысқа видео"],
  ["notes", "Дәптерге конспект"],
  ["written", "Командалық жұмыс"],
  ["oral", "Ауызша жарыс"],
  ["final", "Қорытынды"]
];

const KEY = "English80_" + D.id;
const TOTAL = 80 * 60;

function fresh() {
  return {
    started: null,
    page: "home",
    slide: 0,
    round: 0,
    oralIndex: 0,
    reveal: false,
    names: ["1-команда", "2-команда"],
    written: {},
    oral: {}
  };
}

let stored = {};
try {
  stored = JSON.parse(localStorage.getItem(KEY)) || {};
} catch (err) {
  console.warn("Сақталған ақпарат оқылмады");
}

let s = { ...fresh(), ...stored };

if (!Array.isArray(s.names) || s.names.length !== 2)
  s.names = ["1-команда", "2-команда"];

s.written ||= {};
s.oral ||= {};

if (!PAGES.some(p => p[0] === s.page)) s.page = "home";
s.slide = Math.max(0, Math.min(D.lessons.length - 1, +s.slide || 0));
s.round = Math.max(0, Math.min(3, +s.round || 0));
s.oralIndex = Math.max(0, Math.min(D.oral.length - 1, +s.oralIndex || 0));

let readingOnly = false;

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch (err) {
    console.warn("Сақтау қатесі");
  }
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[c]);
}

function passed() {
  if (!s.started) return 0;
  return Math.min(TOTAL, Math.max(0, Math.floor(
    (Date.now() - s.started) / 1000
  )));
}

function clockText(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const sec = seconds % 60;
  return [h, m, sec].map(n => String(n).padStart(2, "0")).join(":");
}

function start() {
  if (!s.started) s.started = Date.now();
  save();
  render();
}

function reset() {
  if (!confirm("Таймер мен ұпайларды өшіріп, қайта бастайсыз ба?"))
    return;

  s = fresh();
  readingOnly = false;
  save();
  render(true);
}

function page(name) {
  if (!PAGES.some(p => p[0] === name)) return;
  s.page = name;
  s.reveal = false;
  save();
  render(true);
}

function slide(index) {
  if (index < 0 || index >= D.lessons.length) return;
  s.slide = index;
  save();
  render(true);
}

function round(index) {
  if (index < 0 || index > 3) return;
  s.round = index;
  save();
  render(true);
}

function oralQuestion(index) {
  if (index < 0 || index >= D.oral.length) return;
  s.oralIndex = index;
  s.reveal = false;
  save();
  render(true);
}

function toggleAnswer() {
  s.reveal = !s.reveal;
  save();
  render();
}

function rename(team, name) {
  s.names[team] = name.trim() || (team + 1) + "-команда";
  save();
  render();
}

function writtenKey(index, team) {
  return index + "-" + team;
}

function markWritten(index, team, points) {
  if (!Number.isInteger(points) || points < 0 || points > 10)
    return;

  if (index !== 0 && ![0, 5, 10].includes(points))
    return;

  s.written[writtenKey(index, team)] = points;
  save();
  render();
}

function markOral(index, points) {
  if (index !== s.oralIndex || !s.reveal) return;
  if (![0, 5, 10].includes(points)) return;

  s.oral[index] = points;
  save();
  render();
}

function writtenScore(team) {
  let score = 0;
  for (let i = 0; i < 4; i++)
    score += Number(s.written[writtenKey(i, team)] ?? 0);
  return score;
}

function oralScore(team) {
  let score = 0;
  D.oral.forEach((q, i) => {
    if (i % 2 === team) score += Number(s.oral[i] ?? 0);
  });
  return score;
}

function totalScore(team) {
  return writtenScore(team) + oralScore(team);
}

function heading(title, subtitle = "") {
  return `
    <div class="top">
      <span class="kicker">ENGLISH · 1-КУРС · ${esc(D.title)}</span>
      <span class="by">BY DARKHAN</span>
    </div>
    <h1>${esc(title)}</h1>
    <p class="intro">${esc(subtitle)}</p>
    <div class="line"></div>
  `;
}

function note(content) {
  return `
    <div class="copy">
      <div class="copy-title">✍️ ДӘПТЕРГЕ ЖАЗЫП АЛ!</div>
      <div class="copy-content">${esc(content)}</div>
    </div>
  `;
}

function nextButton(next) {
  return `
    <div class="actions">
      <button class="primary" onclick="page('${next}')">
        Келесі бөлім →
      </button>
    </div>
  `;
}

function viewHome() {
  return `
    ${heading(D.title, D.subtitle)}
    <h2>Бүгінгі сабақта не үйренеміз?</h2>
    <p class="prose">${esc(D.intro)}</p>
    ${note("Сабақ тақырыбы: " + D.title +
      "\nМақсаты: ережені түсіну, мәтінді оқу, дәптерге тапсырма орындау және ағылшын тілінде жауап беру.")}
    <p class="intro">
      Сабақ 80 минутқа жоспарланған.
      Барлық бөлім еркін ашылады — уақыттық құлып жоқ.
    </p>
    <div class="actions">
      <button class="primary" onclick="start();page('lesson')">
        ▶ Сабақты бастау
      </button>
    </div>
  `;
}

function viewLesson() {
  const x = D.lessons[s.slide];
  return `
    ${heading(D.title, "Түсіндірме · " +
      (s.slide + 1) + " / " + D.lessons.length)}
    <span class="tag">GRAMMAR EXPLANATION</span>
    <h2>${esc(x.title)}</h2>
    <div class="prose">${esc(x.text)}</div>
    <div class="examples">
      <span class="tag">МЫСАЛДАР</span>
      ${x.examples.map(v =>
        `<p class="example">${esc(v)}</p>`
      ).join("")}
    </div>
    ${note(x.note)}
    <div class="discuss">
      <strong>💡 ОЙЛАН ЖӘНЕ ТАЛҚЫЛА</strong>
      <div>${esc(x.ask)}</div>
    </div>
    <div class="actions">
      <button class="btn" onclick="slide(${s.slide - 1})"
        ${s.slide === 0 ? "disabled" : ""}>← Артқа</button>
      <button class="primary" onclick="slide(${s.slide + 1})"
        ${s.slide === D.lessons.length - 1 ? "disabled" : ""}>
        Келесі түсіндірме →
      </button>
    </div>
    ${s.slide === D.lessons.length - 1
      ? nextButton("video") : ""}
  `;
}

function viewVideo() {
  const id = D.video.id;
  const url = "https://www.youtube.com/watch?v=" + id;

  return `
    ${heading("Қысқа видео", "Тыңдап, грамматикалық ережені бекіт.")}
    <h2>${esc(D.video.title)}</h2>
    <iframe class="video"
      src="https://www.youtube-nocookie.com/embed/${id}?rel=0"
      title="${esc(D.video.title)}"
      loading="lazy"
      allow="accelerometer;autoplay;encrypted-media;gyroscope;picture-in-picture"
      referrerpolicy="strict-origin-when-cross-origin"
      allowfullscreen></iframe>
    <a href="${url}" target="_blank" rel="noopener noreferrer">
      ▶ YouTube-та бөлек ашу
    </a>
    ${note("Видеодан екі мысал жазып ал.\n" + D.video.task)}
    ${nextButton("notes")}
  `;
}

function viewNotes() {
  return `
    ${heading("Дәптерге конспект", "Ережелерді көшіріп жаз.")}
    ${note("Негізгі ережелерді толық көшір.\nФормулаларды және мысалдарды ұмытпа.")}
    <ol class="notes">
      ${D.summary.map(v => `<li>${esc(v)}</li>`).join("")}
    </ol>
    <h2>Конспектті бекіту</h2>
    <ol class="tasks">
      ${D.noteTasks.map(v => `<li>${esc(v)}</li>`).join("")}
    </ol>
    ${nextButton("written")}
  `;
}

function scoreButtons(index, team) {
  const chosen = s.written[writtenKey(index, team)];
  return `
    <div class="grade">
      <span class="tag">МҰҒАЛІМНІҢ БАҒАЛАУЫ</span>
      <p class="muted">Дәптер тексерілген соң ұпай қойылады.</p>
      <div class="actions">
        ${[0, 5, 10].map(n => `
          <button
            class="${n === 10 ? "good" : n === 5 ? "half" : "bad"}
              ${chosen === n ? "selected" : ""}"
            onclick="markWritten(${index},${team},${n})">
            ${n} ұпай
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

function viewWritten() {
  if (s.round === 0) {
    return `
      ${heading("Reading — True / False",
        "Бірінші командалық жұмыс · мәтінді оқып, дәптерге T/F белгіле.")}
      <p class="intro">
        Проекторға тек ағылшын мәтіні шығады.
        True / False тұжырымдары әр команданың жеке парағында болады.
      </p>
      ${note("READING — TRUE / FALSE\n1. Мәтінді мұқият оқы.\n2. Әр тұжырымды True немесе False деп белгіле.\n3. False болса, дұрыс сөйлемді дәптерге жаз.\n4. Дәптерді мұғалімге тексертуге алып кел.")}
      <div class="actions">
        <button class="btn" onclick="printSheet('questions')">
          🖨 Екі командаға тапсырма парақтары
        </button>
        <button class="btn" onclick="printSheet('answers')">
          🔑 Мұғалімнің жауап кілті
        </button>
        <button class="primary" onclick="openReading()">
          📖 ТАҚТАҒА ТЕК МӘТІНДІ ШЫҒАРУ
        </button>
      </div>
      <p class="muted">
        Мәтінді ғана көрсету режимінен Esc батырмасымен шығасың.
        Дұрыс жауаптар проекторға шығарылмайды.
      </p>
      <div class="line"></div>
      <h2>Reading нәтижесін енгізу</h2>
      <div class="teams">
        ${[0, 1].map(team => `
          <section>
            <div class="team-title">${esc(s.names[team])}</div>
            <p class="intro">10 тұжырымнан нешеуі дұрыс?</p>
            <input type="number" min="0" max="10" step="1"
              value="${s.written[writtenKey(0, team)] ?? ""}"
              style="padding:12px;width:140px"
              onchange="if(this.value!=='')markWritten(0,${team},Number(this.value))">
          </section>
        `).join("")}
      </div>
      <div class="actions">
        <button class="primary" onclick="round(1)">
          Келесі жазбаша жұмыс →
        </button>
      </div>
    `;
  }

  const w = D.written[s.round - 1];

  return `
    ${heading("Дәптерге командалық жұмыс", "Жазбаша бөлім " +
      (s.round + 1) + " / 4")}
    ${note("Тапсырмаларды дәптерге толық орында!\nДайын болғанда мұғалімге тексертуге алып кел.")}
    <h2>${esc(w.title)}</h2>
    <p class="intro">${esc(w.instruction)}</p>
    <div class="teams">
      ${[0, 1].map(team => `
        <section>
          <div class="team-title">${esc(s.names[team])}</div>
          <ol class="tasks">
            ${w.teams[team].map(q => `<li>${esc(q)}</li>`).join("")}
          </ol>
          ${scoreButtons(s.round, team)}
        </section>
      `).join("")}
    </div>
    <div class="actions">
      <button class="btn" onclick="round(${s.round - 1})">← Артқа</button>
      <button class="primary" onclick="round(${s.round + 1})"
        ${s.round === 3 ? "disabled" : ""}>Келесі тапсырма →</button>
    </div>
    ${s.round === 3 ? nextButton("oral") : ""}
  `;
}

function viewOral() {
  const i = s.oralIndex;
  const q = D.oral[i];
  const team = i % 2;
  const chosen = s.oral[i];

  return `
    ${heading("Ауызша командалық жарыс",
      "Алдымен команда жауап береді, содан кейін дұрыс жауабы ашылады.")}
    <span class="tag">СҰРАҚ ${i + 1} / ${D.oral.length}</span>
    <h2 style="color:var(--accent)">${esc(s.names[team])} жауап береді</h2>
    <div class="oral-question">${esc(q.q)}</div>
    <div class="actions">
      <button class="good" onclick="toggleAnswer()">
        ${s.reveal ? "🙈 Жауапты жасыру" : "👁 Жауапты көрсету"}
      </button>
    </div>
    ${s.reveal ? `
      <div class="answer">
        <strong>✓ ДҰРЫС ЖАУАПТЫҢ ҮЛГІСІ</strong>
        <p>${esc(q.a)}</p>
      </div>
      <p class="muted">Команданың жауабын бағалау:</p>
      <div class="actions">
        ${[0, 5, 10].map(n => `
          <button class="${n === 10 ? "good" : n === 5 ? "half" : "bad"}
            ${chosen === n ? "selected" : ""}"
            onclick="markOral(${i},${n})">${n} ұпай</button>
        `).join("")}
      </div>
    ` : `
      <p class="muted">Жауап команданың сөйлеп болғанына дейін жасырылған.</p>
    `}
    <div class="line"></div>
    <div class="actions">
      <button class="btn" onclick="oralQuestion(${i - 1})"
        ${i === 0 ? "disabled" : ""}>← Алдыңғы</button>
      <button class="primary" onclick="oralQuestion(${i + 1})"
        ${i === D.oral.length - 1 ? "disabled" : ""}>Келесі сұрақ →</button>
    </div>
    ${i === D.oral.length - 1 ? nextButton("final") : ""}
  `;
}

function viewFinal() {
  const a = totalScore(0);
  const b = totalScore(1);
  const winner = a === b
    ? "Екі команда тең түсті!"
    : (a > b ? s.names[0] : s.names[1]) + " жеңімпаз!";

  return `
    ${heading("Сабақ қорытындысы", "Командалардың нәтижесі")}
    <div class="results">
      ${[0, 1].map(t => `
        <section>
          <h2>${esc(s.names[t])}</h2>
          <div class="big-score">${totalScore(t)} / 100</div>
          <p>Жазбаша: ${writtenScore(t)} / 40</p>
          <p>Ауызша: ${oralScore(t)} / 60</p>
        </section>
      `).join("")}
    </div>
    <div class="winner">🏆 ${esc(winner)}</div>
    <div class="line"></div>
    <h2>Қорытынды сұрақтар</h2>
    <ol class="tasks">
      <li>Қандай үш жаңа ереже үйрендіңдер?</li>
      <li>Бүгінгі мәтіннен қандай ақпарат есте қалды?</li>
      <li>Қай грамматикалық қателерді түзетуді үйрендіңдер?</li>
      <li>Әр команда ағылшынша үш сөйлем құрастырсын.</li>
    </ol>
    ${note("ҚОРЫТЫНДЫ\nБүгінгі тақырыптан үш ережені және екі ағылшын сөйлемін жаз.")}
    <h2>${passed() >= TOTAL
      ? "✓ 80 минут аяқталды!"
      : "Сабақтың жалпы 80 минуттық таймері жүріп жатыр"}</h2>
  `;
}

function sidebar() {
  return `
    <aside class="sidebar">
      <div class="brand">ENGLISH <span style="color:var(--accent)">80</span></div>
      <p class="muted">${esc(D.title)} · By Darkhan</p>
      <div class="clock-area">
        <div class="muted">Қалған уақыт</div>
        <div class="clock" id="clock">${clockText(TOTAL - passed())}</div>
        <div class="muted" id="elapsed">${Math.floor(passed()/60)} / 80 мин</div>
        <div class="track"><div id="fill" class="fill"
          style="width:${passed()/TOTAL*100}%"></div></div>
        ${!s.started ? `<button class="primary"
          style="width:100%" onclick="start()">▶ Таймерді бастау</button>` : ""}
      </div>
      <div class="side-label">БӨЛІМДЕР — БӘРІ АШЫҚ</div>
      ${PAGES.map(([id, label]) => `
        <button class="nav ${s.page===id?"active":""}"
          onclick="page('${id}')">${esc(label)}</button>
      `).join("")}
      ${s.page === "written" ? `
        <div class="side-label">ЖАЗБАША БӨЛІМДЕР</div>
        ${["Reading / True-False","2-тапсырма",
           "3-тапсырма","4-тапсырма"].map((name,i) => `
          <button class="nav ${s.round===i?"active":""}"
            onclick="round(${i})">${name}</button>
        `).join("")}
      ` : ""}
      <div class="side-label">2 КОМАНДА</div>
      ${[0,1].map(t => `
        <div class="team-score">
          <input value="${esc(s.names[t])}"
            aria-label="${t+1}-команда"
            onchange="rename(${t},this.value)">
          <div class="score-small">${totalScore(t)} / 100</div>
          <div class="muted">
            Жазбаша: ${writtenScore(t)} · Ауызша: ${oralScore(t)}
          </div>
        </div>
      `).join("")}
      <button class="btn" onclick="reset()"
        style="width:100%;margin-top:16px">↻ Қайта бастау</button>
      <footer>BY DARKHAN</footer>
    </aside>
  `;
}

// ТЕК МӘТІН КӨРСЕТУ
function openReading() {
  readingOnly = true;
  render(true);
  document.documentElement.requestFullscreen?.().catch(() => {});
}

function closeReading() {
  readingOnly = false;
  if (document.fullscreenElement) {
    document.exitFullscreen?.().catch(() => {});
  }
  render(true);
}

// ОҚУШЫ ПАРАҒЫ МЕН МҰҒАЛІМ КІЛТІ
function printSheet(kind) {
  const r = D.reading;
  const win = window.open("", "_blank");
  if (!win) {
    alert("Браузерде жаңа терезеге рұқсат бер.");
    return;
  }

  const content = [0,1].map(team => {
    const questions = r.teams[team].map((q,i) => `
      <li>${esc(q)}<br>______ T / F</li>
    `).join("");

    if (kind === "questions") {
      return `
        <section class="sheet">
          <h1>${esc(D.title)} · Reading / True or False</h1>
          <h2>${esc(s.names[team])}</h2>
          <p>Read the text on the board.
          Mark True or False in your notebook.
          Correct the false statements.</p>
          <ol>${questions}</ol>
        </section>
      `;
    }

    const key = r.answers[team].map((value,i) =>
      `<li>${value ? "True" : "False"} — ${esc(r.teams[team][i])}</li>`
    ).join("");

    return `
      <section class="sheet">
        <h1>МҰҒАЛІМГЕ АРНАЛҒАН ЖАУАП КІЛТІ</h1>
        <h2>${esc(s.names[team])}</h2>
        <ol>${key}</ol>
      </section>
    `;
  }).join("");

  win.document.write(`<!doctype html><html lang="kk">
    <head><meta charset="UTF-8"><title>Worksheet</title>
    <style>
      body{font-family:Arial,sans-serif;color:#111;padding:20px}
      .sheet{break-after:page;max-width:850px;margin:auto}
      h1{font-size:25px}ol{font-size:17px;line-height:1.9}
      li{margin:12px 0}
      @media print{body{padding:0}}
    </style></head><body>${content}</body></html>`);
  win.document.close();
  win.focus();
}

function render(top = false) {
  const root = document.getElementById("root");
  const y = window.scrollY;

  if (readingOnly) {
    root.innerHTML = `
      <main class="reader">
        <h1>${esc(D.reading.title)}</h1>
        <div class="reader-text">${esc(D.reading.text)}</div>
      </main>
    `;
  } else {
    const views = {
      home:viewHome,
      lesson:viewLesson,
      video:viewVideo,
      notes:viewNotes,
      written:viewWritten,
      oral:viewOral,
      final:viewFinal
    };

    root.innerHTML = `
      <div class="app" data-topic="${esc(D.id)}">
        <main class="main">
          <div class="page">
            ${views[s.page]()}
            <footer>ENGLISH 80 · BY DARKHAN</footer>
          </div>
        </main>
        ${sidebar()}
      </div>
    `;
  }

  window.scrollTo(0, top ? 0 : y);
}

document.addEventListener("keydown", ev => {
  if (readingOnly) {
    if (ev.key === "Escape") closeReading();
    return;
  }

  if (["INPUT","TEXTAREA"].includes(document.activeElement?.tagName))
    return;

  if (s.page === "lesson") {
    if (ev.key === "ArrowRight") slide(s.slide + 1);
    if (ev.key === "ArrowLeft") slide(s.slide - 1);
  }
  if (s.page === "oral") {
    if (ev.key === "ArrowRight") oralQuestion(s.oralIndex + 1);
    if (ev.key === "ArrowLeft") oralQuestion(s.oralIndex - 1);
  }
});

function tick() {
  const clock = document.getElementById("clock");
  const elapsed = document.getElementById("elapsed");
  const fill = document.getElementById("fill");
  if (clock) clock.textContent = clockText(Math.max(0,TOTAL-passed()));
  if (elapsed) elapsed.textContent = Math.floor(passed()/60)+" / 80 мин";
  if (fill) fill.style.width = passed()/TOTAL*100+"%";
  if (s.page === "final" && passed() === TOTAL &&
      !document.querySelector(".timer-complete")) {
    // Қорытынды экранды бір рет жаңарту
    if (!window.__finalRefreshed) {
      window.__finalRefreshed = true;
      render();
    }
  }
}

render();
setInterval(tick,1000);