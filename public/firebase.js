// Firebase 초기화 및 DB 헬퍼
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, updateProfile, signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getDatabase, ref, get, set, update, onValue, query,
  orderByChild, limitToLast, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAp_iI1mhnIWMebdzXUu2gE21aW9TMD2sg",
  authDomain: "bbb-game-d6047.firebaseapp.com",
  databaseURL: "https://bbb-game-d6047-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "bbb-game-d6047",
  storageBucket: "bbb-game-d6047.firebasestorage.app",
  messagingSenderId: "183746574206",
  appId: "1:183746574206:web:62690fa29fb2024a26652f",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const db = getDatabase(app);

// 같은 프로젝트의 다른 데이터(bbb-game 등)와 섞이지 않도록 모든 경로를 rlearn/ 아래에 둔다.
const ROOT = "rlearn";
const P = {
  user: (uid) => `${ROOT}/users/${uid}`,
  progress: (uid) => `${ROOT}/progress/${uid}`,
  board: (room) => `${ROOT}/leaderboard/${room}`,
  entry: (room, uid) => `${ROOT}/leaderboard/${room}/${uid}`,
};

export const watchAuth = (cb) => onAuthStateChanged(auth, cb);
export const login = (email, pw) => signInWithEmailAndPassword(auth, email, pw);
export const logout = () => signOut(auth);

export async function signup({ email, password, name, studentId }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  await set(ref(db, P.user(cred.user.uid)), {
    name, studentId: studentId || "", createdAt: serverTimestamp(),
  });
  return cred.user;
}

export async function loadProfile(uid) {
  const snap = await get(ref(db, P.user(uid)));
  return snap.val();
}

export async function loadProgress(uid) {
  const snap = await get(ref(db, P.progress(uid)));
  return snap.val() || {};
}

export const saveProgress = (uid, key) =>
  set(ref(db, `${P.progress(uid)}/${key}`), true);

export async function getEntry(room, uid) {
  const snap = await get(ref(db, P.entry(room, uid)));
  return snap.val();
}

export const writeEntry = (room, uid, data) =>
  update(ref(db, P.entry(room, uid)), { ...data, updatedAt: serverTimestamp() });

// 방(room)의 순위표를 실시간 구독. 반환값을 호출하면 구독 해제.
export function watchBoard(room, cb) {
  const q = query(ref(db, P.board(room)), orderByChild("score"), limitToLast(50));
  return onValue(q, (snap) => {
    const rows = [];
    snap.forEach((c) => { rows.push({ uid: c.key, ...c.val() }); });
    rows.sort((a, b) => (b.score - a.score) || ((a.updatedAt || 0) - (b.updatedAt || 0)));
    cb(rows);
  }, (err) => cb(null, err));
}
