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
import { simulate, PROFILES, formatYen } from "./calc.js";

const COLORS = {
  principal: "#60a5fa", // 元本
  profit: "#34d399", // 運用益
};

export default function App() {
  const [monthly, setMonthly] = useState(20000);
  const [annualRate, setAnnualRate] = useState(5);
  const [years, setYears] = useState(20);
  const [activeProfile, setActiveProfile] = useState(null);

  const result = useMemo(
    () => simulate({ monthly, annualRate, years }),
    [monthly, annualRate, years]
  );

  // 診断はリスク許容度＝想定年率のみを決める。
  // 毎月の積立額・期間は人それぞれの事情で決めるものなので上書きしない。
  const applyProfile = (profile) => {
    setAnnualRate(profile.annualRate);
    setActiveProfile(profile.key);
  };

  // 年率を手動変更したら診断の選択状態を解除する
  const handleRateChange = (value) => {
    setActiveProfile(null);
    setAnnualRate(value);
  };

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
        <h2>かんたん診断</h2>
        <p className="muted">
          タイプを選ぶと、おすすめの<strong>想定年率</strong>が入ります。毎月の積立額・期間はご自身で自由に設定できます。
        </p>
        <div className="profiles">
          {Object.values(PROFILES).map((p) => (
            <button
              key={p.key}
              className={`profile ${activeProfile === p.key ? "active" : ""}`}
              onClick={() => applyProfile(p)}
            >
              <span className="profile-emoji">{p.emoji}</span>
              <span className="profile-label">{p.label}</span>
              <span className="profile-style">{p.style}</span>
              <span className="profile-rate">想定年率 {p.annualRate}%</span>
              <span className="profile-desc">{p.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>入力</h2>
        <div className="fields">
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
            label="想定年率"
            unit="%"
            value={annualRate}
            min={0}
            max={15}
            step={0.5}
            onChange={handleRateChange}
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
        </p>
      </footer>
    </div>
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
