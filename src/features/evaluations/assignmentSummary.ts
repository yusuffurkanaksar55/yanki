import type { EvaluationAssignment } from "./evaluationAssignmentService";

export type AssignmentInboxSummary = {
  readonly activeCycleCount: number;
  readonly pendingAssignmentCount: number;
};

export function createAssignmentSummary(
  assignments: readonly EvaluationAssignment[]
): AssignmentInboxSummary {
  const activeCycleIds = new Set(
    assignments
      .filter((assignment) => assignment.availabilityStatus === "AVAILABLE")
      .map((assignment) => assignment.evaluationCycleId)
  );
  const pendingAssignmentCount = assignments.filter(
    (assignment) =>
      assignment.assignmentStatus === "PENDING"
      && ["AVAILABLE", "UPCOMING"].includes(assignment.availabilityStatus)
  ).length;

  return {
    activeCycleCount: activeCycleIds.size,
    pendingAssignmentCount
  };
}
