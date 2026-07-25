"use strict";

const REPO_OWNER = "Acaciayyy";
const REPO_NAME = "huikemeng-extra-paradox-wiki";
const BRANCH = "main";
const DATA_PATH = "mega-link-tournament/swiss-tournament/swiss-data.json";
const ADMIN_LOGIN = "acaciayyy";
const API_VERSION = "2022-11-28";

const DEFAULT_DATA = {
  version: 1,
  eventTitle: "辉可梦x更多Mega MegaLink联动赛",
  updatedAt: null,
  settings: {
    totalRounds: 5,
    winPoints: 3,
    drawPoints: 1,
    lossPoints: 0,
    byePoints: 3
  },
  players: [
    { id: "acaciay", name: "Acaciay", active: true },
    { id: "xiao_hui_c233", name: "xiao_hui_c233", active: true }
  ],
  rounds: []
};

const RESULT_VALUES = new Set(["pending", "a", "draw", "b", "bye"]);
const byId = id => document.getElementById(id);

const elements = {
  playerBadge: byId("playerBadge"),
  roundBadge: byId("roundBadge"),
  eventTitle: byId("eventTitle"),
  eventStatus: byId("eventStatus"),
  updatedAt: byId("updatedAt"),
  standingsBody: byId("standingsBody"),
  standingsEmpty: byId("standingsEmpty"),
  scheduleFlow: byId("scheduleFlow"),
  scheduleEmpty: byId("scheduleEmpty"),
  adminOpen: byId("adminOpen"),
  adminShell: byId("adminShell"),
  adminBackdrop: byId("adminBackdrop"),
  adminClose: byId("adminClose"),
  loginView: byId("loginView"),
  managerView: byId("managerView"),
  tokenInput: byId("tokenInput"),
  connectButton: byId("connectButton"),
  loginMessage: byId("loginMessage"),
  verifiedUser: byId("verifiedUser"),
  saveState: byId("saveState"),
  totalRoundsInput: byId("totalRoundsInput"),
  playersInput: byId("playersInput"),
  applyPlayersButton: byId("applyPlayersButton"),
  playersLockHint: byId("playersLockHint"),
  managerRoundProgress: byId("managerRoundProgress"),
  generateRoundButton: byId("generateRoundButton"),
  saveButton: byId("saveButton"),
  reloadButton: byId("reloadButton"),
  controlMessage: byId("controlMessage"),
  roundEditor: byId("roundEditor")
};

let state = structuredClone(DEFAULT_DATA);
let githubToken = "";
let dataSha = "";
let authenticatedUser = "";
let dirty = false;

function clampInteger(value, min, max, fallback) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function cleanText(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function normalizeData(input) {
  const source = input && typeof input === "object" ? input : DEFAULT_DATA;
  const settings = source.settings && typeof source.settings === "object" ? source.settings : {};
  const players = [];
  const ids = new Set();

  for (const player of Array.isArray(source.players) ? source.players : []) {
    const name = cleanText(player?.name);
    let id = cleanText(player?.id);
    if (!name) continue;
    if (!id || ids.has(id)) id = createPlayerId(name, ids);
    ids.add(id);
    players.push({ id, name: name.slice(0, 80), active: player?.active !== false });
  }

  const validPlayerIds = new Set(players.map(player => player.id));
  const rounds = [];
  for (const [roundIndex, round] of (Array.isArray(source.rounds) ? source.rounds : []).entries()) {
    const pairings = [];
    for (const [pairIndex, pairing] of (Array.isArray(round?.pairings) ? round.pairings : []).entries()) {
      const playerA = cleanText(pairing?.playerA);
      const playerB = pairing?.playerB === null ? null : cleanText(pairing?.playerB);
      if (!validPlayerIds.has(playerA)) continue;
      if (playerB !== null && !validPlayerIds.has(playerB)) continue;
      const result = RESULT_VALUES.has(pairing?.result) ? pairing.result : "pending";
      pairings.push({
        table: clampInteger(pairing?.table, 1, 999, pairIndex + 1),
        playerA,
        playerB,
        result: playerB === null ? "bye" : result
      });
    }
    rounds.push({
      number: clampInteger(round?.number, 1, 99, roundIndex + 1),
      generatedAt: cleanText(round?.generatedAt) || null,
      pairings
    });
  }

  return {
    version: 1,
    eventTitle: cleanText(source.eventTitle, DEFAULT_DATA.eventTitle).slice(0, 120),
    updatedAt: cleanText(source.updatedAt) || null,
    settings: {
      totalRounds: clampInteger(settings.totalRounds, 1, 15, 5),
      winPoints: clampInteger(settings.winPoints, 1, 20, 3),
      drawPoints: clampInteger(settings.drawPoints, 0, 20, 1),
      lossPoints: clampInteger(settings.lossPoints, 0, 20, 0),
      byePoints: clampInteger(settings.byePoints, 0, 20, 3)
    },
    players,
    rounds
  };
}

function createPlayerId(name, existingIds = new Set()) {
  const base = name
    .toLocaleLowerCase("zh-CN")
    .normalize("NFKC")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42) || "player";
  let id = base;
  let suffix = 2;
  while (existingIds.has(id)) id = `${base}-${suffix++}`;
  return id;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    "\"": "&quot;"
  })[character]);
}

