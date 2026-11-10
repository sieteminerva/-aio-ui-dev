/**
 * Input module contract — ids and types only.
 *
 * Kept in a leaf file on purpose: a module definition needs its own id, and importing
 * that id from `InputRegistry.ts` (which imports the definitions) would close a cycle and
 * leave `INPUT_MODULE_IDS` undefined while the definitions are being built. The Form family
 * solves the same problem the same way (`FormModuleTypes.ts`).
 */
/** Stable ids for input sub-modules. */
export const INPUT_MODULE_IDS = {
    dropdown: "dropdown",
    file: "file",
    controls: "controls",
    popover: "popover",
};
//# sourceMappingURL=InputModuleTypes.js.map