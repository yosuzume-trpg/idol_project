// =============================================================
// 型定義スケルトン — docs/game_design_doc.md 準拠
// 規約: interface禁止・type使用 / enum禁止・リテラルunion使用
// =============================================================

// ---------- 乱数 ----------
/** シード可能な乱数生成器。engine内の全乱数はこれ経由（Math.random直呼び禁止） */
export type Rng = {
    /** 1〜100 の整数（d100） */
    d100: () => number;
    /** 0以上1未満の実数 */
    random: () => number;
    /** min以上max以下の整数 */
    int: (min: number, max: number) => number;
};

// ---------- パラメータ ----------
export type ParamKey =
    | "vocalTechnique"
    | "vocalExpression"
    | "danceTechnique"
    | "danceExpression"
    | "editTechnique"
    | "editComposition"
    | "lyrics"
    | "composition"
    | "talk"
    | "reaction"
    | "idea"
    | "luck"
    | "staminaParam"
    | "mentalParam"
    | "charisma"
    | "charm"
    | "negotiation"
    | "gameSkill";

export type Params = Record<ParamKey, number>;

// ---------- ジャンル・トレンド ----------
export type Genre = "idol" | "rock" | "ballad" | "edm" | "comedy" | "rap";

export type TrendSize = "S" | "M" | "L";

export type Trend = {
    id: string;
    /** 架空タイトル名（表示用・日本語可） */
    title: string;
    kind: "game" | "song";
    genre: Genre;
    size: TrendSize;
    /** ゲーム内日数（day番号） */
    startDay: number;
    /** L級のみ: 発売予告が出る日 */
    announcedDay?: number;
};

/** SNSチェックで取得するスナップショット */
export type TrendSnapshot = {
    checkedDay: number;
    entries: {
        trendId: string;
        title: string;
        genre: Genre;
        intensity: number;
        direction: "rising" | "peak" | "falling";
    }[];
    /** L級発売予告 */
    announcements: { title: string; genre: Genre; releaseDay: number }[];
};

// ---------- 判定 ----------
export type RollSpec = {
    param: ParamKey;
    weight: number;
};

export type ActionId = string; // balance.ts のアクション定義キー

/** アクション定義（データ駆動エンジンの背骨） */
export type ActionDef = {
    id: ActionId;
    label: string; // UI表示名（日本語）
    rolls: RollSpec[];
    /** ジャンル差し込み枠（歌枠・作曲等で使用時、選択ジャンルの対応paramを重み1で追加） */
    genreSlot?: boolean;
    apCost: number;
    staminaCost: number;
    mentalCost: number;
    moneyCost?: number;
};

export type RollOutcome = {
    param: ParamKey;
    weight: number;
    die: number;
    success: boolean;
    critical: boolean;
    fumble: boolean;
};

export type ScoreBand = "legendary" | "great" | "good" | "standard" | "weak" | "fail" | "accident";

export type ActionResult = {
    actionId: ActionId;
    rolls: RollOutcome[];
    score: number;
    band: ScoreBand;
    scoreCoef: number;
    /** 適用された差分（ログ・UI表示用） */
    effects: {
        money?: number;
        fans?: number;
        paramGains?: Partial<Params>;
        mentalDelta?: number;
    };
};

// ---------- コンテンツ ----------
export type Video = {
    id: string;
    title: string;
    kind: "song" | "dance" | "variety";
    genre?: Genre; // 歌/ダンス動画のみ
    releaseDay: number;
    fansAtRelease: number;
    thumbnailScore: number;
    qualityScore: number;
    reachMultiplier: number;
    /** 集計値（アーカイブ後はこれのみ保持） */
    totalViews: number;
    totalIncome: number;
    archived: boolean;
};

export type Song = {
    id: string;
    title: string;
    genre: Genre;
    releaseDay: number;
    fansAtRelease: number;
    qualityScore: number;
    popularity: number;
    totalDownloads: number;
    totalIncome: number;
    /** ライブブースト管理: 直近のライブ使用 (day, scale)[] */
    liveBoosts: { day: number; scale: number }[];
};

/** 動画・楽曲の進行中プロジェクト（同時1本のみ） */
export type Project = {
    kind: "video" | "song";
    videoKind?: Video["kind"];
    genre?: Genre;
    /** 完了済み工程のスコア */
    stageScores: number[];
    currentStage: number;
};

export type OwnedGame = {
    id: string;
    title: string;
    genre: Genre;
    /** 対応トレンドID（トレンド由来の購入時） */
    trendId?: string;
    purchasedDay: number;
};