function formatDate(value) {
  if (!value) return "等待首次更新";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "更新时间未知";
  return `更新于 ${new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date)}`;
}

function isRoundComplete(round) {
  return round.pairings.length > 0 && round.pairings.every(pairing => pairing.result !== "pending");
}

function calculateStandings(data = state) {
  const records = new Map();
  for (const player of data.players.filter(player => player.active)) {
    records.set(player.id, {
      id: player.id,
      name: player.name,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      points: 0,
      buchholz: 0,
      opponents: [],
      hadBye: false
    });
  }

  for (const round of data.rounds) {
    for (const pairing of round.pairings) {
      const recordA = records.get(pairing.playerA);
      if (!recordA) continue;

      if (pairing.playerB === null || pairing.result === "bye") {
        recordA.hadBye = true;
        recordA.played += 1;
        recordA.wins += 1;
        recordA.points += data.settings.byePoints;
        continue;
      }

      const recordB = records.get(pairing.playerB);
      if (!recordB) continue;
      recordA.opponents.push(recordB.id);
      recordB.opponents.push(recordA.id);

      if (pairing.result === "pending") continue;
      recordA.played += 1;
      recordB.played += 1;

      if (pairing.result === "a") {
        recordA.wins += 1;
        recordB.losses += 1;
        recordA.points += data.settings.winPoints;
        recordB.points += data.settings.lossPoints;
      } else if (pairing.result === "b") {
        recordB.wins += 1;
        recordA.losses += 1;
        recordB.points += data.settings.winPoints;
        recordA.points += data.settings.lossPoints;
      } else if (pairing.result === "draw") {
        recordA.draws += 1;
        recordB.draws += 1;
        recordA.points += data.settings.drawPoints;
        recordB.points += data.settings.drawPoints;
      }
    }
  }

  for (const record of records.values()) {
    record.buchholz = record.opponents.reduce((sum, opponentId) => sum + (records.get(opponentId)?.points || 0), 0);
  }

  return [...records.values()].sort((left, right) =>
    right.points - left.points ||
    right.buchholz - left.buchholz ||
    right.wins - left.wins ||
    left.name.localeCompare(right.name, "zh-CN", { numeric: true, sensitivity: "base" })
  );
}

function renderPublic() {
  const activePlayers = state.players.filter(player => player.active);
  const completedRounds = state.rounds.filter(isRoundComplete).length;
  const totalRounds = Math.max(state.settings.totalRounds, state.rounds.length);

  elements.playerBadge.textContent = `${activePlayers.length} 位选手`;
  elements.roundBadge.textContent = `${state.rounds.length} / ${totalRounds} 轮`;
  elements.eventTitle.textContent = state.eventTitle;
  elements.updatedAt.textContent = formatDate(state.updatedAt);

  if (!state.rounds.length) {
    elements.eventStatus.textContent = "赛程尚未开始";
  } else if (completedRounds === totalRounds && state.rounds.length === totalRounds) {
    elements.eventStatus.textContent = "全部轮次已完成";
  } else if (!isRoundComplete(state.rounds[state.rounds.length - 1])) {
    elements.eventStatus.textContent = `第 ${state.rounds.length} 轮进行中`;
  } else {
    elements.eventStatus.textContent = `已完成 ${completedRounds} 轮，等待下一轮`;
  }

  renderStandings();
  renderSchedule();
}

