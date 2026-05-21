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
FROM node:20-slim AS production

WORKDIR /app

# Copie des dépendances de production uniquement
COPY package*.json ./
RUN npm install --omit=dev

# Copie du dossier dist (contenant l'app compilée et le serveur)
COPY --from=builder /app/dist ./dist

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=3000

# Exposition du port
EXPOSE 3000

# Commande de démarrage
CMD ["node", "dist/server.cjs"]
