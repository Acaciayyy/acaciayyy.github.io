"use strict";

const REPO_OWNER = "Acaciayyy";
const REPO_NAME = "acaciayyy.github.io";
const BRANCH = "main";
const DATA_PATH = "mega-link-tournament/swiss-tournament/swiss-data.json";
const ADMIN_LOGIN = "acaciayyy";
const API_VERSION = "2022-11-28";
const PLAYOFF_STAGE_CONFIG = [
  { id: "quarterfinal", name: "八强赛", size: 4 },
  { id: "semifinal", name: "半决赛", size: 2 },
  { id: "final", name: "决赛", size: 1 }
];

const DEFAULT_PLAYER_NAMES = [
  "_Yangovo", "145", "396", "98989", "114141", "123820920", "Abee_sama", "Ama10",
  "baimo", "beiqixiaoxiao", "BIBI", "Blank", "CC_Xuebing", "Coco_233", "DazaiOsam1",
  "Demisa520", "dhjdoudou", "Dingdon123", "Enkulipa", "FAN", "fengdawang", "GKFJ",
  "Hao_Kui", "Haoikun", "hbnjkm", "hongyan", "Insestawa", "jiegeng2333", "La5495",
  "Lin_M_R", "Lol", "lulu", "M_awa_M", "MC_gou1", "MGGSJ", "Michellexin", "mili",
  "MMXYY", "mngege", "mooda", "nailong", "Non_Void_Art", "nsgll", "pangjia02",
  "Particularly7", "PFYTZ", "piplusip", "ppxsama", "Qiaozhi__", "qwer6666", "qwq",
  "R_LGDS", "R_LITTLE", "Rootkitlo", "ROXY_GREY", "sanqiu_liuhua", "sgfh", "shi_su_A",
  "Showsi", "si_wang", "ssssssss", "su_2526", "sybf", "szh123", "T_LingQiu", "taoqi",
  "Theqingye", "thesummer_dada", "TheYotsuba", "tingfjyu", "TKFdz013", "wcnmlgp", "WDK",
  "wew1234", "whitegiveboy1145", "wushuai", "xbwc", "xgpawa", "xiaosan", "xiaoyeziawa123",
  "Xieeo", "xiet", "xilin", "xuyan", "yalishiquede", "yinyou", "yiqii", "YuanGlen",
  "yuetian", "YuGanYa", "YuMengZi", "yuxi_kibo", "zblvz", "zhaowan", "zxc123"
];

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
  players: DEFAULT_PLAYER_NAMES.map(name => ({ id: createPlayerId(name), name, active: true })),
  rounds: [],
  playoffs: []
};

const RESULT_VALUES = new Set(["pending", "a", "draw", "b", "bye"]);
const PLAYOFF_RESULT_VALUES = new Set(["pending", "a", "b"]);
const byId = id => document.getElementById(id);

const elements = {
  playerBadge: byId("playerBadge"),
  roundBadge: byId("roundBadge"),
  eventTitle: byId("eventTitle"),
  eventStatus: byId("eventStatus"),
  updatedAt: byId("updatedAt"),
  standingsBody: byId("standingsBody"),
  standingsEmpty: byId("standingsEmpty"),
  scheduleSearchInput: byId("scheduleSearchInput"),
  scheduleSearchClear: byId("scheduleSearchClear"),
  scheduleSearchStatus: byId("scheduleSearchStatus"),
  scheduleFlow: byId("scheduleFlow"),
  scheduleEmpty: byId("scheduleEmpty"),
  scheduleEmptyTitle: byId("scheduleEmptyTitle"),
  scheduleEmptyText: byId("scheduleEmptyText"),
  playoffStatus: byId("playoffStatus"),
  playoffFlow: byId("playoffFlow"),
  playoffEmpty: byId("playoffEmpty"),
  playoffEmptyTitle: byId("playoffEmptyTitle"),
  playoffEmptyText: byId("playoffEmptyText"),
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
  openCustomPairingButton: byId("openCustomPairingButton"),
  customPairingPanel: byId("customPairingPanel"),
  customPairingTitle: byId("customPairingTitle"),
  customPairingRows: byId("customPairingRows"),
  confirmCustomPairingButton: byId("confirmCustomPairingButton"),
  cancelCustomPairingButton: byId("cancelCustomPairingButton"),
  resetTournamentButton: byId("resetTournamentButton"),
  generateQuarterfinalButton: byId("generateQuarterfinalButton"),
  generateSemifinalButton: byId("generateSemifinalButton"),
  generateFinalButton: byId("generateFinalButton"),
  resetPlayoffsButton: byId("resetPlayoffsButton"),
  managerPlayoffProgress: byId("managerPlayoffProgress"),
  saveButton: byId("saveButton"),
  reloadButton: byId("reloadButton"),
  adminPlayerSearchInput: byId("adminPlayerSearchInput"),
  adminPlayerSearchClear: byId("adminPlayerSearchClear"),
  adminPlayerSearchStatus: byId("adminPlayerSearchStatus"),
  controlMessage: byId("controlMessage"),
  roundEditor: byId("roundEditor"),
  playoffEditor: byId("playoffEditor")
};

