/**
 * Generate shareable PNG card for social sharing.
 * Uses canvas API — runs client-side only.
 */
export function generateShareCard(input: {
  weaknessTitle: string;
  frequency: string;
  sport: string;
  accentColor: string;
}): Promise<Blob> {
  if (typeof document === "undefined") {
    return Promise.reject(new Error("Share cards can only be generated in the browser"));
  }

  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Canvas not supported"));
      return;
    }

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = input.accentColor;
    ctx.lineWidth = 4;
    ctx.strokeRect(60, 60, canvas.width - 120, canvas.height - 120);

    ctx.fillStyle = input.accentColor;
    ctx.font = "bold 36px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("FIGHTFLO AI COACHING", canvas.width / 2, 200);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 64px system-ui";
    const words = input.weaknessTitle.split(" ");
    let line = "";
    let y = 800;
    for (const word of words) {
      const test = line + word + " ";
      if (ctx.measureText(test).width > 900) {
        ctx.fillText(line, canvas.width / 2, y);
        line = word + " ";
        y += 80;
      } else {
        line = test;
      }
    }
    ctx.fillText(line, canvas.width / 2, y);

    ctx.fillStyle = "#888888";
    ctx.font = "32px system-ui";
    ctx.fillText(input.frequency, canvas.width / 2, y + 120);

    ctx.fillStyle = "#555555";
    ctx.font = "28px system-ui";
    ctx.fillText("fightflo.app/feedback", canvas.width / 2, canvas.height - 150);

    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to generate image"));
      },
      "image/png"
    );
  });
}

export async function downloadShareCard(
  input: Parameters<typeof generateShareCard>[0]
): Promise<void> {
  const blob = await generateShareCard(input);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "feedback-analysis.png";
  a.click();
  URL.revokeObjectURL(url);
}
