import { Prisma, type Devise } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const { Decimal } = Prisma;

export class ConversionService {
  /**
   * Convertit un montant d'une devise vers XOF (devise de référence)
   */
  async convertirVersXOF(
    montant: number | Prisma.Decimal,
    deviseSourceCode: string,
    date?: Date
  ): Promise<Prisma.Decimal> {
    const montantDecimal = new Decimal(montant.toString());

    // Si déjà en XOF, retourner tel quel
    if (deviseSourceCode === "XOF") {
      return montantDecimal;
    }

    // Récupérer le taux de change
    const taux = await this.getTauxChange(deviseSourceCode, date);

    // Conversion : montant * taux
    return montantDecimal.mul(taux);
  }

  /**
   * Convertit un montant de XOF vers une autre devise
   */
  async convertirDepuisXOF(
    montantXOF: number | Prisma.Decimal,
    deviseDestCode: string,
    date?: Date
  ): Promise<Prisma.Decimal> {
    const montantDecimal = new Decimal(montantXOF.toString());

    // Si destination est XOF, retourner tel quel
    if (deviseDestCode === "XOF") {
      return montantDecimal;
    }

    // Récupérer le taux de change
    const taux = await this.getTauxChange(deviseDestCode, date);

    // Conversion inverse : montantXOF / taux
    return montantDecimal.div(taux);
  }

  /**
   * Convertit un montant d'une devise vers une autre
   */
  async convertir(
    montant: number | Prisma.Decimal,
    deviseSourceCode: string,
    deviseDestCode: string,
    date?: Date
  ): Promise<Prisma.Decimal> {
    // Si même devise, retourner tel quel
    if (deviseSourceCode === deviseDestCode) {
      return new Decimal(montant.toString());
    }

    // Passer par XOF comme pivot
    const montantXOF = await this.convertirVersXOF(
      montant,
      deviseSourceCode,
      date
    );

    return await this.convertirDepuisXOF(
      montantXOF,
      deviseDestCode,
      date
    );
  }

  /**
   * Récupère le taux de change actuel ou historique
   */
  async getTauxChange(
    deviseCode: string,
    date?: Date
  ): Promise<Prisma.Decimal> {
    const dateRecherche = date ?? new Date();

    // Chercher dans l'historique des taux
    const tauxHistorique = await prisma.tauxChange.findFirst({
      where: {
        deviseSourceCode: deviseCode,
        dateDebut: { lte: dateRecherche },
        OR: [
          { dateFin: null },
          { dateFin: { gte: dateRecherche } },
        ],
      },
      orderBy: { dateDebut: "desc" },
    });

    if (tauxHistorique) {
      return tauxHistorique.taux;
    }

    // Sinon, utiliser le taux de base de la devise
    const devise = await prisma.devise.findUnique({
      where: { code: deviseCode },
    });

    if (!devise) {
      throw new Error(`Devise ${deviseCode} non trouvée`);
    }

    return devise.tauxVersXOF;
  }

  /**
   * Formate un montant selon les règles de la devise
   */
  async formaterMontant(
    montant: number | Prisma.Decimal,
    deviseCode: string
  ): Promise<string> {
    const devise = await prisma.devise.findUnique({
      where: { code: deviseCode },
    });

    if (!devise) {
      return montant.toString();
    }

    const montantNum =
      typeof montant === "number" ? montant : parseFloat(montant.toString());

    // Arrondir selon le nombre de décimales
    const montantArrondi = montantNum.toFixed(devise.decimales);

    // Séparer partie entière et décimale
    const [partieEntiere, partieDecimale] = montantArrondi.split(".");

    // Ajouter séparateurs de milliers
    const partieEntiereFormatee = partieEntiere.replace(
      /\B(?=(\d{3})+(?!\d))/g,
      devise.separateurMilliers
    );

    // Construire le montant formaté
    let montantFormate = partieEntiereFormatee;
    if (devise.decimales > 0 && partieDecimale) {
      montantFormate += devise.separateurDecimal + partieDecimale;
    }

    // Ajouter le symbole
    if (devise.positionSymbole === "BEFORE") {
      return `${devise.symbole}${montantFormate}`;
    } else {
      return `${montantFormate} ${devise.symbole}`;
    }
  }

  /**
   * Récupère toutes les devises actives
   */
  async getDevisesActives(): Promise<Devise[]> {
    return await prisma.devise.findMany({
      where: { isActive: true },
      orderBy: [{ isDefault: "desc" }, { code: "asc" }],
    });
  }

  /**
   * Récupère la devise par défaut (XOF)
   */
  async getDeviseParDefaut(): Promise<Devise> {
    const devise = await prisma.devise.findFirst({
      where: { isDefault: true },
    });

    if (!devise) {
      throw new Error("Aucune devise par défaut configurée");
    }

    return devise;
  }

  /**
   * Met à jour les taux de change via API externe
   */
  async mettreAJourTauxAPI(): Promise<void> {
    // Utiliser API gratuite : exchangerate-api.com
    // Ou API de la BCEAO pour les devises CFA

    try {
      const response = await fetch(
        "https://api.exchangerate-api.com/v4/latest/XOF"
      );
      const data = (await response.json()) as {
        rates?: Record<string, number>;
      };

      if (!data.rates) {
        throw new Error("Réponse API invalide");
      }

      // Mettre à jour les taux pour chaque devise
      const devises = await this.getDevisesActives();

      for (const devise of devises) {
        if (devise.code === "XOF") continue;

        const tauxVersXOF = 1 / (data.rates[devise.code] ?? 1);

        await prisma.tauxChange.create({
          data: {
            deviseSourceId: devise.id,
            deviseSourceCode: devise.code,
            taux: new Decimal(tauxVersXOF),
            source: "API",
            dateDebut: new Date(),
          },
        });

        // Mettre à jour le taux de base
        await prisma.devise.update({
          where: { id: devise.id },
          data: { tauxVersXOF: new Decimal(tauxVersXOF) },
        });
      }

      console.log("✅ Taux de change mis à jour depuis l'API");
    } catch (error) {
      console.error("❌ Erreur mise à jour taux:", error);
      throw error;
    }
  }
}

export const conversionService = new ConversionService();
