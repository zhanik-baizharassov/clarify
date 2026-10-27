import {
  assertKzCity,
  isPointNearCity,
} from "@/shared/kz/kz";

export type AddressCheckResult = {
  /** Pin set by the owner on the map; null when none was given. */
  lat: number | null;
  lng: number | null;
  normalizedAddress: string;
};

export type AddressValidationErrorCode =
  | "INVALID_CITY"
  | "ADDRESS_TOO_SHORT"
  | "HOUSE_REQUIRED"
  | "INVALID_POINT";

export class AddressValidationError extends Error {
  code: AddressValidationErrorCode;
  status: number;

  constructor(
    code: AddressValidationErrorCode,
    message: string,
    status: number,
  ) {
    super(message);
    this.name = "AddressValidationError";
    this.code = code;
    this.status = status;
  }
}

function norm(s: string) {
  return String(s ?? "").trim().replace(/\s+/g, " ");
}

function normalizeHouseToken(value: string) {
  return norm(value)
    .replace(/\s+/g, "")
    .replace(/ё/gi, "е")
    .toUpperCase();
}

// Сначала ищем явное "дом 111" / "д. 111".
// Если нет — берём ПОСЛЕДНИЙ числовой блок, а не первый.
// Это важно для адресов вроде "мкр Самал-2, дом 111".
function extractDesiredHouse(address: string) {
  const a = norm(address);

  const explicit =
    a.match(
      /(?:^|[\s,;])(?:дом|д\.?)\s*([0-9]{1,5}[A-Za-zА-Яа-яЁё]?(?:[/-][0-9]{1,4})?)/iu,
    ) ?? null;

  if (explicit?.[1]) {
    return normalizeHouseToken(explicit[1]);
  }

  const all = Array.from(
    a.matchAll(/\b([0-9]{1,5}[A-Za-zА-Яа-яЁё]?(?:[/-][0-9]{1,4})?)\b/gu),
  );

  if (!all.length) return null;

  return normalizeHouseToken(all[all.length - 1][1]);
}

/**
 * Checks the address text (city from the list, a street and a house number)
 * and, when the owner pinned the place on the map, that the pin is near the
 * selected city. No external geocoder is involved: free OSM geocoders resolve
 * Russian-language Kazakhstan addresses unreliably, and a wrong pin is worse
 * than no pin.
 */
export async function validateKzAddress(params: {
  city: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
}): Promise<AddressCheckResult> {
  const address = norm(params.address);

  let city;
  try {
    city = assertKzCity(norm(params.city), "Город");
  } catch (err) {
    throw new AddressValidationError(
      "INVALID_CITY",
      err instanceof Error ? err.message : "Город указан некорректно",
      400,
    );
  }

  if (address.length < 5) {
    throw new AddressValidationError(
      "ADDRESS_TOO_SHORT",
      "Адрес: минимум 5 символов",
      400,
    );
  }

  if (!extractDesiredHouse(address)) {
    throw new AddressValidationError(
      "HOUSE_REQUIRED",
      "Адрес: укажите номер дома (например «Сейфуллина 34» или «Абиша Кекилбайулы 151»).",
      400,
    );
  }

  const hasPoint =
    typeof params.lat === "number" &&
    typeof params.lng === "number" &&
    Number.isFinite(params.lat) &&
    Number.isFinite(params.lng);

  if (!hasPoint) {
    return { lat: null, lng: null, normalizedAddress: address };
  }

  if (!isPointNearCity(city, params.lat as number, params.lng as number)) {
    throw new AddressValidationError(
      "INVALID_POINT",
      "Точка на карте далеко от выбранного города. Поставьте точку в пределах города или сбросьте её.",
      400,
    );
  }

  return {
    lat: params.lat as number,
    lng: params.lng as number,
    normalizedAddress: address,
  };
}
