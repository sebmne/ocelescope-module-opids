import { Card, Flex, Heading } from "@r4pm/components/ui";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

// A card on a page: icon and title on top, content below.
export default function Section({
  title,
  icon: Icon,
  aside,
  children,
}: {
  title: string;
  icon?: LucideIcon;
  /** Shown opposite the title, e.g. controls. */
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card size="3">
      <Flex direction="column" gap="4">
        <Flex gap="3" align="center" justify="between" minWidth="0" wrap="wrap">
          <Flex gap="3" align="center" minWidth="0">
            {Icon && (
              <Flex
                align="center"
                justify="center"
                flexShrink="0"
                aria-hidden
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "var(--radius-3)",
                  background: "var(--gray-a3)",
                  color: "var(--gray-11)",
                }}
              >
                <Icon size={17} />
              </Flex>
            )}
            <Heading as="h2" size="4" style={{ lineHeight: "32px" }} truncate>
              {title}
            </Heading>
          </Flex>
          {aside}
        </Flex>
        {children}
      </Flex>
    </Card>
  );
}
