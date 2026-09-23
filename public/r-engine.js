// 브라우저 안에서 실제 R을 실행하는 webR 래퍼
import { WebR } from "https://webr.r-wasm.org/latest/webr.mjs";

let webR = null;
let readyPromise = null;
let queue = Promise.resolve(); // R 호출을 한 번에 하나씩 실행

export function initR() {
  if (!readyPromise) {
    readyPromise = (async () => {
      webR = new WebR();
      await webR.init();
      return webR;
    })();
  }
  return readyPromise;
}

function serial(fn) {
  const p = queue.then(fn, fn);
  queue = p.catch(() => {});
  return p;
}

/**
 * R 코드를 실행하고 콘솔 출력과 그래프를 돌려준다.
 * fresh=true면 전역 환경을 더럽히지 않도록 새 환경(부모=globalenv)에서 실행한다.
 */
export function runR(code, { fresh = false, width = 560, height = 400 } = {}) {
  return serial(async () => {
    const w = await initR();
    const shelter = await new w.Shelter();
    let env;
    try {
      if (fresh) env = await shelter.evalR("new.env(parent = globalenv())");
      const res = await shelter.captureR(code, {
        env,
        withAutoprint: true,
        captureStreams: true,
        captureConditions: false,
        captureGraphics: { width, height },
      });
      const output = res.output.map((o) => ({ type: o.type, text: String(o.data) }));
      // R 오류(문법 오류, 없는 함수 등)는 예외가 아니라 stderr의 "Error..." 줄로 들어온다.
      const failed = output.some((o) => o.type === "stderr" && /^Error/.test(o.text));
      return { output, images: res.images || [], error: null, failed };
    } catch (e) {
      return { output: [], images: [], error: String(e.message || e).replace(/^Error:\s*/, "") };
    } finally {
      shelter.purge();
    }
  });
}

const normalize = (r) =>
  r.output
    .filter((o) => o.type === "stdout")
    .flatMap((o) => o.text.split("\n"))
    .map((l) => l.replace(/\s+$/, ""))
    .filter(Boolean)
    .join("\n");

/**
 * 학생 코드와 정답 코드를 각각 새 환경에서 실행해 출력이 같은지 비교한다.
 * check === "plot" 이면 그래프가 그려졌는지만 확인한다.
 */
export async function grade(studentCode, answerCode, check) {
  const student = await runR(studentCode, { fresh: true });
  if (student.error || student.failed) return { ok: false, student, reason: "코드 실행 중 오류가 발생했어요." };
  if (!studentCode.trim()) return { ok: false, student, reason: "코드를 입력해 주세요." };
  if (check === "plot") {
    const ok = student.images.length > 0;
    return { ok, student, reason: ok ? "" : "그래프가 그려지지 않았어요." };
  }
  const expectedRun = await runR(answerCode, { fresh: true });
  const expected = normalize(expectedRun);
  const got = normalize(student);
  const ok = got === expected && expected !== "";
  return { ok, student, expected, reason: ok ? "" : "출력이 기대한 결과와 달라요." };
}
