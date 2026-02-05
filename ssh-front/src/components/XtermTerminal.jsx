import { useEffect, useRef, useState } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

export default function XtermTerminal({ onData, onResize, outputRef, onReady }) {
  const terminalRef = useRef(null);
  const xtermInstance = useRef(null);
  const fitAddon = useRef(null);
  const onDataRef = useRef(onData);
  const onResizeRef = useRef(onResize);
  const onReadyRef = useRef(onReady);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    onDataRef.current = onData;
  }, [onData]);

  useEffect(() => {
    onResizeRef.current = onResize;
  }, [onResize]);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  // Wait for container to be mounted and have dimensions
  useEffect(() => {
    const checkDimensions = () => {
      if (!terminalRef.current) return;
      const rect = terminalRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setIsReady(true);
      } else {
        // Retry after a short delay
        setTimeout(checkDimensions, 50);
      }
    };

    const timer = setTimeout(checkDimensions, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    const container = terminalRef.current;
    if (!container) return;

    // Initialize Xterm
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      theme: {
        background: '#0b0f14',
        foreground: '#d7e2f0',
        cursor: '#ffffff',
        selectionBackground: 'rgba(255, 255, 255, 0.3)',
        black: '#000000',
        red: '#e06c75',
        green: '#98c379',
        yellow: '#e5c07b',
        blue: '#61afef',
        magenta: '#c678dd',
        cyan: '#56b6c2',
        white: '#abb2bf',
        brightBlack: '#5c6370',
        brightRed: '#e06c75',
        brightGreen: '#98c379',
        brightYellow: '#e5c07b',
        brightBlue: '#61afef',
        brightMagenta: '#c678dd',
        brightCyan: '#56b6c2',
        brightWhite: '#ffffff'
      }
    });

    const fit = new FitAddon();
    term.loadAddon(fit);

    try {
      term.open(container);

      // Wait for terminal to be fully initialized
      requestAnimationFrame(() => {
        try {
          fit.fit();
          term.focus();
          onReadyRef.current?.();

          // Send resize event to backend
          onResizeRef.current?.(term.cols, term.rows);
        } catch (error) {
          console.error('Error fitting terminal:', error);
        }
      });
    } catch (error) {
      console.error('Error opening terminal:', error);
      return;
    }

    // Handle user input
    term.onData((data) => {
      onDataRef.current?.(data);
    });

    // Handle resize
    const handleResize = () => {
      if (fit && term) {
        fit.fit();
        onResizeRef.current?.(term.cols, term.rows);
      }
    };
    window.addEventListener('resize', handleResize);

    xtermInstance.current = term;
    fitAddon.current = fit;

    // Expose write method to parent via ref
    if (outputRef) {
      outputRef.current = (data) => term.write(data);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, [isReady, outputRef]);

  // Re-fit on layout changes when outputRef changes
  useEffect(() => {
    if (!fitAddon.current) return;
    const t = setTimeout(() => {
      try {
        fitAddon.current?.fit();
      } catch (e) {
        // Ignore fit errors during mounting
      }
    }, 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      ref={terminalRef}
      onMouseDown={() => xtermInstance.current?.focus()}
      className="w-full h-full min-h-[200px] rounded-lg overflow-hidden bg-[#0b0f14]"
    />
  );
}
