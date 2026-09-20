/**
 * PostCSS pipeline.
 *
 * The plugin list is intentionally empty, and the file intentionally exists.
 *
 * It previously loaded Tailwind, which has been removed - the stylesheet
 * contained no @tailwind directives, so Tailwind emitted nothing and was dead
 * configuration. But deleting this file outright is NOT equivalent to leaving
 * it empty: without it Next.js applies its built-in pipeline, which includes
 * autoprefixer, and the emitted CSS gains vendor prefixes it does not have
 * today. Keeping an explicit empty config preserves exactly the output this
 * project ships.
 *
 * @type {import('postcss-load-config').Config}
 */
const config = {
  plugins: {},
}

export default config
