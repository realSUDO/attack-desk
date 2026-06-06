export function getOptionalFormString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export function getNullableFormString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function getOptionalFormNumber(formData: FormData, key: string) {
  const value = getOptionalFormString(formData, key);

  if (value === undefined) {
    return undefined;
  }

  return Number(value);
}

export function getOptionalFormJson(formData: FormData, key: string) {
  const value = getOptionalFormString(formData, key);

  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(value) as unknown;
}
