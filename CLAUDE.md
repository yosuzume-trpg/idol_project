# 配信アイドル育成ゲーム

一人の配信者兼アーティストを5年間（1825ターン）育成し、武道館ライブを目指すブラウザゲーム。
クトゥルフ風のd100判定ロールが全アクションの共通基盤。

## 仕様の正

- **`docs/game_design_doc.md` が唯一の仕様書。** 実装判断に迷ったら必ず参照する
- ゲームバランスに関わる数値を変更する場合、`src/engine/balance.ts` と仕様書の両方を更新する
- 仕様書にない挙動を実装する場合、先にユーザーに確認する
- **`docs/handoff.md` に現在の進捗・実装済み範囲・実装しながら決めた数値の一覧がある。** セッション開始時はこれも読んで現状を把握し、区切りの良いところで内容を更新する

## 技術スタック

- React / TypeScript / **Next.js**（App Router、`output: 'export'` による静的エクスポート）
    - `create-next-app` でブートストラップ済みのプロジェクトをそのまま使う（Vite化はしない）
    - ルーティングは使わない。`app/page.tsx` はゲーム本体（`src/ui/` のルートコンポーネント）を描画するだけの薄いエントリーポイント。画面遷移はNextのルートではなくアプリ内部の状態（現在の画面）で切り替える
- パッケージマネージャー: **npm**
- スタイリング: **Tailwind CSS**
- 状態管理: **Zustand**（persistミドルウェア + idb-keyval で IndexedDB 保存）
- テスト: Vitest（テストファイルは対象と同階層に `*.test.ts` で配置）
- デプロイ: 自宅VPS（Nginx）に `next build` の静的エクスポート（`out/`）を配置予定
- **将来のクラウド保存: 自宅VPS上の PostgreSQL に同期予定。** 現時点で実装は不要だが、以下を守ること:
    - セーブデータは `SaveData` 型の**単一JSONで完結**させる（分散保存しない）
    - `version` / `savedAt` / `rngSeed` を必ず含める（サーバー側マイグレーション・競合解決の基準になる）
    - エクスポート/インポート機能（JSON1ファイル）を早期に実装する。クラウド同期はこのJSONをそのまま転送する設計とする
    - IndexedDBアクセスはストレージアダプタ1箇所に隔離し、将来リモート同期を差し込めるようにする

## コマンド

```
npm run dev        # 開発サーバー
npm run build      # ビルド
npm run test       # Vitest（エンジンの単体テスト＋バランス回帰テスト）
npm run lint       # ESLint
```

## アーキテクチャ規約

- `src/engine/` : ゲームロジック。**純粋関数のみ、React/DOM/Zustand非依存**
- `src/store/` : Zustandストア。engineを呼び出す薄い層。persistはIndexedDB（idb-keyval）
- `src/ui/` : Reactコンポーネント。ロジックを持たない
- `app/` : Next.jsのエントリーポイントのみ（`layout.tsx` / `page.tsx`）。ページ内にロジックやマークアップを書かず、`src/ui/` のコンポーネントを呼び出すだけにする
- **乱数は必ず引数で受け取る**（`Rng`型）。`Math.random`直呼び禁止。シード固定でリプレイ・テスト可能にする
- バランス定数は `src/engine/balance.ts` に一元化。マジックナンバーをロジック内に書かない
- セーブデータは `version` フィールドを持ち、`src/store/migrations.ts` でマイグレーションする

## 開発ルール

- **新しい依存パッケージの追加はユーザーに確認してから行う**
- 依頼されたタスクの範囲外のリファクタリング・改名・構造変更をしない
- コメント・コミットメッセージは日本語

## 開発用デバッグパネル（正式な開発機能）

1825日のゲームを通しでテストするのは不可能なため、開発ビルドにデバッグパネルを最初から組み込む:

