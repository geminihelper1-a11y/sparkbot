function createLogger(level='info') {
  const ranks = { debug: 10, info: 20, warn: 30, error: 40 };
  const threshold = ranks[level] ?? 20;
  const write = (name, args) => {
    if ((ranks[name] ?? 20) < threshold) return;
    const prefix = `[NETHRION] ${new Date().toISOString()} ${name.toUpperCase()}`;
    console[name === 'debug' ? 'log' : name](prefix, ...args);
  };
  return { debug: (...a) => write('debug', a), info: (...a) => write('info', a), warn: (...a) => write('warn', a), error: (...a) => write('error', a) };
}
module.exports = { createLogger };
