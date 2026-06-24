import { useEffect, useMemo, useState } from "react";
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

export default function App() {
  const [monthly, setMonthly] = useState(20000);
  const [annualRate, setAnnualRate] = useState(5);
  const [years, setYears] = useState(20);

  // 3ステップ診断の選択状態（{ style, stance, region }）
  const [selections, setSelections] = useState({});

  const result = useMemo(
    () => simulate({ monthly, annualRate, years }),
    [monthly, annualRate, years]
  );

  // すべてのステップを選び終えたら診断結果を算出する
  const diagnosis = useMemo(() => {
    const { style, stance, region } = selections;
    return style && stance && region ? diagnose(selections) : null;
  }, [selections]);

  // 診断が完了したら、おすすめの想定年率を入力に反映する
  useEffect(() => {
    if (diagnosis) setAnnualRate(diagnosis.annualRate);
  }, [diagnosis]);

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
            return (
              <div className="step" key={step.key}>
                <p className="step-q">{step.question}</p>
                <div className="step-options">
                  {step.options.map((opt) => (
                    <button
                      key={opt.value}
                      className={`step-option ${
                        selections[step.key] === opt.value ? "active" : ""
                      }`}
                      onClick={() => selectOption(i, step.key, opt.value)}
                    >
                      <span className="step-emoji">{opt.emoji}</span>
                      <span className="step-label">{opt.label}</span>
                      <span className="step-note">{opt.note}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {diagnosis && (
          <div className="diag-result">
            <div className="diag-result-head">
              <span className="profile-style">{diagnosis.style}</span>
              <span className="profile-rate">想定年率 {diagnosis.annualRate}%</span>
            </div>
            <p className="muted">あなたにおすすめの資産配分です（年率は下の入力に反映済み）。</p>
            <AllocationBar allocation={diagnosis.allocation} />
          </div>
        )}
      </section>

      <section className="card">
        <h2>入力</h2>
        <div className="fields">
          <Field
            label="想定年率"
            unit="%"
            value={annualRate}
            min={0}
            max={15}
            step={0.5}
            onChange={setAnnualRate}
          />
          <Field
            label="毎月の積立金額"
            unit="円"
            value={monthly}
            min={1000}
            max={100000}
            step={1000}
            onChange={setMonthly}
          />
          <Field
            label="積立期間"
            unit="年"
            value={years}
            min={1}
            max={40}
            step={1}
            onChange={setYears}
          />
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

function Field({ label, unit, value, min, max, step, onChange }) {
  return (
    <div className="field">
      <label>
        {label}
        <span className="field-value">
          {new Intl.NumberFormat("ja-JP").format(value)}
          {unit}
        </span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
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
