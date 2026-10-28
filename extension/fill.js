// This function is serialized by Chrome into the isolated world of frame 0.
// It is self-contained and returns status only, never credentials or page data.
export function fillLogin(expectedOrigin, username, password) {
  if (location.origin !== expectedOrigin || location.protocol !== 'https:' || window.top !== window)
    return 'origin';
  const visible = (input) => {
    if (input.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
    for (let parent = input.parentElement; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      if (style.display === 'none' || style.visibility !== 'visible' || Number(style.opacity) === 0)
        return false;
    }
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
  const tokens = (input) => input.autocomplete.toLowerCase().split(/\s+/);
  const has = (input, token) => tokens(input).includes(token);
  const passwords = [...document.querySelectorAll('input')].filter(
    (input) =>
      (input.type === 'password' || (input.type === 'text' && has(input, 'current-password'))) &&
      visible(input),
  );
  const set = (input, value) => {
    input.focus();
    if (location.origin !== expectedOrigin || !input.isConnected || !visible(input)) return false;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    input.blur();
    return input.isConnected && input.value === value;
  };
  const userScore = (input) => {
    if (
      !['text', 'email', 'tel'].includes(input.type) ||
      !visible(input) ||
      ['one-time-code', 'new-password', 'current-password'].some((token) => has(input, token))
    )
      return 0;
    if (has(input, 'username')) return 3;
    if (has(input, 'email') || input.type === 'email') return 2;
    return /^(?:user(?:name)?|login(?:id)?|email|identifier(?:id)?|account)$/i.test(input.name) ||
      /^(?:user(?:name)?|login(?:id)?|email|identifier(?:id)?|account)$/i.test(input.id)
      ? 1
      : 0;
  };
  const chooseUser = (inputs) => {
    const ranked = inputs.map((input) => ({ input, score: userScore(input) }));
    const best = Math.max(0, ...ranked.map(({ score }) => score));
    const users = ranked.filter(({ score }) => score > 0 && score === best);
    return users.length === 1 ? users[0].input : null;
  };
  if (!passwords.length) {
    const field = chooseUser([...document.querySelectorAll('input')]);
    if (!field || !username) return 'ambiguous';
    if (
      field.form &&
      [...field.form.querySelectorAll('input')].some((input) => has(input, 'new-password'))
    )
      return 'ambiguous';
    return set(field, username) ? 'username-filled' : 'ambiguous';
  }
  if (
    passwords.length !== 1 ||
    ['new-password', 'one-time-code'].some((token) => has(passwords[0], token))
  )
    return 'ambiguous';
  const field = passwords[0],
    scope = field.form || document;
  if ([...scope.querySelectorAll('input')].some((input) => has(input, 'new-password')))
    return 'ambiguous';
  const users = [...scope.querySelectorAll('input')].filter(
    (input) =>
      ['text', 'email', 'tel'].includes(input.type) &&
      visible(input) &&
      !['one-time-code', 'new-password', 'current-password'].some((token) => has(input, token)) &&
      input.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING,
  );
  const user =
    chooseUser(users) || (users.length === 1 && userScore(users[0]) === 0 ? users[0] : null);
  if (users.length && !user) return 'ambiguous';
  if (user && username && !set(user, username)) return 'ambiguous';
  if (location.origin !== expectedOrigin || !field.isConnected) return 'origin';
  return set(field, password) ? 'filled' : 'ambiguous';
}

export function fillOTP(expectedOrigin, code) {
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
  const candidates = [...document.querySelectorAll('input')].filter((input) => {
    if (!['text', 'tel', 'number', 'password'].includes(input.type) || !visible(input))
      return false;
    if (input.autocomplete === 'one-time-code') return true;
    const label = [input.name, input.id, input.getAttribute('aria-label'), input.placeholder]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return /otp|one[-_ ]?time|verification|2fa|auth(?:entication)?|security[_ -]?code|token/.test(
      label,
    );
  });
  if (candidates.length !== 1) return 'ambiguous';
  const field = candidates[0];
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(field, code);
  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.dispatchEvent(new Event('change', { bubbles: true }));
  return 'otp-filled';
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
