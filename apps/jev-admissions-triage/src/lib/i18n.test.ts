import { describe, expect, test } from "bun:test";
import { catalogs, interpolate, translate } from "./i18n";

function paths(node: unknown, prefix = ""): string[] {
  if (typeof node === "string") return [prefix];
  if (!node || typeof node !== "object") return [];
  return Object.entries(node).flatMap(([key, value]) =>
    paths(value, prefix ? `${prefix}.${key}` : key),
  );
}

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).toSorted();
}

describe("i18n catalogs", () => {
  test("English and Simplified Chinese share the same message keys", () => {
    expect(paths(catalogs["zh-CN"])).toEqual(paths(catalogs.en));
  });

  test("each locale keeps the same interpolation placeholders", () => {
    for (const path of paths(catalogs.en)) {
      const enVars = placeholders(translate("en", path as never));
      const zhVars = placeholders(translate("zh-CN", path as never));
      expect(zhVars, path).toEqual(enVars);
    }
  });

  test("interpolate leaves unknown tokens in place", () => {
    expect(interpolate("Hello {name}", { other: "x" })).toBe("Hello {name}");
  });

  test("mode names use the agreed glossary", () => {
    expect(translate("en", "app.queue")).toBe("Queue");
    expect(translate("zh-CN", "app.queue")).toBe("队列");
    expect(translate("zh-CN", "app.applicant")).toBe("申请人");
    expect(translate("zh-CN", "app.preset")).toBe("题组");
  });
});
