import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
function byteLength(value) {
    if (value === undefined)
        return 0;
    return Buffer.byteLength(typeof value === "string" ? value : JSON.stringify(value), "utf8");
}
function textPayload(result) {
    if (!result || typeof result !== "object")
        return "";
    const content = result.content;
    if (!Array.isArray(content))
        return "";
    return content
        .filter((item) => item?.type === "text" && typeof item.text === "string")
        .map((item) => item.text)
        .join("\n");
}
function recordCount(value) {
    if (!value || typeof value !== "object")
        return undefined;
    const obj = value;
    for (const key of ["findings", "rules", "components", "items", "elements"]) {
        if (Array.isArray(obj[key]))
            return obj[key].length;
    }
    for (const key of ["count", "elementsInspected", "total"]) {
        if (typeof obj[key] === "number")
            return obj[key];
    }
    return undefined;
}
function inputRecordCount(args) {
    if (!args || typeof args !== "object")
        return undefined;
    const obj = args;
    for (const key of ["ids", "selectors", "rules", "findings", "checks"]) {
        if (Array.isArray(obj[key]))
            return obj[key].length;
    }
    return undefined;
}
function compactError(error) {
    const message = error instanceof Error ? error.message : String(error);
    return message.replace(/\s+/g, " ").slice(0, 300);
}
export class ToolTelemetry {
    runId;
    file;
    onEvent;
    constructor(options = {}) {
        this.runId = options.runId ?? process.env.GOVBR_VALIDATOR_RUN_ID ?? "unscoped";
        this.file = options.file ?? process.env.GOVBR_VALIDATOR_TELEMETRY_FILE;
        this.onEvent = options.onEvent;
        if (this.file)
            mkdirSync(dirname(this.file), { recursive: true });
    }
    async measure(tool, args, invoke) {
        const startedAt = new Date();
        const base = {
            runId: this.runId,
            tool,
            startedAt: startedAt.toISOString(),
            requestBytes: byteLength(args),
            inputRecords: inputRecordCount(args),
            detail: args && typeof args === "object" && typeof args.detail === "string"
                ? String(args.detail)
                : undefined,
        };
        try {
            const result = await invoke();
            const text = textPayload(result);
            let parsed;
            try {
                parsed = text ? JSON.parse(text) : undefined;
            }
            catch {
                parsed = undefined;
            }
            this.emit({
                ...base,
                durationMs: Date.now() - startedAt.getTime(),
                status: "ok",
                responseBytes: byteLength(text),
                outputRecords: recordCount(parsed),
                truncated: parsed && typeof parsed === "object" && typeof parsed.truncated === "boolean"
                    ? Boolean(parsed.truncated)
                    : undefined,
                cacheHit: parsed && typeof parsed === "object" && typeof parsed.cacheHit === "boolean"
                    ? Boolean(parsed.cacheHit)
                    : undefined,
                cacheMissReason: parsed && typeof parsed === "object" && typeof parsed.cacheMissReason === "string"
                    ? String(parsed.cacheMissReason)
                    : undefined,
                stateFingerprint: parsed && typeof parsed === "object" && typeof parsed.stateFingerprint === "string"
                    ? String(parsed.stateFingerprint)
                    : undefined,
            });
            return result;
        }
        catch (error) {
            this.emit({
                ...base,
                durationMs: Date.now() - startedAt.getTime(),
                status: "error",
                responseBytes: 0,
                error: compactError(error),
            });
            throw error;
        }
    }
    emit(event) {
        this.onEvent?.(event);
        if (this.file)
            appendFileSync(this.file, `${JSON.stringify(event)}\n`, "utf8");
    }
}
export function instrumentTool(telemetry, name, handler) {
    return (args) => telemetry.measure(name, args, () => handler(args));
}
//# sourceMappingURL=telemetry.js.map