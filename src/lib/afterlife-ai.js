import { chat } from "@tanstack/ai";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { gatewayModel } from "@/lib/ai.server";
import { requireUser } from "@/lib/auth-middleware";

const Input = z.object({
  name: z.string().max(120),
  description: z.string().max(2400),
  category: z.enum(["electronics", "appliance", "textile", "furniture", "packaging", "other"]),
  condition: z.enum(["working", "damaged", "broken", "unknown"]),
  region: z.string().max(100),
  priority: z.enum(["impact", "fast", "cost"]),
  imageDataUrl: z.string().max(3000000).regex(/^data:image\/(jpeg|png|webp);base64,/).nullable().optional()
});

const Component = z.object({
  name: z.string().max(120),
  material: z.string().max(160),
  min: z.number().min(0).max(100000),
  max: z.number().min(0).max(100000),
  recover: z.number().min(0).max(100),
  condition: z.string().max(100),
  hazard: z.boolean(),
  note: z.string().max(500)
});
const Hazard = z.object({
  severity: z.enum(["low", "medium", "high"]),
  name: z.string().max(120),
  note: z.string().max(600)
});
const Output = z.object({
  title: z.string().max(120),
  summary: z.string().max(1200),
  massMin: z.number().min(0).max(100000),
  massMax: z.number().min(0).max(100000),
  components: z.array(Component).min(2).max(8),
  hazards: z.array(Hazard).max(8),
  nextSteps: z.array(z.string().max(400)).min(2).max(6),
  uncertainty: z.array(z.string().max(350)).max(8)
});

const dangerPattern = /\b(punctur\w*|short\w*\s+(?:the\s+)?capacitor|discharg\w*\s+(?:the\s+)?capacitor|open\w*\s+(?:the\s+)?battery|remove\w*\s+(?:the\s+)?battery|cut\w*\s+(?:the\s+)?wire|open\w*\s+(?:the\s+)?power supply|bypass\w*\s+(?:the\s+)?fuse)\b/i;
function safeText(value, fallback) {
  return dangerPattern.test(value) ? fallback : value;
}

export const analyzeObjectWithAI = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator((input) => Input.parse(input))
  .handler(async ({ data, context }) => {
    const { imageDataUrl, ...fields } = data;
    const content = [{
      type: "text",
      content: JSON.stringify({
        task: imageDataUrl
          ? "Analyze the attached object photo and user details to produce an unverified first-pass component-level afterlife analysis."
          : "Produce an unverified first-pass component-level afterlife analysis from these user-provided details. No photo was attached.",
        ...fields,
        imageAttached: Boolean(imageDataUrl)
      })
    }];
    if (imageDataUrl) {
      const match = imageDataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
      if (!match) throw new Error("The image must be a valid JPEG, PNG or WebP data URL.");
      content.push({
        type: "image",
        source: { type: "data", value: match[2], mimeType: match[1] },
        metadata: { detail: "high" }
      });
    }
    const response = await chat({
      adapter: gatewayModel(context.getBase44()),
      stream: false,
      systemPrompts: [
        "You are the component analysis engine for The Afterlife Compiler, a circularity decision aid.",
        "If a photo is attached, inspect the visible object. Do not claim to see internal parts that are not visible. Use visible labels where legible, but do not invent a model or exact material composition. Without a photo, state that analysis is based on user text only.",
        "Return the schema only. Keep confidence implicit through broad mass ranges and the uncertainty field. Separate observable facts from inferences. List 2-8 plausible components with estimated min and max mass in grams and a 0-100 recovery potential heuristic.",
        "Flag lithium batteries, mains electricity, capacitors, broken glass, sharp items, mould, refrigerants, mercury and chemicals where plausible. Never instruct people to open batteries, discharge capacitors, open power supplies, or disassemble hazardous electrical equipment. Refer those to qualified repair or recycling services.",
        "Give 2-6 safe high-level next steps. Do not name businesses or invent collection-point availability, environmental savings or citations. Material and mass estimates are unverified."
      ],
      messages: [{ role: "user", content }],
      outputSchema: Output
    });
    if (!response || !Array.isArray(response.components) || !Array.isArray(response.nextSteps)) {
      throw new Error("The AI response did not match the expected analysis schema.");
    }
    const components = response.components.map((part) => ({
      ...part,
      name: safeText(part.name, "Unverified component"),
      material: safeText(part.material, "Material not confirmed"),
      note: safeText(part.note, "Do not perform internal disassembly; ask a qualified repair or recycling service."),
      min: Math.min(part.min, part.max),
      max: Math.max(part.min, part.max)
    }));
    const hazards = response.hazards.map((hazard) => ({
      ...hazard,
      name: safeText(hazard.name, "Possible safety hazard"),
      note: safeText(hazard.note, "Avoid disassembly and ask a qualified handler for safe assessment.")
    }));
    const nextSteps = response.nextSteps.map((step) =>
      safeText(step, "Do not perform internal disassembly. Ask a qualified repair or recycling service for the next safe step.")
    );
    const totalMin = components.reduce((sum, part) => sum + part.min, 0);
    const totalMax = components.reduce((sum, part) => sum + part.max, 0);
    const massMin = totalMin;
    const massMax = Math.max(totalMax, massMin);
    return {
      ...response,
      title: safeText(response.title, "Unidentified object"),
      summary: safeText(response.summary, "The analysis contains an unsafe instruction and has been replaced. Confirm the object and seek qualified guidance before acting."),
      components,
      hazards,
      nextSteps,
      massMin: Math.round(massMin),
      massMax: Math.round(massMax),
      source: imageDataUrl ? "ai-image" : "ai-text",
      note: imageDataUrl
        ? "AI-assisted image and text analysis. All components, masses and hazards remain estimates that need human verification."
        : "AI-assisted text analysis only. No image was processed; verify each component, mass estimate and hazard."
    };
  });