import { describe, expect, it } from "vitest";
import {
  AddressValidationError,
  validateKzAddress,
} from "@/server/address/validate";

async function expectError(
  promise: Promise<unknown>,
  code: AddressValidationError["code"],
) {
  const err = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(AddressValidationError);
  expect((err as AddressValidationError).code).toBe(code);
  expect((err as AddressValidationError).status).toBe(400);
}

describe("validateKzAddress", () => {
  it("accepts a normal address and returns it normalized without a pin", async () => {
    const res = await validateKzAddress({
      city: "Алматы",
      address: "  Абая   150  ",
    });
    expect(res).toEqual({ lat: null, lng: null, normalizedAddress: "Абая 150" });
  });

  it("rejects a city that is not in the list", async () => {
    await expectError(
      validateKzAddress({ city: "Москва", address: "Тверская 1" }),
      "INVALID_CITY",
    );
    await expectError(
      validateKzAddress({ city: "", address: "Тверская 1" }),
      "INVALID_CITY",
    );
  });

  it("rejects an address shorter than 5 characters", async () => {
    await expectError(
      validateKzAddress({ city: "Алматы", address: "ул 1" }),
      "ADDRESS_TOO_SHORT",
    );
    await expectError(
      validateKzAddress({ city: "Алматы", address: "    " }),
      "ADDRESS_TOO_SHORT",
    );
  });

  it("requires a house number", async () => {
    await expectError(
      validateKzAddress({ city: "Алматы", address: "проспект Абая" }),
      "HOUSE_REQUIRED",
    );
  });

  it.each([
    "дом 111",
    "мкр Самал-2, дом 111",
    "Сейфуллина 34",
    "Абиша Кекилбайулы 151",
    "ул. Абая, д. 12А",
    "Абая 15/2",
  ])("accepts a house number in %j", async (address) => {
    const res = await validateKzAddress({ city: "Алматы", address });
    expect(res.normalizedAddress).toBe(address);
  });

  describe("map pin", () => {
    const [lat, lng] = [43.24, 76.95]; // Almaty centre

    it("keeps a pin inside the city radius", async () => {
      const res = await validateKzAddress({
        city: "Алматы",
        address: "Абая 150",
        lat,
        lng,
      });
      expect(res.lat).toBe(lat);
      expect(res.lng).toBe(lng);
    });

    it("rejects a pin far from the selected city with INVALID_POINT", async () => {
      await expectError(
        validateKzAddress({
          city: "Алматы",
          address: "Абая 150",
          lat: 51.169,
          lng: 71.449, // Astana
        }),
        "INVALID_POINT",
      );
    });

    it("rejects a pin just outside the 60 km radius", async () => {
      await expectError(
        validateKzAddress({
          city: "Алматы",
          address: "Абая 150",
          lat: lat + 0.7, // ~78 km north
          lng,
        }),
        "INVALID_POINT",
      );
    });

    it("returns null coordinates when no pin was given", async () => {
      for (const extra of [
        {},
        { lat: null, lng: null },
        { lat: undefined, lng: undefined },
        { lat: 43.24 },
        { lng: 76.95 },
        { lat: Number.NaN, lng: 76.95 },
        { lat: 43.24, lng: Number.POSITIVE_INFINITY },
      ]) {
        const res = await validateKzAddress({
          city: "Алматы",
          address: "Абая 150",
          ...extra,
        });
        expect(res.lat).toBeNull();
        expect(res.lng).toBeNull();
      }
    });
  });
});
