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
  const set = (input, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };
  if (!passwords.length) {
    const users = [...document.querySelectorAll('input')].filter(
      (input) =>
        ['text', 'email'].includes(input.type) &&
        visible(input) &&
        (input.autocomplete === 'username' ||
          input.autocomplete === 'email' ||
          input.type === 'email'),
    );
    if (users.length !== 1 || !username) return 'ambiguous';
    const field = users[0];
    if (
      field.form &&
      [...field.form.querySelectorAll('input')].some(
        (input) => input.autocomplete === 'new-password',
      )
    )
      return 'ambiguous';
    set(field, username);
    return 'username-filled';
  }
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
  if (user && username) set(user, username);
  if (location.origin !== expectedOrigin || !field.isConnected) return 'origin';
  set(field, password);
  return 'filled';
}

export function readNewPassword(expectedOrigin) {
  if (location.origin !== expectedOrigin || location.protocol !== 'https:' || window.top !== window)
    return { status: 'origin' };
  const candidates = [...document.querySelectorAll('input[autocomplete="new-password"]')].filter(
    (input) => {
      const style = getComputedStyle(input),
        rect = input.getBoundingClientRect();
      return (
        input.type === 'password' &&
        !input.disabled &&
        !input.readOnly &&
        !input.closest('[inert]') &&
        style.display !== 'none' &&
        style.visibility === 'visible' &&
        Number(style.opacity) > 0 &&
        rect.width > 0 &&
        rect.height > 0
      );
    },
  );
  if (
    !candidates.length ||
    candidates.length > 2 ||
    !candidates[0].value ||
    candidates.some(
      (input) => input.value !== candidates[0].value || input.form !== candidates[0].form,
    )
  )
    return { status: 'ambiguous' };
  return { status: 'captured', password: candidates[0].value };
}