function renderStandings() {
  const standings = calculateStandings();
  elements.standingsEmpty.hidden = standings.length > 0;
  elements.standingsBody.innerHTML = standings.map((record, index) => `
    <tr>
      <td><span class="rank-number">${index + 1}</span></td>
      <td class="player-cell">${escapeHtml(record.name)}</td>
      <td>${record.played}</td>
      <td>${record.wins}</td>
      <td>${record.draws}</td>
      <td>${record.losses}</td>
      <td class="points-cell">${record.points}</td>
      <td>${record.buchholz}</td>
    </tr>
  `).join("");
}

function matchPresentation(pairing) {
  if (pairing.playerB === null || pairing.result === "bye") {
    return { classA: "winner", classB: "loser", markA: `+${state.settings.byePoints}`, markB: "—", label: "轮空" };
  }
  if (pairing.result === "a") return { classA: "winner", classB: "loser", markA: "1", markB: "0", label: "上方选手胜" };
  if (pairing.result === "b") return { classA: "loser", classB: "winner", markA: "0", markB: "1", label: "下方选手胜" };
  if (pairing.result === "draw") return { classA: "", classB: "", markA: "½", markB: "½", label: "平局" };
  return { classA: "", classB: "", markA: "·", markB: "·", label: "等待结果" };
}

function renderSchedule() {
  const names = new Map(state.players.map(player => [player.id, player.name]));
  elements.scheduleEmpty.hidden = state.rounds.length > 0;
  elements.scheduleFlow.hidden = state.rounds.length === 0;
  elements.scheduleFlow.innerHTML = state.rounds.map(round => {
    const complete = isRoundComplete(round);
    const matches = round.pairings.map(pairing => {
      const view = matchPresentation(pairing);
      const playerA = names.get(pairing.playerA) || "未知选手";
      const playerB = pairing.playerB === null ? "轮空" : (names.get(pairing.playerB) || "未知选手");
      return `
        <article class="match-card">
          <div class="table-label">TABLE ${pairing.table}</div>
          <div class="match-player ${view.classA}"><span>${escapeHtml(playerA)}</span><em>${view.markA}</em></div>
          <div class="match-player ${view.classB}"><span>${escapeHtml(playerB)}</span><em>${view.markB}</em></div>
          <div class="match-result">${view.label}</div>
        </article>
      `;
    }).join("");
    return `
      <section class="round-column">
        <div class="round-heading">
          <strong>第 ${round.number} 轮</strong>
          <span class="${complete ? "complete" : ""}">${complete ? "已完成" : "进行中"}</span>
        </div>
        <div class="matches">${matches}</div>
      </section>
    `;
  }).join("");
}

function secureShuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const random = new Uint32Array(1);
    crypto.getRandomValues(random);
    const target = random[0] % (index + 1);
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

function previousPairKeys() {
  const keys = new Set();
  for (const round of state.rounds) {
    for (const pairing of round.pairings) {
      if (pairing.playerB === null) continue;
      keys.add([pairing.playerA, pairing.playerB].sort().join("|"));
    }
  }
  return keys;
}

function pairingPenalty(playerA, playerB, standingMap, rankMap, previousKeys) {
  const pairKey = [playerA.id, playerB.id].sort().join("|");
  const repeatPenalty = previousKeys.has(pairKey) ? 100000 : 0;
  const scoreGap = Math.abs((standingMap.get(playerA.id)?.points || 0) - (standingMap.get(playerB.id)?.points || 0));
  const rankGap = Math.abs((rankMap.get(playerA.id) || 0) - (rankMap.get(playerB.id) || 0));
  return repeatPenalty + scoreGap * 1000 + rankGap * 3;
}

