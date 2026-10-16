"use client";

import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

// Adapted from Fluid Functionalism's lib/right-rail.tsx (MIT).

interface RightRailValue {
  node: HTMLElement | null;
  setNode: (node: HTMLElement | null) => void;
}

const RightRailContext = createContext<RightRailValue>({
  node: null,
  setNode: () => {},
});

export const RightRailProvider = ({
  children,
}: {
  readonly children: ReactNode;
}) => {
  const [node, setNode] = useState<HTMLElement | null>(null);
  return (
    <RightRailContext.Provider value={{ node, setNode }}>
      {children}
    </RightRailContext.Provider>
  );
};

export const RightRailTarget = () => {
  const { setNode } = useContext(RightRailContext);
  return <div ref={setNode} className="contents" />;
};

export function useRightRailNode() {
  return useContext(RightRailContext).node;
}
