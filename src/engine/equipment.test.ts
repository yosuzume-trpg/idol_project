import { describe, expect, it } from "vitest";
import { equipmentBonus, equipmentUpgradeCost, practiceEnvMultiplier, upgradeEquipmentSlot } from "./equipment";
import type { Equipment } from "./types";

const ZERO_EQUIPMENT: Equipment = {
    mic: { level: 0 },
    camera: { level: 0 },
    pc: { level: 0 },
    outfit: { level: 0 },
    practiceEnv: { level: 0 },
};

describe("equipmentBonus", () => {
    it("レベル×3（§12.2）", () => {
        expect(equipmentBonus(0)).toBe(0);
        expect(equipmentBonus(10)).toBe(30);
    });
});

describe("equipmentUpgradeCost", () => {
    it("Lv0→1の費用は基礎価格200G", () => {
        expect(equipmentUpgradeCost(0)).toBeCloseTo(200);
    });

    it("費用は1.35^レベルで指数的に伸びる（§12.2）", () => {
        expect(equipmentUpgradeCost(1)).toBeCloseTo(270); // 200×1.35
        expect(equipmentUpgradeCost(10)).toBeCloseTo(200 * 1.35 ** 10);
    });
});

describe("practiceEnvMultiplier", () => {
    it("レベル0は倍率1（無補正）", () => {
        expect(practiceEnvMultiplier(0)).toBe(1);
    });

    it("レベル×2%が加算される（§12.1）", () => {
        expect(practiceEnvMultiplier(10)).toBeCloseTo(1.2);
    });
});

describe("upgradeEquipmentSlot", () => {
    it("指定スロットのみレベルが+1され、他は変化しない", () => {
        const upgraded = upgradeEquipmentSlot(ZERO_EQUIPMENT, "mic");
        expect(upgraded.mic.level).toBe(1);
        expect(upgraded.camera.level).toBe(0);
        expect(upgraded.pc.level).toBe(0);
        expect(upgraded.outfit.level).toBe(0);
        expect(upgraded.practiceEnv.level).toBe(0);
    });

    it("元のEquipmentは変更しない（純粋関数）", () => {
        upgradeEquipmentSlot(ZERO_EQUIPMENT, "mic");
        expect(ZERO_EQUIPMENT.mic.level).toBe(0);
    });
});