let state = structuredClone(DEFAULT_DATA);
let githubToken = "";
let dataSha = "";
let authenticatedUser = "";
let dirty = false;
let customPairingOpen = false;
let customPairingDraft = [];

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

  const playoffs = [];
  const usedStages = new Set();
  for (const stage of Array.isArray(source.playoffs) ? source.playoffs : []) {
    const config = PLAYOFF_STAGE_CONFIG.find(item => item.id === stage?.id);
    if (!config || usedStages.has(config.id)) continue;
    const pairings = [];
    for (const [pairIndex, pairing] of (Array.isArray(stage?.pairings) ? stage.pairings : []).entries()) {
      const playerA = cleanText(pairing?.playerA);
      const playerB = cleanText(pairing?.playerB);
      if (!validPlayerIds.has(playerA) || !validPlayerIds.has(playerB) || playerA === playerB) continue;
      pairings.push({
        table: clampInteger(pairing?.table, 1, 99, pairIndex + 1),
        playerA,
        playerB,
        result: PLAYOFF_RESULT_VALUES.has(pairing?.result) ? pairing.result : "pending"
      });
    }
    if (!pairings.length) continue;
    usedStages.add(config.id);
    playoffs.push({
      id: config.id,
      name: config.name,
      generatedAt: cleanText(stage?.generatedAt) || null,
      pairings: pairings.slice(0, config.size)
    });
  }
  playoffs.sort((left, right) =>
    PLAYOFF_STAGE_CONFIG.findIndex(item => item.id === left.id) - PLAYOFF_STAGE_CONFIG.findIndex(item => item.id === right.id)
  );

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
    rounds,
    playoffs
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

function isSwissComplete(data = state) {
  return data.rounds.length >= data.settings.totalRounds &&
    data.rounds.slice(0, data.settings.totalRounds).every(isRoundComplete);
}

function isPlayoffStageComplete(stage) {
  return Boolean(stage?.pairings.length) && stage.pairings.every(pairing => pairing.result === "a" || pairing.result === "b");
}

function getPlayoffStage(id, data = state) {
  return data.playoffs.find(stage => stage.id === id);
}

function playoffWinner(pairing) {
  if (pairing?.result === "a") return pairing.playerA;
  if (pairing?.result === "b") return pairing.playerB;
  return "";
}

