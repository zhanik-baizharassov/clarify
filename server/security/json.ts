import { z } from "zod";

const MAX_BODY_CHARS = 100_000;

function badBody(message: string) {
  return new z.ZodError([{ code: "custom", path: [], message, input: undefined }]);
}

/**
 * Читает JSON-тело запроса. Пустое/битое тело или слишком большой запрос
 * приводит к ZodError с понятным сообщением, поэтому существующие catch-блоки
 * роутов отвечают 400 вместо 500.
 */
export async function readJsonBody(req: Request): Promise<unknown> {
  let text: string;
  try {
    text = await req.text();
  } catch {
    throw badBody("Некорректный JSON");
  }

  if (text.length > MAX_BODY_CHARS) {
    throw badBody("Слишком большой запрос");
  }

  try {
    return JSON.parse(text);
  } catch {
    throw badBody("Некорректный JSON");
  }
}
