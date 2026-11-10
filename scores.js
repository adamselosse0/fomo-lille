/*
  CLASSEMENTS DU FOMO
  -------------------
  C'est le seul fichier à modifier pour mettre les scores à jour.
  - Ajoute, modifie ou supprime des joueurs dans les listes ci-dessous.
  - L'ordre n'a pas d'importance : la page trie toute seule par points.
  - Pense à changer la date de "miseAJour".
  - demo: true affiche un bandeau "classement de démonstration".
    Passe-le à false dès que les vrais résultats sont saisis.
*/
window.FOMO_SCORES = {
  miseAJour: "10 novembre 2026",
  demo: true,

  echecs: {
    regle: "Victoire = 3 pts · Nul = 1 pt · Défaite = 0 pt. Comptent les parties des tournois du FOMO.",
    joueurs: [
      { nom: "Joueur A", v: 7, n: 2, d: 1 },
      { nom: "Joueur B", v: 6, n: 3, d: 1 },
      { nom: "Joueur C", v: 6, n: 1, d: 3 },
      { nom: "Joueur D", v: 5, n: 2, d: 3 },
      { nom: "Joueur E", v: 4, n: 4, d: 2 },
      { nom: "Joueur F", v: 3, n: 3, d: 4 },
      { nom: "Joueur G", v: 2, n: 2, d: 6 },
      { nom: "Joueur H", v: 1, n: 1, d: 8 }
    ]
  },

  flechettes: {
    regle: "Victoire = 2 pts · Défaite = 0 pt. « Meilleur finish » = le plus gros checkout réussi.",
    joueurs: [
      { nom: "Joueur 1", v: 9, d: 3, finish: 121 },
      { nom: "Joueur 2", v: 8, d: 4, finish: 100 },
      { nom: "Joueur 3", v: 7, d: 5, finish: 96 },
      { nom: "Joueur 4", v: 6, d: 6, finish: 80 },
      { nom: "Joueur 5", v: 5, d: 7, finish: 64 },
      { nom: "Joueur 6", v: 3, d: 9, finish: 40 }
    ]
  }
};
