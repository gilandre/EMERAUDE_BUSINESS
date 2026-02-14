import { prisma } from "@/lib/prisma";

/**
 * Rendu de templates avec variables {{variable}}
 */
export class TemplateService {
  /**
   * Remplace les variables {{key}} dans le texte
   */
  async render(
    template: string,
    variables: Record<string, string> = {}
  ): Promise<string> {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g");
      result = result.replace(regex, value ?? "");
    }
    return result;
  }

  /**
   * Charge un template depuis la BDD et le rend
   */
  async renderFromCode(
    templateCode: string,
    variables: Record<string, string> = {}
  ): Promise<{ sujet?: string; corps: string }> {
    const template = await prisma.alerteTemplate.findUnique({
      where: { code: templateCode },
    });

    if (!template) {
      throw new Error(`Template ${templateCode} introuvable`);
    }

    const corps = await this.render(template.corps, variables);
    const sujet = template.sujet
      ? await this.render(template.sujet, variables)
      : undefined;

    return { sujet, corps };
  }
}

export const templateService = new TemplateService();
