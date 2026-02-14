import { NextRequest, NextResponse } from "next/server";
import { conversionService } from "@/services/devises/conversion.service";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const montant = parseFloat(searchParams.get("montant") || "0");
  const fromCode = searchParams.get("from") || "XOF";
  const toCode = searchParams.get("to");

  if (toCode) {
    // Conversion vers une devise spécifique
    const montantConverti = await conversionService.convertir(
      montant,
      fromCode,
      toCode
    );

    return NextResponse.json({
      montantOriginal: montant,
      deviseOriginal: fromCode,
      montantConverti: parseFloat(montantConverti.toString()),
      deviseConvertie: toCode,
    });
  } else {
    // Conversion vers toutes les devises actives
    const devises = await conversionService.getDevisesActives();
    const conversions: {
      devise: string;
      nom: string;
      symbole: string;
      montant: number;
    }[] = [];

    for (const devise of devises) {
      if (devise.code === fromCode) continue;

      const montantConverti = await conversionService.convertir(
        montant,
        fromCode,
        devise.code
      );

      conversions.push({
        devise: devise.code,
        nom: devise.nom,
        symbole: devise.symbole,
        montant: parseFloat(montantConverti.toString()),
      });
    }

    return NextResponse.json(conversions);
  }
}
