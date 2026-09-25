/** The only way images are served: through the session-checked route. */
export function imageUrl(imageId: string) {
  return `/api/images/${imageId}`;
}
