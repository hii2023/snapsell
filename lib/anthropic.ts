import Anthropic from "@anthropic-ai/sdk";
import type { VisionResult, Category } from "./types";
import { SIZE_OPTIONS, COLORS } from "./constants";

const MODEL = "claude-sonnet-4-6";

// Reads a product photo and returns name + category + suggested size + colour.
// Falls back to a safe stub if no API key is set, so the seller flow still works
// during local setup before the key is wired up.
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
      suggested_color: "",
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
            "Short product name a shopkeeper would use, e.g. 'Cotton T-shirt', 'Basmati Rice', 'Bluetooth Speaker', 'Wooden Chair'. Max 4 words.",
        },
        category: {
          type: "string",
          enum: ["apparel", "food", "electronics", "furniture", "cleaning", "jewellery", "cosmetics"],
          description:
            "apparel = clothing/wearables, food = edible/grocery, electronics = gadgets/devices, furniture = chairs/tables/home furniture, cleaning = cleaning supplies/chemicals/detergents, jewellery = rings/necklaces/earrings/ornaments, cosmetics = makeup/beauty/skincare.",
        },
        suggested_size: {
          type: "string",
          description:
            "Best guess. Apparel: S/M/L/XL/XXL/Free. Food: weight like 250g/1kg. Electronics: Laptop/Mobile/Other. Furniture: Small/Medium/Large. Cleaning: volume like 500ml/1L.",
        },
        suggested_color: {
          type: "string",
          description:
            "Dominant colour as a single word: Black, White, Grey, Red, Blue, Green, Yellow, Pink, Brown, Beige. Empty if unclear.",
        },
      },
      required: ["name", "category", "suggested_size", "suggested_color"],
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
            text: "Identify this product for a small shop listing. Return the product name, category, a suggested size, and the dominant colour.",
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
      suggested_color: "",
      size_options: SIZE_OPTIONS.apparel,
    };
  }

  const input = block.input as {
    name?: string;
    category?: Category;
    suggested_size?: string;
    suggested_color?: string;
  };
  const valid: Category[] = [
    "apparel",
    "food",
    "electronics",
    "furniture",
    "cleaning",
    "jewellery",
    "cosmetics",
  ];
  const category: Category = valid.includes(input.category as Category)
    ? (input.category as Category)
    : "apparel";
  const options = SIZE_OPTIONS[category];
  const suggested =
    input.suggested_size && options.includes(input.suggested_size)
      ? input.suggested_size
      : "";
  const colorMatch = COLORS.find(
    (c) => c.name.toLowerCase() === (input.suggested_color || "").toLowerCase()
  );

  return {
    name: (input.name || "").slice(0, 60),
    category,
    suggested_size: suggested,
    suggested_color: colorMatch?.name || "",
    size_options: options,
  };
}
