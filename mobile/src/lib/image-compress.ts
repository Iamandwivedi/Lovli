// Client-side upload compression (research §12, "Performance on budget Android").
// Most chat screenshots are 2–4 MB PNG; the API caps at 6 MB and budget-Android
// uploads on mobile data are slow. Re-encode to JPEG ≤ ~1.5 MB before sending.
// Best-effort: any failure returns the original asset untouched.
import { Platform } from "react-native";
import type { ImagePickerAsset } from "expo-image-picker";

export type UploadImage = { uri: string; name: string; type: string };

const MAX_EDGE = 1600; // px — plenty for the model to read chat text
const SKIP_BELOW_BYTES = 700 * 1024; // already small JPEGs go up as-is
const JPEG_QUALITY = 0.8;

export const toUploadImage = (asset: ImagePickerAsset): UploadImage => ({
  uri: asset.uri,
  name: asset.fileName || `chat.${(asset.mimeType || "image/jpeg").split("/").pop()}`,
  type: asset.mimeType || "image/jpeg",
});

export async function compressForUpload(asset: ImagePickerAsset): Promise<UploadImage> {
  const original = toUploadImage(asset);
  if (Platform.OS === "web") return original;
  const isJpeg = (asset.mimeType || "").toLowerCase().includes("jpeg");
  if (isJpeg && asset.fileSize && asset.fileSize < SKIP_BELOW_BYTES) return original;
  try {
    const { ImageManipulator, SaveFormat } = await import("expo-image-manipulator");
    const context = ImageManipulator.manipulate(asset.uri);
    const longest = Math.max(asset.width || 0, asset.height || 0);
    if (longest > MAX_EDGE) {
      const scale = MAX_EDGE / longest;
      context.resize({
        width: Math.round((asset.width || longest) * scale),
        height: Math.round((asset.height || longest) * scale),
      });
    }
    const rendered = await context.renderAsync();
    const saved = await rendered.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });
    rendered.release?.();
    return { uri: saved.uri, name: "chat.jpg", type: "image/jpeg" };
  } catch {
    return original;
  }
}
