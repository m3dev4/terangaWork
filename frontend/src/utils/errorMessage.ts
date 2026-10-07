import axios from "axios";

type BackendErrorValue = string | string[] | BackendErrorResponse;

type BackendErrorResponse = {
  detail?: BackendErrorValue;
  message?: BackendErrorValue;
  error?: BackendErrorValue;
  non_field_errors?: BackendErrorValue;
  [field: string]: BackendErrorValue | undefined;
};

const flattenErrorValue = (value: unknown): string[] => {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(flattenErrorValue);
  }

  if (typeof value === "object" && value !== null) {
    return Object.values(value).flatMap(flattenErrorValue);
  }

  return [];
};

export const getErrorMessage = (
  error: unknown,
  defaultMessage: string
): string => {
  if (axios.isAxiosError(error)) {
    const backendData = error.response?.data as
      BackendErrorResponse | undefined;
    const backendMessages = flattenErrorValue(
      backendData?.detail ??
        backendData?.message ??
        backendData?.error ??
        backendData?.non_field_errors ??
        backendData
    );

    if (backendMessages.length > 0) {
      return backendMessages.join(" ");
    }
  }

  if (error instanceof Error) {
    return error.message || defaultMessage;
  }

  if (typeof error === "object" && error !== null) {
    const err = error as { message?: unknown };
    if (typeof err.message === "string") {
      return err.message;
    }
  }

  return defaultMessage;
};
