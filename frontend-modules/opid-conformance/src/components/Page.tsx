import { Box, Flex, Heading } from "@r4pm/components/ui";
import type { ReactNode } from "react";
import ModuleTheme from "./ModuleTheme";

// Every page of the module: the module theme and a title, over the full width.
export default function Page({
  title,
  actions,
  children,
}: {
  title: string;
  /** Shown opposite the title. */
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <ModuleTheme>
      <Box p="4">
        <Flex direction="column" gap="4">
          <Flex align="center" justify="between" gap="3" wrap="wrap">
            <Heading size="7" weight="bold" style={{ letterSpacing: "-0.01em" }}>
              {title}
            </Heading>
            {actions}
          </Flex>
          {children}
        </Flex>
      </Box>
    </ModuleTheme>
  );
}