function optimizePairs(pairs, standingMap, rankMap, previousKeys) {
  for (let pass = 0; pass < 4; pass += 1) {
    let improved = false;
    for (let left = 0; left < pairs.length; left += 1) {
      for (let right = left + 1; right < pairs.length; right += 1) {
        const current =
          pairingPenalty(pairs[left][0], pairs[left][1], standingMap, rankMap, previousKeys) +
          pairingPenalty(pairs[right][0], pairs[right][1], standingMap, rankMap, previousKeys);
        const swapped =
          pairingPenalty(pairs[left][0], pairs[right][1], standingMap, rankMap, previousKeys) +
          pairingPenalty(pairs[right][0], pairs[left][1], standingMap, rankMap, previousKeys);
        if (swapped < current) {
          [pairs[left][1], pairs[right][1]] = [pairs[right][1], pairs[left][1]];
          improved = true;
        }
      }
    }
    if (!improved) break;
  }
  return pairs;
}

function selectByePlayer(players, standingMap, rankMap, firstRound) {
  if (firstRound) return players[players.length - 1];
  return [...players].sort((left, right) => {
    const leftStanding = standingMap.get(left.id);
    const rightStanding = standingMap.get(right.id);
    return Number(leftStanding?.hadBye) - Number(rightStanding?.hadBye) ||
      (leftStanding?.points || 0) - (rightStanding?.points || 0) ||
      (leftStanding?.buchholz || 0) - (rightStanding?.buchholz || 0) ||
      (rankMap.get(right.id) || 0) - (rankMap.get(left.id) || 0);
  })[0];
}

function buildNextRound() {
  const standings = calculateStandings();
  const activePlayers = state.players.filter(player => player.active);
  const standingMap = new Map(standings.map(record => [record.id, record]));
  const rankMap = new Map(standings.map((record, index) => [record.id, index]));
  const firstRound = state.rounds.length === 0;
  let ordered = firstRound
    ? secureShuffle(activePlayers)
    : standings.map(record => activePlayers.find(player => player.id === record.id)).filter(Boolean);

  let byePlayer = null;
  if (ordered.length % 2 === 1) {
    byePlayer = selectByePlayer(ordered, standingMap, rankMap, firstRound);
    ordered = ordered.filter(player => player.id !== byePlayer.id);
  }

  const previousKeys = previousPairKeys();
  const pool = [...ordered];
  const pairs = [];
  while (pool.length > 1) {
    const playerA = pool.shift();
    let bestIndex = 0;
    let bestPenalty = Number.POSITIVE_INFINITY;
    for (let index = 0; index < pool.length; index += 1) {
      const penalty = pairingPenalty(playerA, pool[index], standingMap, rankMap, previousKeys) + index;
      if (penalty < bestPenalty) {
        bestPenalty = penalty;
        bestIndex = index;
      }
    }
    const playerB = pool.splice(bestIndex, 1)[0];
    pairs.push([playerA, playerB]);
  }

  optimizePairs(pairs, standingMap, rankMap, previousKeys);
  const pairings = pairs.map(([playerA, playerB], index) => ({
    table: index + 1,
    playerA: playerA.id,
    playerB: playerB.id,
    result: "pending"
  }));
  if (byePlayer) {
    pairings.push({ table: pairings.length + 1, playerA: byePlayer.id, playerB: null, result: "bye" });
  }

  state.rounds.push({
    number: state.rounds.length + 1,
    generatedAt: new Date().toISOString(),
    pairings
  });
}

function generationBlockReason() {
  const activePlayers = state.players.filter(player => player.active);
  if (activePlayers.length < 2) return "至少需要 2 位选手才能生成对阵。";
  if (state.rounds.length >= state.settings.totalRounds) return "计划轮数已全部生成。";
  const latestRound = state.rounds[state.rounds.length - 1];
  if (latestRound && !isRoundComplete(latestRound)) return `请先录入第 ${latestRound.number} 轮全部比赛结果。`;
  return "";
}

