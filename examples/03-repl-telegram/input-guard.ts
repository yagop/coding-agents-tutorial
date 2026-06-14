// bun run examples/03-repl-telegram/input-guard.ts

export function isBlank(text: string): boolean {
  return text.trim().length === 0;
}

// Answer /start and /help locally, before spending a token on Claude.
export function handleCommand(text: string): string | null {
  const command = text.trim().split(/\s+/)[0];
  if (command === '/start') return 'Hi! Send me a message and I will ask Claude.';
  if (command === '/help') return 'Just type a question. /start and /help are handled here.';
  return null;
}

// Telegram caps one message at 4096 characters; split longer replies to fit.
export function chunk(text: string, size = 4096): string[] {
  const pieces: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    pieces.push(text.slice(i, i + size));
  }
  return pieces.length > 0 ? pieces : [''];
}

if (import.meta.main) {
  console.log('isBlank("")        ->', isBlank(''));
  console.log('isBlank("   ")     ->', isBlank('   '));
  console.log('isBlank("hi")      ->', isBlank('hi'));
  console.log('handleCommand("/start") ->', handleCommand('/start'));
  console.log('handleCommand("/help")  ->', handleCommand('/help'));
  console.log('handleCommand("weather?")->', handleCommand('weather?'));
  console.log('chunk(9000 chars)  -> lengths', chunk('x'.repeat(9000)).map((p) => p.length));
}
