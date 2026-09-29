# Notebook Google Colab - OCR sur PDFs scannés
# 3 cellules à coller dans Colab dans cet ordre


# ============ CELLULE 1 - Installation (à lancer une fois) ============

!pip install "Pillow<12" pikepdf ocrmypdf -q --force-reinstall
!apt-get install -y tesseract-ocr-fra ghostscript > /dev/null 2>&1
print("OCR installé")
import os
os._exit(0)


# ============ CELLULE 2 - OCR sur un zip de PDFs ============

from google.colab import files
import zipfile, os, ocrmypdf, shutil

shutil.rmtree("input", ignore_errors=True)
shutil.rmtree("output", ignore_errors=True)
os.makedirs("input", exist_ok=True)
os.makedirs("output", exist_ok=True)

print("Choisis un ZIP")
uploaded = files.upload()
zip_name = list(uploaded.keys())[0]

with zipfile.ZipFile(zip_name, 'r') as z:
    z.extractall("input")

pdfs = []
for root, dirs, fls in os.walk("input"):
    for f in fls:
        if f.lower().endswith(".pdf"):
            pdfs.append(os.path.join(root, f))

print(f"{len(pdfs)} PDF(s) trouvé(s)\n")

ok = 0
erreurs = []
for i, pdf_path in enumerate(pdfs):
    nom = os.path.basename(pdf_path)
    nom_sortie = os.path.join("output", "OCR_" + nom)
    print(f"[{i+1}/{len(pdfs)}] {nom}...", end=" ")
    try:
        ocrmypdf.ocr(pdf_path, nom_sortie, language="fra", force_ocr=True)
        ok += 1
        print("ok")
    except Exception as e:
        erreurs.append(nom + " : " + str(e))
        print("KO")

print(f"\nCréation du ZIP ({ok} fichiers)")
shutil.make_archive("BL_OCR_Searchable", "zip", "output")
print("Téléchargement")
files.download("BL_OCR_Searchable.zip")
print(f"\n{ok} convertis, {len(erreurs)} erreurs")


# ============ CELLULE 3 - Nettoyage entre deux lots ============

import shutil, os
shutil.rmtree("input", ignore_errors=True)
shutil.rmtree("output", ignore_errors=True)
os.makedirs("input", exist_ok=True)
os.makedirs("output", exist_ok=True)
print("Nettoyé")


# ----
# Fouad El Berbri
# Business Analyst — Direction Supply Chain C.E.T & Master Data - Carrefour
