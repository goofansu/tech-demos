import { describe, expect, test } from "bun:test";
import { faceOf, facingPair } from "./cameras.js";

describe("camera faces", () => {
  test("reads facing modes before the label", () => {
    expect(faceOf({ facingModes: ["environment"], label: "Front Camera" })).toBe("environment");
    expect(faceOf({ facingModes: ["user"], label: "Back Camera" })).toBe("user");
  });

  test("reads front and back from phone labels", () => {
    expect(faceOf({ label: "Front Camera" })).toBe("user");
    expect(faceOf({ label: "Back Camera" })).toBe("environment");
    expect(faceOf({ label: "camera2 1, facing front" })).toBe("user");
    expect(faceOf({ label: "camera2 0, facing back" })).toBe("environment");
  });

  test("offers a switch only when both faces are present", () => {
    const pair = facingPair([
      { kind: "videoinput", deviceId: "front", label: "Front Camera" },
      { kind: "videoinput", deviceId: "back", label: "Back Camera" },
      { kind: "audioinput", deviceId: "mic", label: "Microphone" },
    ]);
    expect(pair).toEqual({ user: "front", environment: "back" });
  });

  test("hides the switch for one camera or unlabeled cameras", () => {
    expect(facingPair([{ kind: "videoinput", deviceId: "only", label: "FaceTime HD Camera" }])).toBeNull();
    expect(facingPair([
      { kind: "videoinput", deviceId: "a", label: "Camera 0" },
      { kind: "videoinput", deviceId: "b", label: "Camera 1" },
    ])).toBeNull();
  });
});
