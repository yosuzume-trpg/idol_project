// =============================================================
// セーブデータマイグレーション — SaveData.versionを基準に古い形式を最新へ変換する
// 新しいセーブ形式に変更する際は、ここに version ごとの変換ステップを追加していく
// =============================================================

export const CURRENT_SAVE_VERSION = 1;

/** persistミドルウェアのmigrate関数。現状はv1のみなので素通しする */
export function migrateSaveData(persisted: unknown, version: number): unknown {
    void version;
    return persisted;
}
