import { copyFile, writeFile } from "fs/promises";
import { isAbsolute } from "path";

export async function materializeVideoToPath(
  videoUrl: string,
  destPath: string
): Promise<void> {
  if (videoUrl.startsWith("http://") || videoUrl.startsWith("https://")) {
    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.statusText}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(destPath, buffer);
    return;
  }

  if (isAbsolute(videoUrl)) {
    await copyFile(videoUrl, destPath);
    return;
  }

  throw new Error(`Unsupported video URL: ${videoUrl}`);
}
