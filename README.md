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

その他: `npm run build` / `npm run preview` / `npm run lint` / `npm test`

生成される進行をテキストで確認: `npm run sample -- --key C --scale major --temp 0.3 --spice 0.5`

## 構成

```
src/
  App.jsx                    画面の組み立て（各コンポーネントを配置するだけ）
  constants.js               キー一覧・演奏スタイル・拍/小節などの定数
  hooks/
    useChordSequencer.js     再生ループ・履歴管理（スケジューラ）
  engines/
    planner.js               8小節先読みの進行プランナー（骨格・色・仕掛け・終止）
    chordEngine.js           スケール定義 / 度数→コード spec / spec→具体的なコード
    theory.js                構成音程からコード名・ローマ数字を生成
    voicing.js               ベース＋上声のボイスリーディング
    weightEngine.js          マルコフ遷移表 + 進行パターンボーナス + 音楽理論補正
    audioEngine.js           Web Audio によるコード再生
  components/
    Piano.jsx                背景の鍵盤（鳴っている音をハイライト）
    ChordDisplay.jsx         現在のコード + 定番進行ポップアップ
    ChordHistory.jsx         流れていくコード履歴
    TransportControls.jsx    再生 / 設定の開閉
    WeightPanel.jsx          設定パネル
    ProbabilityMeter.jsx     次のコードの確率メーター
    DecorationInfo.jsx       装飾の発生確率
docs/
  PLAN.md                    改善計画
```

生成の流れ: `useChordSequencer` が `planner` で8小節ぶんを先読み計画
（骨格は `weightEngine` の重みから抽選 → 色付け → クリシェ等の仕掛けを差し込み）→
再生時に `chordEngine` / `voicing` で前のコードに繋がる音高を決定 → `audioEngine` で発音、を BPM に合わせて繰り返します。
scripts/ には生成結果をテキストで書き出す `sample.js` があります。
