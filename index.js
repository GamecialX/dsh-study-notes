/**
 * Host half of the `dsh-study-notes` bundle.
 *
 * Registers one borrowed skill provider into `ctx.skills`. Every skill lives as
 * a self-contained directory under `assets/` holding a `SKILL.md` (YAML
 * frontmatter plus instruction body) and, optionally, `references/`,
 * `templates/` and `scripts/` beside it. Those sibling directories are exposed
 * to the model through the skill's `resourceBase`, so the instruction body stays
 * small and the bulky reusable assets are read from disk only when needed.
 *
 * The module deliberately imports nothing outside `node:` builtins: the package
 * therefore declares no dependencies and no peer dependencies, installs offline,
 * needs no build step, and cannot be rejected by the profile's DSH-peer
 * compatibility check. The `skills` service is declared in `inject`, so the
 * plugin simply stays inactive in a profile that has no skill registry instead
 * of throwing.
 *
 * @module dsh-study-notes
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { basename, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Cordis plugin identity; also the Loader row id in `cordis.patch.yml`. */
export const name = 'study-notes';

/** Required services. Without `skills` the plugin stays inactive. */
export const inject = ['skills'];

/** Provider name surfaced in skill summaries and diagnostics. */
const PROVIDER = 'dsh-study-notes';

/**
 * Precedence rank for packaged skill providers. Mirrors the registry's
 * `BUNDLED_SKILL_RANK`; spelled out here to keep this package import-free.
 */
const BUNDLED_SKILL_RANK = 600;

/** Public skill-name grammar enforced by the skill registry. */
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Frontmatter block: the first `---` line up to the next `---` line. */
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u;

/** Resource directories this provider knows how to advertise. */
const RESOURCE_DIRS = ['references', 'templates', 'scripts'];

/**
 * Parse a `SKILL.md` file into a registry candidate.
 *
 * Supports the YAML subset skill metadata actually uses: one `key: value` per
 * line, with a plain, single-quoted, or double-quoted value. Unknown keys are
 * ignored so a skill may carry extra metadata for other tools.
 *
 * @param raw - Complete file contents.
 * @param path - Absolute path, used in diagnostics.
 * @returns Parsed name, description, optional `whenToUse`, and the body.
 * @throws When the frontmatter block or a usable description is missing.
 */
function parseSkill(raw, path) {
  const match = FRONTMATTER.exec(raw);
  if (match?.[1] === undefined) {
    throw new Error(`${PROVIDER}: ${path} has no YAML frontmatter`);
  }
  const fields = new Map();
  for (const line of match[1].split(/\r?\n/u)) {
    if (line.trim().length === 0 || line.trimStart().startsWith('#')) continue;
    const separator = line.indexOf(':');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    fields.set(key, unquote(line.slice(separator + 1).trim()));
  }
  const description = fields.get('description');
  if (description === undefined || description.length === 0) {
    throw new Error(`${PROVIDER}: ${path} has no description`);
  }
  const declaredName = fields.get('name');
  const whenToUse = fields.get('whenToUse');
  return {
    name: declaredName,
    description,
    whenToUse: whenToUse === undefined || whenToUse.length === 0 ? undefined : whenToUse,
    content: raw.slice(match[0].length).trim(),
  };
}

/**
 * Strip one layer of matching YAML quotes and resolve the escapes used inside
 * double-quoted scalars.
 *
 * @param value - Raw scalar text after the colon.
 * @returns The unquoted value.
 */
function unquote(value) {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replaceAll('\\"', '"').replaceAll('\\n', '\n');
  }
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replaceAll("''", "'");
  }
  return value;
}

/**
 * Resolve an installed plugin's `assets/` directory.
 *
 * @param config - Row configuration; `assetRoot` overrides the packaged default.
 * @returns An absolute directory path.
 */
function resolveAssetRoot(config) {
  const configured = config?.assetRoot;
  if (configured !== undefined && !isAbsolute(configured)) {
    throw new Error(`${PROVIDER}: assetRoot must be an absolute directory`);
  }
  const root = configured ?? fileURLToPath(new URL('./assets/', import.meta.url));
  if (!statSync(root).isDirectory()) {
    throw new Error(`${PROVIDER}: assets directory not found at ${root}`);
  }
  return root;
}