function renderManager() {
  if (!authenticatedUser) return;
  elements.verifiedUser.textContent = `已验证：@${authenticatedUser}`;
  elements.saveState.textContent = dirty ? "有未保存修改" : "与 GitHub 数据一致";
  elements.totalRoundsInput.value = state.settings.totalRounds;
  if (document.activeElement !== elements.playersInput) {
    elements.playersInput.value = state.players.filter(player => player.active).map(player => player.name).join("\n");
  }
  const locked = state.rounds.length > 0;
  elements.playersInput.disabled = locked;
  elements.applyPlayersButton.disabled = locked;
  elements.playersLockHint.textContent = locked
    ? "赛程已经开始，选手名单已锁定。"
    : "第一轮生成后名单会锁定，避免历史积分失效。";
  elements.managerRoundProgress.textContent = `${state.rounds.length} / ${state.settings.totalRounds}`;
  elements.generateRoundButton.disabled = Boolean(generationBlockReason());
  elements.saveButton.disabled = !dirty;
  renderRoundEditor();
}

function renderRoundEditor() {
  const names = new Map(state.players.map(player => [player.id, player.name]));
  if (!state.rounds.length) {
    elements.roundEditor.innerHTML = '<div class="empty-state">尚未生成任何轮次。</div>';
    return;
  }
  elements.roundEditor.innerHTML = [...state.rounds].reverse().map(round => {
    const actualIndex = state.rounds.indexOf(round);
    const matches = round.pairings.map((pairing, pairIndex) => {
      const playerA = names.get(pairing.playerA) || "未知选手";
      const playerB = pairing.playerB === null ? "轮空" : (names.get(pairing.playerB) || "未知选手");
      if (pairing.playerB === null) {
        return `<div class="editor-match"><strong>${escapeHtml(playerA)} · 轮空</strong><span>自动获得 ${state.settings.byePoints} 分</span></div>`;
      }
      return `
        <label class="editor-match">
          <strong>${escapeHtml(playerA)} vs ${escapeHtml(playerB)}</strong>
          <select data-round-index="${actualIndex}" data-pair-index="${pairIndex}" aria-label="第 ${round.number} 轮第 ${pairing.table} 桌结果">
            <option value="pending" ${pairing.result === "pending" ? "selected" : ""}>等待结果</option>
            <option value="a" ${pairing.result === "a" ? "selected" : ""}>${escapeHtml(playerA)} 胜</option>
            <option value="draw" ${pairing.result === "draw" ? "selected" : ""}>平局</option>
            <option value="b" ${pairing.result === "b" ? "selected" : ""}>${escapeHtml(playerB)} 胜</option>
          </select>
        </label>
      `;
    }).join("");
    return `<section class="editor-round"><h4>第 ${round.number} 轮</h4>${matches}</section>`;
  }).join("");
}

function setDirty(value = true) {
  dirty = value;
  if (authenticatedUser) {
    elements.saveState.textContent = dirty ? "有未保存修改" : "与 GitHub 数据一致";
    elements.saveButton.disabled = !dirty;
  }
}

function setMessage(element, message, type = "") {
  element.textContent = message;
  element.className = element === elements.loginMessage ? "form-message" : "control-message";
  if (type) element.classList.add(type);
}

function setButtonBusy(button, busy, busyText, normalText) {
  button.disabled = busy;
  button.textContent = busy ? busyText : normalText;
}

function apiPath(path) {
  return path.split("/").map(part => encodeURIComponent(part)).join("/");
}

async function githubRequest(path, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${githubToken}`,
      "X-GitHub-Api-Version": API_VERSION,
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    let detail = "";
    try { detail = (await response.json()).message || ""; } catch { detail = ""; }
    const error = new Error(detail || `GitHub 请求失败（${response.status}）`);
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? null : response.json();
}

function decodeBase64Utf8(content) {
  const binary = atob(content.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeBase64Utf8(content) {
  const bytes = new TextEncoder().encode(content);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

async function loadRemoteData() {
  const file = await githubRequest(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${apiPath(DATA_PATH)}?ref=${BRANCH}`);
  if (!file?.content || !file?.sha) throw new Error("GitHub 没有返回有效的赛程数据文件。");
  const remoteData = JSON.parse(decodeBase64Utf8(file.content));
  state = normalizeData(remoteData);
  dataSha = file.sha;
  setDirty(false);
  renderPublic();
  renderManager();
}

