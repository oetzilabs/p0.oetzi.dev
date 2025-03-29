import { Terminal } from "@xterm/xterm";
import { createSignal, onMount } from "solid-js";
import { FitAddon } from "@xterm/addon-fit";
import { isServer } from "solid-js/web";
import { onCleanup } from "solid-js";
import "@xterm/xterm/css/xterm.css";

export default function ServerTerminal(props: { serverId: string }) {
  let terminalRef: HTMLDivElement;
  const [terminal, setTerminal] = createSignal<Terminal>();
  const [fitAddon, setFitAddon] = createSignal<FitAddon>();

  onMount(() => {
    if (isServer) return;
    if (terminal()) return;

    const term = new Terminal({
      fontFamily: "JetBrains Mono, monospace",
      fontSize: 14,
      cursorBlink: true,
      windowOptions: {
        fullscreenWin: true,
      },
    });
    const fAddon = new FitAddon();
    setFitAddon(fAddon);
    term.loadAddon(fAddon);

    term.open(terminalRef!);
    const prompt = () => term.write("\r\n$ ");

    // Handle user input
    term.onData((data) => {
      if (data === "\r") {
        // Enter key - process command (for now, just echo)
        // term.write("\r\nYou typed: " + inputBuffer);
        inputBuffer = "";
        prompt();
      } else if (data === "\x7F") {
        // Backspace handling
        if (inputBuffer.length > 0) {
          inputBuffer = inputBuffer.slice(0, -1);
          term.write("\b \b");
        }
      } else {
        // Store and display input
        inputBuffer += data;
        term.write(data);
      }
    });

    const handleResize = () => fAddon.fit();
    window.addEventListener("resize", handleResize);

    fAddon.fit();
    let inputBuffer = "";
    prompt();
    setTerminal(term);
    onCleanup(() => {
      window.removeEventListener("resize", handleResize);
      terminal()?.dispose();
    });
  });

  return <div ref={terminalRef!} class="flex bg-transparent !w-full !h-full" onLoad={() => fitAddon()?.fit()} />;
}
