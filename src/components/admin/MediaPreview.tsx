import { useEffect, useState } from "react";
import { FileVideo, ImageIcon } from "lucide-react";

import { DynamicMedia } from "@/components/DynamicMedia";
import { getSignedUrl, isDynamicMedia, type MediaRow } from "@/lib/signage";
import { cn } from "@/lib/utils";

export function MediaPreview({
  media,
  className,
  controls = false,
}: {
  media: Pick<MediaRow, "type" | "storage_path" | "title" | "content_config">;
  className?: string;
  controls?: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);

  if (isDynamicMedia(media)) {
    return <DynamicMedia media={media} compact className={className} />;
  }

  useEffect(() => {
    let alive = true;
    getSignedUrl(media.storage_path).then((value) => {
      if (alive) setUrl(value);
    });
    return () => {
      alive = false;
    };
  }, [media.storage_path]);

  if (!url) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          className,
        )}
      >
        {media.type === "video" ? (
          <FileVideo className="h-6 w-6" aria-hidden />
        ) : (
          <ImageIcon className="h-6 w-6" aria-hidden />
        )}
      </div>
    );
  }

  if (media.type === "video") {
    return (
      <video
        src={url}
        className={cn("bg-black object-contain", className)}
        controls={controls}
        muted
        playsInline
        preload="metadata"
      />
    );
  }

  return <img src={url} alt={media.title} className={cn("bg-muted object-contain", className)} />;
}
