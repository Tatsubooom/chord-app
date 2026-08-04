# chord-app

ランダムなコード進行が確率的に流れ続ける Web アプリのモックアップ。
キー / スケール / BPM / 多様性（temperature）を変えながら、マルコフ遷移＋定番進行パターンに基づいてコードを生成し、Web Audio API で再生します。
デプロイ先は[こちら](https://tatsubooom.github.io/chord-app/)

## 技術スタック

- React 19 + Vite 8（JS/JSX）
- Web Audio API（外部音源なし・オシレーター合成）
- GitHub Pages へ Actions で自動デプロイ

## 開発

```bash
# Docker（推奨）
docker compose up   # http://localhost:5173

# もしくはローカルに Node 20+
npm install
npm run dev
```

その他: `npm run build` / `npm run preview` / `npm run lint`

## 構成

```
src/
  App.jsx                    画面の組み立て（各コンポーネントを配置するだけ）
  constants.js               キー一覧・拍/小節などの定数
  hooks/
    useChordSequencer.js     再生ループ・履歴管理（スケジューラ）
  engines/
    chordEngine.js           スケール定義 / 度数→コード変換 / ボイスリーディング
    weightEngine.js          マルコフ遷移表 + 進行パターンボーナス + 代理コード
    audioEngine.js           Web Audio によるコード再生
  components/
    ChordDisplay.jsx         現在のコード
    ChordHistory.jsx         流れていくコード履歴
    TransportControls.jsx    再生 / Multi-Chord 切り替え
    WeightPanel.jsx          キー / スケール / BPM / temperature
    ScaleLegend.jsx          スケール各度数の凡例
```

生成の流れ: `useChordSequencer` が `weightEngine` で次の度数の重みを計算 → 抽選 →
`chordEngine` でコード化 → `audioEngine` で発音、を BPM に合わせて `setTimeout` で繰り返します。
