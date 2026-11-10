/**
 * Split one flat navigation list into three sections.
 *
 * The source data is linear (a header row plus links plus a CTA), so the split is a
 * convention rather than a structure:
 *
 * - the **first** entry is the brand,
 * - an entry whose `className` is `button`, or whose `href` is a `tel:` link, is an action,
 * - everything else is a navigation link.
 *
 * Exported and pure so the rule is testable without a DOM.
 */
export function splitMenuContent(content) {
    const navigations = Array.isArray(content?.navigations)
        ? content.navigations
        : content?.navigations
            ? [content.navigations]
            : [];
    const brand = navigations[0] ?? { label: "Brand", href: "#home" };
    const rest = navigations.slice(1);
    const isAction = (link) => link?.className === "button" || Boolean(link?.href?.includes("tel:"));
    const actions = Array.isArray(content?.actions)
        ? [...content.actions]
        : content?.actions
            ? [content.actions]
            : [];
    const cta = rest.find(isAction);
    // The CTA may already be listed under `actions`; adding it twice was the old behaviour.
    if (cta && !actions.includes(cta))
        actions.push(cta);
    return { brand, navigations: rest.filter((link) => !isAction(link)), actions };
}
//# sourceMappingURL=Menu.engine.js.map