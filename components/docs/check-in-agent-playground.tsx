"use client";

import { useState } from "react";
import { ComponentPreview } from "@/components/docs/component-preview";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import CheckInAgent from "@/features/flights/components/check-in-agent";
import { useIcons } from "@/lib/icon-context";
import { useSize } from "@/lib/size-context";

/**
The check-in agent in a preview frame, with a button that starts the conversation over.
*/
export default function CheckInAgentPlayground({
  code,
}: {
  readonly code: string;
}) {
  const [run, setRun] = useState(0);
  const { variant } = useSize();
  const RerunIcon = useIcons()["rotate-ccw"];

  const rerun = (
    <Tooltip content="Start over" side="top">
      <Button
        variant="ghost"
        size={variant === "compact" ? "icon-compact" : "icon"}
        onClick={() => setRun((previous) => previous + 1)}
        aria-label="Start over"
      >
        <RerunIcon />
      </Button>
    </Tooltip>
  );

  return (
    <ComponentPreview code={code} actions={rerun} heightClass="h-[640px]">
      <CheckInAgent key={run} className="h-full" />
    </ComponentPreview>
  );
}
