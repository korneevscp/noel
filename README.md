# Noël — CTF narratif

Bienvenue à l’Atelier du Pôle Nord. Derrière l’intranet des lutins, quelque chose ne tourne pas rond : des informations se contredisent et certains éléments méritent d’être examinés de plus près.

Ce projet propose un **CTF (Capture The Flag) à explorer dans un navigateur**. Votre objectif est d’enquêter dans cet univers, d’analyser les éléments mis à disposition et de soumettre les flags trouvés sur la page prévue à cet effet.

## Lancer le CTF

Prérequis : Docker et Docker Compose.

Depuis la racine du dépôt, démarrez le site avec :

```sh
docker compose up -d --build
```

Sous Windows, vous pouvez aussi lancer `deployer.bat`.

Ouvrez ensuite [http://localhost:8080](http://localhost:8080) dans votre navigateur.

Pour arrêter les conteneurs :

```sh
docker compose down
```

## Comment jouer

- Explorez le site et les ressources accessibles depuis celui-ci.
- Les épreuves sont présentées dans l’interface du CTF.
- Chaque épreuve possède un flag à retrouver. Vérifiez soigneusement le format demandé dans l’interface avant de le soumettre.
- Des indices facultatifs sont disponibles pour accompagner la progression.
- Le README ne contient ni flag, ni réponse, ni procédure de résolution : l’enquête reste entre vos mains.

## Cadre

Le scénario est fictif et conçu pour être joué localement. N’utilisez les techniques découvertes que sur ce projet ou sur des systèmes pour lesquels vous avez une autorisation explicite.

## Technologies

Le site est servi par Nginx dans un conteneur Docker. Les fichiers de l’application web se trouvent dans le dossier `docs/`.
