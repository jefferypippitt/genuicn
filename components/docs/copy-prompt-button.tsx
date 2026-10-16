"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { useIcons } from "@/lib/icon-context";
import { spring } from "@/lib/springs";
import { cn } from "@/lib/utils";
import type { IconComponentProps } from "@/lib/icon-context";
import type { Transition } from "motion/react";

// Adapted from Fluid Functionalism's lib/docs/copy-prompt-button.tsx (MIT).

const CopiedContext = createContext(false);

const SHOWN = { filter: "blur(0px)", opacity: 1, scale: 1 };
const HIDDEN = { filter: "blur(4px)", opacity: 0, scale: 0.6 };

const CopyPromptIcon = ({
  size = 16,
  strokeWidth,
  className,
}: IconComponentProps) => {
  const copied = useContext(CopiedContext);
  const icons = useIcons();
  const CopyIcon = icons.copy;
  const CheckIcon = icons.check;
  const reduced = useReducedMotion();
  const enter: Transition = reduced
    ? { duration: 0 }
    : { duration: spring.fast.duration, ease: "easeOut", type: "tween" };
  const leave: Transition = reduced
    ? { duration: 0 }
    : { ...spring.fast.exit, ease: "easeIn", type: "tween" };
  return (
    <span className="grid shrink-0" style={{ height: size, width: size }}>
      <motion.span
        className="col-start-1 row-start-1 flex"
        initial={false}
        animate={copied ? HIDDEN : SHOWN}
        transition={copied ? leave : enter}
      >
        <CopyIcon size={size} strokeWidth={strokeWidth} className={className} />
      </motion.span>
      <motion.span
        className="col-start-1 row-start-1 flex"
        initial={false}
        animate={copied ? SHOWN : HIDDEN}
        transition={copied ? enter : leave}
      >
        <CheckIcon
          size={size}
          strokeWidth={strokeWidth}
          className={className}
        />
      </motion.span>
    </span>
  );
};

export const CopyPromptButton = ({
  prompt,
  label = "Copy prompt",
  className,
}: {
  readonly prompt: string | (() => string);
  readonly label?: string;
  readonly className?: string;
}) => {
  const [copied, setCopied] = useState(false);
  const timeoutReference = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    return () => {
      if (timeoutReference.current) {
        clearTimeout(timeoutReference.current);
      }
    };
  }, []);

  const handleCopy = useCallback(async () => {
    const text = typeof prompt === "function" ? prompt() : prompt;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    setCopied(true);
    if (timeoutReference.current) {
      clearTimeout(timeoutReference.current);
    }
    timeoutReference.current = setTimeout(() => setCopied(false), 2000);
  }, [prompt]);

  return (
    <CopiedContext.Provider value={copied}>
      <Button
        variant="primary"
        leadingIcon={CopyPromptIcon}
        onClick={handleCopy}
        className={cn("w-fit shrink-0", className)}
        aria-live="polite"
      >
        {label}
        {copied ? <span className="sr-only">Copied</span> : null}
      </Button>
    </CopiedContext.Provider>
  );
};
