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
  from: "From",
  to: "To",
  passenger: "Passenger",
  cabin: "Class",
  flight: "Flight",
  date: "Date",
  seat: "Seat",
  recordLocator: "Booking reference",
  sequence: "Sequence",
  status: "Status",
  patient: "Name",
  birthDate: "Date of birth",
  issuer: "Issuer",
  healthCard: "Health card",
  vaccine: "Vaccine",
  lot: "Lot",
  issued: "Issued",
  result: "Result",
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
  from: "De",
  to: "Vers",
  passenger: "Passager",
  cabin: "Classe",
  flight: "Vol",
  date: "Date",
  seat: "Siège",
  recordLocator: "Référence de réservation",
  sequence: "Numéro d'ordre",
  status: "Statut",
  patient: "Nom",
  birthDate: "Date de naissance",
  issuer: "Émetteur",
  healthCard: "Carnet de santé",
  vaccine: "Vaccin",
  lot: "Lot",
  issued: "Émis le",
  result: "Résultat",
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
  from: "Von",
  to: "Nach",
  passenger: "Passagier",
  cabin: "Klasse",
  flight: "Flug",
  date: "Datum",
  seat: "Sitz",
  recordLocator: "Buchungscode",
  sequence: "Folgenummer",
  status: "Status",
  patient: "Name",
  birthDate: "Geburtsdatum",
  issuer: "Aussteller",
  healthCard: "Gesundheitsnachweis",
  vaccine: "Impfstoff",
  lot: "Charge",
  issued: "Ausgestellt",
  result: "Ergebnis",
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
  from: "De",
  to: "A",
  passenger: "Pasajero",
  cabin: "Clase",
  flight: "Vuelo",
  date: "Fecha",
  seat: "Asiento",
  recordLocator: "Código de reserva",
  sequence: "Secuencia",
  status: "Estado",
  patient: "Nombre",
  birthDate: "Fecha de nacimiento",
  issuer: "Emisor",
  healthCard: "Tarjeta de salud",
  vaccine: "Vacuna",
  lot: "Lote",
  issued: "Emitido",
  result: "Resultado",
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
  from: "De",
  to: "Para",
  passenger: "Passageiro",
  cabin: "Classe",
  flight: "Voo",
  date: "Data",
  seat: "Lugar",
  recordLocator: "Referência da reserva",
  sequence: "Sequência",
  status: "Estado",
  patient: "Nome",
  birthDate: "Data de nascimento",
  issuer: "Emissor",
  healthCard: "Cartão de saúde",
  vaccine: "Vacina",
  lot: "Lote",
  issued: "Emitido",
  result: "Resultado",
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
  from: "Откуда",
  to: "Куда",
  passenger: "Пассажир",
  cabin: "Класс",
  flight: "Рейс",
  date: "Дата",
  seat: "Место",
  recordLocator: "Код бронирования",
  sequence: "Порядковый номер",
  status: "Статус",
  patient: "Имя",
  birthDate: "Дата рождения",
  issuer: "Кем выдан",
  healthCard: "Медицинская карта",
  vaccine: "Вакцина",
  lot: "Серия",
  issued: "Выдан",
  result: "Результат",
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
  from: "出发",
  to: "到达",
  passenger: "乘客",
  cabin: "舱位",
  flight: "航班",
  date: "日期",
  seat: "座位",
  recordLocator: "预订编号",
  sequence: "序号",
  status: "状态",
  patient: "姓名",
  birthDate: "出生日期",
  issuer: "签发方",
  healthCard: "健康卡",
  vaccine: "疫苗",
  lot: "批号",
  issued: "签发日期",
  result: "结果",
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
