/** Tipos de tls-cert.mjs (usado pelo runner no host e pelo dublê do provedor). */
export function generateStubTls(dnsNames: string[], days?: number): { caCert: string; cert: string; key: string };
