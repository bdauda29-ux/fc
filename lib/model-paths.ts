export function getModelBasePath(modelId: string) {
  return `/models/${modelId}`;
}

export function getModelPath(modelId: string, segment = "dashboard") {
  return `${getModelBasePath(modelId)}/${segment}`;
}

export function getModelPlayerPath(modelId: string, playerId: string) {
  return `${getModelPath(modelId, "players")}/${playerId}`;
}
