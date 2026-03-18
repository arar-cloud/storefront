/**
 * Input sanitization utilities
 */

export function sanitizeInput(input: string): string {
  // Remove control characters and trim
  return input
    .replace(/[\x00-\x1F\x7F]/g, "") // Remove control characters
    .trim()
    .substring(0, 1000); // Limit length
}

export function sanitizeEmail(email: string): string {
  // Normalize and validate email format
  return email
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9@.+_-]/g, ""); // Only allow safe characters
}

export function sanitizeName(name: string): string {
  // Allow only letters, spaces, hyphens, and apostrophes
  return name
    .trim()
    .replace(/[^a-zA-Z\s\-']/g, "")
    .substring(0, 100);
}

export function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char] || char);
}
