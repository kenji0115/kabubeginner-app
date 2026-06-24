import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { toPng } from "html-to-image";
import {
  simulate,
  diagnose,
  DIAGNOSIS_STEPS,
  ASSET_COLORS,
  formatYen,
  formatMan,
} from "./calc.js";

const COLORS = {
  principal: "#60a5fa", // 元本
  profit: "#34d399", // 運用益
};

// 毎月の積立金額のプリセット（初心者向けに上限5万円）
const MONTHLY_PRESETS = [5000, 10000, 30000, 50000];
const MONTHLY_MIN = 1000;
const MONTHLY_MAX = 50000;
const YEARS_MIN = 1;
const YEARS_MAX = 50;

// 用語ミニ解説
const GLOSSARY = [
  {
    term: "想定年率",
    desc: "1年あたり、資産が平均でどれくらい増えると見込むかの割合。実際は年ごとに上下します。",
  },
  {
    term: "複利",
    desc: "増えたお金がさらに増えを生むしくみ。雪だるま式に大きくなり、長く続けるほど効果が出ます。",
  },
  {
    term: "インデックス投資",
    desc: "市場全体の指数（例：S&P500）に連動。低コストで丸ごと分散できる、初心者の王道です。",
  },
  {
    term: "アクティブ投資",
    desc: "市場平均を上回ることを狙い、銘柄を厳選する方法。コストは高め、成果はさまざまです。",
  },
  {
    term: "分散投資",
    desc: "値動きの異なる資産に分けて持つこと。どれかが下がっても全体の振れをやわらげます。",
  },
];

const yen = (v) => new Intl.NumberFormat("ja-JP").format(v);
const clampMonthly = (v) =>
  Number.isNaN(v) ? MONTHLY_MIN : Math.min(MONTHLY_MAX, Math.max(MONTHLY_MIN, v));

// URLのクエリから初期状態を復元する（共有リンク対応）
function parseInitialState() {
  const p = new URLSearchParams(window.location.search);
  const monthly = clampMonthly(Number(p.get("monthly")));
  const yearsRaw = Math.round(Number(p.get("years")));
  const years =
    Number.isFinite(yearsRaw) && yearsRaw >= YEARS_MIN && yearsRaw <= YEARS_MAX
      ? yearsRaw
      : 20;

  // 前から連続して有効なステップだけを採用する（不整合な並びは無視）
  const selections = {};
  for (const step of DIAGNOSIS_STEPS) {
    const v = p.get(step.key);
    if (v && step.options.some((o) => o.value === v)) selections[step.key] = v;
    else break;
  }
  return { monthly, years, selections };
}

