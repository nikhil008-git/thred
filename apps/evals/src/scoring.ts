import type { CaseScore, EvalCase, EvaluatedAnswer } from "./types.js";

function normalize(value: string): string {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function scoreCase(evalCase: EvalCase, result: EvaluatedAnswer): CaseScore {
  const abstentionCorrect = evalCase.shouldAbstain === result.abstained;
  const answerCorrect = evalCase.shouldAbstain
    ? abstentionCorrect
    : evalCase.expectedAnswer
      ? normalize(result.answer).includes(normalize(evalCase.expectedAnswer))
        || normalize(evalCase.expectedAnswer).includes(normalize(result.answer))
      : null;

  return {
    answerCorrect,
    temporalCorrect: evalCase.category === "temporal" ? answerCorrect : null,
    revisionCorrect: evalCase.category === "revision" ? answerCorrect : null,
    abstentionCorrect,
  };
}