- 日数スキップ（+1日 / +7日 / +30日 / 指定日へ）
- 資金・ファン数・全パラメータの直接編集
- 乱数シードの固定/解除切替
- 任意トレンドの即時発生（規模・ジャンル指定）
- 現在のGameStateのJSONダンプ表示
  本番ビルドでは無効化する（Next.jsなので`process.env.NODE_ENV !== "production"`で分岐。`import.meta.env.DEV`はVite用でこのプロジェクトでは使えない）。

## UIコンポーネント規約

- 共有UIは `src/ui/components/` に置く
- **新しいUI要素を書く前に、必ず `src/ui/components/` の既存一覧を確認する。**
  既存で足りるならそれを使い、似たものがあるならpropsを拡張して対応する
- 以下は必ず共有コンポーネントを使う（画面ごとのインライン再実装を禁止）:
    - モーダル（`Modal`）/ 確認ダイアログ（`ConfirmDialog`）
    - ボタン（`Button`）
    - 数値表示（`MoneyDisplay` / `FansDisplay`: フォーマット付き）
    - パラメータバー（`ParamBar`）
    - ロール結果ログ行（`RollResultLine`: ○✕◎☠表示）
    - スコア帯バッジ（`ScoreBandBadge`: 伝説回〜失敗）
    - トースト通知（`Toast`）
- 共有化の基準: **2箇所以上で使うもの**。1箇所でしか使わないUIはページコンポーネント内に書いてよい（過剰な分解をしない）
- **ダークモードのテキストは白系（`zinc-50`〜`zinc-100`）を基本とする。** `zinc-400`〜`zinc-600` の灰色は黒背景でコントラストが低く読みにくいため、本文・ラベル・数値など主要なテキストには使わない
- タスク完了前に確認: 今回書いたJSXに既存コンポーネントで置き換えられる重複（特にモーダル・ダイアログ構造）がないか。あれば抽出してから完了とする

## コーディング規約

- 型定義は `interface` ではなく **`type`** を使う
- 識別子は英語、UI表示文字列は日本語。対訳は下の用語マッピングに従う（勝手に別名を作らない）
- enumは使わず文字列リテラルunionを使う
- 内部数値は小数で保持、UI表示は `Math.floor` で整数化（ステータス等）

## 用語マッピング（識別子は必ずこれに従う）

### コアリソース

| 日本語         | 識別子           |
| -------------- | ---------------- |
| 資金           | `money`          |
| ファン数       | `fans`           |
| 行動ポイント   | `ap`             |
| スタミナ現在値 | `stamina`        |
| メンタル現在値 | `mental`         |
| 実効値         | `effectiveValue` |
| 要求値         | `requirement`    |

### 18パラメータ（`ParamKey`）

| 日本語                     | 識別子            |
| -------------------------- | ----------------- |
| ボーカル技術               | `vocalTechnique`  |
| ボーカル表現               | `vocalExpression` |
| ダンス技術                 | `danceTechnique`  |
| ダンス表現                 | `danceExpression` |
| 編集技術                   | `editTechnique`   |
| 編集構成                   | `editComposition` |
| 作詞                       | `lyrics`          |
| 作曲                       | `composition`     |
| トーク                     | `talk`            |
| リアクション               | `reaction`        |
| アイデア                   | `idea`            |
| ラック                     | `luck`            |
| スタミナ（成長パラメータ） | `staminaParam`    |
| メンタル（成長パラメータ） | `mentalParam`     |
| カリスマ                   | `charisma`        |
| 愛嬌                       | `charm`           |
| 交渉                       | `negotiation`     |
| ゲームスキル               | `gameSkill`       |

※現在値の `stamina`/`mental` と成長パラメータの `staminaParam`/`mentalParam` を混同しない

### ジャンル（`Genre`）

| 日本語       | 識別子   | ジャンルロール    |
| ------------ | -------- | ----------------- |
| アイドル系   | `idol`   | `charm`           |
| ロック系     | `rock`   | `charisma`        |
| バラード系   | `ballad` | `mentalParam`     |
| クラブ/EDM系 | `edm`    | `danceExpression` |
| ネタ曲系     | `comedy` | `idea`            |
| ラップ系     | `rap`    | `reaction`        |

