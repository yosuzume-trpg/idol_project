// =============================================================
// 装備（§12） — ショップ購入＋レベル強化方式の継続的な資金シンク
// マイク/カメラ・照明/PC・ソフト/練習環境は判定・成長量に反映済み。
// 衣装（outfit）は購入・強化のみ実装し、効果（ライブ全セクション＋ジャンル適性ロール）は
// ライブ（マイルストーン8）実装時にまとめて有効化する（残課題）。
// PC・ソフトの「動画テール減衰延長」効果は仕様書に数式が無いため未実装（残課題）
// =============================================================

import { BALANCE } from "./balance";
import type { Equipment, EquipmentSlot } from "./types";

/** 装備1枠の補正値（実効値への加算量、§12.2）: レベル×3、上限なし */
export function equipmentBonus(level: number): number {
    return level * BALANCE.equipment.bonusPerLevel;
}

/** 装備1枠を現在レベルからLv+1へ強化する費用（§12.2）: 基礎価格200G×1.35^レベル */
export function equipmentUpgradeCost(level: number): number {
    return BALANCE.equipment.baseCost * BALANCE.equipment.costGrowth ** level;
}

/** 練習環境によるレッスン成長量ブースト倍率（§12.1）: レベル×2% */
export function practiceEnvMultiplier(level: number): number {
    return 1 + level * BALANCE.equipment.practiceEnvBonusPerLevel;
}

/** 指定スロットを1レベル強化した新しいEquipmentを返す（純粋関数。費用チェック・資金減算はstore側で行う） */
export function upgradeEquipmentSlot(equipment: Equipment, slot: EquipmentSlot): Equipment {
    return { ...equipment, [slot]: { ...equipment[slot], level: equipment[slot].level + 1 } };
}
