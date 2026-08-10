import { describe, expect, it } from "vitest";
import {
  aggregateEvaluationPayloads,
  type DecryptedEvaluationPayload,
  type ReportingQuestion
} from "../supabase/functions/_shared/evaluationReporting";

const questions: readonly ReportingQuestion[] = [
  {
    id: "rating",
    options: [],
    position: 1,
    prompt: "Rating",
    questionType: "RATING_1_TO_5"
  },
  {
    id: "boolean",
    options: [],
    position: 2,
    prompt: "Boolean",
    questionType: "YES_NO"
  },
  {
    id: "single",
    options: ["A", "B"],
    position: 3,
    prompt: "Single",
    questionType: "SINGLE_SELECT"
  },
  {
    id: "multi",
    options: ["X", "Y", "Z"],
    position: 4,
    prompt: "Multi",
    questionType: "MULTI_SELECT"
  },
  {
    id: "text",
    options: [],
    position: 5,
    prompt: "Text",
    questionType: "LONG_TEXT"
  }
];

describe("aggregateEvaluationPayloads", () => {
  it("aggregates structured answers and returns independently grouped text comments", () => {
    const payloads = [
      createPayload(2, true, "A", ["X", "Y"], "Secret alpha"),
      createPayload(3, false, "A", ["Y"], "Secret beta"),
      createPayload(4, true, "B", ["Z"], null),
      createPayload(5, true, "B", ["X", "Z"], "Secret delta")
    ];

    const result = aggregateEvaluationPayloads(questions, payloads);

    expect(result[0]?.aggregation).toEqual({
      average: 3.5,
      distribution: [
        { count: 0, value: "1" },
        { count: 1, value: "2" },
        { count: 1, value: "3" },
        { count: 1, value: "4" },
        { count: 1, value: "5" }
      ],
      kind: "RATING"
    });
    expect(result[1]?.aggregation).toEqual({
      kind: "YES_NO",
      noCount: 1,
      yesCount: 3
    });
    expect(result[2]?.aggregation).toEqual({
      allowsMultiple: false,
      distribution: [
        { count: 2, value: "A" },
        { count: 2, value: "B" }
      ],
      kind: "OPTIONS"
    });
    expect(result[3]?.aggregation).toEqual({
      allowsMultiple: true,
      distribution: [
        { count: 2, value: "X" },
        { count: 2, value: "Y" },
        { count: 2, value: "Z" }
      ],
      kind: "OPTIONS"
    });
    expect(result[4]?.aggregation).toEqual({
      comments: expect.arrayContaining([
        "Secret alpha",
        "Secret beta",
        "Secret delta"
      ]),
      kind: "TEXT_COMMENTS"
    });
    expect(
      result[4]?.aggregation.kind === "TEXT_COMMENTS"
        ? result[4].aggregation.comments
        : []
    ).toHaveLength(3);
  });

  it("rejects payloads with missing, duplicate, or type-mismatched answers", () => {
    const invalidPayload: DecryptedEvaluationPayload = {
      answers: [
        { questionId: "rating", questionType: "LONG_TEXT", value: "Leak" }
      ],
      payloadSchemaVersion: 1
    };

    expect(() => aggregateEvaluationPayloads(questions, [invalidPayload])).toThrow(
      "EVALUATION_DECRYPTED_PAYLOAD_INVALID"
    );
  });
});

function createPayload(
  rating: number,
  booleanValue: boolean,
  single: string,
  multi: readonly string[],
  text: string | null
): DecryptedEvaluationPayload {
  return {
    answers: [
      { questionId: "rating", questionType: "RATING_1_TO_5", value: rating },
      { questionId: "boolean", questionType: "YES_NO", value: booleanValue },
      { questionId: "single", questionType: "SINGLE_SELECT", value: single },
      { questionId: "multi", questionType: "MULTI_SELECT", value: multi },
      { questionId: "text", questionType: "LONG_TEXT", value: text }
    ],
    payloadSchemaVersion: 1
  };
}
