import Anthropic from "@anthropic-ai/sdk";
import type { VisionResult, Category } from "./types";
import { SIZE_OPTIONS } from "./constants";

const MODEL = "claude-sonnet-4-6";

// Reads a product photo and returns name + category + a suggested size.
// Falls back to a safe stub if no API key is set, so the seller flow still
// works during local setup before the key is wired up.
export async function readProductPhoto(
  base64: string,
  mediaType: string
): Promise<VisionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      name: "",
      category: "apparel",
      suggested_size: "M",
      size_options: SIZE_OPTIONS.apparel,
    };
  }

  const client = new Anthropic({ apiKey });

  const tool: Anthropic.Tool = {
    name: "record_product",
    description: "Record the identified product details from the photo.",
    input_schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description:
            "Short product name a shopkeeper would use, e.g. 'Cotton T-shirt', 'Basmati Rice'. Max 4 words.",
        },
        category: {
          type: "string",
          enum: ["apparel", "food"],
          description:
            "apparel for clothing/wearables, food for edible items, groceries, kitchen produce.",
        },
        suggested_size: {
          type: "string",
          description:
            "Best guess size. For apparel use S/M/L/XL/XXL/Free. For food use a weight or count like 250g, 1kg, 1 pc.",
        },
      },
      required: ["name", "category", "suggested_size"],
    },
  };

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 300,
    tools: [tool],
    tool_choice: { type: "tool", name: "record_product" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType as "image/jpeg" | "image/png" | "image/webp",
              data: base64,
            },
          },
          {
            type: "text",
            text: "Identify this product for a small shop listing. Return the product name, whether it is apparel or food, and a suggested size.",
          },
        ],
      },
    ],
  });

  const block = msg.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") {
    return {
      name: "",
      category: "apparel",
      suggested_size: "M",
      size_options: SIZE_OPTIONS.apparel,
    };
  }

  const input = block.input as {
    name?: string;
    category?: Category;
    suggested_size?: string;
  };
  const category: Category = input.category === "food" ? "food" : "apparel";
  const options = SIZE_OPTIONS[category];
  const suggested =
    input.suggested_size && options.includes(input.suggested_size)
      ? input.suggested_size
      : options[Math.floor(options.length / 2)];

  return {
    name: (input.name || "").slice(0, 60),
    category,
    suggested_size: suggested,
    size_options: options,
  };
}
