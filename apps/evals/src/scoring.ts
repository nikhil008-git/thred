import type { AnswerJudge, CaseScore, EvalCase, EvaluatedAnswer } from "./types.js";

function normalize(value: string): string {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export async function scoreCase(
  evalCase: EvalCase,
  result: EvaluatedAnswer,
  judge: AnswerJudge,
): Promise<CaseScore> {
  const abstentionCorrect = evalCase.shouldAbstain === result.abstained;
  const answerCorrect = evalCase.shouldAbstain
    ? abstentionCorrect
    : evalCase.expectedAnswer
      ? normalize(result.answer) === normalize(evalCase.expectedAnswer)
        || await judge.judge({
          question: evalCase.question,
          expectedAnswer: evalCase.expectedAnswer,
          answer: result.answer,
        })
      : null;

  return {
    answerCorrect,
    temporalCorrect: evalCase.category === "temporal" ? answerCorrect : null,
    revisionCorrect: evalCase.category === "revision" ? answerCorrect : null,
    abstentionCorrect,
    isAbstention: evalCase.shouldAbstain,
  };
}
