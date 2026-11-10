/**
 * Stable ids for Form sub-modules.
 *
 * Kept in a leaf file so module definitions can import an id without importing
 * the runtime composition module, which would create a circular import.
 */
export const FORM_MODULE_IDS = {
    validation: "validation",
    cascade: "cascade",
    multistep: "multistep",
    calculation: "calculation",
    input: "input",
    idAddress: "idAddress",
    table: "table",
    message: "message",
};
//# sourceMappingURL=FormModuleTypes.js.map