// 학습 콘텐츠와 퀴즈 문제 은행
// exercises: { prompt, starter, answer, hint, check? }  — check: "plot"이면 그래프 생성 여부로 채점
// body는 신뢰할 수 있는 HTML(작성자가 직접 씀)만 넣는다.

export const LESSONS = [
  {
    id: "basics",
    title: "R은 계산기다",
    tag: "기초",
    body: `
      <p>R 콘솔에 식을 입력하면 바로 결과가 나옵니다. 결과 앞의 <code>[1]</code>은 "첫 번째 값"이라는 뜻이에요.</p>
      <p>값을 저장할 때는 화살표 <code>&lt;-</code>를 씁니다. <kbd>Alt</kbd>+<kbd>-</kbd>를 누르면 편집기에서 바로 입력돼요.</p>
      <ul>
        <li><code>+ - * /</code> 사칙연산, <code>^</code> 거듭제곱</li>
        <li><code>%/%</code> 몫, <code>%%</code> 나머지</li>
      </ul>`,
    examples: [
      { code: "3 + 4 * 2", note: "곱셈이 먼저 계산돼요" },
      { code: "x <- 10\nx * 2", note: "변수에 저장하고 사용하기" },
      { code: "17 %/% 5\n17 %% 5", note: "몫과 나머지" },
    ],
    exercises: [
      { prompt: "12와 8의 곱을 계산하세요.", starter: "", answer: "12 * 8", hint: "곱셈 기호는 * 입니다." },
      { prompt: "변수 age에 20을 저장한 뒤, age에 5를 더한 값을 출력하세요.", starter: "", answer: "age <- 20\nage + 5", hint: "age <- 20 을 먼저 입력하고, 다음 줄에 age + 5" },
      { prompt: "2의 10제곱을 계산하세요.", starter: "", answer: "2^10", hint: "거듭제곱은 ^ 기호를 씁니다." },
    ],
  },
  {
    id: "vectors",
    title: "벡터 만들기",
    tag: "벡터",
    body: `
      <p>R의 가장 기본 자료형은 <b>벡터</b>입니다. 여러 값을 한 줄로 묶은 것이에요.</p>
      <ul>
        <li><code>c(1, 2, 3)</code> — 값을 직접 묶기 (combine)</li>
        <li><code>1:10</code> — 1부터 10까지 연속 정수</li>
        <li><code>seq(from, to, by)</code> — 간격을 정한 수열</li>
        <li><code>rep(x, times)</code> — 반복</li>
      </ul>`,
    examples: [
      { code: 'c(3, 1, 4, 1, 5)', note: "숫자 벡터" },
      { code: 'fruits <- c("사과", "배", "귤")\nfruits', note: "문자 벡터" },
      { code: "seq(1, 2, by = 0.25)", note: "0.25 간격 수열" },
    ],
    exercises: [
      { prompt: "1부터 10까지의 정수 벡터를 출력하세요.", starter: "", answer: "1:10", hint: "콜론(:)을 사용해 보세요." },
      { prompt: "seq()를 사용해 0부터 100까지 25 간격의 수열을 만드세요.", starter: "", answer: "seq(0, 100, by = 25)", hint: "seq(0, 100, by = ...)" },
      { prompt: 'rep()를 사용해 "A"를 3번 반복한 벡터를 만드세요.', starter: "", answer: 'rep("A", 3)', hint: '문자는 따옴표로 감싸야 해요: rep("A", ...)' },
    ],
  },
  {
    id: "indexing",
    title: "벡터 연산과 인덱싱",
    tag: "벡터",
    body: `
      <p>벡터는 <b>원소별로</b> 계산됩니다. <code>c(1,2,3) * 2</code>는 <code>2 4 6</code>이 돼요.</p>
      <p>대괄호 <code>[ ]</code>로 원소를 꺼냅니다. R의 인덱스는 <b>1부터</b> 시작해요.</p>
      <ul>
        <li><code>x[2]</code> — 두 번째 원소</li>
        <li><code>x[c(1, 3)]</code> — 1번째와 3번째</li>
        <li><code>x[x &gt; 5]</code> — 조건에 맞는 원소만 (논리 인덱싱)</li>
      </ul>`,
    examples: [
      { code: "x <- c(10, 20, 30, 40)\nx[2]", note: "두 번째 원소" },
      { code: "x <- c(10, 20, 30, 40)\nx > 25", note: "비교하면 TRUE/FALSE 벡터" },
      { code: "x <- c(10, 20, 30, 40)\nx[x > 25]", note: "조건으로 거르기" },
    ],
    exercises: [
      { prompt: "scores의 두 번째 원소를 출력하세요.", starter: "scores <- c(80, 95, 70, 88)\n", answer: "scores <- c(80, 95, 70, 88)\nscores[2]", hint: "scores[ ] 안에 위치 번호를 넣어요." },
      { prompt: "scores에서 85점 이상인 점수만 출력하세요.", starter: "scores <- c(80, 95, 70, 88)\n", answer: "scores <- c(80, 95, 70, 88)\nscores[scores >= 85]", hint: "scores[scores >= 85]" },
      { prompt: "scores의 모든 점수에 5점을 더한 결과를 출력하세요.", starter: "scores <- c(80, 95, 70, 88)\n", answer: "scores <- c(80, 95, 70, 88)\nscores + 5", hint: "벡터에 숫자를 더하면 모든 원소에 더해져요." },
    ],
  },
  {
    id: "functions",
    title: "자주 쓰는 함수",
    tag: "함수",
    body: `
      <p>R에는 통계 계산용 함수가 많이 내장되어 있어요. <code>함수이름(인자)</code> 형태로 호출합니다.</p>
      <ul>
        <li><code>sum()</code> 합계, <code>mean()</code> 평균, <code>median()</code> 중앙값</li>
        <li><code>max()</code>, <code>min()</code>, <code>length()</code> 개수</li>
        <li><code>sort(x, decreasing = TRUE)</code> 정렬, <code>round(x, 2)</code> 반올림</li>
      </ul>
      <p>모르는 함수는 <code>?mean</code>처럼 도움말을 볼 수 있어요.</p>`,
    examples: [
      { code: "x <- c(3, 7, 1, 9, 5)\nsum(x)\nmean(x)", note: "합계와 평균" },
      { code: "x <- c(3, 7, 1, 9, 5)\nsort(x)", note: "오름차순 정렬" },
      { code: "round(3.14159, 2)", note: "소수점 둘째 자리" },
    ],
    exercises: [
      { prompt: "x의 평균을 구하세요.", starter: "x <- c(3, 7, 1, 9, 5)\n", answer: "x <- c(3, 7, 1, 9, 5)\nmean(x)", hint: "mean()" },
      { prompt: "x를 내림차순(큰 수부터)으로 정렬하세요.", starter: "x <- c(3, 7, 1, 9, 5)\n", answer: "x <- c(3, 7, 1, 9, 5)\nsort(x, decreasing = TRUE)", hint: "sort(x, decreasing = TRUE)" },
      { prompt: "원주율 pi를 소수점 둘째 자리까지 반올림하세요.", starter: "", answer: "round(pi, 2)", hint: "round(값, 자릿수)" },
    ],
  },
  {
    id: "strings",
    title: "문자열 다루기",
    tag: "문자",
    body: `
      <p>문자열은 큰따옴표 <code>"..."</code>나 작은따옴표로 감쌉니다.</p>
      <ul>
        <li><code>paste("a", "b")</code> — 공백을 넣어 붙이기, <code>paste0()</code> — 공백 없이 붙이기</li>
        <li><code>nchar()</code> 글자 수, <code>toupper()</code>/<code>tolower()</code> 대소문자</li>
        <li><code>substr(x, 시작, 끝)</code> 일부 자르기</li>
      </ul>`,
    examples: [
      { code: 'paste("Hello", "R")', note: "공백으로 연결" },
      { code: 'paste0("data", 1:3, ".csv")', note: "벡터와 함께 쓰면 여러 개 생성" },
      { code: 'substr("statistics", 1, 4)', note: "1~4번째 글자" },
    ],
    exercises: [
      { prompt: '"Hello"와 "R"을 공백 하나로 연결하세요.', starter: "", answer: 'paste("Hello", "R")', hint: "paste()" },
      { prompt: '"statistics"의 글자 수를 구하세요.', starter: "", answer: 'nchar("statistics")', hint: "nchar()" },
      { prompt: '"r language"를 모두 대문자로 바꾸세요.', starter: "", answer: 'toupper("r language")', hint: "toupper()" },
    ],
  },
  {
    id: "dataframe",
    title: "데이터프레임",
    tag: "데이터",
    body: `
      <p><b>데이터프레임</b>은 엑셀 표처럼 행과 열로 이루어진 자료입니다. 각 열은 하나의 벡터예요.</p>
      <ul>
        <li><code>df$열이름</code> — 열 하나 꺼내기</li>
        <li><code>df[행, 열]</code> — 행/열 선택 (비워두면 전체)</li>
        <li><code>nrow()</code>, <code>ncol()</code>, <code>str()</code>, <code>summary()</code></li>
      </ul>`,
    examples: [
      { code: 'df <- data.frame(name = c("Kim", "Lee", "Park"), score = c(85, 92, 78))\ndf', note: "데이터프레임 만들기" },
      { code: 'df <- data.frame(name = c("Kim", "Lee", "Park"), score = c(85, 92, 78))\ndf$name', note: "열 꺼내기" },
      { code: 'df <- data.frame(name = c("Kim", "Lee", "Park"), score = c(85, 92, 78))\ndf[2, ]', note: "2번째 행 전체" },
    ],
    exercises: [
      { prompt: "df의 score 열을 출력하세요.", starter: 'df <- data.frame(name = c("Kim", "Lee", "Park"), score = c(85, 92, 78))\n', answer: 'df <- data.frame(name = c("Kim", "Lee", "Park"), score = c(85, 92, 78))\ndf$score', hint: "df$score" },
      { prompt: "score가 80 이상인 행만 출력하세요.", starter: 'df <- data.frame(name = c("Kim", "Lee", "Park"), score = c(85, 92, 78))\n', answer: 'df <- data.frame(name = c("Kim", "Lee", "Park"), score = c(85, 92, 78))\ndf[df$score >= 80, ]', hint: "df[조건, ] — 쉼표 뒤를 비워 두면 모든 열" },
      { prompt: "df의 행 개수를 구하세요.", starter: 'df <- data.frame(name = c("Kim", "Lee", "Park"), score = c(85, 92, 78))\n', answer: 'df <- data.frame(name = c("Kim", "Lee", "Park"), score = c(85, 92, 78))\nnrow(df)', hint: "nrow()" },
    ],
  },
  {
    id: "datasets",
    title: "내장 데이터 탐색",
    tag: "데이터",
    body: `
      <p>R에는 연습용 데이터가 들어 있어요. 대표적으로 자동차 데이터 <code>mtcars</code>, 붓꽃 데이터 <code>iris</code>가 있습니다.</p>
      <ul>
        <li><code>head(df, n)</code> 앞부분 보기</li>
        <li><code>table()</code> 빈도표</li>
        <li><code>summary()</code> 요약 통계</li>
      </ul>`,
    examples: [
      { code: "head(mtcars)", note: "앞 6행" },
      { code: "str(iris)", note: "구조 확인" },
      { code: "summary(iris$Sepal.Length)", note: "요약 통계" },
    ],
    exercises: [
      { prompt: "iris 데이터의 앞 3행을 출력하세요.", starter: "", answer: "head(iris, 3)", hint: "head(데이터, 개수)" },
      { prompt: "mtcars의 mpg(연비) 열의 평균을 구하세요.", starter: "", answer: "mean(mtcars$mpg)", hint: "mean(mtcars$mpg)" },
      { prompt: "iris의 Species 열의 빈도표를 만드세요.", starter: "", answer: "table(iris$Species)", hint: "table()" },
    ],
  },
  {
    id: "control",
    title: "조건문과 반복문",
    tag: "제어",
    body: `
      <p><code>if (조건) {...} else {...}</code>로 분기하고, <code>for (i in 벡터) {...}</code>로 반복합니다.</p>
      <p>벡터 전체에 조건을 적용할 때는 <code>ifelse(조건, 참일때, 거짓일때)</code>가 편리해요.</p>`,
    examples: [
      { code: 'x <- 7\nif (x > 5) {\n  print("5보다 커요")\n} else {\n  print("5 이하예요")\n}', note: "if / else" },
      { code: "for (i in 1:3) {\n  print(i * 10)\n}", note: "for 반복" },
      { code: 'ifelse(c(1, 6, 3, 8) > 4, "big", "small")', note: "벡터화된 조건" },
    ],
    exercises: [
      { prompt: 'x가 짝수면 "even", 홀수면 "odd"를 print()로 출력하세요. (x <- 7)', starter: "x <- 7\n", answer: 'x <- 7\nif (x %% 2 == 0) print("even") else print("odd")', hint: "x %% 2 == 0 이면 짝수" },
      { prompt: "for문으로 1부터 5까지 각 수의 제곱을 print()로 출력하세요.", starter: "", answer: "for (i in 1:5) print(i^2)", hint: "for (i in 1:5) print(i^2)" },
      { prompt: 'ifelse()로 v의 각 원소가 60 이상이면 "pass", 아니면 "fail"을 출력하세요.', starter: "v <- c(55, 72, 90, 40)\n", answer: 'v <- c(55, 72, 90, 40)\nifelse(v >= 60, "pass", "fail")', hint: 'ifelse(v >= 60, "pass", "fail")' },
    ],
  },
  {
    id: "myfunc",
    title: "함수 만들기",
    tag: "함수",
    body: `
      <p><code>function()</code>으로 나만의 함수를 만들 수 있어요. 마지막 줄의 값이 결과로 돌려집니다.</p>
      <pre class="snippet">함수이름 &lt;- function(인자1, 인자2) {
  결과
}</pre>`,
    examples: [
      { code: "double <- function(n) {\n  n * 2\n}\ndouble(21)", note: "2배 하는 함수" },
      { code: 'greet <- function(name = "학생") paste("안녕,", name)\ngreet()\ngreet("민지")', note: "기본값이 있는 인자" },
    ],
    exercises: [
      { prompt: "숫자를 제곱하는 함수 square를 만들고, square(9)의 결과를 출력하세요.", starter: "", answer: "square <- function(n) n^2\nsquare(9)", hint: "square <- function(n) n^2" },
      { prompt: "두 수를 더하는 함수 add(a, b)를 만들고 add(3, 4)를 출력하세요.", starter: "", answer: "add <- function(a, b) a + b\nadd(3, 4)", hint: "function(a, b) a + b" },
    ],
  },
  {
    id: "plots",
    title: "그래프 그리기",
    tag: "시각화",
    body: `
      <p>R의 기본 그래프 함수로 바로 시각화할 수 있어요. 실행하면 아래에 그림이 나타납니다.</p>
      <ul>
        <li><code>plot(x, y)</code> 산점도, <code>hist(x)</code> 히스토그램</li>
        <li><code>barplot(table(x))</code> 막대그래프, <code>boxplot(y ~ 그룹)</code> 상자그림</li>
        <li><code>main=</code> 제목, <code>col=</code> 색상, <code>xlab=</code>/<code>ylab=</code> 축 이름</li>
      </ul>`,
    examples: [
      { code: 'plot(mtcars$wt, mtcars$mpg, main = "무게 vs 연비", col = "steelblue", pch = 19)', note: "산점도" },
      { code: "boxplot(Sepal.Length ~ Species, data = iris, col = c(\"#fca5a5\", \"#93c5fd\", \"#86efac\"))", note: "그룹별 상자그림" },
    ],
    exercises: [
      { prompt: "iris의 Sepal.Length로 히스토그램을 그리세요.", starter: "", answer: "hist(iris$Sepal.Length)", hint: "hist()", check: "plot" },
      { prompt: "mtcars의 cyl(실린더 수) 빈도로 막대그래프를 그리세요.", starter: "", answer: "barplot(table(mtcars$cyl))", hint: "barplot(table(...))", check: "plot" },
    ],
  },
];

