export interface ToolTelemetryEvent {
    runId: string;
    tool: string;
    startedAt: string;
    durationMs: number;
    status: "ok" | "error";
    requestBytes: number;
    responseBytes: number;
    inputRecords?: number;
    outputRecords?: number;
    detail?: string;
    truncated?: boolean;
    cacheHit?: boolean;
    cacheMissReason?: string;
    stateFingerprint?: string;
    error?: string;
}
export interface ToolTelemetryOptions {
    runId?: string;
    file?: string;
    onEvent?: (event: ToolTelemetryEvent) => void;
}
export declare class ToolTelemetry {
    private readonly runId;
    private readonly file?;
    private readonly onEvent?;
    constructor(options?: ToolTelemetryOptions);
    measure<TArgs, TResult>(tool: string, args: TArgs, invoke: () => Promise<TResult>): Promise<TResult>;
    private emit;
}
export declare function instrumentTool<TArgs, TResult>(telemetry: ToolTelemetry, name: string, handler: (args: TArgs) => Promise<TResult>): (args: TArgs) => Promise<TResult>;
