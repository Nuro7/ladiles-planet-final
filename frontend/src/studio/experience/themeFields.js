/**
 * themeFields.js — tolerant readers for the theme/scene/pose objects the backend
 * returns. Kept in a plain module (no component export) so both the ThemePicker
 * and the studio modules can share them without tripping fast-refresh.
 *
 * Backend items look like { id, label, description, coverImage?, prompt? } but
 * field names may vary while the backend is being built — read across aliases.
 */

/** Cover image URL for a theme tile, across the likely field names. */
export function getThemeCover(item) {
  return item?.coverImage || item?.cover || item?.coverUrl
    || item?.cover_image || item?.imageUrl || item?.image_url || item?.thumbnail || null;
}

/** Default prompt text for a theme, across the likely field names. */
export function getThemePrompt(item) {
  return item?.prompt || item?.promptText || item?.default_prompt || item?.defaultPrompt || '';
}
