"use client";

import type { VariantProps } from "class-variance-authority";
import { Clipboard } from "lucide-react";
import { type ReactNode, useState } from "react";

import { Button, type buttonVariants } from "@/components/ui/button";
import { copyText } from "@/lib/copy-text";

const COPIED_RESET_MS = 1500;

export function CopyButton({
  value,
  children,
  variant = "outline",
  className,
}: {
  value: string;
  children?: ReactNode;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      className={className}
      variant={variant}
      onClick={async () => {
        if (await copyText(value)) {
          setCopied(true);
          window.setTimeout(() => setCopied(false), COPIED_RESET_MS);
        }
      }}
    >
      <Clipboard data-icon="inline-start" />
      {copied ? "Copied" : children}
    </Button>
  );
}
