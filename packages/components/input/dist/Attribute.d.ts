import { type InputType, type iBasicInputNode } from "./Input";
export interface iAttributeProperty {
    name: string;
    type: InputType;
    label?: string;
    value: string | number | boolean;
    config?: {
        style?: string;
        options?: any;
        position?: "left" | "right";
    };
}
export type InputAttributeType = "value" | "label" | "name" | "placeholder" | "required" | "disabled" | "min" | "max" | "minlength" | "maxlength" | "step" | "rows" | "cols" | "accept" | "multiple" | "checked" | "orient" | "pattern" | "form" | "range" | "data-max-upload" | "data-max-file-size" | "data-group-unallowed" | "data-thumbnail" | "data-view" | "view" | "thumbnail";
export declare class InputAttributeBuilder {
    static inputs: Record<InputType, Partial<Record<InputAttributeType, string | number | boolean>>>;
    static attributes: Partial<Record<InputAttributeType, iAttributeProperty>>;
    static resolveMinMaxType(inputType: InputType, key: InputAttributeType): "number" | "date" | "time" | "datetime-local" | null;
    static buildSchemaForType(inputType: InputType, header?: iBasicInputNode): Record<string, any>;
    /**
     * Checks a field schema against the registry matrix for its type.
     *
     * One source of truth: the same rows `InputBuilder` renders with decide what may be
     * accepted, so the editor and the renderer can never disagree. The previous version
     * kept its own copy of the matrix and returned `true` as soon as *any* key was
     * allowed — one bad key next to one good key passed silently.
     *
     * @param type - Field type the schema claims.
     * @param schema - Field schema (`{ type, id, title, placeholder, config, … }`).
     * @param customAllowed - Extra keys this project allows beyond the matrix.
     * @returns Accepted/rejected/structural keys; `ok` is true when nothing was rejected.
     */
    static scan(type: InputType, schema: Record<string, any>, customAllowed?: string[]): {
        type: InputType;
        accepted: string[];
        rejected: string[];
        structural: string[];
        ok: boolean;
    };
    /**
     * Boolean form of {@link scan}, kept for callers that only need a pass/fail.
     *
     * @param type - Field type.
     * @param config - Field schema.
     * @param customAllowed - Extra keys this project allows.
     * @returns `true` when every non-structural key is valid for the type.
     */
    static scanUnallowedAttrs(type: InputType, config: Record<string, any>, customAllowed?: string[]): boolean;
    static create(headers: Array<iBasicInputNode>): Record<string, any>[];
}
//# sourceMappingURL=Attribute.d.ts.map