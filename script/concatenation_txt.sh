#!/bin/bash
#Ce script récupère tout les fichiers text contenu dans le dossier situé dans la variable root
#Les concatène pour les inclure dans le fichier result.txt
#Pour lancer le script tapez "./nom_fichier_contenant_script"
#Chaque fichier est encadré par "Start_File" et "End_File"
#Les sous-dossiers inclus dans la variable root sont également référencés
debutFichier='Start_File'
finFichier='End_File'
root=./error_rate_references-master

function directory

{
	for element in `ls $1`
	do
		if [ -d "$1/$element" ]
		then
			echo -e "$1/$element\n" >> ../result.txt
			directory "$1/$element"
		else 
			echo -e "$1/$element:\n" >> ../result.txt
			echo -e "$debutFichier\n" >> ../result.txt
			cat "$1/$element" >> ../result.txt
			echo -e "$finFichier\n" >> ../result.txt
		fi
	done
}

echo -e "" > ../result.txt
directory $root