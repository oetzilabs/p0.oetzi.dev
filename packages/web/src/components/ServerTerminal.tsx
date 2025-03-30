import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { Setter } from "solid-js";
import { Accessor, createSignal, onCleanup, onMount, Signal } from "solid-js";
import { isServer } from "solid-js/web";
import { toast } from "solid-sonner";

const commands = (
  terminal: Terminal,
  options: {
    signal: Signal<string>;
    prefix: string;
    socket: WebSocket;
  }
): Record<string, () => void> => ({
  // CTRL+C
  "\u0003": () => {
    if (terminal.hasSelection()) {
      const text = terminal.getSelection();
      toast.info("Copied to clipboard");
      navigator.clipboard.writeText(text);
      terminal.clearSelection();
      return;
    }
    terminal.write(`\r\n${options.prefix} `);
  },
  // CTRL+V
  "\u0016": () => {
    navigator.clipboard.readText().then((text) => {
      terminal.write(text);
    });
  },
  // CTRL+L
  "\u000c": () => {
    if (terminal.hasSelection()) {
      terminal.clearSelection();
    }
    terminal.clear();
  },
  // Enter
  "\r": () => {
    terminal.write(`\r\n${options.prefix} `);
  },
  // Backspace
  "\x7F": () => {
    // Backspace handling
    const text = options.signal[0]();
    const setText = options.signal[1];
    if (text.length > 0) {
      setText(text.slice(0, -1));
      terminal.write("\b \b");
    }
  },
  // CTRL+Backspace (delete word)
  "\u0017": () => {
    // Backspace handling
    const text = options.signal[0]();
    const setText = options.signal[1];
    if (text.length > 0) {
      const lastSpace = text.lastIndexOf(" ");
      let newText = "";

      if (lastSpace === -1) {
        newText = "";
      } else {
        newText = text.slice(0, lastSpace + 1);
      }

      setText(newText);
      // Clear the current line and redraw
      terminal.writeln(`\r\x1b[K${options.prefix} ${newText}`);
    }
  },
  clear: () => {
    if (terminal.hasSelection()) {
      terminal.clearSelection();
    }
    terminal.clear();
  },
});

export default function ServerTerminal() {
  let terminalRef: HTMLDivElement;
  const [terminal, setTerminal] = createSignal<Terminal>();
  const inputBufferSignal = createSignal<string>("");
  const fAddon = new FitAddon();
  const handleResize = () => fAddon.fit();
  onMount(() => {
    if (isServer) return;
    if (terminal()) return;
    const socket = new WebSocket("");

    const term = new Terminal({
      fontFamily: "JetBrains Mono, monospace",
      fontSize: 14,
      cursorBlink: true,
      windowOptions: {
        fullscreenWin: true,
      },
      customGlyphs: true,
      allowProposedApi: true,
    });
    term.loadAddon(fAddon);

    term.open(terminalRef!);

    const commandCollection = commands(term, { signal: inputBufferSignal, prefix: "$", socket });
    // Handle user input
    term.onData((data) => {
      if (Object.hasOwn(commandCollection, data)) {
        commandCollection[data]();
      } else {
        inputBufferSignal[1](inputBufferSignal[0]() + data);
        term.write(data);
      }
    });

    window.addEventListener("resize", handleResize);

    fAddon.fit();
    term.write("$ ");
    setTerminal(term);
  });

  onCleanup(() => {
    window.removeEventListener("resize", handleResize);
    const term = terminal();
    if (term) term.dispose();
  });

  return (
    <div class="flex w-full h-min bg-black p-2 rounded overflow-clip">
      <div ref={terminalRef!} class="flex !bg-transparent !w-full !h-full" />
    </div>
  );
}
