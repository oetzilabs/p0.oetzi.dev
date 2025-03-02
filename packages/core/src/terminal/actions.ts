export const TERMINAL_ACTIONS = {
  CLEAR: "\x1b[2J",
  CURSOR_HOME: "\x1b[0;0H",
  CURSOR_UP: "\x1b[A",
  CURSOR_DOWN: "\x1b[B",
  CURSOR_LEFT: "\x1b[D",
  CURSOR_RIGHT: "\x1b[C",

  CLEAR_LINE: "\x1b[2K",
  ERASE_LINE: "\x1b[K",
} as const;
