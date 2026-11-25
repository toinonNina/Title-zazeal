# Titreur : générateur de titres de stream Twitch

Choisis ton jeu dans le catalogue Twitch, ton humeur (Chill, Tryhard, Rage, Délire…) ou le **mode apéro**. L'IA (Groq gratuit, ou Claude) te propose 8 titres, et tu les appliques à ta chaîne en un clic.

- Recherche en direct dans tout le catalogue Twitch (avec jaquettes), plus les jeux les plus regardés du moment
- Affichage du titre et de la catégorie actuels de ta chaîne
- Bouton **Appliquer** : change le titre (et la catégorie si tu le veux) de ta chaîne
- Humeurs combinables, mode apéro sur 4 niveaux, langue, longueur, emojis, contexte, commandes (`!discord`)
- Compteur sur 140 caractères (limite Twitch), retouche directe, copie, favoris
- **Bonus : un bot qui répond à ton chat avec l'IA** (page `bot.html`, voir plus bas)
- IA au choix : **Groq** (gratuit), **Claude** (payant à l'usage) ou une **IA locale** sur ton PC (Ollama, LM Studio)
- 100 % statique : aucun serveur, hébergeable gratuitement sur GitHub Pages

---

## Installation en 4 étapes (environ 10 minutes)

### 1. Mettre le projet sur GitHub

1. Crée un dépôt **public** sur GitHub, par exemple `titres-twitch`.
2. Envoie-y tous les fichiers de ce dossier (`index.html`, `app.js`, `style.css`, `config.js`, `.nojekyll`, `README.md`).
   Le plus simple : sur la page du dépôt, clique sur **Add file → Upload files**, puis glisse les fichiers.
3. Va dans **Settings → Pages**. Sous *Build and deployment*, choisis **Deploy from a branch**, branche `main`, dossier `/ (root)`, puis clique sur **Save**.
4. Au bout d'une minute environ, ton site est en ligne à l'adresse :
   `https://TON-PSEUDO-GITHUB.github.io/titres-twitch/`

> Note bien cette adresse **exacte**, avec le `/` final. Elle sert à l'étape suivante.

### 2. Créer ton application Twitch

1. Va sur <https://dev.twitch.tv/console/apps> et connecte-toi avec ton compte Twitch. L'authentification à deux facteurs doit être activée sur ton compte.
2. Clique sur **Register Your Application** et remplis :
   - **Name** : un nom unique, par exemple `titreur-tonpseudo`
   - **OAuth Redirect URLs** : l'adresse exacte de l'étape 1, par exemple `https://tonpseudo.github.io/titres-twitch/`
   - **Category** : `Application Integration`
   - **Client Type** : **Public**
3. Clique sur **Create**, puis sur **Manage** : copie le **Client ID**.

> Le Client ID n'est pas un secret, il peut être public. Le **Client Secret**, en revanche, ne doit jamais être mis dans ce projet (il n'en a pas besoin).

### 3. Renseigner le Client ID

