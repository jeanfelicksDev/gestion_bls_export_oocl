# Gestion BLs Export OOCL

**Plateforme de gestion et d'export des Bills of Lading pour OOCL (Orient Overseas Container Line)**

![Status](https://img.shields.io/badge/status-active-brightgreen) ![TypeScript](https://img.shields.io/badge/language-TypeScript-blue) ![License](https://img.shields.io/badge/license-private-red)

## 📋 À propos

Système complet de gestion des Bills of Lading (BLs) avec:
- 📊 Gestion des voyages de navires
- 📄 Suivi des BLs (numéros de connaissement)
- 💾 Export/Import depuis Excel
- 🔍 Recherche et filtrage avancé
- 📱 Interface responsive
- 🗄️ Base de données PostgreSQL
- ✅ Type-safe avec TypeScript

## 🚀 Démarrage rapide

### Installation

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer la base de données
cp .env.example .env.local
# Éditer .env.local et ajouter DATABASE_URL

# 3. Initialiser la DB
npm run db:push

# 4. Lancer en dev
npm run dev
```

Application accessible à [http://localhost:3000](http://localhost:3000)

## 📚 Documentation

- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Guide complet de déploiement et API
- **[IMPROVEMENTS.md](IMPROVEMENTS.md)** - Résumé des améliorations apportées
- **[.env.example](.env.example)** - Variables d'environnement requises

## 🏗️ Architecture

### Stack Technologique
| Component | Technology |
|-----------|------------|
| Frontend | React 19 + Next.js 16 |
| Backend | Next.js API Routes |
| Database | PostgreSQL + Prisma ORM |
| Language | TypeScript 5 |
| UI Framework | Tailwind CSS 4 |
| Icons | Lucide React |
| File Format | Excel (XLSX) |

### Structure du projet

```
src/
├── app/
│   ├── api/
│   │   ├── bls/              # Bills of Lading
│   │   ├── voyages/          # Ship voyages
│   │   ├── navires/          # Ships
│   │   ├── coques/           # Ship hulls
│   │   ├── type-charges/     # Charge types
│   │   └── raison-retour/    # Return reasons
│   └── page.tsx              # Main page
├── components/               # React components
├── hooks/                    # Custom React hooks
└── lib/
    ├── types.ts              # TypeScript types
    ├── validation.ts         # Input validation
    ├── logger.ts             # Logging system
    ├── apiResponse.ts        # API helpers
    ├── auth.ts               # Authentication (optional)
    └── prisma.ts             # Database client
prisma/
└── schema.prisma             # Database schema
```

## 📊 Modèle de données

```
Navire (Ships)
├── Coque (Hull)
└── Voyage (Voyages)
    ├── BL (Bills of Lading)
    │   └── AutreCharge (Additional Charges)
    ├── TypeCharge (Charge Types)
    └── RaisonRetour (Return Reasons)
```

## 🔧 Commandes disponibles

```bash
# Développement
npm run dev          # Lancer le serveur de dev
npm run build        # Build pour production
npm run start        # Lancer en production

# Base de données
npm run db:push      # Pousser le schéma
npm run db:generate  # Régénérer Prisma client
npm run db:migrate   # Appliquer les migrations

# Linting
npm lint             # Vérifier le code
```

## 🔒 Sécurité

### Implémentée
- ✅ Type safety complet (TypeScript strict)
- ✅ Validation des entrées
- ✅ Gestion centralisée des erreurs
- ✅ Logging structuré
- ✅ Variables sensibles dans `.env.local`
- ✅ Connection pooling sécurisé

### À implémenter
- [ ] Authentification JWT
- [ ] Rate limiting
- [ ] CORS configuration
- [ ] Encryption des données sensibles

## 📈 Performance

### Optimisations
- Pool PostgreSQL: 20 connexions max
- Pagination sur tous les endpoints
- Query optimization avec Prisma
- Lazy loading des relations
- Structured logging (dev only)

## 🐛 Dépannage

### Erreurs courantes

**DATABASE_URL not found**
```bash
# Vérifier .env.local
cat .env.local | grep DATABASE_URL

# Relancer le dev server
npm run dev
```

**Port 3000 en utilisation**
```bash
PORT=3001 npm run dev
```

Voir [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) pour plus de détails.

## 📝 API Documentation

Documentation complète: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md#api-documentation)

## 🚀 Déploiement

Voir [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md#déploiement) pour les options de déploiement.

---

**Dernière mise à jour**: 17 mai 2026
