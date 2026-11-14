/**
 * Markdown engine — parser, outline, and path selection.
 *
 * Lives beside its only consumer instead of in `@aio-ui/utilities`: the builder
 * (`./Markdown.ts`) is the one thing in the repo that reads a document, so publishing a
 * parser subpath would have been surface with no second caller.
 *
 * The repository documents itself in `.md` files (every package README, `docs/framework/*.md`),
 * so a page that shows documentation must be able to read one. This module turns Markdown
 * into a small **AST**, and nothing else: it never touches the DOM, never builds HTML, and
 * never escapes by string concatenation. The renderer (`./Markdown.ts`) walks the tree and
 * writes text with `textContent`, which is why a `<script>` in the source is printed, not run.
 *
 * The subset is exactly what this repo writes:
 *
 *   block      heading h1-h6, paragraph, fenced code, unordered/ordered list,
 *              GFM table, blockquote, horizontal rule
 *   inline     `code`, **bold**, *em* / _em_, [link](href)
 *   marker     `<!-- part: id=x role=y -->` — a line no renderer ever shows, read as a
 *              pointer that names the heading under it
 *
 * A `mermaid` fence is an ordinary fence here — highlighting is a renderer's business.
 *
 * Two things sit on top of the AST and are the reason the markers exist:
 *
 *   `outline()`        the document as a list of heading sections, each with the trail that
 *                      reaches it and whatever the marker declared
 *   `selectOutline()`  one path in, the blocks behind it out — `@lead`, `@title`, `#anchor`,
 *                      `role:name`, or a heading path (`Supported syntax > Cascade`)
 *
 * The parser understands *syntax*, never *meaning*: `role=usage` is a word it hands back, not
 * a concept it interprets. That keeps every convention in the document, not in this file.
 */
const FENCE = /^```(.*)$/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const RULE = /^\s*(-{3,}|\*{3,}|_{3,})\s*$/;
const QUOTE = /^\s*>\s?(.*)$/;
const BULLET = /^(\s*)([-*+])\s+(.*)$/;
const ORDERED = /^(\s*)(\d+)[.)]\s+(.*)$/;
const SEPARATOR = /^\s*\|?[\s:|-]*-[\s:|-]*\|[\s:|-]*$/;
/** `<!-- part: id=x role=y -->` — the default marker spelling. */
const COMMENT_MARKER = /^\s*<!--\s*([A-Za-z0-9_-]+)\s*:\s*(.*?)\s*-->\s*$/;
/** A single-line HTML comment, marker or not. */
const COMMENT_LINE = /^\s*<!--.*-->\s*$/;
/** The start of a comment, which may or may not close on the same line. */
const COMMENT_OPEN = /^\s*<!--/;
/** `[part:id=x role=y]: #` — a definition nobody references, so no renderer shows it. */
const LINK_MARKER = /^\s*\[([A-Za-z0-9_-]+):([^\]]*)\]\s*:\s*#\s*$/;
/** Marker options with the defaults filled in. */
function markerConfig(config) {
    return {
        keyword: config?.keyword?.trim() || "part",
        forms: config?.forms?.length ? config.forms : ["comment"],
    };
}
/** `id=x role=y` → `{ id: "x", role: "y" }`. Anything without a value is ignored. */
function markerValues(text) {
    const values = {};
    for (const token of text.split(/\s+/)) {
        const pair = /^([A-Za-z0-9_-]+)=(.*)$/.exec(token);
        const value = pair?.[2].trim();
        if (pair && value)
            values[pair[1]] = value;
    }
    return values;
}
/**
 * Read one line as a marker, a plain comment, or neither.
 *
 * A comment that is *not* a marker is still dropped: an HTML comment is invisible in every
 * Markdown renderer, so printing it would be the surprise. It is only a marker when its
 * keyword matches — the keyword is what makes the line an instruction instead of a note.
 */