// type: "mc"(객관식, answer=정답 인덱스) | "code"(코드 작성, answer=정답 코드)
export const QUIZ_POOL = [
  { type: "mc", q: "R에서 변수에 값을 할당할 때 가장 널리 쓰는 연산자는?", options: ["<-", "==", "=>", ":="], answer: 0, explain: "x <- 5 처럼 사용합니다." },
  { type: "mc", q: "c(1, 2, 3) * 2 의 결과는?", options: ["2 4 6", "1 2 3 1 2 3", "오류", "12"], answer: 0, explain: "벡터 연산은 원소별로 적용돼요." },
  { type: "mc", q: "벡터 x의 원소 개수를 구하는 함수는?", options: ["size(x)", "length(x)", "count(x)", "len(x)"], answer: 1, explain: "length(x)" },
  { type: "mc", q: "R 벡터의 첫 번째 원소의 인덱스는?", options: ["0", "1", "-1", "상황마다 다름"], answer: 1, explain: "R은 1부터 셉니다." },
  { type: "mc", q: "데이터프레임의 앞 몇 행을 보여주는 함수는?", options: ["top()", "first()", "head()", "peek()"], answer: 2, explain: "head(df)는 기본 6행을 보여줘요." },
  { type: "mc", q: "10 %% 3 의 결과는?", options: ["3", "3.33", "0", "1"], answer: 3, explain: "%% 는 나머지 연산자입니다." },
  { type: "mc", q: "R에서 결측값(값 없음)을 나타내는 특수값은?", options: ["NA", "None", "nil", "undefined"], answer: 0, explain: "is.na()로 확인할 수 있어요." },
  { type: "mc", q: "df$age 에서 $ 기호의 역할은?", options: ["행 선택", "열 선택", "정렬", "필터링"], answer: 1, explain: "데이터프레임의 열을 이름으로 꺼냅니다." },
  { type: "mc", q: "x <- c(5, 2, 9); x[x > 3] 의 결과는?", options: ["5 9", "TRUE FALSE TRUE", "2", "9"], answer: 0, explain: "조건이 TRUE인 원소만 남아요." },
  { type: "mc", q: 'paste0("A", 1:2) 의 결과는?', options: ['"A 1" "A 2"', '"A1" "A2"', '"A12"', "오류"], answer: 1, explain: "paste0는 공백 없이 원소별로 붙입니다." },
  { type: "code", q: "1부터 100까지의 합을 구하세요.", answer: "sum(1:100)", explain: "sum(1:100) → 5050" },
  { type: "code", q: "c(4, 8, 15, 16, 23, 42)의 중앙값을 구하세요.", answer: "median(c(4, 8, 15, 16, 23, 42))", explain: "median()" },
  { type: "code", q: "5부터 1까지 거꾸로 된 정수 벡터를 출력하세요.", answer: "5:1", explain: "5:1 또는 seq(5, 1)" },
  { type: "code", q: "mtcars 데이터의 행 개수를 구하세요.", answer: "nrow(mtcars)", explain: "nrow(mtcars) → 32" },
  { type: "code", q: "iris의 Petal.Length 열의 최댓값을 구하세요.", answer: "max(iris$Petal.Length)", explain: "max(iris$Petal.Length)" },
  { type: "code", q: '"R"과 "Studio"를 공백 없이 붙여 출력하세요.', answer: 'paste0("R", "Studio")', explain: 'paste0("R", "Studio") 또는 paste("R", "Studio", sep = "")' },
  { type: "code", q: "1부터 20까지의 정수 중 3의 배수만 출력하세요.", answer: "x <- 1:20\nx[x %% 3 == 0]", explain: "x[x %% 3 == 0] 또는 seq(3, 20, by = 3)" },
  { type: "code", q: "16의 제곱근을 구하세요.", answer: "sqrt(16)", explain: "sqrt(16)" },
  { type: "code", q: "mtcars에서 hp(마력)의 평균을 소수점 첫째 자리까지 반올림하세요.", answer: "round(mean(mtcars$hp), 1)", explain: "round(mean(mtcars$hp), 1)" },
];

export const QUIZ_SIZE = { mc: 5, code: 5 };
export const TIME_LIMIT = { mc: 20, code: 60 };
