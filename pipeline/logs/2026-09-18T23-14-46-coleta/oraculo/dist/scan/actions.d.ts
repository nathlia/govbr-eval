/**
 * Ações de estado aceitas pelas ferramentas que reabrem a página. Um único esquema para `scan_page`
 * e `verify_finding`: um estado reproduzido para varrer tem de ser reproduzível para verificar.
 */
import { z } from "zod";
export declare const PageActionSchema: z.ZodDiscriminatedUnion<"action", [z.ZodObject<{
    action: z.ZodLiteral<"click">;
    selector: z.ZodString;
}, "strip", z.ZodTypeAny, {
    selector: string;
    action: "click";
}, {
    selector: string;
    action: "click";
}>, z.ZodObject<{
    action: z.ZodLiteral<"fill">;
    selector: z.ZodString;
    value: z.ZodString;
}, "strip", z.ZodTypeAny, {
    value: string;
    selector: string;
    action: "fill";
}, {
    value: string;
    selector: string;
    action: "fill";
}>, z.ZodObject<{
    action: z.ZodLiteral<"press">;
    key: z.ZodString;
    selector: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    key: string;
    action: "press";
    selector?: string | undefined;
}, {
    key: string;
    action: "press";
    selector?: string | undefined;
}>, z.ZodObject<{
    action: z.ZodLiteral<"wait">;
    selector: z.ZodOptional<z.ZodString>;
    ms: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    action: "wait";
    ms?: number | undefined;
    selector?: string | undefined;
}, {
    action: "wait";
    ms?: number | undefined;
    selector?: string | undefined;
}>]>;
export declare const PageActionsSchema: z.ZodArray<z.ZodDiscriminatedUnion<"action", [z.ZodObject<{
    action: z.ZodLiteral<"click">;
    selector: z.ZodString;
}, "strip", z.ZodTypeAny, {
    selector: string;
    action: "click";
}, {
    selector: string;
    action: "click";
}>, z.ZodObject<{
    action: z.ZodLiteral<"fill">;
    selector: z.ZodString;
    value: z.ZodString;
}, "strip", z.ZodTypeAny, {
    value: string;
    selector: string;
    action: "fill";
}, {
    value: string;
    selector: string;
    action: "fill";
}>, z.ZodObject<{
    action: z.ZodLiteral<"press">;
    key: z.ZodString;
    selector: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    key: string;
    action: "press";
    selector?: string | undefined;
}, {
    key: string;
    action: "press";
    selector?: string | undefined;
}>, z.ZodObject<{
    action: z.ZodLiteral<"wait">;
    selector: z.ZodOptional<z.ZodString>;
    ms: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    action: "wait";
    ms?: number | undefined;
    selector?: string | undefined;
}, {
    action: "wait";
    ms?: number | undefined;
    selector?: string | undefined;
}>]>, "many">;
