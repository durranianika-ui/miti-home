// next/image loader for the static GitHub Pages preview (NEXT_PUBLIC_STATIC_PREVIEW=1).
// Pages cannot run the image optimiser, and root-relative public files need the
// repository base path, so local images are served as-is under that path.

/** Prefix a root-relative public file with the configured base path (no-op in normal builds). */
export function withBasePath(src: string): string {
  if (/^(https?:)?\/\//.test(src) || src.startsWith("data:")) return src;
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  if (!basePath || src.startsWith(basePath + "/")) return src;
  return `${basePath}${src.startsWith("/") ? "" : "/"}${src}`;
}

export default function staticImageLoader({ src }: { src: string; width: number; quality?: number }) {
  return withBasePath(src);
}
