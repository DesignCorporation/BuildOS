// BuildOS - Room geometry tests

import { describe, it, expect } from "vitest";
import { calculateRoomGeometry } from "../src/room.service";

describe("RoomService geometry", () => {
  it("should calculate areas for full height", () => {
    const geometry = calculateRoomGeometry({
      length: 3,
      width: 2,
      height: 2.5,
      tileHeightMode: "full",
    });

    expect(geometry.area).toBeCloseTo(6);
    expect(geometry.perimeter).toBeCloseTo(10);
    expect(geometry.wallArea).toBeCloseTo(25);
    expect(geometry.ceilingArea).toBeCloseTo(6);
  });

  it("should use partial tile height for wall area", () => {
    const geometry = calculateRoomGeometry({
      length: 4,
      width: 3,
      height: 2.8,
      tileHeightMode: "partial",
      tileHeightValue: 1.2,
    });

    expect(geometry.area).toBeCloseTo(12);
    expect(geometry.perimeter).toBeCloseTo(14);
    expect(geometry.wallArea).toBeCloseTo(16.8);
  });
});
