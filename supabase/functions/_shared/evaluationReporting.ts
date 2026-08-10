export type ReportingQuestionType =
  | "RATING_1_TO_5"
  | "RATING_1_TO_10"
  | "YES_NO"
  | "SINGLE_SELECT"
  | "MULTI_SELECT"
  | "SHORT_TEXT"
  | "LONG_TEXT"
  | "TAG_SELECTION";

export type ReportingQuestion = {
  readonly id: string;
  readonly position: number;
  readonly prompt: string;
  readonly questionType: ReportingQuestionType;
  readonly options: readonly string[];
};

export type DecryptedEvaluationPayload = {
  readonly payloadSchemaVersion: number;
  readonly answers: readonly unknown[];
};

export type CountDistributionItem = {
  readonly value: string;
  readonly count: number;
};

export type AggregatedQuestionResult = {
  readonly id: string;
  readonly position: number;
  readonly prompt: string;
  readonly questionType: ReportingQuestionType;
  readonly answeredCount: number;
  readonly aggregation:
    | {
        readonly kind: "RATING";
        readonly average: number | null;
        readonly distribution: readonly CountDistributionItem[];
      }
    | {
        readonly kind: "YES_NO";
        readonly yesCount: number;
        readonly noCount: number;
      }
    | {
        readonly kind: "OPTIONS";
        readonly distribution: readonly CountDistributionItem[];
        readonly allowsMultiple: boolean;
      }
    | {
        readonly kind: "TEXT_COMMENTS";
        readonly comments: readonly string[];
      };
};

export function aggregateEvaluationPayloads(
  questions: readonly ReportingQuestion[],
  payloads: readonly DecryptedEvaluationPayload[]
): readonly AggregatedQuestionResult[] {
  if (questions.length === 0 || payloads.length === 0) {
    throw new Error("EVALUATION_REPORT_DATA_INVALID");
  }

  const orderedQuestions = [...questions].sort(
    (left, right) => left.position - right.position
  );
  const answersByQuestion = new Map<string, unknown[]>();

  for (const question of orderedQuestions) {
    if (answersByQuestion.has(question.id)) {
      throw new Error("EVALUATION_REPORT_QUESTION_DUPLICATE");
    }

    answersByQuestion.set(question.id, []);
  }

  for (const payload of payloads) {
    if (
      payload.payloadSchemaVersion !== 1
      || !Array.isArray(payload.answers)
      || payload.answers.length !== orderedQuestions.length
    ) {
      throw new Error("EVALUATION_DECRYPTED_PAYLOAD_INVALID");
    }

    const seenQuestionIds = new Set<string>();

    for (const rawAnswer of payload.answers) {
      if (!isRecord(rawAnswer)) {
        throw new Error("EVALUATION_DECRYPTED_PAYLOAD_INVALID");
      }

      const questionId = readString(rawAnswer.questionId);
      const questionType = readString(rawAnswer.questionType);
      const question = orderedQuestions.find((item) => item.id === questionId);

      if (
        !question
        || question.questionType !== questionType
        || seenQuestionIds.has(questionId)
      ) {
        throw new Error("EVALUATION_DECRYPTED_PAYLOAD_INVALID");
      }

      seenQuestionIds.add(questionId);
      answersByQuestion.get(questionId)?.push(
        validateAnswerValue(question, rawAnswer.value)
      );
    }

    if (seenQuestionIds.size !== orderedQuestions.length) {
      throw new Error("EVALUATION_DECRYPTED_PAYLOAD_INVALID");
    }
  }

  return orderedQuestions.map((question) =>
    aggregateQuestion(question, answersByQuestion.get(question.id) ?? [])
  );
}