async function connectAdmin() {
  const token = elements.tokenInput.value.trim();
  if (!token) {
    setMessage(elements.loginMessage, "请先输入 GitHub 细粒度令牌。", "error");
    return;
  }

  githubToken = token;
  setButtonBusy(elements.connectButton, true, "正在验证…", "验证身份");
  setMessage(elements.loginMessage, "正在核对 GitHub 账号与仓库权限…");

  try {
    const user = await githubRequest("/user");
    if (cleanText(user?.login).toLocaleLowerCase("en-US") !== ADMIN_LOGIN) {
      throw new Error(`当前令牌属于 @${cleanText(user?.login, "未知账号")}，不是允许的管理员。`);
    }
    const repository = await githubRequest(`/repos/${REPO_OWNER}/${REPO_NAME}`);
    if (!repository?.permissions?.push && !repository?.permissions?.admin) {
      throw new Error("该令牌没有此仓库的写入权限，请检查 Contents 权限。");
    }
    authenticatedUser = user.login;
    await loadRemoteData();
    elements.tokenInput.value = "";
    elements.loginView.hidden = true;
    elements.managerView.hidden = false;
    setMessage(elements.loginMessage, "");
    setMessage(elements.controlMessage, "身份验证成功，可以管理赛程。", "success");
    renderManager();
  } catch (error) {
    githubToken = "";
    authenticatedUser = "";
    dataSha = "";
    const message = error.status === 401
      ? "令牌无效或已过期，请重新创建。"
      : error.message;
    setMessage(elements.loginMessage, message, "error");
  } finally {
    setButtonBusy(elements.connectButton, false, "正在验证…", "验证身份");
  }
}

function applyPlayers() {
  if (state.rounds.length) {
    setMessage(elements.controlMessage, "赛程开始后不能修改选手名单。", "error");
    return;
  }
  const unique = new Map();
  for (const line of elements.playersInput.value.split(/\r?\n/)) {
    const name = line.trim().slice(0, 80);
    if (name) unique.set(name.toLocaleLowerCase("zh-CN"), name);
  }
  const names = [...unique.values()];
  if (names.length < 2) {
    setMessage(elements.controlMessage, "至少需要两位选手，每行填写一个选手 ID。", "error");
    return;
  }
  if (names.length > 128) {
    setMessage(elements.controlMessage, "选手数量不能超过 128 位。", "error");
    return;
  }
  const existingByName = new Map(state.players.map(player => [player.name.toLocaleLowerCase("zh-CN"), player]));
  const usedIds = new Set();
  state.players = names.map(name => {
    const existing = existingByName.get(name.toLocaleLowerCase("zh-CN"));
    const id = existing && !usedIds.has(existing.id) ? existing.id : createPlayerId(name, usedIds);
    usedIds.add(id);
    return { id, name, active: true };
  });
  setDirty();
  renderPublic();
  renderManager();
  setMessage(elements.controlMessage, `已应用 ${names.length} 位选手，保存后公开页面才会正式更新。`, "success");
}

function updateTotalRounds() {
  const minimum = Math.max(1, state.rounds.length);
  const value = clampInteger(elements.totalRoundsInput.value, minimum, 15, Math.max(5, minimum));
  elements.totalRoundsInput.value = value;
  if (value === state.settings.totalRounds) return;
  state.settings.totalRounds = value;
  setDirty();
  renderPublic();
  renderManager();
}

function generateNextRound() {
  updateTotalRounds();
  const reason = generationBlockReason();
  if (reason) {
    setMessage(elements.controlMessage, reason, "error");
    return;
  }
  buildNextRound();
  setDirty();
  renderPublic();
  renderManager();
  setMessage(elements.controlMessage, `第 ${state.rounds.length} 轮已生成，请核对后保存。`, "success");
}

