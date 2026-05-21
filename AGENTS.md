# Règles de Déploiement et Résolution des Erreurs (Dokploy, etc.)

Pour éviter de reproduire les erreurs 404 et Bad Gateway (502) lors du déploiement de projets full-stack, l'agent DOIT respecter strictement ces règles pour tous les futurs changements :

1. **Ports et Hôte (0.0.0.0:3000)** :
   - Le serveur (Express, Vite, etc.) doit TOUJOURS écouter sur le port `3000`.
   - Le serveur doit impérativement s'attacher à l'hôte `0.0.0.0` (et non localhost/127.0.0.1) afin de pouvoir recevoir le trafic du proxy inversé comme Dokploy ou Cloud Run.
   - Exemple : `app.listen(3000, '0.0.0.0', () ...)`

2. **Configuration Dockerfile** :
   - Exposer uniquement le port 3000 : `EXPOSE 3000`
   - Définir la variable d'environnement : `ENV PORT=3000`
   - Ne jamais forcer le port 80 dans le conteneur. Le routeur externe (Dokploy) se charge de mapper le trafic entrant (80/443) vers le port 3000 du conteneur.

3. **Scripts de Démarrage (package.json)** :
   - S'assurer que le script de build génère bien le serveur backend (ex: avec esbuild vers `dist/server.cjs`).
   - Le `CMD` du Dockerfile et le script `start` de Node doivent lancer ce fichier compilé exact.