// ---------- 装備 ----------
export type EquipmentSlot = "mic" | "camera" | "pc" | "outfit" | "practiceEnv";

export type Equipment = Record<EquipmentSlot, { level: number }> & {
    /** 衣装の装着ジャンル */
    outfitGenre?: Genre;
};

// ---------- ライブ ----------
export type VenueRank = "livehouse" | "hall" | "arena" | "budokan";

export type LiveRank = "S" | "A" | "B" | "C";

export type ScheduledLive = {
    venue: VenueRank;
    day: number;
    rehearsalCount: number; // 0〜5
    setlist: string[]; // Song id、会場既定の曲数
};

export type LiveSectionResult = {
    section: "op" | "song" | "mc" | "encore";
    songId?: string;
    rolls: RollOutcome[];
    score: number;
    maxScore: number;
    fatigued: boolean;
};

export type LiveResult = {
    venue: VenueRank;
    sections: LiveSectionResult[];
    totalScore: number;
    maxScore: number;
    rank: LiveRank;
    ticketIncome: number;
    fanGain: number;
};

// ---------- 放置 ----------
/** スケジュール1枠: アクションID or 自動判断 */
export type IdleSlot = ActionId | "auto";

export type IdleSchedule = [IdleSlot, IdleSlot, IdleSlot];

export type WelcomeBackLog = {
    daysProcessed: number;
    moneyGained: number;
    fansGained: number;
    paramGains: Partial<Params>;
    actionCounts: Record<string, number>;
    flavorEvents: string[];
};

// ---------- サブコンテンツ: プレイアブルキャラ・NPC・デート（§13） ----------
export type PlayableCharacterId = string;

/** プレイアブルキャラ定義（静的データ） */
export type PlayableCharacterDef = {
    id: PlayableCharacterId;
    name: string;
    description: string;
    /** 専用NPCロースター（5名固定） */
    npcIds: [string, string, string, string, string];
};

export type DateSpotId = string;
export type TopicId = string;

/** NPC静的定義 */
export type NpcDef = {
    id: string;
    name: string;
    role: string; // 立場（同期の配信者 等）
    /** 誕生日（1年内の日番号 0〜364、開始日=4月1日基準） */
    birthday: number;
    /** 解禁条件の説明（判定ロジックはengine側で対応） */
    unlockCondition: string;
    /** 抽選プール（人格タグ済み: このNPCがなり得る好みの候補のみ入れる） */
    preferencePool: {
        spots: DateSpotId[];
        topics: TopicId[];
        taboos: TopicId[];
    };
};

/** セーブ作成時に rngSeed から抽選される好み */
export type NpcPreferences = {
    favoriteSpots: DateSpotId[];
    favoriteTopics: TopicId[];
    tabooTopics: TopicId[];
};

/** NPCのセーブ内状態 */
export type NpcState = {
    npcId: string;
    unlocked: boolean;
    /** 0〜100 */
    affection: number;
    preferences: NpcPreferences;
    /** 会話で開示済みの好み（プレイヤーが知っている情報） */
    revealed: {
        spots: DateSpotId[];
        topics: TopicId[];
        taboos: TopicId[];
    };
    /** 到達済みカットイン閾値（25/50/75/100） */
    reachedMilestones: number[];
};

export type DateResult = {
    npcId: string;
    spot: DateSpotId;
    rolls: RollOutcome[];
    affectionDelta: number;
    newlyRevealed: Partial<NpcState["revealed"]>;
    /** 日付イベント（クリスマス・誕生日等）が発生したか */
    calendarEvent?: string;
    milestoneReached?: number;
};

// ---------- キャラクター・ゲーム状態 ----------
export type Character = {
    name: string;
    params: Params;
    stamina: number;
    staminaMax: number;
    mental: number;
};

export type GameState = {
    day: number; // 0〜1824（day 0 = 4月1日）
    ap: number;
    playableCharacterId: PlayableCharacterId;
    character: Character;
    npcs: NpcState[];
    money: number;
    fans: number;
    equipment: Equipment;
    videos: Video[];
    songs: Song[];
    project: Project | null;
    ownedGames: OwnedGame[];
    trends: Trend[];
    trendSnapshot: TrendSnapshot | null;
    scheduledLive: ScheduledLive | null;
    clearedVenues: VenueRank[];
    idleSchedule: IdleSchedule;
    /** 統計履歴（グラフ用、日次） */
    history: { day: number; fans: number; money: number }[];
};

// ---------- セーブデータ ----------
export type SaveData = {
    version: number;
    savedAt: string; // ISO datetime（放置時間計算の基準）
    state: GameState;
    rngSeed: number;
};
