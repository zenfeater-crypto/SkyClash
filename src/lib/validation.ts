/**
 * Skyblock Value Calculator Username & Profile Validation Utilities
 */

/**
 * Validates a username according to strict rules:
 * 1. Must contain lowercase English letters and numbers only (a-z, 0-9)
 * 2. Uppercase letters are NOT allowed
 * 3. Spaces are NOT allowed
 * 4. Emojis are NOT allowed
 * 5. Special characters are NOT allowed
 * 6. Must start with a lowercase English letter (a-z)
 * 7. Length must be between 3 and 20 characters
 * 
 * Returns null if valid, or a descriptive error message if invalid.
 */
export function validateUsername(username: string): string | null {
  if (!username) {
    return 'Username cannot be empty.';
  }

  // Check length
  if (username.length < 3 || username.length > 20) {
    return 'Username must be between 3 and 20 characters.';
  }

  // Check for uppercase letters specifically
  if (/[A-Z]/.test(username)) {
    return 'Username must use lowercase letters and numbers only. Uppercase letters are not allowed.';
  }

  // Check for spaces
  if (/\s/.test(username)) {
    return 'Username cannot contain spaces.';
  }

  // Check starting character (must start with lowercase letter a-z)
  if (!/^[a-z]/.test(username)) {
    return 'Username must start with a lowercase English letter (a-z).';
  }

  // Check for emojis or special characters
  if (!/^[a-z0-9]+$/.test(username)) {
    return 'Username must contain only lowercase letters and numbers (a-z, 0-9). Emojis and special characters are not allowed.';
  }

  return null;
}

/**
 * Counts words in a string. Handles whitespace, newlines, and emojis cleanly.
 */
export function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Validates a user Bio:
 * Maximum 100 words (not merely characters).
 * Allows normal text, capital/lowercase letters, spaces, emojis.
 */
export function validateBio(bio: string): string | null {
  const words = countWords(bio);
  if (words > 100) {
    return 'Bio must be 100 words or less.';
  }
  return null;
}

/**
 * Strips deceptive role brackets from display names (e.g. "[ADMIN]", "[OFFICER]", "[TRUSTED]")
 * so that users cannot visually impersonate official staff titles in their display name.
 */
export function stripSpoofedRoleTags(name?: string): string {
  if (!name) return '';
  return name.replace(/\[\s*(ADMIN|OFFICER|TRUSTED|STAFF|MOD|OWNER)\s*\]/gi, '').trim();
}


/**
 * Converts image file to compressed base64 data URL (< 800px max dimension, JPEG/PNG).
 * Ensures safe, zero-cost, persistent profile photo storage without requiring
 * external paid cloud buckets.
 */
export function processProfileImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      return reject(new Error('Please select a valid image file (JPEG, PNG, WebP, GIF).'));
    }

    // Limit source file size to 10MB
    if (file.size > 10 * 1024 * 1024) {
      return reject(new Error('Image file is too large. Please select a photo under 10MB.'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to process image.'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 400; // 400x400 max is optimal for avatars (< 150KB base64)
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(reader.result as string);
        }
        ctx.drawImage(img, 0, 0, width, height);
        // Export compressed WebP/JPEG
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Deeply sanitizes any object or document payload destined for Firestore by
 * removing all keys whose values are `undefined`.
 * Firestore strictly forbids `undefined` field values in setDoc, updateDoc,
 * Transaction.set, and Transaction.update.
 * 
 * Preserves primitives, non-empty objects, arrays, Date, and Firestore FieldValues
 * (like serverTimestamp() and deleteField()).
 */
export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Preserve arrays but strip any undefined items
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => (item !== null && typeof item === 'object' ? sanitizeForFirestore(item) : item)) as unknown as T;
  }

  // If not a plain Javascript object (e.g. FieldValue, Date, RegExp), preserve as is
  const proto = Object.getPrototypeOf(obj);
  if (proto !== Object.prototype && proto !== null) {
    return obj;
  }

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue; // completely omit undefined fields
    }
    if (value !== null && typeof value === 'object') {
      result[key] = sanitizeForFirestore(value);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

/**
 * Normalizes a world chat message for duplicate anti-spam detection:
 * - Trims leading and trailing spaces
 * - Collapses repeated internal whitespace to a single space
 * - Lowercases for case-insensitive duplicate comparison
 */
export function normalizeWorldMessage(text: string): string {
  if (!text) return '';
  return text.trim().replace(/\s+/g, ' ').toLowerCase();
}

