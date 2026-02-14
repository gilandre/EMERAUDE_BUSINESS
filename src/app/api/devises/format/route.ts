import { NextRequest, NextResponse } from "next/server";
import { conversionService } from "@/services/devises/conversion.service";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const montant = parseFloat(searchParams.get("montant") || "0");
  const deviseCode = searchParams.get("devise") || "XOF";

  const montantFormate = await conversionService.formaterMontant(
    montant,
    deviseCode
  );

  return new NextResponse(montantFormate);
}