function playoffChampion(data = state) {
  const finalStage = getPlayoffStage("final", data);
  return isPlayoffStageComplete(finalStage) ? playoffWinner(finalStage.pairings[0]) : "";
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

  const championId = playoffChampion();
  if (championId) {
    const championName = state.players.find(player => player.id === championId)?.name || "未知选手";
    elements.eventStatus.textContent = `赛事结束 · 冠军 ${championName}`;
  } else if (state.playoffs.length) {
    const latestStage = state.playoffs[state.playoffs.length - 1];
    elements.eventStatus.textContent = isPlayoffStageComplete(latestStage)
      ? `${latestStage.name}已完成，等待下一阶段`
      : `${latestStage.name}进行中`;
  } else if (!state.rounds.length) {
    elements.eventStatus.textContent = "赛程尚未开始";
  } else if (isSwissComplete()) {
    elements.eventStatus.textContent = "瑞士轮已完成，等待八强淘汰赛";
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
  const showQualifiers = isSwissComplete() && standings.length >= 8;
  elements.standingsEmpty.hidden = standings.length > 0;
  elements.standingsBody.innerHTML = standings.map((record, index) => `
    <tr>
      <td><span class="rank-number">${index + 1}</span></td>
      <td class="player-cell">${escapeHtml(record.name)}${showQualifiers && index < 8 ? '<span class="qualifier-badge">晋级八强</span>' : ""}</td>
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
  const rawQuery = elements.scheduleSearchInput.value.trim();
  const query = rawQuery.toLocaleLowerCase("zh-CN");
  const matchingPlayers = query
    ? state.players.filter(player =>
      player.id.toLocaleLowerCase("zh-CN").includes(query) ||
      player.name.toLocaleLowerCase("zh-CN").includes(query)
    )
    : state.players;
  const matchingIds = new Set(matchingPlayers.map(player => player.id));
  let swissMatchCount = 0;
  const visibleRounds = state.rounds.map(round => {
    const pairings = query
      ? round.pairings.filter(pairing => matchingIds.has(pairing.playerA) || matchingIds.has(pairing.playerB))
      : round.pairings;
    swissMatchCount += pairings.length;
    return { round, pairings };
  }).filter(item => item.pairings.length > 0);

  let playoffMatchCount = 0;
  const visiblePlayoffStages = state.playoffs.map(stage => {
    const pairings = query
      ? stage.pairings.filter(pairing => matchingIds.has(pairing.playerA) || matchingIds.has(pairing.playerB))
      : stage.pairings;
    playoffMatchCount += pairings.length;
    return { stage, pairings };
  }).filter(item => item.pairings.length > 0);
  const matchCount = swissMatchCount + playoffMatchCount;

  elements.scheduleSearchClear.hidden = !query;
  if (!query) {
    elements.scheduleSearchStatus.textContent = "输入选手 ID，可查看他的瑞士轮与淘汰赛对阵。";
  } else if (!matchingPlayers.length) {
    elements.scheduleSearchStatus.textContent = `未找到选手 ID“${rawQuery}”。`;
  } else if (!matchCount) {
    elements.scheduleSearchStatus.textContent = `已找到“${matchingPlayers.map(player => player.name).join("、")}”，目前还没有已生成的对阵。`;
  } else {
    elements.scheduleSearchStatus.textContent = `已找到 ${matchCount} 场相关对阵，赛程线中仅显示包含“${rawQuery}”的比赛。`;
  }

  const showEmpty = visibleRounds.length === 0;
  elements.scheduleEmpty.hidden = !showEmpty;
  elements.scheduleFlow.hidden = showEmpty;
  if (!query && !state.rounds.length) {
    elements.scheduleEmptyTitle.textContent = "赛程尚未生成";
    elements.scheduleEmptyText.textContent = "管理员完成选手名单后即可生成第一轮对阵。";
  } else if (!matchingPlayers.length) {
    elements.scheduleEmptyTitle.textContent = "未找到选手";
    elements.scheduleEmptyText.textContent = "请检查选手 ID 是否输入正确。";
  } else if (!swissMatchCount) {
    elements.scheduleEmptyTitle.textContent = "暂无瑞士轮对阵";
    elements.scheduleEmptyText.textContent = "该选手目前没有可显示的瑞士轮比赛。";
  }

  elements.scheduleFlow.innerHTML = visibleRounds.map(({ round, pairings }) => {
    const complete = isRoundComplete(round);
    const matches = pairings.map(pairing => {
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

  const championId = playoffChampion();
  const championName = championId ? (names.get(championId) || "未知选手") : "";
  if (championName) {
    elements.playoffStatus.textContent = `冠军 · ${championName}`;
  } else if (state.playoffs.length) {
    const latestStage = state.playoffs[state.playoffs.length - 1];
    elements.playoffStatus.textContent = isPlayoffStageComplete(latestStage)
      ? `${latestStage.name}已完成`
      : `${latestStage.name}进行中`;
  } else if (isSwissComplete() && calculateStandings().length >= 8) {
    elements.playoffStatus.textContent = "瑞士轮结束 · 等待生成八强";
  } else {
    elements.playoffStatus.textContent = "等待瑞士轮前 8 名";
  }

  const showPlayoffEmpty = visiblePlayoffStages.length === 0;
  elements.playoffEmpty.hidden = !showPlayoffEmpty;
  elements.playoffFlow.hidden = showPlayoffEmpty;
  if (!query && !state.playoffs.length) {
    elements.playoffEmptyTitle.textContent = "淘汰赛尚未生成";
    elements.playoffEmptyText.textContent = "瑞士轮全部完成后，由管理员按积分排名生成八强对阵。";
  } else if (!matchingPlayers.length) {
    elements.playoffEmptyTitle.textContent = "未找到选手";
    elements.playoffEmptyText.textContent = "请检查选手 ID 是否输入正确。";
  } else if (!playoffMatchCount) {
    elements.playoffEmptyTitle.textContent = "暂无淘汰赛对阵";
    elements.playoffEmptyText.textContent = "该选手目前没有进入已生成的淘汰赛阶段。";
  }

  elements.playoffFlow.innerHTML = visiblePlayoffStages.map(({ stage, pairings }) => {
    const complete = isPlayoffStageComplete(stage);
    const matches = pairings.map(pairing => {
      const view = matchPresentation(pairing);
      const playerA = names.get(pairing.playerA) || "未知选手";
      const playerB = names.get(pairing.playerB) || "未知选手";
      return `
        <article class="playoff-match-card">
          <div class="table-label">MATCH ${pairing.table}</div>
          <div class="match-player ${view.classA}"><span>${escapeHtml(playerA)}</span><em>${view.markA}</em></div>
          <div class="match-player ${view.classB}"><span>${escapeHtml(playerB)}</span><em>${view.markB}</em></div>
          <div class="match-result">${view.label}</div>
        </article>
      `;
    }).join("");
    return `
      <section class="playoff-stage playoff-stage-${stage.id}">
        <div class="round-heading">
          <strong>${escapeHtml(stage.name)}</strong>
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

function createDefaultCustomPairingDraft() {
  const activeIds = state.rounds.length
    ? calculateStandings().map(record => record.id)
    : state.players.filter(player => player.active).map(player => player.id);
  const draft = [];
  for (let index = 0; index + 1 < activeIds.length; index += 2) {
    draft.push({ playerA: activeIds[index], playerB: activeIds[index + 1] });
  }
  if (activeIds.length % 2 === 1) {
    draft.push({ playerA: activeIds[activeIds.length - 1], playerB: null });
  }
  return draft;
}

function validateCustomPairingDraft(draft) {
  const activePlayers = state.players.filter(player => player.active);
  const activeIds = new Set(activePlayers.map(player => player.id));
  const expectedRows = Math.ceil(activePlayers.length / 2);
  const expectedByes = activePlayers.length % 2;
  if (!Array.isArray(draft) || draft.length !== expectedRows) return "自定义对阵数量与当前选手人数不一致。";
  if (draft.filter(pairing => pairing?.playerB === null).length !== expectedByes) {
    return expectedByes ? "奇数人数必须指定一位轮空选手。" : "偶数人数不能设置轮空。";
  }

  const used = new Set();
  for (const pairing of draft) {
    const playerA = cleanText(pairing?.playerA);
    const playerB = pairing?.playerB === null ? null : cleanText(pairing?.playerB);
    if (!playerA || (playerB !== null && !playerB)) return "请完成所有场次的选手选择。";
    if (!activeIds.has(playerA) || (playerB !== null && !activeIds.has(playerB))) return "对阵中包含不在当前名单内的选手。";
    if (playerA === playerB) return "同一位选手不能与自己对战。";
    for (const playerId of [playerA, playerB].filter(Boolean)) {
      if (used.has(playerId)) return "同一位选手不能在本轮重复出场。";
      used.add(playerId);
    }
  }
  if (used.size !== activeIds.size) return "每位参赛选手都必须在本轮出现一次。";
  return "";
}

function createCustomRound(draft = customPairingDraft) {
  const reason = generationBlockReason() || validateCustomPairingDraft(draft);
  if (reason) return reason;
  state.rounds.push({
    number: state.rounds.length + 1,
    generatedAt: new Date().toISOString(),
    pairings: draft.map((pairing, index) => ({
      table: index + 1,
      playerA: pairing.playerA,
      playerB: pairing.playerB,
      result: pairing.playerB === null ? "bye" : "pending"
    }))
  });
  return "";
}

function customPlayerOptions(selectedId) {
  const options = state.players.filter(player => player.active).map(player => `
    <option value="${escapeHtml(player.id)}" ${player.id === selectedId ? "selected" : ""}>${escapeHtml(player.name)}</option>
  `).join("");
  return `<option value="" ${selectedId ? "" : "selected"}>请选择选手</option>${options}`;
}

function renderCustomPairingEditor() {
  elements.customPairingPanel.hidden = !customPairingOpen;
  if (!customPairingOpen) {
    elements.customPairingRows.innerHTML = "";
    return;
  }
  elements.customPairingTitle.textContent = `自定义第 ${state.rounds.length + 1} 轮对阵`;
  elements.customPairingRows.innerHTML = customPairingDraft.map((pairing, index) => {
    const playerASelect = `
      <select data-custom-pair-index="${index}" data-custom-side="a" aria-label="第 ${index + 1} 桌选手 A">
        ${customPlayerOptions(pairing.playerA)}
      </select>
    `;
    if (pairing.playerB === null) {
      return `
        <div class="custom-pairing-row custom-bye-row">
          <strong>轮空</strong>
          ${playerASelect}
          <span class="custom-versus">本轮轮空</span>
        </div>
      `;
    }
    return `
      <div class="custom-pairing-row">
        <strong>第 ${index + 1} 桌</strong>
        ${playerASelect}
        <span class="custom-versus">VS</span>
        <select data-custom-pair-index="${index}" data-custom-side="b" aria-label="第 ${index + 1} 桌选手 B">
          ${customPlayerOptions(pairing.playerB)}
        </select>
      </div>
    `;
  }).join("");
}

function generationBlockReason() {
  const activePlayers = state.players.filter(player => player.active);
  if (activePlayers.length < 2) return "至少需要 2 位选手才能生成对阵。";
  if (state.playoffs.length) return "淘汰赛已经开始，不能继续生成瑞士轮。";
  if (state.rounds.length >= state.settings.totalRounds) return "计划轮数已全部生成。";
  const latestRound = state.rounds[state.rounds.length - 1];
  if (latestRound && !isRoundComplete(latestRound)) return `请先录入第 ${latestRound.number} 轮全部比赛结果。`;
  return "";
}

function playoffStartBlockReason() {
  if (state.playoffs.length) return "八强淘汰赛已经生成。";
  if (state.players.filter(player => player.active).length < 8) return "至少需要 8 位选手才能生成八强淘汰赛。";
  if (!isSwissComplete()) return "请先完成全部瑞士轮及比赛结果。";
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
  const locked = state.rounds.length > 0 || state.playoffs.length > 0;
  elements.playersInput.disabled = locked;
  elements.applyPlayersButton.disabled = locked;
  elements.totalRoundsInput.disabled = state.playoffs.length > 0;
  elements.playersLockHint.textContent = locked
    ? "赛程已经开始，选手名单已锁定。"
    : "第一轮生成后名单会锁定，避免历史积分失效。";
  elements.managerRoundProgress.textContent = `${state.rounds.length} / ${state.settings.totalRounds}`;
  const generationReason = generationBlockReason();
  elements.generateRoundButton.disabled = Boolean(generationReason);
  elements.openCustomPairingButton.disabled = Boolean(generationReason);
  if (generationReason && customPairingOpen) {
    customPairingOpen = false;
    customPairingDraft = [];
  }
  renderCustomPairingEditor();
  elements.resetTournamentButton.disabled = state.rounds.length === 0 && state.playoffs.length === 0;
  const quarterfinal = getPlayoffStage("quarterfinal");
  const semifinal = getPlayoffStage("semifinal");
  const finalStage = getPlayoffStage("final");
  elements.generateQuarterfinalButton.disabled = Boolean(playoffStartBlockReason());
  elements.generateSemifinalButton.disabled = !quarterfinal || !isPlayoffStageComplete(quarterfinal) || Boolean(semifinal);
  elements.generateFinalButton.disabled = !semifinal || !isPlayoffStageComplete(semifinal) || Boolean(finalStage);
  elements.resetPlayoffsButton.disabled = state.playoffs.length === 0;
  const championId = playoffChampion();
  if (championId) {
    const championName = state.players.find(player => player.id === championId)?.name || "未知选手";
    elements.managerPlayoffProgress.textContent = `冠军 · ${championName}`;
  } else if (state.playoffs.length) {
    const latestStage = state.playoffs[state.playoffs.length - 1];
    elements.managerPlayoffProgress.textContent = `${latestStage.name}${isPlayoffStageComplete(latestStage) ? "已完成" : "进行中"}`;
  } else {
    elements.managerPlayoffProgress.textContent = isSwissComplete() ? "可生成八强" : "等待瑞士轮";
  }
  elements.saveButton.disabled = !dirty;
  renderManagerMatches();
}

function getAdminSearchContext() {
  const rawQuery = elements.adminPlayerSearchInput.value.trim();
  const query = rawQuery.toLocaleLowerCase("zh-CN");
  const matchingPlayers = query
    ? state.players.filter(player =>
      player.id.toLocaleLowerCase("zh-CN").includes(query) ||
      player.name.toLocaleLowerCase("zh-CN").includes(query)
    )
    : state.players;
  return {
    rawQuery,
    query,
    matchingPlayers,
    matchingIds: new Set(matchingPlayers.map(player => player.id))
  };
}

function renderManagerMatches() {
  const search = getAdminSearchContext();
  const swissMatchCount = renderRoundEditor(search);
  const playoffMatchCount = renderPlayoffEditor(search);
  const matchCount = swissMatchCount + playoffMatchCount;
  elements.adminPlayerSearchClear.hidden = !search.query;
  if (!search.query) {
    elements.adminPlayerSearchStatus.textContent = "输入选手 ID，可筛选瑞士轮与淘汰赛并直接录入胜负。";
  } else if (!search.matchingPlayers.length) {
    elements.adminPlayerSearchStatus.textContent = `未找到选手 ID“${search.rawQuery}”。`;
  } else if (!matchCount) {
    elements.adminPlayerSearchStatus.textContent = `已找到“${search.matchingPlayers.map(player => player.name).join("、")}”，目前还没有已生成的对局。`;
  } else {
    elements.adminPlayerSearchStatus.textContent = `已找到 ${matchCount} 场包含“${search.rawQuery}”的对局，可直接录入胜负。`;
  }
}

function renderRoundEditor(search = getAdminSearchContext()) {
  const names = new Map(state.players.map(player => [player.id, player.name]));
  let matchCount = 0;
  const visibleRounds = [...state.rounds].reverse().map(round => {
    const actualIndex = state.rounds.indexOf(round);
    const pairings = round.pairings.map((pairing, pairIndex) => ({ pairing, pairIndex })).filter(({ pairing }) =>
      !search.query || search.matchingIds.has(pairing.playerA) || search.matchingIds.has(pairing.playerB)
    );
    matchCount += pairings.length;
    return { round, actualIndex, pairings };
  }).filter(item => item.pairings.length > 0);

  if (!visibleRounds.length) {
    const emptyText = !search.query
      ? "尚未生成任何瑞士轮。"
      : (!search.matchingPlayers.length ? "未找到该选手。" : "该选手目前没有瑞士轮对局。");
    elements.roundEditor.innerHTML = `<div class="empty-state">${emptyText}</div>`;
    return 0;
  }

  const swissLocked = state.playoffs.length > 0;
  elements.roundEditor.innerHTML = visibleRounds.map(({ round, actualIndex, pairings }) => {
    const matches = pairings.map(({ pairing, pairIndex }) => {
      const playerA = names.get(pairing.playerA) || "未知选手";
      const playerB = pairing.playerB === null ? "轮空" : (names.get(pairing.playerB) || "未知选手");
      if (pairing.playerB === null) {
        return `<div class="editor-match"><strong>${escapeHtml(playerA)} · 轮空</strong><span>自动获得 ${state.settings.byePoints} 分</span></div>`;
      }
      return `
        <label class="editor-match">
          <strong>${escapeHtml(playerA)} vs ${escapeHtml(playerB)}</strong>
          <select data-round-index="${actualIndex}" data-pair-index="${pairIndex}" aria-label="第 ${round.number} 轮第 ${pairing.table} 桌结果" ${swissLocked ? "disabled" : ""}>
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
  return matchCount;
}

function renderPlayoffEditor(search = getAdminSearchContext()) {
  const names = new Map(state.players.map(player => [player.id, player.name]));
  let matchCount = 0;
  const visibleStages = state.playoffs.map((stage, stageIndex) => {
    const pairings = stage.pairings.map((pairing, pairIndex) => ({ pairing, pairIndex })).filter(({ pairing }) =>
      !search.query || search.matchingIds.has(pairing.playerA) || search.matchingIds.has(pairing.playerB)
    );
    matchCount += pairings.length;
    return { stage, stageIndex, pairings };
  }).filter(item => item.pairings.length > 0);

  if (!visibleStages.length) {
    const emptyText = !search.query
      ? "尚未生成八强淘汰赛。"
      : (!search.matchingPlayers.length ? "未找到该选手。" : "该选手目前没有淘汰赛对局。");
    elements.playoffEditor.innerHTML = `<div class="empty-state">${emptyText}</div>`;
    return 0;
  }

  elements.playoffEditor.innerHTML = visibleStages.map(({ stage, stageIndex, pairings }) => {
    const locked = stageIndex < state.playoffs.length - 1;
    const matches = pairings.map(({ pairing, pairIndex }) => {
      const playerA = names.get(pairing.playerA) || "未知选手";
      const playerB = names.get(pairing.playerB) || "未知选手";
      return `
        <label class="editor-match">
          <strong>${escapeHtml(playerA)} vs ${escapeHtml(playerB)}</strong>
          <select data-playoff-stage-index="${stageIndex}" data-playoff-pair-index="${pairIndex}" aria-label="${escapeHtml(stage.name)}第 ${pairing.table} 场结果" ${locked ? "disabled" : ""}>
            <option value="pending" ${pairing.result === "pending" ? "selected" : ""}>等待结果</option>
            <option value="a" ${pairing.result === "a" ? "selected" : ""}>${escapeHtml(playerA)} 胜</option>
            <option value="b" ${pairing.result === "b" ? "selected" : ""}>${escapeHtml(playerB)} 胜</option>
          </select>
        </label>
      `;
    }).join("");
    return `<section class="editor-round playoff-editor-stage"><h4>${escapeHtml(stage.name)}${locked ? " · 已锁定" : ""}</h4>${matches}</section>`;
  }).join("");
  return matchCount;
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
  customPairingOpen = false;
  customPairingDraft = [];
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
  if (state.rounds.length || state.playoffs.length) {
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
  customPairingOpen = false;
  customPairingDraft = [];
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
  customPairingOpen = false;
  customPairingDraft = [];
  setDirty();
  renderPublic();
  renderManager();
  setMessage(elements.controlMessage, `第 ${state.rounds.length} 轮已生成，请核对后保存。`, "success");
}

function openCustomPairing() {
  updateTotalRounds();
  const reason = generationBlockReason();
  if (reason) {
    setMessage(elements.controlMessage, reason, "error");
    return;
  }
  customPairingDraft = createDefaultCustomPairingDraft();
  customPairingOpen = true;
  renderCustomPairingEditor();
  setMessage(elements.controlMessage, `请指定第 ${state.rounds.length + 1} 轮的全部对阵。`, "success");
}

function cancelCustomPairing() {
  customPairingOpen = false;
  customPairingDraft = [];
  renderCustomPairingEditor();
  setMessage(elements.controlMessage, "已取消自定义对阵。", "");
}

function handleCustomPairingChange(event) {
  const select = event.target.closest("select[data-custom-pair-index][data-custom-side]");
  if (!select) return;
  const pairIndex = Number.parseInt(select.dataset.customPairIndex, 10);
  const pairing = customPairingDraft[pairIndex];
  if (!pairing) return;
  if (select.dataset.customSide === "a") pairing.playerA = select.value;
  if (select.dataset.customSide === "b" && pairing.playerB !== null) pairing.playerB = select.value;
}

function generateCustomRound() {
  updateTotalRounds();
  const reason = createCustomRound();
  if (reason) {
    setMessage(elements.controlMessage, reason, "error");
    return;
  }
  customPairingOpen = false;
  customPairingDraft = [];
  setDirty();
  renderPublic();
  renderManager();
  setMessage(elements.controlMessage, `第 ${state.rounds.length} 轮自定义对阵已生成，请核对后保存。`, "success");
}

function addPlayoffStage(id, playerPairs) {
  const config = PLAYOFF_STAGE_CONFIG.find(stage => stage.id === id);
  if (!config) return;
  state.playoffs.push({
    id: config.id,
    name: config.name,
    generatedAt: new Date().toISOString(),
    pairings: playerPairs.map(([playerA, playerB], index) => ({
      table: index + 1,
      playerA,
      playerB,
      result: "pending"
    }))
  });
}

function generateQuarterfinals() {
  const reason = playoffStartBlockReason();
  if (reason) {
    setMessage(elements.controlMessage, reason, "error");
    return;
  }
  const topEight = calculateStandings().slice(0, 8).map(record => record.id);
  addPlayoffStage("quarterfinal", [
    [topEight[0], topEight[7]],
    [topEight[3], topEight[4]],
    [topEight[1], topEight[6]],
    [topEight[2], topEight[5]]
  ]);
  setDirty();
  renderPublic();
  renderManager();
  setMessage(elements.controlMessage, "已按瑞士轮排名生成八强淘汰赛：1–8、4–5、2–7、3–6。", "success");
}

function generateSemifinals() {
  const quarterfinal = getPlayoffStage("quarterfinal");
  if (!quarterfinal || !isPlayoffStageComplete(quarterfinal) || getPlayoffStage("semifinal")) {
    setMessage(elements.controlMessage, "请先完成全部八强赛结果。", "error");
    return;
  }
  const winners = quarterfinal.pairings.map(playoffWinner);
  addPlayoffStage("semifinal", [[winners[0], winners[1]], [winners[2], winners[3]]]);
  setDirty();
  renderPublic();
  renderManager();
  setMessage(elements.controlMessage, "半决赛已生成，请录入两场比赛结果。", "success");
}

function generateFinal() {
  const semifinal = getPlayoffStage("semifinal");
  if (!semifinal || !isPlayoffStageComplete(semifinal) || getPlayoffStage("final")) {
    setMessage(elements.controlMessage, "请先完成全部半决赛结果。", "error");
    return;
  }
  const winners = semifinal.pairings.map(playoffWinner);
  addPlayoffStage("final", [[winners[0], winners[1]]]);
  setDirty();
  renderPublic();
  renderManager();
  setMessage(elements.controlMessage, "决赛已生成，请录入冠军争夺结果。", "success");
}

function resetPlayoffs() {
  if (!state.playoffs.length) {
    setMessage(elements.controlMessage, "当前没有可重置的淘汰赛。", "error");
    return;
  }
  const confirmed = window.confirm("确定要重置淘汰赛吗？八强赛、半决赛和决赛的对阵与结果都会被清空，瑞士轮将保留。");
  if (!confirmed) return;
  state.playoffs = [];
  setDirty();
  renderPublic();
  renderManager();
  setMessage(elements.controlMessage, "淘汰赛已清空，瑞士轮仍保留；点击“保存到 GitHub”后正式生效。", "success");
}

function resetTournament() {
  if (!state.rounds.length && !state.playoffs.length) {
    setMessage(elements.controlMessage, "当前没有可重置的赛程。", "error");
    return;
  }
  const confirmed = window.confirm("确定要重置全部赛程吗？此操作会清空所有瑞士轮、八强赛、半决赛、决赛及比赛结果；保存到 GitHub 后将无法恢复。");
  if (!confirmed) return;
  state.rounds = [];
  state.playoffs = [];
  customPairingOpen = false;
  customPairingDraft = [];
  setDirty();
  renderPublic();
  renderManager();
  setMessage(elements.controlMessage, "所有赛程已清空，点击“保存到 GitHub”后正式生效。", "success");
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
        message: `更新瑞士轮及淘汰赛赛程（瑞士轮 ${state.rounds.length} 轮）`,
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

function handlePlayoffResultChange(event) {
  const select = event.target.closest("select[data-playoff-stage-index][data-playoff-pair-index]");
  if (!select) return;
  const stageIndex = Number.parseInt(select.dataset.playoffStageIndex, 10);
  const pairIndex = Number.parseInt(select.dataset.playoffPairIndex, 10);
  const pairing = state.playoffs[stageIndex]?.pairings[pairIndex];
  if (!pairing || !PLAYOFF_RESULT_VALUES.has(select.value)) return;
  pairing.result = select.value;
  setDirty();
  renderPublic();
  renderManager();
  const championId = playoffChampion();
  const championName = state.players.find(player => player.id === championId)?.name;
  setMessage(elements.controlMessage, championName
    ? `决赛结果已录入，冠军为 ${championName}；记得保存到 GitHub。`
    : "淘汰赛结果已修改，记得保存到 GitHub。", "success");
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
  elements.scheduleSearchInput.addEventListener("input", renderSchedule);
  elements.scheduleSearchClear.addEventListener("click", () => {
    elements.scheduleSearchInput.value = "";
    renderSchedule();
    elements.scheduleSearchInput.focus();
  });
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
  elements.openCustomPairingButton.addEventListener("click", openCustomPairing);
  elements.cancelCustomPairingButton.addEventListener("click", cancelCustomPairing);
  elements.confirmCustomPairingButton.addEventListener("click", generateCustomRound);
  elements.customPairingRows.addEventListener("change", handleCustomPairingChange);
  elements.resetTournamentButton.addEventListener("click", resetTournament);
  elements.generateQuarterfinalButton.addEventListener("click", generateQuarterfinals);
  elements.generateSemifinalButton.addEventListener("click", generateSemifinals);
  elements.generateFinalButton.addEventListener("click", generateFinal);
  elements.resetPlayoffsButton.addEventListener("click", resetPlayoffs);
  elements.saveButton.addEventListener("click", saveToGitHub);
  elements.reloadButton.addEventListener("click", reloadRemoteData);
  elements.adminPlayerSearchInput.addEventListener("input", renderManagerMatches);
  elements.adminPlayerSearchClear.addEventListener("click", () => {
    elements.adminPlayerSearchInput.value = "";
    renderManagerMatches();
    elements.adminPlayerSearchInput.focus();
  });
  elements.roundEditor.addEventListener("change", handleResultChange);
  elements.playoffEditor.addEventListener("change", handlePlayoffResultChange);
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
