// Ported from: lib/utils/validators.dart

export function validateEmail(value: string | null | undefined): string {
  const regex =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

  if (!value || value.trim() === '') {
    return 'Your username is required';
  }
  if (!regex.test(value)) {
    return 'Please provide a valid email address';
  }
  return 'Success';
}

export function validatePassword(value: string | null | undefined): string {
  if (!value || value.trim() === '') {
    return 'Password is required';
  }
  if (value.length < 8) {
    return 'Password must be at least 8 characters';
  }
  return 'Success';
}

export function validateRequired(value: string | null | undefined, fieldName: string): string {
  if (!value || value.trim() === '') {
    return `${fieldName} is required`;
  }
  return 'Success';
}
