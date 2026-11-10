export function ensureMetadataIdentity(selector, scopeId = "", childSuffix = "", templateKey) {
    const cleanScope = scopeId || "";
    const cleanLocalKey = `${selector}${childSuffix ? "-" + childSuffix : ""}`;
    // 🟢 HASIL PELEBURAN COMPOSE_GLOBAL_KEY: Penentu mutlak format string koordinat RAM global pusat
    const finalizedGlobalKey = cleanScope ? `${cleanScope}:${cleanLocalKey}` : cleanLocalKey;
    return {
        tree: {
            scope: cleanScope,
            key: cleanLocalKey,
            template: templateKey || cleanLocalKey,
            parent: null,
            children: []
        },
        key: finalizedGlobalKey // Alamat GPS Absolut Terpadu (e.g. "page-admin:input.form-control")
    };
}
export function setMetadata(element, localRecordsPool, _rootPartKey) {
    if (!element || !localRecordsPool)
        return;
    // Kunci salinan array records di dalam closure agar rebasing context tidak menimpa sumber aslinya
    const capturedRecords = localRecordsPool.map((item) => ({
        ...item,
        relations: item?.relations ? { ...item.relations, children: item.relations.children ? [...item.relations.children] : [] } : null
    }));
    element.getMetadata = (context) => {
        if (!context)
            return capturedRecords;
        const scopeId = context.scopeId ?? "";
        const parentKey = context.parentKey ?? null;
        const keyMap = new Map();
        // PUTARAN 1: Petakan koordinat perpindahan alamat menggunakan hukum tunggal ensureMetadataIdentity!
        capturedRecords.forEach((item) => {
            const origin = item.relations || {};
            // Gunakan langsung setter tunggal warisan emas Anda!
            const originGlobalKey = ensureMetadataIdentity(origin.key, origin.scope).key;
            const rebasedGlobalKey = ensureMetadataIdentity(origin.key, scopeId).key;
            keyMap.set(originGlobalKey, rebasedGlobalKey);
        });
        // PUTARAN 2: Jalankan eksekusi rebasing silsilah graf secara total, horizontal, anti salah alamat!
        capturedRecords.forEach((item) => {
            const origin = item.relations || {};
            const originGlobalKey = ensureMetadataIdentity(origin.key, origin.scope).key;
            const rebasedGlobalKey = keyMap.get(originGlobalKey) || ensureMetadataIdentity(origin.key, scopeId).key;
            if (!item.relations)
                item.relations = {};
            item.relations.scope = scopeId;
            item.relations.template = origin.template || origin.key;
            const isRootCandidate = origin.parent === null || origin.parent === undefined || origin.parent === "";
            if (isRootCandidate) {
                item.relations.parent = parentKey;
            }
            else if (origin.parent) {
                item.relations.parent = keyMap.get(origin.parent) || origin.parent;
            }
            const originChildren = Array.isArray(origin.children) ? origin.children : [];
            item.relations.children = originChildren.map((childKey) => keyMap.get(childKey) || childKey);
            // Simpan key ter-rebase absolut agar terbaca akurat satu pintu di level sasis terluar DOMTreeMemory
            item.relations.key = rebasedGlobalKey;
        });
        return capturedRecords;
    };
}
/**
 * @internal Generates a stable hash seed from content + config for namespace derivation.
 * Extracted from former buildNamespaceSeed() for internal use by ensureIdentity().
 */
export function buildNamespace(content, config) {
    const stableHash = (input) => {
        let hash = 5381;
        for (let i = 0; i < input.length; i++) {
            hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
        }
        return (hash >>> 0).toString(36);
    };
    const summarize = (value, depth = 0) => {
        if (value === null || value === undefined)
            return "";
        if (typeof value === "string")
            return value.trim();
        if (typeof value === "number" || typeof value === "boolean")
            return String(value);
        if (value instanceof HTMLElement) {
            const tag = value.tagName ? value.tagName.toLowerCase() : "element";
            const id = value.id ? `#${value.id}` : "";
            const cls = value.className && typeof value.className === "string"
                ? `.${value.className.trim().split(/\s+/).filter(Boolean).join(".")}`
                : "";
            return `${tag}${id}${cls}`;
        }
        if (Array.isArray(value)) {
            const firstItems = value.slice(0, 3).map((item) => summarize(item, depth + 1)).filter(Boolean);
            return `len${value.length}[${firstItems.join("|")}]`;
        }
        if (typeof value === "object") {
            const keys = Object.keys(value).filter((key) => {
                const current = value[key];
                return typeof current !== "function" && typeof current !== "undefined";
            }).sort();
            const preferredKeys = ["namespace", "id", "name", "title", "slug", "formId", "builder", "key", "category"];
            const picked = [];
            for (const key of preferredKeys) {
                if (key in value) {
                    const current = value[key];
                    if (current instanceof HTMLElement) {
                        picked.push(`${key}=${summarize(current, depth + 1)}`);
                    }
                    else if (Array.isArray(current)) {
                        picked.push(`${key}=${summarize(current, depth + 1)}`);
                    }
                    else if (current && typeof current === "object") {
                        picked.push(`${key}=${summarize(current, depth + 1)}`);
                    }
                    else if (typeof current !== "function" && typeof current !== "undefined") {
                        picked.push(`${key}=${String(current)}`);
                    }
                }
            }
            if (picked.length > 0)
                return picked.join(";");
            const minimalShape = keys.slice(0, 5).map((key) => {
                const current = value[key];
                if (current instanceof HTMLElement)
                    return `${key}:${summarize(current, depth + 1)}`;
                if (Array.isArray(current))
                    return `${key}:len${current.length}`;
                if (current && typeof current === "object")
                    return `${key}:{${Object.keys(current).slice(0, 3).join(",")}}`;
                return `${key}:${String(current)}`;
            });
            return `keys${keys.length}[${minimalShape.join("|")}]`;
        }
        return "";
    };
    const configSeed = config?.namespace ||
        config?.id ||
        config?.formId ||
        config?.name ||
        config?.title ||
        config?.slug ||
        config?.key ||
        "";
    const contentSeed = (content && typeof content === "object" ? content.id : "") ||
        (content && typeof content === "object" ? content.name : "") ||
        (content && typeof content === "object" ? content.title : "") ||
        (content && typeof content === "object" ? content.formId : "") ||
        (content && typeof content === "object" ? content.uid : "") ||
        (content && typeof content === "object" ? content.slug : "") ||
        summarize(content);
    const rawSeed = [String(configSeed || "").trim(), String(contentSeed || "").trim()].filter(Boolean).join("::");
    return rawSeed ? stableHash(rawSeed) : "anonymous";
}
//# sourceMappingURL=Metadata.js.map