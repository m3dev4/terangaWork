export const validateOrThrow = <T>(result: {
  success: boolean;
  data?: T;
  error?: { issues: unknown[] };
}): T => {
  if (!result.success) {
    throw new Error("Les données du formulaire sont invalides.");
  }

  return result.data as T;
};
