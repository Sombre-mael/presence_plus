"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { avatarColorClasses, profileInitials } from "@/lib/profile-presentation";
import type { AccountAvatarColor } from "@/types/account";

export function ProfileAvatar({
  name,
  avatarUrl,
  avatarColor = "EMERALD",
  className,
  fallbackClassName,
  alt = "",
}: {
  name: string;
  avatarUrl?: string;
  avatarColor?: AccountAvatarColor;
  className?: string;
  fallbackClassName?: string;
  alt?: string;
}) {
  return (
    <Avatar className={className}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt={alt} /> : null}
      <AvatarFallback className={cn(avatarColorClasses[avatarColor], fallbackClassName)}>
        {profileInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
