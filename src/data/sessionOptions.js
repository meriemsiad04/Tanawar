// Placeholder option lists for the Create Session form until the modules/locations API exists.
export const LEVELS = ["L1", "L2", "L3", "M1", "M2","ING1", "ING2", "ING3","ING4","ING5"];

// Modules taught at each level: the Module field only offers the ones for the chosen level.
export const MODULES_BY_LEVEL = {
  L1: ["Algorithmique 1", "Analyse 1", "Algèbre 1", "Structure machine 1", "Électricité"],
  L2: ["Algorithmique avancée", "Analyse 2", "Structures de données", "Probabilités", "Architecture des ordinateurs"],
  L3: ["Bases de données", "Réseaux", "Systèmes d’exploitation", "Génie logiciel", "Compilation"],
  M1: ["Intelligence artificielle", "Sécurité informatique", "Systèmes distribués", "Big Data"],
  M2: ["Apprentissage profond", "Cloud computing", "Méthodologie de recherche"],
  ING1: ["Analyse 1", "Algèbre 1", "Algorithmique", "Physique 1"],
  ING2: ["Analyse 2", "Probabilités et statistiques", "Structures de données", "Électronique"],
  ING3: ["Bases de données", "Réseaux", "Systèmes d’exploitation", "Génie logiciel"],
  ING4: ["Architecture logicielle", "Sécurité des systèmes", "Intelligence artificielle", "Cloud computing"],
  ING5: ["Projet de fin d’études", "Big Data", "Gestion de projet", "Systèmes distribués"],
};

export const LOCATIONS = ["Amphi A", "Amphi B", "Bloc 2, Salle 7", "Bloc 5, Salle 12", "Bibliothèque Centrale"];

export const SESSION_LIMITS = {
  title: 100,
  description: 500,
  seats: { min: 1, max: 200 },
  duration: { min: 15, max: 480 },
  resources: 10,
  fileBytes: 10 * 1024 * 1024,
};

export const ALLOWED_FILE_TYPES = ["application/pdf", "image/png", "image/jpeg"];
export const ALLOWED_FILE_ACCEPT = ".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg";
