"use client";

const IMAGE_TYPES = ["image/jpeg", "image/png"];

/**
 * Renders a document inline. Browsers can display PDFs and images natively;
 * Office formats (Word/Excel) have no in-browser renderer, so those fall back
 * to an explicit open-in-new-tab action rather than an empty frame.
 */
export function DocumentPreview({ mimeType, url }: { mimeType: string; url: string }) {
  if (mimeType === "application/pdf") {
    return <iframe src={url} title="Document preview" className="h-[70vh] w-full rounded-lg border border-border" />;
  }

  if (IMAGE_TYPES.includes(mimeType)) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={url}
        alt="Document preview"
        className="max-h-[70vh] w-full rounded-lg border border-border object-contain"
      />
    );
  }

  return (
    <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-lg border border-border text-center">
      <p className="text-sm text-muted-foreground">This file type can&apos;t be previewed in the browser.</p>
      <a href={url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
        Open in a new tab
      </a>
    </div>
  );
}