async function saveToGitHub() {
  if (!authenticatedUser || !githubToken || !dataSha) {
    setMessage(elements.controlMessage, "管理员连接已失效，请刷新后重新验证。", "error");
    return;
  }
  updateTotalRounds();
  if (!dirty) {
    setMessage(elements.controlMessage, "当前没有需要保存的修改。", "error");
    return;
  }

  setButtonBusy(elements.saveButton, true, "正在保存…", "保存到 GitHub");
  setMessage(elements.controlMessage, "正在写入公开赛程数据…");
  state.updatedAt = new Date().toISOString();
  const content = `${JSON.stringify(state, null, 2)}\n`;

  try {
    const result = await githubRequest(`/repos/${REPO_OWNER}/${REPO_NAME}/contents/${apiPath(DATA_PATH)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `更新瑞士轮赛程（第 ${state.rounds.length} 轮）`,
        content: encodeBase64Utf8(content),
        sha: dataSha,
        branch: BRANCH
      })
    });
    dataSha = result?.content?.sha || dataSha;
    setDirty(false);
    renderPublic();
    renderManager();
    const commit = cleanText(result?.commit?.sha).slice(0, 7);
    setMessage(elements.controlMessage, `保存成功${commit ? `（${commit}）` : ""}，公开网页通常会在约 1 分钟内刷新。`, "success");
  } catch (error) {
    const message = error.status === 409
      ? "远端数据已发生变化，请点击“放弃修改并重载”后重新操作。"
      : error.message;
    setMessage(elements.controlMessage, message, "error");
    setDirty(true);
  } finally {
    elements.saveButton.textContent = "保存到 GitHub";
    elements.saveButton.disabled = !dirty;
  }
}

async function reloadRemoteData() {
  if (dirty && !window.confirm("确定放弃当前未保存修改，并重新读取 GitHub 数据吗？")) return;
  elements.reloadButton.disabled = true;
  setMessage(elements.controlMessage, "正在重新读取 GitHub 数据…");
  try {
    await loadRemoteData();
    setMessage(elements.controlMessage, "已恢复为 GitHub 上的最新数据。", "success");
  } catch (error) {
    setMessage(elements.controlMessage, error.message, "error");
  } finally {
    elements.reloadButton.disabled = false;
  }
}

function handleResultChange(event) {
  const select = event.target.closest("select[data-round-index][data-pair-index]");
  if (!select) return;
  const roundIndex = Number.parseInt(select.dataset.roundIndex, 10);
  const pairIndex = Number.parseInt(select.dataset.pairIndex, 10);
  const pairing = state.rounds[roundIndex]?.pairings[pairIndex];
  if (!pairing || !RESULT_VALUES.has(select.value) || select.value === "bye") return;
  pairing.result = select.value;
  setDirty();
  renderPublic();
  renderManager();
  setMessage(elements.controlMessage, "比赛结果已修改，记得保存到 GitHub。", "success");
}

function openAdmin() {
  elements.adminShell.hidden = false;
  document.body.classList.add("modal-open");
  if (authenticatedUser) {
    elements.loginView.hidden = true;
    elements.managerView.hidden = false;
    renderManager();
  } else {
    elements.loginView.hidden = false;
    elements.managerView.hidden = true;
    window.setTimeout(() => elements.tokenInput.focus(), 0);
  }
}

function closeAdmin() {
  elements.adminShell.hidden = true;
  document.body.classList.remove("modal-open");
}

function bindEvents() {
  elements.adminOpen.addEventListener("click", openAdmin);
  elements.adminClose.addEventListener("click", closeAdmin);
  elements.adminBackdrop.addEventListener("click", closeAdmin);
  elements.connectButton.addEventListener("click", connectAdmin);
  elements.tokenInput.addEventListener("keydown", event => {
    if (event.key === "Enter") connectAdmin();
  });
  elements.applyPlayersButton.addEventListener("click", applyPlayers);
  elements.totalRoundsInput.addEventListener("change", updateTotalRounds);
  elements.generateRoundButton.addEventListener("click", generateNextRound);
  elements.saveButton.addEventListener("click", saveToGitHub);
  elements.reloadButton.addEventListener("click", reloadRemoteData);
  elements.roundEditor.addEventListener("change", handleResultChange);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !elements.adminShell.hidden) closeAdmin();
  });
}

async function loadPublicData() {
  try {
    const response = await fetch(`swiss-data.json?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`赛程数据加载失败（${response.status}）`);
    state = normalizeData(await response.json());
  } catch (error) {
    state = structuredClone(DEFAULT_DATA);
    elements.eventStatus.textContent = error.message;
  }
  renderPublic();
}

bindEvents();
loadPublicData();
