# Titreur : générateur de titres de stream Twitch

Choisis ton jeu dans le catalogue Twitch, ton humeur (Chill, Tryhard, Rage, Délire…) ou le **mode apéro**. L'IA (Groq gratuit, ou Claude) te propose 8 titres, et tu les appliques à ta chaîne en un clic.

- Recherche en direct dans tout le catalogue Twitch (avec jaquettes), plus les jeux les plus regardés du moment
- Affichage du titre et de la catégorie actuels de ta chaîne
- Bouton **Appliquer** : change le titre (et la catégorie si tu le veux) de ta chaîne
- Humeurs combinables, mode apéro sur 4 niveaux, langue, longueur, emojis, contexte, commandes (`!discord`)
- Compteur sur 140 caractères (limite Twitch), retouche directe, copie, favoris
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

## Sécurité : ce qu'il faut savoir

- **Jeton Twitch** : il est stocké dans ton navigateur, revérifié toutes les heures et révoqué quand tu cliques sur *Déconnexion*. Il expire de lui-même au bout de quelques heures ; il suffit alors de te reconnecter.
- **Clé d'IA (Groq ou Anthropic)** : elle est envoyée directement du navigateur au fournisseur choisi (`api.groq.com` ou `api.anthropic.com`). Quelqu'un qui a accès à ton navigateur pourrait la lire. Ne l'utilise pas sur un ordinateur partagé ; pour Claude, fixe une **limite de dépense**.
- Le site n'a **aucun serveur** : rien n'est envoyé ailleurs qu'à Twitch et au fournisseur d'IA choisi.

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

## Tester en local (facultatif)

```bash
python3 -m http.server 8000
```

Ouvre ensuite <http://localhost:8000/>. Pour que la connexion Twitch marche en local, ajoute aussi `http://localhost:8000/` dans les *OAuth Redirect URLs* de ton application Twitch.

## Structure

```
index.html   la page
style.css    le style (sombre ou clair selon ton système ; orange en mode apéro)
app.js       la logique : connexion Twitch, API Helix, appel à l'IA (Groq ou Claude), favoris
config.js    ton Client ID Twitch, le fournisseur et les modèles par défaut
.nojekyll    indique à GitHub Pages de servir les fichiers tels quels
```

Application indépendante, non affiliée à Twitch ni à Amazon.
