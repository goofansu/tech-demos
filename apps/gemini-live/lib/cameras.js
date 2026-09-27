export function faceOf(device) {
  const modes = Array.isArray(device.facingModes) ? device.facingModes : [];
  if (modes.includes("environment")) return "environment";
  if (modes.includes("user")) return "user";
  const label = String(device.label || "").toLowerCase();
  if (/back|rear|environment/.test(label)) return "environment";
  if (/\b(front|selfie|user)\b/.test(label)) return "user";
  return "";
}

export function facingPair(devices) {
  const found = { user: "", environment: "" };
  let user = false;
  let environment = false;
  for (const device of devices || []) {
    if (device.kind && device.kind !== "videoinput") continue;
    const face = faceOf(device);
    if (face !== "user" && face !== "environment") continue;
    if (face === "user") user = true;
    else environment = true;
    if (!found[face] && device.deviceId) found[face] = device.deviceId;
  }
  if (!user || !environment) return null;
  return found;
}
