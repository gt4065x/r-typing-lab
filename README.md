# R 타이핑 랩

R 명령어를 직접 입력하면서 배우는 학습 사이트입니다. 브라우저에서 진짜 R([webR](https://docs.r-wasm.org/webr/latest/))이 실행되고, 퀴즈 점수는 Firebase Realtime Database를 통해 실시간 순위표에 반영됩니다.

## 구성

| 파일 | 역할 |
|---|---|
| `public/index.html`, `style.css` | 화면 |
| `public/app.js` | 로그인, 학습, 퀴즈, 실시간 순위표 |
| `public/r-engine.js` | webR 실행과 채점(학생 출력과 정답 출력 비교) |
| `public/content.js` | 레슨 10개와 퀴즈 문제 은행. **문제를 추가하거나 고칠 때는 이 파일만 수정합니다** |
| `public/firebase.js` | Firebase 설정과 DB 접근. 모든 데이터는 `rlearn/` 경로 아래에 저장됩니다 |
| `database.rules.json` | Realtime Database 보안 규칙 (`rlearn` 부분) |

## 처음 한 번만 하는 Firebase 설정

1. **Authentication**: Firebase 콘솔 → Authentication → 로그인 방법에서 **이메일/비밀번호**를 사용 설정합니다.
2. **보안 규칙**: Realtime Database → 규칙 탭에 `database.rules.json`의 `"rlearn": {...}` 블록을 **기존 규칙 안에 합쳐 넣습니다**.
   이 프로젝트(bbb-game)에 이미 다른 규칙이 있다면 전체를 덮어쓰지 마세요.

## 로컬 실행

```bash
python -m http.server 5500 --directory public
```

브라우저에서 http://localhost:5500 을 엽니다. `file://`로 직접 열면 동작하지 않습니다.

## 배포 (Firebase Hosting)

```bash
firebase deploy --only hosting --project bbb-game-d6047
```

`--only hosting`을 꼭 붙이세요. `firebase.json`에는 hosting 설정만 들어 있어서 DB 규칙은 배포되지 않습니다.

## 수업에서 쓰는 법

- 학생들은 회원가입 후 **퀴즈 · 실시간 순위** 탭에서 선생님이 알려준 **방 코드**(예: `R101`, `STAT2-A`)를 입력하고 시작합니다.
- 같은 방 코드를 쓴 학생끼리 순위표를 공유합니다. 반이나 차시마다 새 코드를 쓰면 순위가 새로 시작됩니다.
- 점수는 정답 100점, 속도 보너스 최대 50점, 2연속 정답부터 붙는 콤보 보너스로 구성됩니다.

## 참고

- 채점은 학생 브라우저에서 이뤄지므로 개발자 도구로 점수를 조작하는 것까지 막지는 못합니다. 보안 규칙은 본인 항목만 쓸 수 있고 점수가 0~3000 범위에 있는지만 검사합니다.
- webR은 처음 접속할 때 약 10~20초 동안 로딩되고, 이후에는 브라우저 캐시를 사용합니다.
