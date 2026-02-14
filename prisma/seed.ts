import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const { Decimal } = Prisma;

async function main() {
  console.log("🌱 Seeding database...");

  // ═══════════════════════════════════════════
  // 1. PERMISSIONS
  // ═══════════════════════════════════════════
  console.log("📋 Creating permissions...");

  const permissions = [
    { libelle: "Voir marchés", code: "marches:read", module: "marches" },
    { libelle: "Créer marchés", code: "marches:create", module: "marches" },
    { libelle: "Modifier marchés", code: "marches:update", module: "marches" },
    { libelle: "Supprimer marchés", code: "marches:delete", module: "marches" },
    { libelle: "Exporter marchés", code: "marches:export", module: "marches" },
    { libelle: "Voir accomptes", code: "accomptes:read", module: "accomptes" },
    { libelle: "Créer accomptes", code: "accomptes:create", module: "accomptes" },
    { libelle: "Modifier accomptes", code: "accomptes:update", module: "accomptes" },
    { libelle: "Supprimer accomptes", code: "accomptes:delete", module: "accomptes" },
    { libelle: "Voir décaissements", code: "decaissements:read", module: "decaissements" },
    { libelle: "Créer décaissements", code: "decaissements:create", module: "decaissements" },
    { libelle: "Modifier décaissements", code: "decaissements:update", module: "decaissements" },
    { libelle: "Supprimer décaissements", code: "decaissements:delete", module: "decaissements" },
    { libelle: "Valider décaissements", code: "decaissements:validate", module: "decaissements" },
    { libelle: "Voir préfinancements", code: "prefinancements:read", module: "prefinancements" },
    { libelle: "Autoriser préfinancements", code: "prefinancements:authorize", module: "prefinancements" },
    { libelle: "Voir alertes", code: "alertes:read", module: "alertes" },
    { libelle: "Créer alertes", code: "alertes:create", module: "alertes" },
    { libelle: "Modifier alertes", code: "alertes:update", module: "alertes" },
    { libelle: "Supprimer alertes", code: "alertes:delete", module: "alertes" },
    { libelle: "Voir utilisateurs", code: "users:read", module: "administration" },
    { libelle: "Créer utilisateurs", code: "users:create", module: "administration" },
    { libelle: "Modifier utilisateurs", code: "users:update", module: "administration" },
    { libelle: "Supprimer utilisateurs", code: "users:delete", module: "administration" },
    { libelle: "Voir profils", code: "profils:read", module: "administration" },
    { libelle: "Créer profils", code: "profils:create", module: "administration" },
    { libelle: "Modifier profils", code: "profils:update", module: "administration" },
    { libelle: "Supprimer profils", code: "profils:delete", module: "administration" },
    { libelle: "Voir permissions", code: "permissions:read", module: "administration" },
    { libelle: "Gérer permissions", code: "permissions:manage", module: "administration" },
    { libelle: "Voir menus", code: "menus:read", module: "administration" },
    { libelle: "Gérer menus", code: "menus:manage", module: "administration" },
    { libelle: "Voir configuration", code: "config:read", module: "administration" },
    { libelle: "Modifier configuration", code: "config:update", module: "administration" },
    { libelle: "Voir audit", code: "audit:read", module: "audit" },
    { libelle: "Exporter audit", code: "audit:export", module: "audit" },
    { libelle: "Voir monitoring", code: "monitoring:read", module: "monitoring" },
    { libelle: "Voir dashboards", code: "dashboards:read", module: "dashboards" },
    { libelle: "Créer dashboards", code: "dashboards:create", module: "dashboards" },
    { libelle: "Modifier dashboards", code: "dashboards:update", module: "dashboards" },
    { libelle: "Voir rapports", code: "rapports:read", module: "rapports" },
    { libelle: "Créer rapports", code: "rapports:create", module: "rapports" },
    { libelle: "Exécuter rapports", code: "rapports:execute", module: "rapports" },
  ];

  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: {},
      create: p,
    });
  }

  console.log(`✅ ${permissions.length} permissions created`);

  // ═══════════════════════════════════════════
  // 2. PROFILS
  // ═══════════════════════════════════════════
  console.log("👥 Creating profils...");

  const profilAdmin = await prisma.profil.upsert({
    where: { code: "ADMIN" },
    update: {},
    create: {
      code: "ADMIN",
      libelle: "Administrateur",
      description: "Accès complet à toutes les fonctionnalités",
      active: true,
    },
  });

  const profilManager = await prisma.profil.upsert({
    where: { code: "MANAGER" },
    update: {},
    create: {
      code: "MANAGER",
      libelle: "Manager",
      description: "Gestion des marchés et validation des opérations",
      active: true,
    },
  });

  const profilUser = await prisma.profil.upsert({
    where: { code: "USER" },
    update: {},
    create: {
      code: "USER",
      libelle: "Utilisateur",
      description: "Consultation et saisie des données",
      active: true,
    },
  });

  console.log("✅ Profils created");

  // ═══════════════════════════════════════════
  // 3. ASSIGNER PERMISSIONS AUX PROFILS
  // ═══════════════════════════════════════════
  console.log("🔗 Assigning permissions to profils...");

  const allPermissions = await prisma.permission.findMany();

  for (const permission of allPermissions) {
    await prisma.profilPermission.upsert({
      where: {
        profilId_permissionId: {
          profilId: profilAdmin.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        profilId: profilAdmin.id,
        permissionId: permission.id,
      },
    });
  }

  const managerPermCodes = [
    "marches:read",
    "marches:create",
    "marches:update",
    "marches:export",
    "accomptes:read",
    "accomptes:create",
    "accomptes:update",
    "decaissements:read",
    "decaissements:create",
    "decaissements:update",
    "decaissements:validate",
    "prefinancements:read",
    "prefinancements:authorize",
    "alertes:read",
    "dashboards:read",
    "dashboards:create",
    "rapports:read",
    "rapports:execute",
    "audit:read",
  ];

  const managerPerms = allPermissions.filter((p) => managerPermCodes.includes(p.code));
  for (const permission of managerPerms) {
    await prisma.profilPermission.upsert({
      where: {
        profilId_permissionId: {
          profilId: profilManager.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        profilId: profilManager.id,
        permissionId: permission.id,
      },
    });
  }

  const userPermCodes = [
    "marches:read",
    "marches:create",
    "accomptes:read",
    "accomptes:create",
    "decaissements:read",
    "dashboards:read",
    "rapports:read",
  ];

  const userPerms = allPermissions.filter((p) => userPermCodes.includes(p.code));
  for (const permission of userPerms) {
    await prisma.profilPermission.upsert({
      where: {
        profilId_permissionId: {
          profilId: profilUser.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        profilId: profilUser.id,
        permissionId: permission.id,
      },
    });
  }

  console.log("✅ Permissions assigned to profils");

  // Invalider le cache des permissions pour prendre en compte les changements
  try {
    const { cacheDelByPrefix } = await import("@/lib/cache");
    await cacheDelByPrefix("permissions");
    console.log("✅ Permissions cache invalidated");
  } catch {
    // ignore si Redis indisponible
  }

  // ═══════════════════════════════════════════
  // 4. UTILISATEUR ADMIN
  // ═══════════════════════════════════════════
  console.log("👤 Creating admin user...");

  const hashedPassword = await bcrypt.hash("Admin@2026", 10);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@gestionmarches.com" },
    update: {},
    create: {
      email: "admin@gestionmarches.com",
      passwordHash: hashedPassword,
      name: "Administrateur Système",
      nom: "Système",
      prenom: "Administrateur",
      emailVerified: new Date(),
      active: true,
      profilId: profilAdmin.id,
    },
  });

  console.log("✅ Admin user created (admin@gestionmarches.com / Admin@2026)");

  // ═══════════════════════════════════════════
  // 5. MENUS PRINCIPAUX
  // ═══════════════════════════════════════════
  console.log("🗂️ Creating menus...");

  const menuDashboard = await prisma.menu.upsert({
    where: { code: "DASHBOARD" },
    update: {},
    create: {
      code: "DASHBOARD",
      libelle: "Dashboard",
      path: "/dashboard",
      icon: "LayoutDashboard",
      ordre: 1,
      active: true,
    },
  });

  const menuMarches = await prisma.menu.upsert({
    where: { code: "MARCHES" },
    update: {},
    create: {
      code: "MARCHES",
      libelle: "Marchés",
      path: "/marches",
      icon: "Briefcase",
      ordre: 2,
      active: true,
      permission: "marches:read",
    },
  });

  const menuTresorerie = await prisma.menu.upsert({
    where: { code: "TRESORERIE" },
    update: {},
    create: {
      code: "TRESORERIE",
      libelle: "Trésorerie",
      path: "/tresorerie",
      icon: "Wallet",
      ordre: 3,
      active: true,
    },
  });

  const menuAdmin = await prisma.menu.upsert({
    where: { code: "ADMIN" },
    update: {},
    create: {
      code: "ADMIN",
      libelle: "Administration",
      path: "/admin",
      icon: "Settings",
      ordre: 10,
      active: true,
      permission: "users:read",
    },
  });

  const adminMenusData = [
    { code: "ADMIN_USERS", libelle: "Utilisateurs", path: "/admin/utilisateurs", icon: "Users", ordre: 1, permission: "users:read" },
    { code: "ADMIN_PROFILS", libelle: "Profils", path: "/admin/profils", icon: "Shield", ordre: 2, permission: "profils:read" },
    { code: "ADMIN_PERMISSIONS", libelle: "Permissions", path: "/admin/permissions", icon: "Key", ordre: 3, permission: "permissions:read" },
    { code: "ADMIN_MENUS", libelle: "Menus", path: "/admin/menus", icon: "Menu", ordre: 4, permission: "menus:read" },
    { code: "ADMIN_ALERTES", libelle: "Alertes", path: "/admin/alertes", icon: "Bell", ordre: 5, permission: "alertes:read" },
    { code: "ADMIN_DASHBOARDS", libelle: "Dashboards", path: "/admin/dashboards", icon: "BarChart3", ordre: 6, permission: "dashboards:read" },
    { code: "ADMIN_RAPPORTS", libelle: "Rapports", path: "/admin/rapports", icon: "FileText", ordre: 7, permission: "rapports:read" },
    { code: "ADMIN_CONFIG", libelle: "Configuration", path: "/admin/configuration", icon: "Cog", ordre: 8, permission: "config:read" },
    { code: "ADMIN_MONITORING", libelle: "Monitoring", path: "/admin/monitoring", icon: "Activity", ordre: 9, permission: "monitoring:read" },
    { code: "ADMIN_DEVISES", libelle: "Devises", path: "/admin/devises", icon: "DollarSign", ordre: 10, permission: "config:read" },
    { code: "ADMIN_AUDIT", libelle: "Audit", path: "/admin/audit", icon: "FileText", ordre: 11, permission: "audit:read" },
  ];

  for (const m of adminMenusData) {
    await prisma.menu.upsert({
      where: { code: m.code },
      update: { parentId: menuAdmin.id },
      create: {
        ...m,
        parentId: menuAdmin.id,
        active: true,
      },
    });
  }

  const allMenus = await prisma.menu.findMany();
  for (const menu of allMenus) {
    await prisma.profilMenu.upsert({
      where: {
        profilId_menuId: {
          profilId: profilAdmin.id,
          menuId: menu.id,
        },
      },
      update: {},
      create: {
        profilId: profilAdmin.id,
        menuId: menu.id,
      },
    });
  }

  console.log("✅ Menus created and assigned to admin");

  // ═══════════════════════════════════════════
  // 6. RÈGLES D'ALERTES TEMPLATES
  // ═══════════════════════════════════════════
  console.log("🔔 Creating alert rules templates...");

  const alertesTemplates = [
    {
      code: "TRESORERIE_SEUIL",
      libelle: "Seuil de trésorerie atteint",
      description: "Déclenché quand le solde tombe sous un seuil",
      canaux: ["email"],
      regle: { type: "seuil", champ: "solde", operateur: "<" },
      seuils: { soldeMin: 10000 },
      active: true,
    },
    {
      code: "ACOMPTE_RECU",
      libelle: "Accompte encaissé",
      description: "Notification à chaque nouvel accompte",
      canaux: ["email"],
      active: true,
    },
    {
      code: "DECAISSEMENT_VALIDE",
      libelle: "Décaissement validé",
      description: "Confirmation de décaissement",
      canaux: ["email"],
      active: true,
    },
    {
      code: "MARCHE_CREE",
      libelle: "Nouveau marché créé",
      description: "Déclenché à la création d'un marché",
      canaux: ["email"],
      active: true,
    },
    {
      code: "DEADLINE_APPROCHANT",
      libelle: "Échéance marché proche",
      description: "Déclenché quand la date de fin du marché approche",
      canaux: ["email"],
      active: true,
    },
  ];

  for (const a of alertesTemplates) {
    await prisma.alerte.upsert({
      where: { code: a.code },
      update: {},
      create: a,
    });
  }

  // Templates email/SMS pour le moteur d'alertes
  await prisma.alerteTemplate.upsert({
    where: { code: "ALERTE_TRESORERIE" },
    update: {},
    create: {
      code: "ALERTE_TRESORERIE",
      libelle: "Alerte trésorerie",
      canal: "email",
      sujet: "Alerte trésorerie - {{marcheCode}}",
      corps: "Le seuil de trésorerie a été atteint pour le marché {{marcheCode}}. Montant: {{montant}} €.",
      variables: {},
    },
  });

  console.log("✅ Alert rules and templates created");

  // ═══════════════════════════════════════════
  // 7. CONFIGURATION CANAUX (désactivés par défaut)
  // ═══════════════════════════════════════════
  console.log("📡 Creating canal configurations...");

  const canaux = ["EMAIL", "SMS", "PUSH", "WEBHOOK"];

  for (const canal of canaux) {
    await prisma.configurationCanal.upsert({
      where: { canal },
      update: {},
      create: {
        canal,
        isEnabled: false,
        credentials: {},
        config: {},
      },
    });
  }

  console.log("✅ Canal configurations created");

  // ═══════════════════════════════════════════
  // 8. RAPPORTS PRÉDÉFINIS
  // ═══════════════════════════════════════════
  console.log("📊 Creating report templates...");

  const rapportTemplates = [
    { code: "RAPPORT_FINANCIER_MENSUEL", libelle: "Rapport Financier Mensuel", type: "financier" },
    { code: "RAPPORT_TRESORERIE_PAR_MARCHE", libelle: "Rapport Trésorerie par Marché", type: "trésorerie" },
    { code: "RAPPORT_ACCOMPTES_DECAIEMENTS", libelle: "Rapport Accomptes/Décaissements", type: "flux" },
    { code: "RAPPORT_PREFINANCEMENTS", libelle: "Rapport Préfinancements", type: "préfinancement" },
    { code: "RAPPORT_ALERTES_DECLENCHEES", libelle: "Rapport Alertes Déclenchées", type: "alertes" },
    { code: "RAPPORT_AUDIT_UTILISATEURS", libelle: "Rapport Audit Utilisateurs", type: "audit" },
  ];

  for (const r of rapportTemplates) {
    await prisma.rapport.upsert({
      where: { code: r.code },
      update: {},
      create: { ...r, active: true },
    });
  }

  console.log("✅ Report templates created");

  // ═══════════════════════════════════════════
  // 9. DEVISES
  // ═══════════════════════════════════════════
  console.log("💱 Creating devises...");

  const deviseXOF = await prisma.devise.upsert({
    where: { code: "XOF" },
    update: {},
    create: {
      code: "XOF",
      nom: "Franc CFA (BCEAO)",
      symbole: "FCFA",
      isDefault: true,
      isActive: true,
      decimales: 0,
      separateurMilliers: " ",
      separateurDecimal: ",",
      positionSymbole: "AFTER",
      tauxVersXOF: new Decimal(1),
      pays: [
        "Bénin",
        "Burkina Faso",
        "Côte d'Ivoire",
        "Guinée-Bissau",
        "Mali",
        "Niger",
        "Sénégal",
        "Togo",
      ],
      description: "Franc de la Communauté Financière Africaine (Zone UEMOA)",
    },
  });

  const deviseXAF = await prisma.devise.upsert({
    where: { code: "XAF" },
    update: {},
    create: {
      code: "XAF",
      nom: "Franc CFA (BEAC)",
      symbole: "FCFA",
      isActive: true,
      decimales: 0,
      separateurMilliers: " ",
      separateurDecimal: ",",
      positionSymbole: "AFTER",
      tauxVersXOF: new Decimal(1),
      pays: [
        "Cameroun",
        "Centrafrique",
        "Congo",
        "Gabon",
        "Guinée équatoriale",
        "Tchad",
      ],
      description: "Franc de la Coopération Financière en Afrique Centrale (Zone CEMAC)",
    },
  });

  const deviseEUR = await prisma.devise.upsert({
    where: { code: "EUR" },
    update: {},
    create: {
      code: "EUR",
      nom: "Euro",
      symbole: "€",
      isActive: true,
      decimales: 2,
      separateurMilliers: " ",
      separateurDecimal: ",",
      positionSymbole: "AFTER",
      tauxVersXOF: new Decimal(655.957),
      pays: ["France", "Allemagne", "Italie"],
      description: "Monnaie unique de la zone euro",
    },
  });

  const deviseUSD = await prisma.devise.upsert({
    where: { code: "USD" },
    update: {},
    create: {
      code: "USD",
      nom: "Dollar Américain",
      symbole: "$",
      isActive: true,
      decimales: 2,
      separateurMilliers: ",",
      separateurDecimal: ".",
      positionSymbole: "BEFORE",
      tauxVersXOF: new Decimal(600),
      pays: ["États-Unis"],
      description: "Dollar des États-Unis d'Amérique",
    },
  });

  const deviseGBP = await prisma.devise.upsert({
    where: { code: "GBP" },
    update: {},
    create: {
      code: "GBP",
      nom: "Livre Sterling",
      symbole: "£",
      isActive: true,
      decimales: 2,
      separateurMilliers: ",",
      separateurDecimal: ".",
      positionSymbole: "BEFORE",
      tauxVersXOF: new Decimal(780),
      pays: ["Royaume-Uni"],
      description: "Livre du Royaume-Uni",
    },
  });

  console.log("✅ Devises created");

  // ═══════════════════════════════════════════
  // 10. TAUX DE CHANGE INITIAUX
  // ═══════════════════════════════════════════
  console.log("📈 Creating initial exchange rates...");

  const tauxExistants = await prisma.tauxChange.count();
  if (tauxExistants === 0) {
    await prisma.tauxChange.create({
      data: {
        deviseSourceId: deviseEUR.id,
        deviseSourceCode: "EUR",
        taux: new Decimal(655.957),
        source: "BCE",
        dateDebut: new Date(),
        notes: "Taux fixe EUR/XOF",
      },
    });

    await prisma.tauxChange.create({
      data: {
        deviseSourceId: deviseUSD.id,
        deviseSourceCode: "USD",
        taux: new Decimal(600),
        source: "MANUEL",
        dateDebut: new Date(),
        notes: "Taux initial USD/XOF",
      },
    });
  }

  console.log("✅ Initial exchange rates created");

  console.log("\n🎉 Database seeded successfully!");
  console.log("\n📝 Login credentials:");
  console.log("   Email: admin@gestionmarches.com");
  console.log("   Password: Admin@2026");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
