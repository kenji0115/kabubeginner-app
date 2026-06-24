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
 * 診断タイプごとの推奨パラメータ。
 * 診断が決めるのはリスク許容度＝想定年率と、資産配分（ポートフォリオの内訳）。
 * 毎月の積立額・期間は人それぞれの事情で決めるものなので診断では扱わない。
 * allocation の合計は 100 になるようにする。
 */
export const PROFILES = {
  stable: {
    key: "stable",
    label: "安定型",
    emoji: "🛡️",
    style: "インデックス投資",
    description: "市場全体にまるごと分散投資。低コストで値動きもゆるやか。コツコツ派の王道です。",
    annualRate: 3,
    allocation: [
      { name: "米国株", percent: 25 },
      { name: "日本株", percent: 15 },
      { name: "債券", percent: 60 },
    ],
  },
  balanced: {
    key: "balanced",
    label: "バランス型",
    emoji: "⚖️",
    style: "インデックス＋アクティブ",
    description: "守りのインデックスに、攻めのアクティブを少し。バランス重視で迷ったらこれ。",
    annualRate: 5,
    allocation: [
      { name: "米国株", percent: 40 },
      { name: "日本株", percent: 20 },
      { name: "債券", percent: 40 },
    ],
  },
  aggressive: {
    key: "aggressive",
    label: "積極型",
    emoji: "🚀",
    style: "アクティブ投資",
    description: "市場平均を上回るリターンを狙って銘柄を厳選。値動きは大きめ、攻めたい人向け。",
    annualRate: 7,
    allocation: [
      { name: "米国株", percent: 55 },
      { name: "日本株", percent: 30 },
      { name: "債券", percent: 15 },
    ],
  },
};

/** 円を「1,234万円」「1,234円」のように整形 */
export function formatYen(value) {
  return new Intl.NumberFormat("ja-JP").format(Math.round(value)) + "円";
}