function readMarker(line, config) {
    for (const form of config.forms) {
        const hit = form === "comment" ? COMMENT_MARKER.exec(line) : LINK_MARKER.exec(line);
        if (!hit || hit[1] !== config.keyword)
            continue;
        return { kind: "marker", values: markerValues(hit[2]) };
    }
    return COMMENT_LINE.test(line) ? { kind: "comment" } : null;
}
/** True for a line that can start a block other than a paragraph. */
function startsBlock(line) {
    return (FENCE.test(line) ||
        HEADING.test(line) ||
        RULE.test(line) ||
        QUOTE.test(line) ||
        BULLET.test(line) ||
        ORDERED.test(line));
}
/** A GFM table needs a header row and a `|---|` separator under it. */
function isTableStart(lines, index) {
    const head = lines[index];
    const separator = lines[index + 1];
    if (head === undefined || separator === undefined)
        return false;
    return head.includes("|") && SEPARATOR.test(separator);
}
/**
 * Split one table row on pipes that are NOT inside a code span.
 *
 * `` `a | b` `` is one cell: splitting naively would cut an inline code span in half, which
 * is the exact bug the fixtures pin down.
 */
export function splitTableRow(line) {
    const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
    const cells = [];
    let buffer = "";
    let inCode = false;
    for (const char of trimmed) {
        if (char === "`") {
            inCode = !inCode;
            buffer += char;
            continue;
        }
        if (char === "|" && !inCode) {
            cells.push(buffer.trim());
            buffer = "";
            continue;
        }
        buffer += char;
    }
    cells.push(buffer.trim());
    return cells;
}
/**
 * Inline parser.
 *
 * One pass, left to right, longest-marker-first so `**bold**` is not read as two `*em*`.
 * Unclosed markers are literal text — a document is not required to be well formed here.
 */
