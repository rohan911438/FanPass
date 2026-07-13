import type { SkillContext, SkillName, SkillResult } from "@fanpass/shared";
import type { SkillMaterials } from "@/skills/types";
import { resolveSkillNames } from "./contexts";
import { skillRegistry } from "./skillRegistry";

export type OnSkillComplete = (name: SkillName, result: SkillResult<unknown>) => Promise<void> | void;

/** Depth-first order such that every skill appears after everything (requested) it depends on. */
function topoSort(names: SkillName[]): SkillName[] {
  const visited = new Set<SkillName>();
  const ordered: SkillName[] = [];

  function visit(name: SkillName): void {
    if (visited.has(name)) return;
    visited.add(name);
    const skill = skillRegistry[name];
    for (const dep of skill?.dependsOn ?? []) {
      if (names.includes(dep)) visit(dep);
    }
    ordered.push(name);
  }

  names.forEach(visit);
  return ordered;
}

/** Groups the topo-sorted list into parallel batches: a skill joins a batch once its deps are done. */
function toBatches(ordered: SkillName[]): SkillName[][] {
  const batches: SkillName[][] = [];
  const done = new Set<SkillName>();
  let remaining = [...ordered];

  while (remaining.length > 0) {
    const batch = remaining.filter((name) =>
      (skillRegistry[name]?.dependsOn ?? []).every((dep) => done.has(dep) || !ordered.includes(dep))
    );
    const next = batch.length > 0 ? batch : remaining; // safety valve against an unexpected cycle
    batches.push(next);
    next.forEach((name) => done.add(name));
    remaining = remaining.filter((name) => !next.includes(name));
  }

  return batches;
}

function failureResult(name: SkillName, error: unknown): SkillResult<unknown> {
  const message = error instanceof Error ? error.message : String(error);
  return { agent: name, confidence: 0, output: null, flags: [`${name}_failed: ${message}`], latencyMs: 0 };
}

/**
 * Runs the skills a SkillContext resolves to, in dependency order, batching independent skills in
 * parallel (Promise.allSettled — one skill failing folds into its own result's flags, never aborts the
 * rest of the run). See docs/PHASE_5_ECOSYSTEM_INTEGRATION.md Part 4/5.
 */
export async function runPlanner(
  materials: SkillMaterials,
  context: SkillContext,
  onSkillComplete?: OnSkillComplete
): Promise<Partial<Record<SkillName, SkillResult<unknown>>>> {
  const requested = resolveSkillNames(context).filter((name) => skillRegistry[name]?.appliesTo(context));
  const batches = toBatches(topoSort(requested));

  const results: Partial<Record<SkillName, SkillResult<unknown>>> = { ...context.priorResults };
  const runContext: SkillContext = { ...context, priorResults: results };

  for (const batch of batches) {
    const settled = await Promise.allSettled(
      batch.map((name) => skillRegistry[name]!.execute(materials, runContext))
    );

    for (let i = 0; i < batch.length; i++) {
      const name = batch[i];
      const outcome = settled[i];
      results[name] = outcome.status === "fulfilled" ? outcome.value : failureResult(name, outcome.reason);
      await onSkillComplete?.(name, results[name]!);
    }
  }

  return results;
}