function aggregateQuestion(
  question: ReportingQuestion,
  values: readonly unknown[]
): AggregatedQuestionResult {
  const answeredValues = values.filter((value) => value !== null);
  const base = {
    answeredCount: answeredValues.length,
    id: question.id,
    position: question.position,
    prompt: question.prompt,
    questionType: question.questionType
  } as const;

  if (
    question.questionType === "RATING_1_TO_5"
    || question.questionType === "RATING_1_TO_10"
  ) {
    const maximum = question.questionType === "RATING_1_TO_5" ? 5 : 10;
    const ratings = answeredValues.map(Number);
    const average = ratings.length === 0
      ? null
      : Math.round(
          (ratings.reduce((sum, value) => sum + value, 0) / ratings.length)
            * 100
        ) / 100;

    return {
      ...base,
      aggregation: {
        average,
        distribution: Array.from({ length: maximum }, (_, index) => ({
          count: ratings.filter((value) => value === index + 1).length,
          value: String(index + 1)
        })),
        kind: "RATING"
      }
    };
  }

  if (question.questionType === "YES_NO") {
    return {
      ...base,
      aggregation: {
        kind: "YES_NO",
        noCount: answeredValues.filter((value) => value === false).length,
        yesCount: answeredValues.filter((value) => value === true).length
      }
    };
  }

  if (
    question.questionType === "SINGLE_SELECT"
    || question.questionType === "MULTI_SELECT"
    || question.questionType === "TAG_SELECTION"
  ) {
    const selectedValues = answeredValues.flatMap((value) =>
      Array.isArray(value) ? value.map(String) : [String(value)]
    );

    return {
      ...base,
      aggregation: {
        allowsMultiple: question.questionType !== "SINGLE_SELECT",
        distribution: question.options.map((option) => ({
          count: selectedValues.filter((value) => value === option).length,
          value: option
        })),
        kind: "OPTIONS"
      }
    };
  }

  return {
    ...base,
    aggregation: {
      comments: shuffleAnonymousComments(answeredValues.map(String)),
      kind: "TEXT_COMMENTS"
    }
  };
}

function shuffleAnonymousComments(values: readonly string[]): readonly string[] {
  const shuffled = [...values];

  // Each question is shuffled independently to avoid linking answer rows.
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const replacementIndex = randomIndex(index + 1);
    const current = shuffled[index];

    shuffled[index] = shuffled[replacementIndex];
    shuffled[replacementIndex] = current;
  }

  return shuffled;
}

function randomIndex(maximumExclusive: number): number {
  const range = 0x1_0000_0000;
  const acceptedLimit = range - (range % maximumExclusive);
  const randomValue = new Uint32Array(1);

  do {
    crypto.getRandomValues(randomValue);
  } while (randomValue[0] >= acceptedLimit);

  return randomValue[0] % maximumExclusive;
}

function validateAnswerValue(
  question: ReportingQuestion,
  value: unknown
): unknown {
  if (value === null) {
    return null;
  }

  if (question.questionType === "RATING_1_TO_5") {
    return readInteger(value, 1, 5);
  }

  if (question.questionType === "RATING_1_TO_10") {
    return readInteger(value, 1, 10);
  }

  if (question.questionType === "YES_NO") {
    if (typeof value !== "boolean") {
      throw new Error("EVALUATION_DECRYPTED_PAYLOAD_INVALID");
    }

    return value;
  }

  if (question.questionType === "SINGLE_SELECT") {
    if (typeof value !== "string" || !question.options.includes(value)) {
      throw new Error("EVALUATION_DECRYPTED_PAYLOAD_INVALID");
    }

    return value;
  }

  if (
    question.questionType === "MULTI_SELECT"
    || question.questionType === "TAG_SELECTION"
  ) {
    if (
      !Array.isArray(value)
      || value.length === 0
      || value.some((item) => typeof item !== "string")
      || new Set(value).size !== value.length
      || value.some((item) => !question.options.includes(String(item)))
    ) {
      throw new Error("EVALUATION_DECRYPTED_PAYLOAD_INVALID");
    }

    return value;
  }

  if (
    typeof value !== "string"
    || value.trim().length === 0
    || value.length > (question.questionType === "SHORT_TEXT" ? 500 : 5000)
  ) {
    throw new Error("EVALUATION_DECRYPTED_PAYLOAD_INVALID");
  }

  return value;
}

function readInteger(value: unknown, minimum: number, maximum: number): number {
  if (!Number.isInteger(value) || Number(value) < minimum || Number(value) > maximum) {
    throw new Error("EVALUATION_DECRYPTED_PAYLOAD_INVALID");
  }

  return Number(value);
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
