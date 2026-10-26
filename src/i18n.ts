// Self-contained strings so the library is complete on its own. The locale comes from the
// browser's preferred languages (base language, first match), English as the fallback.

export type Dict = Record<string, string>;

const en: Dict = {
  details: "Details",
  voided: "This pass has been voided.",
  expired: "This pass has expired.",
  unverified: "Signature not checked.",
  barcodeFailed: "The barcode could not be drawn.",
  cannotOpen: "This file could not be displayed as a pass.",
  passN: "Pass {n} of {total}",
  barcode: "Barcode",
};

const fr: Dict = {
  details: "Détails",
  voided: "Ce pass a été annulé.",
  expired: "Ce pass a expiré.",
  unverified: "Signature non vérifiée.",
  barcodeFailed: "Le code-barres n'a pas pu être dessiné.",
  cannotOpen: "Ce fichier n'a pas pu être affiché comme un pass.",
  passN: "Pass {n} sur {total}",
  barcode: "Code-barres",
};

const de: Dict = {
  details: "Details",
  voided: "Dieser Pass wurde entwertet.",
  expired: "Dieser Pass ist abgelaufen.",
  unverified: "Signatur nicht geprüft.",
  barcodeFailed: "Der Barcode konnte nicht gezeichnet werden.",
  cannotOpen: "Diese Datei konnte nicht als Pass angezeigt werden.",
  passN: "Pass {n} von {total}",
  barcode: "Barcode",
};

const es: Dict = {
  details: "Detalles",
  voided: "Este pase ha sido anulado.",
  expired: "Este pase ha caducado.",
  unverified: "Firma no comprobada.",
  barcodeFailed: "No se pudo dibujar el código de barras.",
  cannotOpen: "Este archivo no se pudo mostrar como un pase.",
  passN: "Pase {n} de {total}",
  barcode: "Código de barras",
};

const pt: Dict = {
  details: "Detalhes",
  voided: "Este passe foi anulado.",
  expired: "Este passe expirou.",
  unverified: "Assinatura não verificada.",
  barcodeFailed: "Não foi possível desenhar o código de barras.",
  cannotOpen: "Este ficheiro não pôde ser apresentado como um passe.",
  passN: "Passe {n} de {total}",
  barcode: "Código de barras",
};

const ru: Dict = {
  details: "Подробности",
  voided: "Этот пропуск аннулирован.",
  expired: "Срок действия пропуска истёк.",
  unverified: "Подпись не проверена.",
  barcodeFailed: "Не удалось нарисовать штрихкод.",
  cannotOpen: "Не удалось показать этот файл как пропуск.",
  passN: "Пропуск {n} из {total}",
  barcode: "Штрихкод",
};

const zh: Dict = {
  details: "详情",
  voided: "此票券已作废。",
  expired: "此票券已过期。",
  unverified: "未验证签名。",
  barcodeFailed: "无法绘制条码。",
  cannotOpen: "无法将此文件显示为票券。",
  passN: "第 {n} 张，共 {total} 张",
  barcode: "条码",
};

const LOCALES: Record<string, Dict> = { en, fr, de, es, pt, ru, zh };

let forced: string | null = null;

export function setLocale(code: string | null): void {
  forced = code;
}

export function preferredLanguages(): string[] {
  if (forced) return [forced];
  if (typeof navigator === "undefined") return ["en"];
  const list = navigator.languages?.length ? [...navigator.languages] : [navigator.language || "en"];
  return list;
}

function baseLocale(): string {
  for (const l of preferredLanguages()) {
    const base = l.toLowerCase().split("-")[0]!;
    if (LOCALES[base]) return base;
  }
  return "en";
}

export function translator(overrides?: Dict): (key: string, vars?: Record<string, string | number>) => string {
  const dict = { ...en, ...LOCALES[baseLocale()], ...overrides };
  return (key, vars) => {
    let s = dict[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
    return s;
  };
}
