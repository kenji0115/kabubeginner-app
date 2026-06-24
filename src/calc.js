// 積立投資のシミュレーション計算ロジック

/**
 * 毎月積立の将来資産を年ごとに計算する。
 * 月利 = 年率 / 12 で毎月複利運用するモデル。
 *
 * @param {object} params
 * @param {number} params.monthly  毎月の積立額（円）
 * @param {number} params.annualRate 想定年率（％, 例: 5 は 5%）
 * @param {number} params.years     積立期間（年）
 * @returns {{
 *   yearly: Array<{year:number, principal:number, total:number, profit:number}>,
 *   principal:number, total:number, profit:number
 * }}
 */
export function simulate({ monthly, annualRate, years }) {
  const monthlyRate = annualRate / 100 / 12;
  const totalMonths = years * 12;

  let balance = 0; // 評価額（元本＋運用益）
  const yearly = [
    { year: 0, principal: 0, total: 0, profit: 0 },
  ];

  for (let m = 1; m <= totalMonths; m++) {
    // 月初に積立 → その月の運用益を加算
    balance = (balance + monthly) * (1 + monthlyRate);

    if (m % 12 === 0) {
      const year = m / 12;
      const principal = monthly * m;
      const total = Math.round(balance);
      yearly.push({
        year,
        principal,
        total,
        profit: total - principal,
      });
    }
  }

  const principal = monthly * totalMonths;
  const total = Math.round(balance);
  return {
    yearly,
    principal,
    total,
    profit: total - principal,
  };
}

// 資産クラスごとの表示色（カード間で色を統一する）
export const ASSET_COLORS = {
  米国株: "#3b82f6",
  日本株: "#ef4444",
  債券: "#94a3b8",
};

/**
 * かんたん診断の3ステップ。
 * 段階的に選んでいくと、資産配分と想定年率が決まる。
 * 毎月の積立額・期間は人それぞれの事情で決めるものなので診断では扱わない。
 */
export const DIAGNOSIS_STEPS = [
  {
    key: "style",
    question: "1. どんなスタンスで投資したい？",
    options: [
      {
        value: "index",
        label: "安定志向",
        emoji: "🛡️",
        note: "インデックス投資。市場全体に分散して、低コストでコツコツ。",
      },
      {
        value: "active",
        label: "積極志向",
        emoji: "🚀",
        note: "アクティブ投資。銘柄を厳選して市場平均超えを狙う。",
      },
    ],
  },
  {
    key: "stance",
    question: "2. その中で、攻め？守り？",
    options: [
      {
        value: "defensive",
        label: "守りより",
        emoji: "🛡️",
        note: "債券を多めにして値動きを抑える。",
      },
      {
        value: "offensive",
        label: "攻めより",
        emoji: "🔥",
        note: "株式を多めにしてリターンを狙う。",
      },
    ],
  },
  {
    key: "region",
    question: "3. 株式はどこ中心に？",
    options: [
      {
        value: "us",
        label: "米国中心",
        emoji: "🇺🇸",
        note: "成長期待の米国株を厚めに。",
      },
      {
        value: "japan",
        label: "日本も厚め",
        emoji: "🇯🇵",
        note: "なじみのある日本株の比率も上げる。",
      },
    ],
  },
];

// ステップ1×2で株式・債券の比率が決まる
const EQUITY_BOND = {
  "index|defensive": { equity: 40, bond: 60 },
  "index|offensive": { equity: 60, bond: 40 },
  "active|defensive": { equity: 60, bond: 40 },
  "active|offensive": { equity: 80, bond: 20 },
};

// ステップ3で株式の中の地域配分が決まる
const REGION_SPLIT = {
  us: { us: 0.75, jp: 0.25 },
  japan: { us: 0.55, jp: 0.45 },
};

// 想定年率の算出に使う各資産の期待リターン（％）
const EXPECTED_RETURN = {
  index: { equity: 7, bond: 1 },
  active: { equity: 9, bond: 1 },
};

/**
 * 3ステップの選択から、投資スタイル・資産配分・想定年率を算出する。
 * @param {{style:string, stance:string, region:string}} selections
 */
export function diagnose({ style, stance, region }) {
  const eb = EQUITY_BOND[`${style}|${stance}`];
  const split = REGION_SPLIT[region];

  const usStock = Math.round(eb.equity * split.us);
  const jpStock = eb.equity - usStock; // 端数は日本株で吸収して合計100に揃える
  const bond = eb.bond;

  const ret = EXPECTED_RETURN[style];
  const rawRate = (eb.equity / 100) * ret.equity + (eb.bond / 100) * ret.bond;
  const annualRate = Math.round(rawRate * 2) / 2; // 0.5刻みに丸める

  return {
    style: style === "index" ? "インデックス投資" : "アクティブ投資",
    annualRate,
    allocation: [
      { name: "米国株", percent: usStock },
      { name: "日本株", percent: jpStock },
      { name: "債券", percent: bond },
    ],
  };
}

/** 円を「1,234万円」「1,234円」のように整形 */
export function formatYen(value) {
  return new Intl.NumberFormat("ja-JP").format(Math.round(value)) + "円";
}