export function parseInline(source) {
    const out = [];
    let buffer = "";
    const flush = () => {
        if (buffer)
            out.push({ type: "text", value: buffer });
        buffer = "";
    };
    let index = 0;
    while (index < source.length) {
        const rest = source.slice(index);
        const code = /^`([^`]+)`/.exec(rest);
        if (code) {
            flush();
            out.push({ type: "code", value: code[1] });
            index += code[0].length;
            continue;
        }
        const link = /^\[([^\]]*)\]\(([^)\s]+)\)/.exec(rest);
        if (link) {
            flush();
            out.push({ type: "link", href: link[2], content: parseInline(link[1]) });
            index += link[0].length;
            continue;
        }
        const strong = /^\*\*([^*]+)\*\*/.exec(rest);
        if (strong) {
            flush();
            out.push({ type: "strong", content: parseInline(strong[1]) });
            index += strong[0].length;
            continue;
        }
        const emphasis = /^\*([^*]+)\*/.exec(rest) ?? /^_([^_]+)_/.exec(rest);
        if (emphasis) {
            flush();
            out.push({ type: "emphasis", content: parseInline(emphasis[1]) });
            index += emphasis[0].length;
            continue;
        }
        buffer += source[index];
        index += 1;
    }
    flush();
    return out;
}
/**
 * Block parser.
 *
 * Line based on purpose: the documents this reads are written by hand and edited line by
 * line, so a line-oriented pass keeps every construct local and debuggable.
 *
 * Marker lines are consumed here, not by a renderer: a marker that reached the AST as text
 * would print `<!-- part: id=x -->` in the middle of a page.
 */
export function parseMarkdown(source, options = {}) {
    const lines = source.replace(/\r\n?/g, "\n").split("\n");
    const blocks = [];
    const config = markerConfig(options.marker);
    /** A marker waits for the heading under it; blank lines in between are harmless. */
    let pending = null;
    let inComment = false;
    let index = 0;
    while (index < lines.length) {
        const line = lines[index];
        if (!line.trim()) {
            index += 1;
            continue;
        }
        const fence = FENCE.exec(line);
        if (fence) {
            const code = [];
            index += 1;
            while (index < lines.length && !FENCE.test(lines[index])) {
                code.push(lines[index]);
                index += 1;
            }
            index += 1; // closing fence (or end of input)
            blocks.push({ type: "fence", language: fence[1].trim(), code: code.join("\n") });
            continue;
        }
        // Inside a comment that opened on an earlier line and has not closed yet.
        if (inComment) {
            if (line.includes("-->"))
                inComment = false;
            index += 1;
            continue;
        }
        const marked = readMarker(line, config);
        if (marked) {
            if (marked.kind === "marker")
                pending = marked.values;
            index += 1;
            continue;
        }
        // A comment that opens without closing: drop its lines until it does.
        if (COMMENT_OPEN.test(line)) {
            inComment = !line.includes("-->");
            index += 1;
            continue;
        }
        const heading = HEADING.exec(line);
        if (heading) {
            const node = {
                type: "heading",
                level: heading[1].length,
                content: parseInline(heading[2].trim()),
            };
            if (pending) {
                node.marker = pending;
                pending = null;
            }
            blocks.push(node);
            index += 1;
            continue;
        }
        if (RULE.test(line)) {
            blocks.push({ type: "rule" });
            index += 1;
            continue;
        }
        if (QUOTE.test(line)) {
            const inner = [];
            let match = QUOTE.exec(line);
            while (match) {
                inner.push(match[1]);
                index += 1;
                match = index < lines.length ? QUOTE.exec(lines[index]) : null;
            }
            blocks.push({ type: "quote", blocks: parseMarkdown(inner.join("\n"), options) });
            continue;
        }
        if (isTableStart(lines, index)) {
            const head = splitTableRow(lines[index]).map(parseInline);
            const rows = [];
            index += 2; // header + separator
            while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
                rows.push(splitTableRow(lines[index]).map(parseInline));
                index += 1;
            }
            blocks.push({ type: "table", head, rows });
            continue;
        }
        const bullet = BULLET.exec(line);
        const ordered = ORDERED.exec(line);
        if (bullet || ordered) {
            const isOrdered = Boolean(ordered);
            const items = [];
            while (index < lines.length) {
                const current = lines[index];
                const nextBullet = BULLET.exec(current);
                const nextOrdered = ORDERED.exec(current);
                const match = isOrdered ? nextOrdered : nextBullet;
                if (!match) {
                    // A plain continuation line belongs to the item above it, not to a new block.
                    if (current.trim() && items.length && !startsBlock(current) && !isTableStart(lines, index)) {
                        const previous = items[items.length - 1];
                        const last = previous[previous.length - 1];
                        if (last && last.type === "text")
                            last.value += ` ${current.trim()}`;
                        else
                            previous.push({ type: "text", value: ` ${current.trim()}` });
                        index += 1;
                        continue;
                    }
                    break;
                }
                items.push(parseInline(match[3].trim()));
                index += 1;
            }
            blocks.push({ type: "list", ordered: isOrdered, items });
            continue;
        }
        // Paragraph: consume until a blank line or the start of another block.
        const paragraph = [];
        while (index < lines.length &&
            lines[index].trim() &&
            !startsBlock(lines[index]) &&
            !isTableStart(lines, index) &&
            !readMarker(lines[index], config) &&
            !COMMENT_OPEN.test(lines[index])) {
            paragraph.push(lines[index].trim());
            index += 1;
        }
        if (paragraph.length)
            blocks.push({ type: "paragraph", content: parseInline(paragraph.join(" ")) });
        else
            index += 1; // defensive: never loop on an unrecognised line
    }
    return blocks;
}
/** Inline content flattened to plain text — headings are matched as text, not as runs. */
export function inlineText(nodes) {
    let text = "";
    for (const node of nodes) {
        if (node.type === "text" || node.type === "code")
            text += node.value;
        else
            text += inlineText(node.content);
    }
    return text;
}
/** Heading text → anchor: `Supported syntax` → `supported-syntax`. */
export function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}
/** Adds a numeric suffix until the id is free, so `#id` always names one section. */
function uniqueId(id, seen) {
    let candidate = id;
    let count = 1;
    while (seen.has(candidate)) {
        count += 1;
        candidate = `${id}-${count}`;
    }
    seen.add(candidate);
    return candidate;
}
/**
 * Section a parsed document.
 *
 * A section owns the blocks between its heading and the next heading of **any** level, so an
 * H2 keeps its H3s: `Config` renders complete, while `Supported syntax > Cascade` renders one
 * block. The trail is what makes both resolvable without a hand-written index.
 */
