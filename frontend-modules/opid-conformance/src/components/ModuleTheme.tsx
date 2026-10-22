import { Theme } from "@r4pm/components/ui";
import type { ReactNode } from "react";

// The module's design language, nested in the r4pm Theme Ocelescope wraps the app in.
// Surfaces are neutral; color is kept for what carries meaning: object types, place colors
// and the kinds of moves.
export default function ModuleTheme({ children }: { children: ReactNode }) {
  return (
    <Theme
      accentColor="blue"
      radius="medium"
      scaling="100%"
      panelBackground="solid"
      hasBackground={false}
    >
      {children}
    </Theme>
  );
}