/**
 * Enumerate the skill directories shipped in `assets/`.
 *
 * @param assetRoot - Absolute assets directory.
 * @returns Absolute skill directories, sorted by directory name.
 * @throws When the assets directory holds no `SKILL.md`.
 */
function discoverSkills(assetRoot) {
  const directories = readdirSync(assetRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => join(assetRoot, entry.name))
    .filter((directory) => statSync(join(directory, 'SKILL.md'), { throwIfNoEntry: false })?.isFile() === true)
    .sort();
  if (directories.length === 0) {
    throw new Error(`${PROVIDER}: assets directory ${assetRoot} contains no skill directory with a SKILL.md`);
  }
  return directories;
}

/**
 * Build the model-visible text appended after a skill's instruction body.
 *
 * The skill tool is the only place a skill can report facts that depend on
 * where the plugin was installed, so the absolute base directory and the
 * validator entry point are stated here rather than guessed in the body.
 *
 * @param skillDirectory - Absolute directory holding this skill.
 * @returns Markdown ready to append to the body.
 */
function runtimeNotes(skillDirectory) {
  const paths = { base: skillDirectory };
  for (const directory of RESOURCE_DIRS) {
    const absolute = join(skillDirectory, directory);
    if (statSync(absolute, { throwIfNoEntry: false })?.isDirectory() === true) {
      paths[directory] = absolute;
    }
  }
  const lines = [
    '',
    '---',
    '',
    '## Runtime facts (injected by the plugin)',
    '',
    'The absolute paths below belong to this installed plugin. Use them directly;',
    'do not search the disk for another copy of this skill.',
    '',
    '```json',
    JSON.stringify({ studyNotesSkill: paths }, undefined, 2),
    '```',
    '',
    'Copy the bulky templates with the shell instead of retyping them. On',
    'Windows, `Copy-Item -LiteralPath`; on macOS or Linux, `cp`. The portal',
    'template is thousands of lines long and the two launcher scripts must keep',
    'their original bytes (the `.bat` uses CRLF line endings and a UTF-8 code',
    'page), so always copy those three files and only hand-author the',
    'subject-specific files.',
  ];
  return lines.join('\n');
}

/**
 * Register every packaged skill with the skill registry.
 *
 * @param ctx - Context carrying the `skills` service.
 * @param config - Optional row configuration; `assetRoot` points at a different
 *   assets directory, which packaged deployments use to keep resources outside
 *   an archive the plugin cannot read.
 */
export function apply(ctx, config) {
  const assetRoot = resolveAssetRoot(config);
  const directories = discoverSkills(assetRoot);
  const candidates = directories.map((directory) => {
    const path = join(directory, 'SKILL.md');
    const parsed = parseSkill(readFileSync(path, 'utf8'), path);
    const declaredName = parsed.name ?? basename(directory);
    if (!SKILL_NAME.test(declaredName)) {
      throw new Error(`${PROVIDER}: ${path} declares invalid skill name "${declaredName}"`);
    }
    return {
      summary: {
        name: declaredName,
        description: parsed.description,
        ...(parsed.whenToUse === undefined ? {} : { whenToUse: parsed.whenToUse }),
        invocation: { modelInvocable: true, userInvocable: true },
        provider: PROVIDER,
        source: 'bundled',
        rank: BUNDLED_SKILL_RANK,
        resourceBase: { kind: 'directory', path: directory },
        locator: path,
      },
      runtime: runtimeNotes(directory),
    };
  });

  const provider = {
    name: PROVIDER,
    list: () => Promise.resolve(candidates.map((entry) => entry.summary)),
    async get(candidate, options) {
      const match = candidates.find((entry) => entry.summary.name === candidate.name);
      if (match === undefined) return undefined;
      const raw = await readFile(candidate.locator, { encoding: 'utf8', signal: options.signal });
      const parsed = parseSkill(raw, candidate.locator);
      const { locator: _locator, ...summary } = match.summary;
      return { ...summary, content: parsed.content + match.runtime };
    },
  };

  ctx.skills.registerProvider(() => provider);
}

/** Absolute directory holding this package, for diagnostics and tests. */
export const packageDir = fileURLToPath(new URL('.', import.meta.url));
