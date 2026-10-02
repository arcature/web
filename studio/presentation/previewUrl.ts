/**
 * Where the Studio opens the frontend, for Presentation and the Preview tab:
 * the QA site once deployed (SANITY_STUDIO_PREVIEW_URL), local dev otherwise.
 * QA always renders drafts, so no draft-mode handshake is needed.
 */
export const previewUrl =
  process.env.SANITY_STUDIO_PREVIEW_URL || 'http://localhost:4321';
