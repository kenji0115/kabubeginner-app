import { describe, it, expect } from "vitest";
import {
  simulate,
  diagnose,
  DIAGNOSIS_STEPS,
  formatYen,
  formatMan,
} from "./calc.js";

// 診断の全組み合わせを列挙するヘルパー
const ALL_COMBOS = [];
for (const style of DIAGNOSIS_STEPS[0].options.map((o) => o.value)) {
  for (const stance of DIAGNOSIS_STEPS[1].options.map((o) => o.value)) {
    for (const region of DIAGNOSIS_STEPS[2].options.map((o) => o.value)) {
      ALL_COMBOS.push({ style, stance, region });
    }
  }
}

describe("diagnose", () => {
  it("どの組み合わせでも資産配分の合計は100%になる", () => {
    for (const combo of ALL_COMBOS) {
      const total = diagnose(combo).allocation.reduce((a, b) => a + b.percent, 0);
      expect(total).toBe(100);
    }
  });

  it("想定年率は0%超〜10%以内に収まる", () => {
    for (const combo of ALL_COMBOS) {
      const { annualRate } = diagnose(combo);
      expect(annualRate).toBeGreaterThan(0);
      expect(annualRate).toBeLessThanOrEqual(10);
    }
  });

  it("年率は 米国 ＞ 全世界 ＞ 日本 の順になる（同じスタイル・スタンス）", () => {
    for (const style of ["index", "active"]) {
      for (const stance of ["defensive", "balanced", "offensive"]) {
        const us = diagnose({ style, stance, region: "us" }).annualRate;
        const world = diagnose({ style, stance, region: "world" }).annualRate;
        const japan = diagnose({ style, stance, region: "japan" }).annualRate;
        expect(us).toBeGreaterThan(world);
        expect(world).toBeGreaterThan(japan);
      }
    }
  });

  it("全世界株を選ぶと株式は『全世界株』1区分にまとまる", () => {
    const names = diagnose({ style: "index", stance: "balanced", region: "world" }).allocation.map(
      (a) => a.name
    );
    expect(names).toContain("全世界株");
    expect(names).not.toContain("米国株");
  });
});

describe("simulate", () => {
  it("年率0%なら運用益は0で、最終資産＝元本になる", () => {
    const r = simulate({ monthly: 5000, annualRate: 0, years: 20 });
    expect(r.principal).toBe(5000 * 12 * 20);
    expect(r.profit).toBe(0);
    expect(r.total).toBe(r.principal);
  });

  it("年率がプラスなら運用益はプラスになる", () => {
    const r = simulate({ monthly: 10000, annualRate: 5, years: 30 });
    expect(r.profit).toBeGreaterThan(0);
    expect(r.total).toBe(r.principal + r.profit);
  });

  it("年ごとデータは期間+1件（0年目を含む）", () => {
    const r = simulate({ monthly: 10000, annualRate: 5, years: 10 });
    expect(r.yearly).toHaveLength(11);
    expect(r.yearly[0]).toMatchObject({ year: 0, total: 0 });
  });
});

describe("formatMan / formatYen", () => {
  it("formatYen は円単位でカンマ区切り", () => {
    expect(formatYen(1234567)).toBe("1,234,567円");
  });

  it("formatMan は万円・億円で読みやすく整形", () => {
    expect(formatMan(5000)).toBe("5,000円");
    expect(formatMan(1200000)).toBe("120万円");
    expect(formatMan(13398857)).toBe("約1,340万円");
    expect(formatMan(100000000)).toBe("1億円");
    expect(formatMan(134000000)).toBe("1億3,400万円");
  });
});
