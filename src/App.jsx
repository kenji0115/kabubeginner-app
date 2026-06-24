import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { simulate, diagnose, DIAGNOSIS_STEPS, ASSET_COLORS, formatYen } from "./calc.js";

const COLORS = {
  principal: "#60a5fa", // 元本
  profit: "#34d399", // 運用益
};

// 毎月の積立金額のプリセット（初心者向けに上限5万円）
const MONTHLY_PRESETS = [5000, 10000, 30000, 50000];
const MONTHLY_MIN = 1000;
const MONTHLY_MAX = 50000;

const yen = (v) => new Intl.NumberFormat("ja-JP").format(v);
const clampMonthly = (v) =>
  Number.isNaN(v) ? MONTHLY_MIN : Math.min(MONTHLY_MAX, Math.max(MONTHLY_MIN, v));

export default function App() {
  const [monthly, setMonthly] = useState(5000);
  const [years, setYears] = useState(20);

  // 3ステップ診断の選択状態（{ style, stance, region }）
  const [selections, setSelections] = useState({});

  // すべてのステップを選び終えたら診断結果を算出する
  const diagnosis = useMemo(() => {
    const { style, stance, region } = selections;
    return style && stance && region ? diagnose(selections) : null;
  }, [selections]);

  // 想定年率は診断結果から決まる。未診断・やり直し直後は0%。
  const annualRate = diagnosis ? diagnosis.annualRate : 0;

  const result = useMemo(
    () => simulate({ monthly, annualRate, years }),
    [monthly, annualRate, years]
  );

  // ステップの選択。あるステップを選び直したら、それより後ろの選択はリセットする
  const selectOption = (stepIndex, stepKey, value) => {
    setSelections((prev) => {
      const next = { ...prev, [stepKey]: value };
      for (let i = stepIndex + 1; i < DIAGNOSIS_STEPS.length; i++) {
        delete next[DIAGNOSIS_STEPS[i].key];
      }
      return next;
    });
  };

  const resetDiagnosis = () => setSelections({});

  return (
    <div className="app">
      <header className="hero">
        <h1>📈 積立投資シミュレーター</h1>
        <p>
          毎月いくら積み立てると、将来いくらになる？
          <br />
          数字を入れるだけで、元本と運用益の内訳をグラフで確認できます。
        </p>
      </header>

      <section className="card">
        <div className="card-head">
          <h2>かんたん診断</h2>
          {Object.keys(selections).length > 0 && (
            <button className="reset" onClick={resetDiagnosis}>
              やり直す
            </button>
          )}
        </div>
        <p className="muted">
          3つの質問に答えると、<strong>資産配分</strong>と<strong>想定年率</strong>が決まります。毎月の積立額・期間はご自身で自由に設定できます。
        </p>

        <div className="steps">
          {DIAGNOSIS_STEPS.map((step, i) => {
            // 前のステップが未選択ならまだ表示しない（段階的に出す）
            const prevDone = i === 0 || selections[DIAGNOSIS_STEPS[i - 1].key];
            if (!prevDone) return null;
            const answered = Boolean(selections[step.key]);
            return (
              <div className="step" key={step.key}>
                <p className="step-q">
                  <span className="step-num">{i + 1}</span>
                  {step.question}
                  {answered && <span className="step-done">✓ 選択済み</span>}
                </p>
                <div className="step-options">
                  {step.options.map((opt) => {
                    const isActive = selections[step.key] === opt.value;
                    return (
                      <button
                        key={opt.value}
                        className={`step-option ${isActive ? "active" : ""}`}
                        onClick={() => selectOption(i, step.key, opt.value)}
                      >
                        {opt.recommended && (
                          <span className="ribbon">⭐ {opt.recommended}</span>
                        )}
                        <span className="step-emoji">{opt.emoji}</span>
                        <span className="step-label">
                          {opt.label}
                          {isActive && <span className="step-check">✓</span>}
                        </span>
                        <span className="step-note">{opt.note}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {diagnosis && (
          <div className="diag-result">
            <p className="diag-title">🎉 診断結果</p>
            <div className="diag-result-head">
              <span className="profile-style">{diagnosis.style}</span>
              <span className="profile-rate">想定年率 {diagnosis.annualRate}%</span>
            </div>
            <p className="muted">あなたにおすすめの資産配分です（想定年率は下に反映済み）。</p>
            <AllocationBar allocation={diagnosis.allocation} />
          </div>
        )}
      </section>

      <section className="card">
        <h2>入力</h2>
        <div className="fields">
          {/* 想定年率：かんたん診断で決まる固定表示 */}
          <div className="field">
            <div className="field-top">
              <span className="field-name">想定年率</span>
              <span className="field-value lg">{annualRate}%</span>
            </div>
            <p className="field-hint">
              上の「かんたん診断」で決まります。
            </p>
          </div>

          {/* 毎月の積立金額：プリセット＋自由入力 */}
          <div className="field">
            <div className="field-top">
              <span className="field-name">毎月の積立金額</span>
              <span className="field-value">{yen(monthly)}円</span>
            </div>
            <div className="presets">
              {MONTHLY_PRESETS.map((v) => (
                <button
                  key={v}
                  className={`preset ${monthly === v ? "active" : ""}`}
                  onClick={() => setMonthly(v)}
                >
                  {yen(v)}円
                </button>
              ))}
            </div>
            <input
              type="number"
              min={MONTHLY_MIN}
              max={MONTHLY_MAX}
              step={1000}
              value={monthly}
              onChange={(e) => setMonthly(clampMonthly(Number(e.target.value)))}
            />
          </div>

          {/* 積立期間：目盛り付きスライダー */}
          <div className="field">
            <div className="field-top">
              <span className="field-name">積立期間</span>
              <span className="field-value">{years}年</span>
            </div>
            <input
              type="range"
              min={1}
              max={50}
              step={1}
              value={years}
              list="year-ticks"
              onChange={(e) => setYears(Number(e.target.value))}
            />
            <datalist id="year-ticks">
              <option value="5" />
              <option value="10" />
              <option value="15" />
              <option value="20" />
              <option value="25" />
              <option value="30" />
              <option value="35" />
              <option value="40" />
              <option value="45" />
              <option value="50" />
            </datalist>
            <div className="scale">
              <span>1年</span>
              <span>10</span>
              <span>20</span>
              <span>30</span>
              <span>40</span>
              <span>50年</span>
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>シミュレーション結果</h2>
        <div className="summary">
          <Stat label="積立元本" value={formatYen(result.principal)} color={COLORS.principal} />
          <Stat label="運用益" value={formatYen(result.profit)} color={COLORS.profit} />
          <Stat label="最終資産" value={formatYen(result.total)} emphasis />
        </div>

        <div className="chart">
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={result.yearly} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="year" tickFormatter={(y) => `${y}年`} />
              <YAxis tickFormatter={(v) => `${Math.round(v / 10000)}万`} width={48} />
              <Tooltip
                formatter={(value, name) => [formatYen(value), name]}
                labelFormatter={(y) => `${y}年目`}
              />
              <Legend />
              <Bar dataKey="principal" name="元本" stackId="a" fill={COLORS.principal} />
              <Bar dataKey="profit" name="運用益" stackId="a" fill={COLORS.profit} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <footer className="foot">
        <p className="muted">
          ※ 本シミュレーションは想定年率で毎月複利運用した場合の概算です。実際の運用成果を保証するものではありません。
          <br />
          想定年率はGPIF（年金積立金管理運用独立行政法人）が公表する期待リターンを参考にした概算値です。
        </p>
      </footer>
    </div>
  );
}

function AllocationBar({ allocation }) {
  return (
    <span className="alloc">
      <span className="alloc-bar">
        {allocation.map((a) => (
          <span
            key={a.name}
            className="alloc-seg"
            style={{ width: `${a.percent}%`, background: ASSET_COLORS[a.name] }}
            title={`${a.name} ${a.percent}%`}
          />
        ))}
      </span>
      <span className="alloc-legend">
        {allocation.map((a) => (
          <span key={a.name} className="alloc-item">
            <span className="dot" style={{ background: ASSET_COLORS[a.name] }} />
            {a.name} {a.percent}%
          </span>
        ))}
      </span>
    </span>
  );
}

function Stat({ label, value, color, emphasis }) {
  return (
    <div className={`stat ${emphasis ? "emphasis" : ""}`}>
      <span className="stat-label">
        {color && <span className="dot" style={{ background: color }} />}
        {label}
      </span>
      <span className="stat-value">{value}</span>
    </div>
  );
}
