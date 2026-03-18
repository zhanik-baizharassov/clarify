"use client";

import {
  type AvatarIdentity,
  getAvatarInitials,
  getAvatarTheme,
} from "@/shared/avatar";

type AvatarSize = "sm" | "md" | "lg";

const SIZE_CLASS: Record<AvatarSize, string> = {
  sm: "h-10 w-10 rounded-xl text-sm",
  md: "h-16 w-16 rounded-2xl text-lg",
  lg: "h-24 w-24 rounded-2xl text-2xl",
};

export default function UserAvatar({
  user,
  size = "md",
  className = "",
}: {
  user: AvatarIdentity;
  size?: AvatarSize;
  className?: string;
}) {
  const initials = getAvatarInitials(user);
  const theme = getAvatarTheme(user);

  return (
    <div
      aria-label={`Аватар ${initials}`}
      className={[
        "inline-flex select-none items-center justify-center border font-semibold tracking-wide",
        SIZE_CLASS[size],
        theme.bg,
        theme.text,
        theme.border,
        className,
      ].join(" ")}
    >
      {initials}
    </div>
  );
}