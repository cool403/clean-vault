// This function is serialized by Chrome into the isolated world of frame 0.
// It is self-contained and returns status only, never credentials or page data.
export function fillLogin(expectedOrigin, username, password) {
  if (location.origin !== expectedOrigin || location.protocol !== 'https:' || window.top !== window)
    return 'origin';
  const visible = (input) => {
    const style = getComputedStyle(input),
      rect = input.getBoundingClientRect();
    return (
      !input.disabled &&
      !input.readOnly &&
      style.display !== 'none' &&
      style.visibility === 'visible' &&
      Number(style.opacity) > 0 &&
      rect.width > 0 &&
      rect.height > 0 &&
      !input.closest('[inert]')
    );
  };
  const passwords = [...document.querySelectorAll('input[type="password"]')].filter(visible);
  // Ambiguous registration/change-password forms require manual entry.
  if (
    passwords.length !== 1 ||
    ['new-password', 'one-time-code'].includes(passwords[0].autocomplete)
  )
    return 'ambiguous';
  const field = passwords[0],
    scope = field.form || document;
  const users = [...scope.querySelectorAll('input')].filter(
    (input) =>
      ['text', 'email'].includes(input.type) &&
      visible(input) &&
      !['one-time-code', 'new-password'].includes(input.autocomplete) &&
      input.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING,
  );
  const user = users.find((input) => input.autocomplete === 'username') || users.at(-1);
  const set = (input, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };
  if (user && username) set(user, username);
  if (location.origin !== expectedOrigin || !field.isConnected) return 'origin';
  set(field, password);
  return 'filled';
}
