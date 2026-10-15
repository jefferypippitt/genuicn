"use client";

import { forwardRef } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/springs";
import { useShape } from "@/lib/shape-context";
import { useSize, typeClass } from "@/lib/size-context";
import { useTouchPrimary } from "@/hooks/use-touch-primary";
import { FileThumbnail } from "@/components/ui/file-thumbnail";
import type { SizeVariant } from "@/lib/size-context";
import type { HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";

interface ChatMessageProperties extends Omit<
  HTMLMotionProps<"div">,
  "children"
> {
  /** Who sent the message. Drives alignment and bubble colour:
   *  `user` → right-aligned accent bubble, `assistant` → left-aligned plain text. */
  readonly from: "user" | "assistant";
  /**
  Optional attachments rendered as square thumbnails above the bubble.
  */
  readonly files?: File[];
  /**
  Side length of each attachment thumbnail in pixels. Defaults to 64.
  */
  readonly thumbnailSize?: number;
  /** Timestamp shown in the hover-revealed meta row, before the actions.
   *  User-message only — ignored on assistant replies. Caller pre-formats it
   *  (e.g. `"Wednesday 6:08 PM"`). */
  readonly time?: ReactNode;
  /** Icon-only action buttons shown in the hover-revealed meta row (e.g. copy,
   *  edit, regenerate). Rendered next to the timestamp. */
  readonly actions?: ReactNode;
  /**
  Message body. When omitted the text bubble is dropped (attachment-only message).
  */
  readonly children?: ReactNode;
  /** Pins the message to one step of the size ladder (see /docs/sizes) —
   *  compact tightens bubble type and padding. Omitted, it follows the
   *  surrounding SizeProvider. */
  readonly size?: SizeVariant;
}

// ─── ChatMessage ──────────────────────────────────────────────────────────
// A single transcript entry with baked-in entrance + layout motion. Pairs with
// InputMessage's onSend: render one per sent/received message. `layout="position"`
// lets earlier messages slide up smoothly when a new one is appended.
const ChatMessage = forwardRef<HTMLDivElement, ChatMessageProperties>(
  (
    {
      from,
      files,
      thumbnailSize = 64,
      time,
      actions,
      children,
      size,
      className,
      ...properties
    },
    reference
  ) => {
    const shape = useShape();
    const isCompact = useSize(size).variant === "compact";
    const isUser = from === "user";
    // Hover-reveal is unreachable on touch — keep the meta row visible there.
    const isTouch = useTouchPrimary();
    // Timestamps are a user-message affordance; assistant replies show actions only.
    const isShowTime = isUser && time != null;

    return (
      <motion.div
        ref={reference}
        layout="position"
        initial={{ opacity: 0, y: 8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={spring.moderate}
        style={{ transformOrigin: isUser ? "bottom right" : "bottom left" }}
        className={cn(
          "group flex max-w-[80%] flex-col gap-1.5",
          isUser ? "items-end self-end" : "items-start self-start",
          className
        )}
        {...properties}
      >
        {files && files.length > 0 ? (
          <div
            className={cn(
              "flex flex-wrap gap-1.5",
              isUser ? "justify-end" : "justify-start"
            )}
          >
            {files.map((file, index) => {
              return (
                <FileThumbnail
                  key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                  file={file}
                  size={thumbnailSize}
                />
              );
            })}
          </div>
        ) : null}
        {children != null && children !== "" && (
          <div
            className={cn(
              "break-words whitespace-pre-wrap",
              isCompact ? "py-1.5" : "py-2",
              typeClass("subtitle", isCompact ? "compact" : "default"),
              // User keeps the bubble chrome (rounded fill + horizontal padding);
              // the assistant reply is flush-left plain text with no background.
              isUser
                ? cn(
                    shape.bg,
                    isCompact ? "px-3" : "px-3.5",
                    // `text-pretty` is reserved for settled user bubbles. On the
                    // assistant reply it's left off on purpose: `text-wrap: pretty`
                    // re-balances the last lines on every content change, so a
                    // word-by-word stream visibly reflows earlier words to new
                    // lines. Default (normal) wrapping appends left-to-right and
                    // stays put as the text grows.
                    "text-foreground bg-[color-mix(in_oklab,var(--accent),var(--background)_45%)] text-pretty"
                  )
                : "text-foreground"
            )}
          >
            {children}
          </div>
        )}
        {isShowTime || actions != null ? (
          <div
            className={cn(
              "text-muted-foreground flex items-center gap-2 px-1 select-none",
              typeClass("caption", isCompact ? "compact" : "default"),
              !isTouch && [
                "pointer-events-none opacity-0 transition-opacity duration-150",
                "group-hover:pointer-events-auto group-hover:opacity-100",
                "group-focus-within:pointer-events-auto group-focus-within:opacity-100",
              ]
            )}
          >
            {isShowTime ? <span className="tabular-nums">{time}</span> : null}
            {actions != null && (
              <span className="flex items-center gap-0.5">{actions}</span>
            )}
          </div>
        ) : null}
      </motion.div>
    );
  }
);

ChatMessage.displayName = "ChatMessage";

export { ChatMessage };
export type { ChatMessageProperties as ChatMessageProps };
export default ChatMessage;
