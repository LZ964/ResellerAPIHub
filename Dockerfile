# Étape 1 : Build du frontend et du backend
FROM node:20-slim AS builder

WORKDIR /app

# Copie des fichiers de dépendances
COPY package*.json ./
RUN npm install

# Copie du reste du code
COPY . .

# Build de l'application (Vite + Server bundle)
RUN npm run build

# Étape 2 : Image de production
FROM node:20-slim

WORKDIR /app

# Copie des dépendances de production uniquement
COPY package*.json ./
RUN npm install --omit=dev

# Copie du dossier dist (contenant l'app compilée et le serveur)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/firebase-applet-config.json ./

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=3000

# Exposition du port
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { if (res.statusCode === 200) process.exit(0); else process.exit(1); }).on('error', () => process.exit(1))"

# Commande de démarrage
CMD ["node", "dist/server.cjs"]