export default function App() {
  const [init] = useState(parseInitialState); // 初回だけURLから復元
  const [monthly, setMonthly] = useState(init.monthly);
  const [years, setYears] = useState(init.years);
  const [selections, setSelections] = useState(init.selections);
  const [copied, setCopied] = useState(false);

  const captureRef = useRef(null);

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

  // 運用益が元本を上回る最初の年（＝複利が効いてくる転換点）
  const crossover = useMemo(
    () => result.yearly.find((d) => d.principal > 0 && d.profit >= d.principal) || null,
    [result]
  );

  // 状態が変わるたびURLに反映（共有リンクが常に最新を指すように）
  useEffect(() => {
    const p = new URLSearchParams();
    p.set("monthly", String(monthly));
    p.set("years", String(years));
    for (const step of DIAGNOSIS_STEPS) {
      if (selections[step.key]) p.set(step.key, selections[step.key]);
    }
    window.history.replaceState(null, "", `${window.location.pathname}?${p}`);
  }, [monthly, years, selections]);

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

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // クリップボードが使えない環境では何もしない
    }
  };

  const saveImage = async () => {
    if (!captureRef.current) return;
    const dataUrl = await toPng(captureRef.current, {
      backgroundColor: "#ffffff",
      pixelRatio: 2,
    });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "tsumitate-simulation.png";
    a.click();
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
                <p className="step-q" id={`step-${step.key}`}>
                  <span className="step-num" aria-hidden="true">
                    {i + 1}
                  </span>
                  {step.question}
                  {answered && <span className="step-done">✓ 選択済み</span>}
                </p>
                <div className="step-options" role="group" aria-labelledby={`step-${step.key}`}>
                  {step.options.map((opt) => {
                    const isActive = selections[step.key] === opt.value;
                    return (
                      <button
                        key={opt.value}
                        className={`step-option ${isActive ? "active" : ""}`}
                        aria-pressed={isActive}
                        onClick={() => selectOption(i, step.key, opt.value)}
                      >
                        {opt.recommended && (
                          <span className="ribbon">⭐ {opt.recommended}</span>
                        )}
                        <span className="step-emoji" aria-hidden="true">
                          {opt.emoji}
                        </span>
                        <span className="step-label">
                          {opt.label}
                          {isActive && (
                            <span className="step-check" aria-hidden="true">
                              ✓
                            </span>
                          )}
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
            <p className="field-hint">上の「かんたん診断」で決まります。</p>
          </div>

          {/* 毎月の積立金額：プリセット＋自由入力 */}
          <div className="field">
            <div className="field-top">
              <span className="field-name" id="monthly-label">
                毎月の積立金額
              </span>
              <span className="field-value">{yen(monthly)}円</span>
            </div>
            <div className="presets" role="group" aria-label="毎月の積立金額のプリセット">
              {MONTHLY_PRESETS.map((v) => (
                <button
                  key={v}
                  className={`preset ${monthly === v ? "active" : ""}`}
                  aria-pressed={monthly === v}
                  onClick={() => setMonthly(v)}
                >
                  {yen(v)}円
                </button>
              ))}
            </div>
            <input
              type="number"
              aria-labelledby="monthly-label"
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
              <span className="field-name" id="years-label">
                積立期間
              </span>
              <span className="field-value">{years}年</span>
            </div>
            <input
              type="range"
              aria-labelledby="years-label"
              aria-valuetext={`${years}年`}
              min={YEARS_MIN}
              max={YEARS_MAX}
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
            <div className="scale" aria-hidden="true">
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
        <div className="card-head">
          <h2>シミュレーション結果</h2>
          <div className="result-actions">
            <button className="action" onClick={copyShareUrl} aria-label="条件をURLでコピー">
              {copied ? "✓ コピーしました" : "🔗 条件をコピー"}
            </button>
            <button className="action" onClick={saveImage} aria-label="結果を画像で保存">
              📷 画像を保存
            </button>
          </div>
        </div>

        <div className="capture" ref={captureRef}>
          <div className="summary">
            <Stat label="積立元本" value={formatMan(result.principal)} color={COLORS.principal} />
            <Stat label="運用益" value={formatMan(result.profit)} color={COLORS.profit} />
            <Stat label="最終資産" value={formatMan(result.total)} emphasis />
          </div>

          {crossover && (
            <p className="crossover-note">
              🔥 <strong>{crossover.year}年目</strong>で運用益が元本を上回ります（複利の力！）
            </p>
          )}

          <div
            className="chart"
            role="img"
            aria-label={`積立${years}年で最終資産は${formatMan(result.total)}。元本${formatMan(
              result.principal
            )}、運用益${formatMan(result.profit)}。`}
          >
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={result.yearly} margin={{ top: 16, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="year" tickFormatter={(y) => `${y}年`} />
                <YAxis tickFormatter={(v) => `${Math.round(v / 10000)}万`} width={48} />
                <Tooltip
                  formatter={(value, name) => [formatYen(value), name]}
                  labelFormatter={(y) => `${y}年目`}
                />
                <Legend />
                {crossover && (
                  <ReferenceLine
                    x={crossover.year}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    label={{
                      value: "複利が加速",
                      position: "top",
                      fill: "#b45309",
                      fontSize: 11,
                    }}
                  />
                )}
                <Bar dataKey="principal" name="元本" stackId="a" fill={COLORS.principal} />
                <Bar
                  dataKey="profit"
                  name="運用益"
                  stackId="a"
                  fill={COLORS.profit}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="card risk-card">
        <h2>🌱 投資とリスクのこと</h2>
        <ul className="risk-list">
          <li>
            📈 投資は「必ず増える」ものではありません。値上がり・値下がりをくり返しながら、ゆっくり育てていくイメージです。
          </li>
          <li>
            🌧️ 途中でマイナスになる年もあります。でも<strong>長期・積立・分散</strong>を続けると、値動きの振れ幅はやわらぎやすくなります。
          </li>
          <li>
            🧭 大切なのは、<strong>無理のない金額で、あわてて売らずに長く続ける</strong>こと。
          </li>
        </ul>
        <p className="risk-foot">こわがりすぎず、でも油断せず。コツコツ続けるのが近道です。</p>
      </section>

      <section className="card">
        <h2>📖 投資のことば</h2>
        <p className="muted">気になる言葉をタップすると、かんたんな説明が開きます。</p>
        <div className="glossary">
          {GLOSSARY.map((g) => (
            <details className="glossary-item" key={g.term}>
              <summary>{g.term}</summary>
              <p>{g.desc}</p>
            </details>
          ))}
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
  const label = allocation.map((a) => `${a.name}${a.percent}%`).join("、");
  return (
    <span className="alloc" role="img" aria-label={`資産配分：${label}`}>
      <span className="alloc-bar" aria-hidden="true">
        {allocation.map((a) => (
          <span
            key={a.name}
            className="alloc-seg"
            style={{ width: `${a.percent}%`, background: ASSET_COLORS[a.name] }}
            title={`${a.name} ${a.percent}%`}
          />
        ))}
      </span>
      <span className="alloc-legend" aria-hidden="true">
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
        {color && <span className="dot" style={{ background: color }} aria-hidden="true" />}
        {label}
      </span>
      <span className="stat-value">{value}</span>
    </div>
  );
}