Ouvre `config.js` sur GitHub (icône crayon pour l'éditer), puis remplace :

```js
TWITCH_CLIENT_ID: "COLLE_TON_CLIENT_ID_ICI",
```

par ton Client ID, et enregistre avec **Commit changes**. Le site se met à jour en une minute environ.

### 4. Ajouter une clé d'IA (gratuite avec Groq)

Par défaut, l'application utilise **Groq**, qui propose une offre gratuite sans carte bancaire.

1. Crée un compte sur <https://console.groq.com>, puis une clé dans **API Keys**. Elle commence par `gsk_`.
2. Sur ton site, clique sur **Réglages IA**, laisse « Groq (gratuit) », colle la clé, puis clique sur **Enregistrer**.

Le modèle recommandé est `openai/gpt-oss-120b`. L'offre gratuite limite le nombre de demandes par minute et par jour, ce qui suffit largement pour quelques générations avant chaque live. Si la limite est atteinte, l'application te demande de patienter une minute.

**Option payante : Claude.** Dans **Réglages IA**, choisis « Claude d'Anthropic » et colle une clé créée sur <https://console.anthropic.com/settings/keys>. Une génération coûte une fraction de centime avec Haiku. Pense à fixer une limite de dépense.

La clé est gardée **uniquement dans ton navigateur** (localStorage). Elle n'est jamais mise dans le dépôt GitHub : chaque personne qui utilise le site met sa propre clé.

Sans clé, l'application marche quand même, avec des titres de secours plus simples.

---

## Utilisation

1. Clique sur **Se connecter avec Twitch** et accepte la permission « gérer les informations de diffusion » (`channel:manage:broadcast`). Elle sert uniquement à changer ton titre et ta catégorie.
2. Cherche ton jeu, choisis tes humeurs et active éventuellement le mode apéro.
3. Clique sur **Générer les titres**. Tu peux retoucher un titre en cliquant dessus.
4. Clique sur **Appliquer** : le titre part directement sur ta chaîne. Si la case « Mettre aussi ce jeu sur ma chaîne » est cochée, la catégorie change aussi.

---

## Le bot qui répond au chat (`bot.html`)

Une deuxième page du site, `https://TONPSEUDO.github.io/NOM-DU-DEPOT/bot.html`, fait tourner un bot qui **répond à ton chat avec l'IA**. Il ne fait pas de modération : laisse Wizebot s'en occuper. Il fonctionne tant que la page est ouverte : lance-le au début du live, dans un onglet de ton navigateur.

### Installation (5 minutes)

1. **Crée un compte Twitch pour le bot**, par exemple `TonPseudoBot`. Ce n'est pas obligatoire, tu peux connecter ton propre compte, mais c'est plus clair pour tes viewers.
2. **Fais-en un modérateur de ta chaîne** : tape `/mod TonPseudoBot` dans ton chat. Il pourra ainsi écrire même en mode lent, et Twitch le limitera moins.
3. **Ajoute l'adresse de la page du bot sur dev.twitch.tv** : *Manage* → *OAuth Redirect URLs* → **Add**, puis colle l'adresse de `bot.html` (la page l'affiche avec un bouton *Copier*). Garde l'adresse du générateur de titres, les deux doivent y être.
4. Ouvre `bot.html` et clique sur **Connecter le compte du bot**. Twitch te demande de te connecter : utilise le **compte du bot**. Si tu es déjà connecté avec ton compte, déconnecte-toi sur l'écran Twitch avant de valider.
5. Dans **Chaîne où le bot répond**, mets **ton** pseudo de streamer.
6. Choisis une personnalité et remplis **Ce que le bot doit savoir** : planning, Discord, setup, running gags…
7. Essaie-le avec le champ **Tester**, sans toucher au chat, puis clique sur **Lancer le bot**.

La clé d'IA (Groq ou Claude) est la même que pour le générateur de titres : si tu l'as déjà enregistrée dans ce navigateur, il n'y a rien à refaire.

### Quand il répond

- Quand on le mentionne : `@TonPseudoBot c'est quoi le planning ?`
- Quand on répond à l'un de ses messages (fil de réponse Twitch)
- Avec la commande `!ia` (modifiable) : `!ia t'en penses quoi de ce boss ?`
- Avec des surnoms que tu choisis (optionnel)

Il ignore les autres bots (Wizebot, StreamElements, Nightbot…) et toutes les commandes en `!` qui ne sont pas les siennes, pour ne pas interférer avec Wizebot.

### Anti-spam

- **Délai par viewer** (30 s par défaut) : un même viewer ne peut pas le solliciter en boucle.
- **Délai entre deux réponses** (4 s) et **réponses max par minute** (8) : pour ne pas inonder le chat et pour rester dans les limites gratuites de Groq.
- **Qui peut lui parler** : tout le monde, seulement les abonnés, VIP et modos, ou seulement les modos.

### Mode test

Coche **Mode test** : le bot lit le vrai chat et affiche ce qu'il aurait répondu, mais **n'envoie rien**. C'est idéal pour régler sa personnalité pendant un live sans risque.

### Coût

- Avec **Groq** : gratuit, dans la limite des quotas de l'offre gratuite.
- Avec **Claude Haiku** : environ 0,02 centime par réponse, soit environ 2 centimes pour 100 réponses.

### Bon à savoir

- **La page doit rester ouverte** pendant le live. Si l'onglet est fermé ou l'ordinateur se met en veille, le bot s'arrête. Il se reconnecte tout seul après une coupure réseau.
- Le bot dit franchement qu'il est une IA si on le lui demande, ne parle jamais à ta place et n'invente pas d'infos sur ton stream.
- Tout ce que le bot écrit apparaît dans le fil **Chat en direct** de la page, pour garder un œil dessus.

---

## Utiliser une IA locale (Ollama ou LM Studio)

Au lieu de Groq ou Claude, les deux pages peuvent utiliser une IA qui tourne **sur ton PC**. C'est 100 % gratuit, rien ne sort de chez toi, et il n'y a aucune limite de quota.

**À savoir avant de te lancer :**
- **Il faut une bonne carte graphique.** Un petit modèle (environ 8 milliards de paramètres) demande à peu près 8 Go de mémoire vidéo. Un modèle plus doué en français, comme Mistral Small, en demande nettement plus.
- **Elle partage le PC avec ton jeu et OBS.** Pendant un live, l'IA consomme la carte graphique au moment où elle répond, ce qui peut faire baisser tes FPS. Si ton PC est juste, reste sur Groq pour le bot.
- **La page du site doit être ouverte sur le PC où tourne l'IA**, puisqu'elle l'appelle à l'adresse `localhost`.

### Avec Ollama

1. Installe Ollama depuis <https://ollama.com>, puis télécharge un modèle. Dans un terminal :
   ```
   ollama pull mistral-small3.2
   ```
   Sur une carte plus modeste, prends un modèle plus léger, par exemple `ollama pull qwen3:8b`.
2. **Autorise ton site à parler à Ollama.** Remplace l'adresse par celle de ton site GitHub, **sans** le nom du dépôt :
   - Windows (PowerShell) :
     ```
     setx OLLAMA_ORIGINS "https://tonpseudo.github.io"
     ```
     Puis **quitte Ollama** (icône près de l'horloge → *Quit*) et relance-le.
   - macOS :
     ```
     launchctl setenv OLLAMA_ORIGINS "https://tonpseudo.github.io"
     ```
     Puis quitte et relance l'application Ollama.
3. Sur ton site, ouvre **Réglages IA** et choisis **IA locale**. Laisse l'adresse `http://localhost:11434/v1`, choisis ton modèle dans la liste, puis clique sur **Enregistrer**.

### Avec LM Studio

1. Installe LM Studio depuis <https://lmstudio.ai> et télécharge un modèle.
2. Onglet **Developer** : charge le modèle, active **Enable CORS** dans les réglages du serveur, puis démarre le serveur (**Start Server**).
3. Sur ton site, dans **Réglages IA**, choisis **IA locale** et mets l'adresse `http://localhost:1234/v1`.

### Le navigateur demande l'« accès au réseau local »

Les versions récentes de Chrome demandent ton accord quand un site en ligne veut joindre un logiciel installé sur ton PC. Clique sur **Autoriser**. Si tu as refusé par erreur, clique sur l'icône à gauche de l'adresse du site, puis réautorise l'accès au réseau local.

Si la liste des modèles reste vide, vérifie dans l'ordre : Ollama ou LM Studio est bien lancé, un modèle est téléchargé, l'autorisation CORS est faite (et Ollama a été redémarré), et l'accès au réseau local est accepté.

---

## Sécurité : ce qu'il faut savoir

- **Jeton Twitch** : il est stocké dans ton navigateur, revérifié toutes les heures et révoqué quand tu cliques sur *Déconnexion*. Il expire de lui-même au bout de quelques heures ; il suffit alors de te reconnecter.
- **Clé d'IA (Groq ou Anthropic)** : elle est envoyée directement du navigateur au fournisseur choisi (`api.groq.com` ou `api.anthropic.com`). Quelqu'un qui a accès à ton navigateur pourrait la lire. Ne l'utilise pas sur un ordinateur partagé ; pour Claude, fixe une **limite de dépense**.
- Le site n'a **aucun serveur** : rien n'est envoyé ailleurs qu'à Twitch et au fournisseur d'IA choisi (ou ton PC, avec une IA locale).

## Dépannage

| Problème | Solution |
|---|---|
| Après la connexion, Twitch affiche « redirect_mismatch » | L'adresse dans *OAuth Redirect URLs* doit être identique à celle de la page, au caractère près (`https`, `/` final). Tu peux aussi la forcer avec `REDIRECT_URI` dans `config.js`. |
| « Mode démo » reste affiché | Le Client ID n'est pas renseigné dans `config.js`, ou GitHub Pages n'a pas encore été mis à jour (attends une minute, puis recharge avec Ctrl+F5). |
| « Clé API refusée » | Vérifie la clé dans *Réglages IA* (et, pour Claude, le crédit de ton compte). |
| « Limite gratuite de Groq atteinte » | Patiente une minute, ou choisis un autre modèle Groq dans *Réglages IA*. |
| « Impossible de joindre Groq depuis le navigateur » | Désactive ton bloqueur de pub sur le site. Si ça persiste, Groq refuse peut-être les appels venant d'un navigateur : passe sur Claude dans *Réglages IA* ou préviens-moi pour une solution avec un petit relais gratuit. |
| « Modèle indisponible » | Choisis un autre modèle dans *Réglages IA*, ou mets un nom de modèle à jour dans `config.js` (`GROQ_MODEL` / `CLAUDE_MODEL`). |
| « Permission manquante » en appliquant | Déconnecte-toi puis reconnecte-toi pour accorder à nouveau la permission. |
| Le bot ne répond pas dans le chat | Vérifie que le statut est « En ligne » et pas « Mode test », que le viewer l'a bien mentionné ou a tapé la commande, et que le bot est modérateur de la chaîne. |
| « Twitch limite l'envoi de messages » | Fais du bot un modérateur (`/mod TonPseudoBot`). |

## Tester en local (facultatif)

```bash
python3 -m http.server 8000
```

Ouvre ensuite <http://localhost:8000/>. Pour que la connexion Twitch marche en local, ajoute aussi `http://localhost:8000/` dans les *OAuth Redirect URLs* de ton application Twitch.

## Structure

```
index.html   la page
style.css    le style (sombre ou clair selon ton système ; orange en mode apéro)
app.js       la logique du générateur : connexion Twitch, API Helix, appel à l'IA, favoris
bot.html     la page du bot qui répond au chat
bot.js       la logique du bot : lecture du chat en direct (EventSub), réponses IA, envoi dans le chat
bot.css      le style propre à la page du bot
config.js    ton Client ID Twitch, le fournisseur et les modèles par défaut
.nojekyll    indique à GitHub Pages de servir les fichiers tels quels
```

Application indépendante, non affiliée à Twitch ni à Amazon.
