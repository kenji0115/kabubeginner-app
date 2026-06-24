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

/**
 * 診断タイプごとの推奨パラメータ。
 * 質問への回答から最も近いタイプを返す想定のプリセット。
 */
export const PROFILES = {
  stable: {
    key: "stable",
    label: "安定型",
    emoji: "🛡️",
    description: "値動きを抑えてコツコツ。リスクを取りたくない人向け。",
    monthly: 10000,
    annualRate: 3,
    years: 20,
  },
  balanced: {
    key: "balanced",
    label: "バランス型",
    emoji: "⚖️",
    description: "リスクとリターンのバランス重視。迷ったらこれ。",
    monthly: 20000,
    annualRate: 5,
    years: 25,
  },
  aggressive: {
    key: "aggressive",
    label: "積極型",
    emoji: "🚀",
    description: "高いリターンを狙う。値動きの大きさを許容できる人向け。",
    monthly: 30000,
    annualRate: 7,
    years: 30,
  },
};

/** 円を「1,234万円」「1,234円」のように整形 */
export function formatYen(value) {
  return new Intl.NumberFormat("ja-JP").format(Math.round(value)) + "円";
}
