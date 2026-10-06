export function validatePasswordChange(current: string, password: string, confirm: string): string | null {
  if (!current) return "Enter your current password.";
  if (password.length < 12) return "Use at least 12 characters for your new password.";
  if (password.length > 128) return "Use no more than 128 characters for your new password.";
  if (password !== confirm) return "The new passwords don't match.";
  if (password === current) return "Choose a different password from your current one.";
  return null;
}
