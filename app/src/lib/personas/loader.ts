import fs from "fs";
import path from "path";
import { Persona } from "@/types";
import { parsePersonaMarkdown, serializePersonaMarkdown } from "./parser";

const PERSONAS_DIR = path.resolve(process.cwd(), "../personas");

/**
 * Ensures the personas directory exists.
 */
function ensureDir() {
  if (!fs.existsSync(PERSONAS_DIR)) {
    fs.mkdirSync(PERSONAS_DIR, { recursive: true });
  }
}

/**
 * Load all personas from the personas directory.
 */
export async function loadAllPersonas(): Promise<Persona[]> {
  ensureDir();
  try {
    const files = fs.readdirSync(PERSONAS_DIR);
    const personaFiles = files.filter(
      (f) => f.startsWith("persona-") && f.endsWith(".md")
    );

    const personas: Persona[] = [];
    for (const file of personaFiles) {
      const fullPath = path.join(PERSONAS_DIR, file);
      const content = fs.readFileSync(fullPath, "utf-8");
      // Use filename without extension as default ID if we don't have one
      const id = file.replace("persona-", "").replace(".md", "");
      try {
        const parsed = parsePersonaMarkdown(content, id, file);
        personas.push(parsed);
      } catch (err) {
        console.error(`Error parsing persona file ${file}:`, err);
      }
    }

    return personas;
  } catch (error) {
    console.error("Failed to load personas:", error);
    return [];
  }
}

/**
 * Load a single persona by its ID (filename key).
 */
export async function loadPersonaById(id: string): Promise<Persona | null> {
  ensureDir();
  const fileName = `persona-${id}.md`;
  const fullPath = path.join(PERSONAS_DIR, fileName);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(fullPath, "utf-8");
    return parsePersonaMarkdown(content, id, fileName);
  } catch (error) {
    console.error(`Failed to load persona ${id}:`, error);
    return null;
  }
}

/**
 * Saves a persona back to its markdown file.
 */
export async function savePersona(persona: Persona): Promise<boolean> {
  ensureDir();
  const fileName = persona.fileName || `persona-${persona.id}.md`;
  const fullPath = path.join(PERSONAS_DIR, fileName);

  try {
    persona.lastEdited = new Date().toISOString();
    const markdown = serializePersonaMarkdown(persona);
    fs.writeFileSync(fullPath, markdown, "utf-8");
    return true;
  } catch (error) {
    console.error(`Failed to save persona ${persona.id}:`, error);
    return false;
  }
}

/**
 * Loads and parses Capx knowledge base facts from capx.md.
 */
export async function loadCapxFacts(): Promise<string[]> {
  ensureDir();
  const capxPath = path.join(PERSONAS_DIR, "capx.md");
  if (!fs.existsSync(capxPath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(capxPath, "utf-8");
    const lines = content.split("\n");
    const facts: string[] = [];

    let insideForbiddenSection = false;

    for (const line of lines) {
      const cleanLine = line.trim();

      // Skip the forbidden section if listed (e.g. things they should not claim)
      if (cleanLine.includes("Things Personas Should NOT Claim")) {
        insideForbiddenSection = true;
        continue;
      }
      if (insideForbiddenSection && cleanLine.startsWith("##")) {
        insideForbiddenSection = false;
      }

      if (insideForbiddenSection) {
        continue;
      }

      // Extract bullet points that are not headers or placeholders
      if (
        (cleanLine.startsWith("-") || cleanLine.startsWith("*")) &&
        !cleanLine.includes("USER TO FILL") &&
        !cleanLine.includes("[e.g.")
      ) {
        const fact = cleanLine.replace(/^[-*\s]+/, "").trim();
        if (fact) {
          facts.push(fact);
        }
      }
    }

    return facts;
  } catch (error) {
    console.error("Failed to load Capx facts:", error);
    return [];
  }
}