export function outline(blocks) {
    const sections = [];
    const open = [];
    const seen = new Set();
    const lead = [];
    let title = null;
    for (const block of blocks) {
        if (block.type !== "heading") {
            (open.length ? open[open.length - 1].blocks : lead).push(block);
            continue;
        }
        const text = inlineText(block.content).trim();
        // The first H1 is the document's name, not a section: it is what `@title` returns.
        if (!title && block.level === 1) {
            title = block;
            continue;
        }
        while (open.length && open[open.length - 1].level >= block.level)
            open.pop();
        const id = uniqueId(block.marker?.id?.trim().toLowerCase() || slugify(text) || "section", seen);
        const section = {
            level: block.level,
            heading: text,
            id,
            role: block.marker?.role ?? null,
            marker: block.marker ?? null,
            trail: [...open.map((entry) => entry.heading), text],
            headingBlock: block,
            blocks: [],
        };
        sections.push(section);
        open.push(section);
    }
    return { title, lead, sections };
}
/**
 * Resolve one path to the blocks behind it.
 *
 *   `@title`       the H1 block
 *   `@lead`        everything before the first section opener
 *   `#anchor`      the section that declared (or slugged to) that id, and its subsections
 *   `role:name`    every section declaring that role, in document order, with its subsections
 *   `A` / `A > B`  a heading trail, compared case-insensitively on text
 *
 * An unresolvable path returns `[]` — a template never guesses, and a caller that needs the
 * section to exist asserts it in a test.
 */
export function selectOutline(doc, path) {
    const wanted = path.trim();
    if (!wanted)
        return [];
    if (wanted === "@title")
        return doc.title ? [{ heading: null, blocks: [doc.title] }] : [];
    if (wanted === "@lead")
        return doc.lead.length ? [{ heading: null, blocks: doc.lead }] : [];
    if (wanted.startsWith("#")) {
        const id = wanted.slice(1).trim().toLowerCase();
        return subtreeOf(doc.sections, doc.sections.filter((section) => section.id === id));
    }
    if (wanted.startsWith("role:")) {
        const role = wanted.slice("role:".length).trim().toLowerCase();
        if (!role)
            return [];
        return subtreeOf(doc.sections, doc.sections.filter((section) => section.role?.toLowerCase() === role));
    }
    const trail = wanted
        .split(">")
        .map((entry) => entry.trim())
        .filter(Boolean);
    if (!trail.length)
        return [];
    return subtreeOf(doc.sections, doc.sections.filter((section) => sameTrail(section.trail, trail)));
}
/**
 * One pick per matched section **and** per section nested under it, in document order.
 *
 * A selection names a section, not the paragraph box that ends at its first H3: `#config` has
 * to render the `### Adapters` blocks under it, or a README would need one pointer per level.
 * A trail keeps its own meaning — `A > B` is a leaf when nothing is nested deeper.
 */
function subtreeOf(sections, matched) {
    if (!matched.length)
        return [];
    const picked = new Set();
    for (const section of matched) {
        picked.add(section);
        const start = sections.indexOf(section);
        for (let i = start + 1; i < sections.length && sections[i].level > section.level; i++) {
            picked.add(sections[i]);
        }
    }
    return sections.filter((section) => picked.has(section)).map(pickOf);
}
/** A section as a renderer consumes it: heading separate, so it can be dropped on its own. */
function pickOf(section) {
    return { heading: section.headingBlock, blocks: section.blocks };
}
/** Trails match on text and length: `Config` must not resolve to `Config > Notes`. */
function sameTrail(trail, wanted) {
    if (trail.length !== wanted.length)
        return false;
    return trail.every((entry, index) => entry.trim().toLowerCase() === wanted[index].toLowerCase());
}
//# sourceMappingURL=Markdown.engine.js.map