// =====================================================================
//  CONFIGURATION — la seule chose à modifier avant de mettre en ligne
// =====================================================================
window.APP_CONFIG = {
  // Client ID de ton application Twitch (https://dev.twitch.tv/console/apps)
  // Ce n'est PAS un secret : il peut être public. Ne mets jamais le "Client Secret" ici.
  TWITCH_CLIENT_ID: "yi3hyhva0u1oq9lpd56h7naoepi9ku",

  // Adresse de retour après la connexion Twitch.
  // Laisse vide : l'adresse de la page est utilisée automatiquement
  // (ex. https://tonpseudo.github.io/titres-twitch/).
  // Elle doit être IDENTIQUE à l'« OAuth Redirect URL » déclarée sur dev.twitch.tv.
  REDIRECT_URI: "",

  // Fournisseur d'IA proposé par défaut : "groq" (gratuit) ou "claude" (payant à l'usage).
  // Chaque utilisateur peut changer dans « Réglages IA ».
  AI_PROVIDER: "groq",

  // Modèles par défaut (modifiables dans les réglages de l'appli).
  // Liste à jour des modèles Groq : https://console.groq.com/docs/models
  GROQ_MODEL: "openai/gpt-oss-120b",
  CLAUDE_MODEL: "claude-haiku-5-5"
};
