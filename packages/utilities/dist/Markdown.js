/**
 * Markdown — a dependency-free subset parser.
 *
 * The repository documents itself in `.md` files (every package README, `docs/framework/*.md`),
 * so a page that shows documentation must be able to read one. This module turns Markdown
 * into a small **AST**, and nothing else: it never touches the DOM, never builds HTML, and
 * never escapes by string concatenation. The renderer (`@aio-ui/markdown`) walks the tree and
 * writes text with `textContent`, which is why a `<script>` in the source is printed, not run.
 *
 * The subset is exactly what this repo writes:
 *
 *   block      heading h1-h6, paragraph, fenced code, unordered/ordered list,
 *              GFM table, blockquote, horizontal rule
 *   inline     `code`, **bold**, *em* / _em_, [link](href)
 *
 * A `mermaid` fence is an ordinary fence here — highlighting is a renderer's business.
 */
const FENCE = /^```(.*)$/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const RULE = /^\s*(-{3,}|\*{3,}|_{3,})\s*$/;
const QUOTE = /^\s*>\s?(.*)$/;
const BULLET = /^(\s*)([-*+])\s+(.*)$/;
const ORDERED = /^(\s*)(\d+)[.)]\s+(.*)$/;
const SEPARATOR = /^\s*\|?[\s:|-]*-[\s:|-]*\|[\s:|-]*$/;
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
 */
export function parseMarkdown(source) {
    const lines = source.replace(/\r\n?/g, "\n").split("\n");
    const blocks = [];
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
        const heading = HEADING.exec(line);
        if (heading) {
            blocks.push({ type: "heading", level: heading[1].length, content: parseInline(heading[2].trim()) });
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
            blocks.push({ type: "quote", blocks: parseMarkdown(inner.join("\n")) });
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
        while (index < lines.length && lines[index].trim() && !startsBlock(lines[index]) && !isTableStart(lines, index)) {
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
//# sourceMappingURL=Markdown.js.map