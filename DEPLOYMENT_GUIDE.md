# Guide de Déploiement et Utilisation

## Table des matières
1. [Installation](#installation)
2. [Configuration](#configuration)
3. [Déploiement](#déploiement)
4. [API Documentation](#api-documentation)
5. [Architecture](#architecture)
6. [Dépannage](#dépannage)

---

## Installation

### Prérequis
- Node.js 18+ 
- PostgreSQL 14+
- npm ou yarn

### Étapes

```bash
# 1. Cloner le repo
cd gestion_bls_export_oocl

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env.local
# Éditer .env.local et ajouter DATABASE_URL

# 4. Créer la base de données
npm run db:push

# 5. Lancer en développement
npm run dev
```

---

## Configuration

### Variables d'environnement (.env.local)

```bash
# DATABASE - PostgreSQL Connection String
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"

# NODE - Environment
NODE_ENV="development"  # ou "production"

# Optional: Prisma Debug
# DEBUG="prisma:*"
```

### Fichiers de configuration
- `next.config.ts` - Configuration Next.js
- `prisma/schema.prisma` - Schéma de base de données
- `tsconfig.json` - Configuration TypeScript
- `tailwind.config.ts` - Configuration Tailwind CSS (si utilisé)

---

## Déploiement

### Deployer sur Vercel (Recommandé)

```bash
# 1. Créer un compte Vercel et link le repo
vercel link

# 2. Ajouter les variables d'environnement sur Vercel
# Dashboard > Project Settings > Environment Variables
# DATABASE_URL=...

# 3. Déployer
vercel deploy --prod

# 4. Exécuter les migrations
vercel env pull .env.local
npm run db:migrate
```

### Deployer localement (Production)

```bash
# 1. Build
npm run build

# 2. Start
npm run start

# Application sera accessible à http://localhost:3000
```

### Avec Docker

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm run build

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

```bash
# Build & run
docker build -t gestion-bls .
docker run -e DATABASE_URL="..." -p 3000:3000 gestion-bls
```

---

## API Documentation

### Base URL
- Development: `http://localhost:3000/api`
- Production: `https://your-domain.com/api`

### Authentication
*À implémenter*: Ajouter les headers Authorization

```javascript
fetch('/api/voyages', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
```

---

### Endpoints

#### **Voyages (Passages de navires)**

##### GET /api/voyages
Récupérer tous les voyages avec pagination

**Query Parameters:**
- `skip` (number): Nombre d'items à sauter (défaut: 0)
- `take` (number): Nombre d'items à retourner (défaut: 50)

**Response:**
```json
{
  "data": [
    {
      "id": "cuid_...",
      "numero": "014E",
      "eta": "2026-05-20T00:00:00Z",
      "etd": "2026-05-15T00:00:00Z",
      "tauxDollar": "600 XOF",
      "navireId": "cuid_...",
      "navire": {
        "id": "cuid_...",
        "nom": "ONE PRESENCE",
        "coque": null
      },
      "bls": [
        {
          "id": "cuid_...",
          "booking": "001234567",
          "shipper": "ABC Shipping",
          "pod": "DAKAR",
          "statut": "RETIRE",
          "createdAt": "2026-05-17T...",
          "updatedAt": "2026-05-17T..."
        }
      ]
    }
  ],
  "total": 45,
  "skip": 0,
  "take": 50,
  "hasMore": false
}
```

##### POST /api/voyages
Créer un nouveau voyage (manuel ou depuis Excel)

**Request Body (Manuel):**
```json
{
  "manual": true,
  "navireId": "cuid_...",
  "numero": "014E",
  "eta": "2026-05-20",
  "etd": "2026-05-15",
  "tauxDollar": "600"
}
```

**Request Body (Excel):**
```json
{
  "header": {
    "navire": "ONE PRESENCE",
    "voyage": "014E",
    "eta": "2026-05-20",
    "etd": "2026-05-15",
    "tauxDollar": "600"
  },
  "bls": [
    {
      "booking": "001234567",
      "shipper": "ABC Shipping",
      "pod": "DAKAR",
      "statut": "RETIRE",
      "montantFret": "500000",
      "dateRetrait": "2026-05-19"
    }
  ]
}
```

---

#### **BLs (Bills of Lading)**

##### GET /api/bls
Récupérer les BLs avec filtrage optionnel

**Query Parameters:**
- `voyageId` (string): Filter by voyage
- `skip` (number): Pagination
- `take` (number): Pagination

**Response:**
```json
{
  "data": [
    {
      "id": "cuid_...",
      "booking": "001234567",
      "shipper": "ABC Shipping",
      "pod": "DAKAR",
      "statut": "RETIRE",
      "montantFret": "500000",
      "dateRetrait": "2026-05-19",
      "autresCharges": [
        {
          "id": "cuid_...",
          "type": "FRAIS_PORT",
          "montant": "50000"
        }
      ],
      "createdAt": "2026-05-17T...",
      "updatedAt": "2026-05-17T..."
    }
  ],
  "total": 120,
  "skip": 0,
  "take": 50,
  "hasMore": true
}
```

##### POST /api/bls
Créer un nouveau BL

**Request Body:**
```json
{
  "booking": "001234567",
  "voyageId": "cuid_...",
  "shipper": "ABC Shipping",
  "pod": "DAKAR",
  "statut": "EN ATTENTE RETRAIT",
  "montantFret": "500000",
  "dateRetrait": "2026-05-19",
  "autresCharges": [
    {
      "type": "FRAIS_PORT",
      "montant": "50000"
    }
  ]
}
```

---

#### **Navires (Ships)**

##### GET /api/navires
Récupérer tous les navires

**Response:**
```json
[
  {
    "id": "cuid_...",
    "nom": "ONE PRESENCE",
    "coqueId": null,
    "coque": null,
    "voyages": [],
    "createdAt": "2026-05-17T...",
    "updatedAt": "2026-05-17T..."
  }
]
```

##### POST /api/navires
Créer ou mettre à jour un navire

**Request Body:**
```json
{
  "nom": "ONE PRESENCE",
  "coqueId": null
}
```

##### PATCH /api/navires/[id]
Mettre à jour un navire

**Request Body:**
```json
{
  "nom": "ONE PRESENCE UPDATED",
  "coqueId": "cuid_..."
}
```

##### DELETE /api/navires/[id]
Supprimer un navire

---

#### **Coques (Ship Hulls)**

##### GET /api/coques
Récupérer toutes les coques

##### POST /api/coques
Créer une coque

```json
{
  "nom": "PEC-2500"
}
```

---

#### **Types de Charges**

##### GET /api/type-charges
Récupérer tous les types

##### POST /api/type-charges
Créer un type

```json
{
  "nom": "FRAIS_PORT"
}
```

##### DELETE /api/type-charges/[id]
Supprimer un type

---

#### **Raisons de Retour**

##### GET /api/raison-retour
Récupérer toutes les raisons

##### POST /api/raison-retour
Créer une raison

```json
{
  "nom": "ERRATA_SHIPPER"
}
```

---

## Architecture

### Structure du projet

```
src/
├── app/
│   ├── api/
│   │   ├── bls/
│   │   ├── voyages/
│   │   ├── navires/
│   │   ├── coques/
│   │   ├── type-charges/
│   │   └── raison-retour/
│   └── page.tsx
├── components/
│   ├── AddBlModal.tsx
│   ├── BLUploadModal.tsx
│   ├── VoyageCard.tsx
│   └── ...
├── hooks/
│   └── useVoyages.ts
└── lib/
    ├── types.ts          # Type definitions
    ├── validation.ts     # Input validation
    ├── logger.ts         # Structured logging
    ├── apiResponse.ts    # Response helpers
    ├── auth.ts           # Authentication
    └── prisma.ts         # Database client
```

### Stack Technologique
- **Framework**: Next.js 16
- **Language**: TypeScript 5
- **Database**: PostgreSQL + Prisma ORM
- **UI**: React 19 + Tailwind CSS
- **Icons**: Lucide React
- **File Format**: Excel (XLSX) support via SheetJS

### Modèle de données

```
Navire (Ships)
├── Coque (Hull)
└── Voyage (Voyages)
    ├── BL (Bills of Lading)
    │   └── AutreCharge (Additional Charges)
    ├── TypeCharge (Charge Types)
    └── RaisonRetour (Return Reasons)
```

---

## Dépannage

### Erreurs courantes

#### 1. DATABASE_URL not found
**Problème**: `Error: DATABASE_URL environment variable is not set`

**Solution**:
```bash
# Vérifier que .env.local existe
ls -la .env.local

# S'assurer qu'il contient DATABASE_URL
cat .env.local | grep DATABASE_URL
```

#### 2. Port 3000 déjà en utilisation
```bash
# Trouver le processus
lsof -i :3000

# Tuer le processus
kill -9 <PID>

# Ou utiliser un autre port
PORT=3001 npm run dev
```

#### 3. Erreurs de base de données
```bash
# Regénérer Prisma client
npm run db:generate

# Pousser le schéma
npm run db:push

# Voir les logs
DEBUG=prisma:* npm run dev
```

#### 4. Erreurs de build TypeScript
```bash
# Vérifier les erreurs
npm run build

# Corriger les types
npm install --save-dev @types/node

# Régénérer les types Next.js
rm next-env.d.ts
npm run dev
```

---

## Performance

### Optimisations implémentées
- ✅ Connection pooling (20 connexions max)
- ✅ Query pagination (skip/take)
- ✅ Structured logging
- ✅ Type safety (TypeScript)
- ✅ Efficient queries (Promise.all)

### À améliorer
- [ ] Ajouter Redis caching
- [ ] Ajouter rate limiting
- [ ] Ajouter compression gzip
- [ ] Ajouter CDN pour assets statiques
- [ ] Ajouter monitoring (Sentry)

---

## Support & Contribution

Pour toute question ou bug:
1. Consulter IMPROVEMENTS.md
2. Vérifier les logs (logger.info, logger.error)
3. Ouvrir une issue sur GitHub

---

Generated: 17 mai 2026
