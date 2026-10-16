import { describe, expect, it } from "vitest";
import { listOf } from "@/features/chat/lookup";

describe(listOf, () => {
  it.each([
    [[], ""],
    [["London"], "London"],
    [["London", "Paris"], "London and Paris"],
    [["London", "Paris", "Tokyo"], "London, Paris and Tokyo"],
  ])("joins %j as %j", (items, expected) => {
    expect(listOf(items)).toBe(expected);
  });
});
