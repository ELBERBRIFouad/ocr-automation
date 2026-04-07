// Lit le répertoire (Sheet), copie les BL/CMR depuis Drive dans
// des dossiers dédiés et crée des zips par lots de 50.
// Les lots de 50 c'est parce qu'Apps Script a une limite sur la
// taille des fichiers générés par Utilities.zip.

var CONFIG = {
  REPERTOIRE_SHEET_ID: "VOTRE_SHEET_ID",
  COLONNE_NOM_BL: 9,    // I
  COLONNE_NOM_CMR: 10,  // J
  LIGNE_DEBUT: 4,
  DOSSIER_BL: "VOTRE_DOSSIER_BL_ID",
  DOSSIER_CMR: "VOTRE_DOSSIER_CMR_ID",
  DOSSIER_SORTIE: "VOTRE_DOSSIER_SORTIE_ID",
};


function copierBL() {
  var result = lireNomsBLetCMR_();
  Logger.log(result.bls.length + " BL uniques dans le répertoire");

  var index = indexerDossier_(CONFIG.DOSSIER_BL);
  Logger.log(Object.keys(index).length + " fichiers indexés dans Drive");

  var parent = DriveApp.getFolderById(CONFIG.DOSSIER_SORTIE);
  var dossierBL = getOuCreerSousDossier_(parent, "BL à OCR");

  var deja = {};
  var trouves = 0;
  var manquants = [];

  result.bls.forEach(function(nom) {
    var f = trouverFichier_(nom, index);
    if (!f) {
      manquants.push(nom);
      return;
    }
    if (deja[f.getName()]) return;
    deja[f.getName()] = true;
    f.makeCopy(f.getName(), dossierBL);
    trouves++;
  });

  Logger.log(trouves + " copiés, " + manquants.length + " manquants");
  if (manquants.length) Logger.log("Manquants: " + manquants.join(", "));
}


function copierCMR() {
  var result = lireNomsBLetCMR_();
  Logger.log(result.cmrs.length + " CMR uniques dans le répertoire");

  var index = indexerDossier_(CONFIG.DOSSIER_CMR);
  var parent = DriveApp.getFolderById(CONFIG.DOSSIER_SORTIE);
  var dossierCMR = getOuCreerSousDossier_(parent, "CMR à OCR");

  var deja = {};
  var trouves = 0;
  var manquants = [];

  result.cmrs.forEach(function(nom) {
    var f = trouverFichier_(nom, index);
    if (!f) {
      manquants.push(nom);
      return;
    }
    if (deja[f.getName()]) return;
    deja[f.getName()] = true;
    f.makeCopy(f.getName(), dossierCMR);
    trouves++;
  });

  Logger.log(trouves + " copiés, " + manquants.length + " manquants");
  if (manquants.length) Logger.log("Manquants: " + manquants.join(", "));
}


// Lots de 50 fichiers à cause de la limite de taille de Utilities.zip
function creerZipBL_lot1() { creerZipPartiel_("DOSSIER_BL_OCR_ID", "BL_OCR_lot1.zip", 0, 50); }
function creerZipBL_lot2() { creerZipPartiel_("DOSSIER_BL_OCR_ID", "BL_OCR_lot2.zip", 50, 100); }
function creerZipBL_lot3() { creerZipPartiel_("DOSSIER_BL_OCR_ID", "BL_OCR_lot3.zip", 100, 150); }
function creerZipBL_lot4() { creerZipPartiel_("DOSSIER_BL_OCR_ID", "BL_OCR_lot4.zip", 150, 200); }
function creerZipBL_lot5() { creerZipPartiel_("DOSSIER_BL_OCR_ID", "BL_OCR_lot5.zip", 200, 250); }
function creerZipBL_lot6() { creerZipPartiel_("DOSSIER_BL_OCR_ID", "BL_OCR_lot6.zip", 250, 300); }
function creerZipBL_lot7() { creerZipPartiel_("DOSSIER_BL_OCR_ID", "BL_OCR_lot7.zip", 300, 350); }
function creerZipBL_lot8() { creerZipPartiel_("DOSSIER_BL_OCR_ID", "BL_OCR_lot8.zip", 350, 999); }


function creerZipPartiel_(dossierId, nomZip, debut, fin) {
  var dossier = DriveApp.getFolderById(dossierId);
  var fichiers = dossier.getFiles();
  var blobs = [];
  var i = 0;

  while (fichiers.hasNext()) {
    var f = fichiers.next();
    if (i >= debut && i < fin) blobs.push(f.getBlob());
    i++;
  }

  Logger.log(nomZip + ": " + blobs.length + " fichiers");
  var zip = Utilities.zip(blobs, nomZip);
  var sortie = DriveApp.getFolderById(CONFIG.DOSSIER_SORTIE);
  var fichierZip = sortie.createFile(zip);
  Logger.log("Taille: " + Math.round(fichierZip.getSize() / (1024 * 1024)) + " Mo");
}


function lireNomsBLetCMR_() {
  var ss = SpreadsheetApp.openById(CONFIG.REPERTOIRE_SHEET_ID);
  var feuille = ss.getSheets()[0];

  var derniereLigne = feuille.getLastRow();
  if (derniereLigne < CONFIG.LIGNE_DEBUT) return { bls: [], cmrs: [] };

  var nbLignes = derniereLigne - CONFIG.LIGNE_DEBUT + 1;
  var donnees = feuille.getRange(CONFIG.LIGNE_DEBUT, 1, nbLignes, CONFIG.COLONNE_NOM_CMR).getValues();

  var bls = {};
  var cmrs = {};

  donnees.forEach(function(ligne) {
    var nomBL = String(ligne[CONFIG.COLONNE_NOM_BL - 1]).trim();
    var nomCMR = String(ligne[CONFIG.COLONNE_NOM_CMR - 1]).trim();
    if (nomBL && nomBL !== "undefined") bls[nomBL] = true;
    if (nomCMR && nomCMR !== "undefined") cmrs[nomCMR] = true;
  });

  return { bls: Object.keys(bls), cmrs: Object.keys(cmrs) };
}


// Indexe récursivement (jusqu'à 2 niveaux de sous-dossiers)
function indexerDossier_(dossierId) {
  var index = {};
  var racine = DriveApp.getFolderById(dossierId);
  indexerFichiersDuDossier_(racine, index);

  var sd = racine.getFolders();
  while (sd.hasNext()) {
    var d = sd.next();
    indexerFichiersDuDossier_(d, index);
    var ssd = d.getFolders();
    while (ssd.hasNext()) indexerFichiersDuDossier_(ssd.next(), index);
  }
  return index;
}


function indexerFichiersDuDossier_(dossier, index) {
  var fichiers = dossier.getFiles();
  while (fichiers.hasNext()) {
    var f = fichiers.next();
    var nom = f.getName().toLowerCase();
    index[nom] = f;
    index[nom.replace(/\.pdf$/, "")] = f;
  }
}


// Cherche par nom exact, sans extension, puis en partiel
function trouverFichier_(nom, index) {
  if (!nom) return null;
  var n = nom.toLowerCase().trim();

  if (index[n]) return index[n];
  if (index[n + ".pdf"]) return index[n + ".pdf"];

  var sansExt = n.replace(/\.pdf$/, "");
  if (index[sansExt]) return index[sansExt];

  for (var key in index) {
    if (key.indexOf(sansExt) > -1) return index[key];
  }
  return null;
}


function getOuCreerSousDossier_(parent, nom) {
  var d = parent.getFoldersByName(nom);
  return d.hasNext() ? d.next() : parent.createFolder(nom);
}