### 判定システム

| 日本語         | 識別子      |
| -------------- | ----------- |
| 判定ロール     | `roll`      |
| クリティカル   | `critical`  |
| ファンブル     | `fumble`    |
| スコア係数     | `scoreCoef` |
| 伝説回         | `legendary` |
| 大成功         | `great`     |
| 好調           | `good`      |
| 標準成功       | `standard`  |
| 不発           | `weak`      |
| 失敗           | `fail`      |
| 事故（小炎上） | `accident`  |

### 経済・コンテンツ

| 日本語                   | 識別子              |
| ------------------------ | ------------------- | --- | ----- |
| 同接数                   | `concurrentViewers` |
| 発見ボーナス             | `discoveryBonus`    |
| 飽和補正                 | `saturation`        |
| 視聴者疲労（リーチ補正） | `reachMultiplier`   |
| バースト再生             | `burstViews`        |
| テール再生               | `tailViews`         |
| サムネスコア             | `thumbnailScore`    |
| 品質スコア               | `qualityScore`      |
| 発売スパイク             | `releaseSpike`      |
| カタログ底流             | `catalogBaseline`   |
| ライブブースト           | `liveBoost`         |
| 人気度                   | `popularity`        |
| トレンド強度             | `intensity`         |
| トレンド規模             | `TrendSize` (`'S'   | 'M' | 'L'`) |

### ライブ・装備・放置

| 日本語                                           | 識別子                                             |
| ------------------------------------------------ | -------------------------------------------------- | --- | --- | ----- |
| 会場                                             | `venue`                                            |
| ライブハウス / ホール / アリーナ / 武道館        | `livehouse` / `hall` / `arena` / `budokan`         |
| セットリスト                                     | `setlist`                                          |
| リハーサル                                       | `rehearsal`                                        |
| 評価ランク                                       | `LiveRank` (`'S'                                   | 'A' | 'B' | 'C'`) |
| 装備スロット                                     | `EquipmentSlot`                                    |
| マイク / カメラ照明 / PCソフト / 衣装 / 練習環境 | `mic` / `camera` / `pc` / `outfit` / `practiceEnv` |
| 放置スケジュール                                 | `idleSchedule`                                     |
| 好感度                                           | `affection`                                        |
| デート先                                         | `DateSpotId`                                       |
| 話題                                             | `TopicId`                                          |
| 地雷話題                                         | `tabooTopics`                                      |
| カットイン到達値                                 | `reachedMilestones`                                |
| おかえりなさいログ                               | `welcomeBackLog`                                   |

## 実装マイルストーン

1. 型定義（`src/engine/types.ts`）＋ `balance.ts`
2. 判定エンジン（ロール・スコア集計・結果テーブル）＋単体テスト
3. 日次バッチ（ファン減衰・動画再生・楽曲DL・トレンド更新）
4. **UI基盤コンポーネント**（Modal / ConfirmDialog / Button / MoneyDisplay / FansDisplay / ParamBar / RollResultLine / ScoreBandBadge / Toast を先に作る）
5. 配信アクション＋最小UI（この時点で遊べるループ成立）
6. レッスン・動画/楽曲プロジェクト
7. トレンド＋SNSチェック＋ゲーム購入
8. ライブ（会場交渉〜当日処理）
9. 放置スケジュール・装備ショップ・アルバイト
10. サブコンテンツ（キャラ選択画面・NPCデート・アルバム）

## バランス回帰テスト（重要）

数式・定数変更時は必ず `npm run test` でシミュレーション回帰を確認する：

- バランス型bot 5年走行 → 最終ファン数が 200万〜350万 に収まること
- 武道館モンテカルロ（全パラメータ実効1150）→ A以上率 65〜80% であること
- 動画毎日投稿bot → バランス型より大幅に劣ること（退化戦略の封鎖確認）
