const PLACEHOLDER_PROJECT_ID = 'YOUR_EAS_PROJECT_ID';

/** Returns a configured EAS project ID or undefined when missing/placeholder. */
export function resolveEasProjectId(
  projectId: string | undefined | null,
): string | undefined {
  const id = projectId?.trim();
  if (!id || id === PLACEHOLDER_PROJECT_ID) return undefined;
  return id;
}

export function isEasProjectIdConfigured(projectId: string | undefined | null): boolean {
  return resolveEasProjectId(projectId) !== undefined;
}
