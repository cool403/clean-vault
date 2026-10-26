// A local, deliberately conservative heuristic. It is not an entropy estimate
// and never sends the master password anywhere.
const common = [
  'password',
  'passwort',
  'contraseña',
  'パスワード',
  '123456',
  '12345678',
  'qwerty',
  'azerty',
  'admin',
  'letmein',
  'welcome',
  'iloveyou',
  'abc123',
  '111111',
  '000000',
  'dragon',
  'monkey',
  'football',
  'master',
  'login',
  'secret',
];
const sequences = [
  'abcdefghijklmnopqrstuvwxyz',
  '0123456789',
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm',
];
export const strengthLabels = ['太弱', '弱', '一般', '强', '很强'];
function hasSequence(text) {
  for (const sequence of sequences) {
    const reversed = [...sequence].reverse().join('');
    for (let index = 0; index <= text.length - 4; index++) {
      const chunk = text.slice(index, index + 4);
      if (sequence.includes(chunk) || reversed.includes(chunk)) return true;
    }
  }
  return false;
}
export function passwordStrength(value) {
  const password = String(value || '');
  if (!password) return { score: 0, label: strengthLabels[0], suggestions: ['建议至少 12 个字符'] };
  const lower = password.toLocaleLowerCase();
  const normalized = lower
    .replace(/[@4]/g, 'a')
    .replace(/[0]/g, 'o')
    .replace(/[1!|]/g, 'i')
    .replace(/[3]/g, 'e')
    .replace(/[5$]/g, 's')
    .replace(/[7]/g, 't');
  let classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((rule) =>
    rule.test(password),
  ).length;
  if (/[\u3400-\u9fff]/.test(password)) classes = Math.max(classes, 3);
  const repeated = /^(.)\1+$/.test(password);
  const commonWord = common.some((word) => lower.includes(word) || normalized.includes(word));
  const sequential = hasSequence(lower);
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (password.length >= 10 && classes >= 3) score++;
  if (repeated || commonWord || sequential) score = Math.min(score, 1);
  score = Math.max(0, Math.min(4, score));
  const suggestions = [];
  if (password.length < 12) suggestions.push('建议至少 12 个字符');
  if (classes < 3) suggestions.push('混合大小写、数字和符号');
  if (repeated || commonWord || sequential) suggestions.push('避免常见单词、重复或连续字符');
  return { score, label: strengthLabels[score], suggestions };
}
