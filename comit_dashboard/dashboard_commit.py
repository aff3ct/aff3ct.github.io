import pandas as pd
import panel as pn
from datetime import datetime
import os
import matplotlib.pyplot as plt
import argparse
import re

# Charger les données si elles existent
def load_data():
    # Chemins vers les fichiers CSV
    config_csv_path = args.database_path + 'config.csv'
    task_csv_path = args.database_path + 'task_noise.csv'
    performance_csv_path = args.database_path + 'performance_noise.csv'
    git_version_pqt_path = args.database_path + 'log_git.parquet' 
        
    config_df       = pd.read_csv       (config_csv_path)        if os.path.exists(config_csv_path       ) else pd.DataFrame()
    task_df         = pd.read_csv       (task_csv_path)          if os.path.exists(task_csv_path         ) else pd.DataFrame()
    performance_df  = pd.read_csv       (performance_csv_path)   if os.path.exists(performance_csv_path  ) else pd.DataFrame()
    git_df          = pd.read_parquet   (git_version_pqt_path)   if os.path.exists(git_version_pqt_path  ) else pd.DataFrame()
    
    # Créer un dictionnaire de correspondance Config_Hash → Config_Alias
    config_df['Config_Alias'] = config_df['Meta.Git version'] + "_"  +  config_df['Meta.Command Line'] + "(" + config_df['Config_Hash'] + ")"
    config_aliases = dict(zip(config_df['Config_Hash'], config_df['Config_Alias']))
    
    return config_df, task_df, performance_df, git_df, config_aliases

# Graphique du débit moyen par version Git
def plot_git_throughput(git_version):
    config_df, task_df, performance_df, git_df, config_aliases = load_data()

    # Vérifier si une version Git est sélectionnée
    if not git_version:
        return pn.pane.Markdown("Veuillez sélectionner une version Git pour afficher le débit.")

    # Filtrer les données par la version Git sélectionnée
    config_filtered_git_df = config_df[config_df['Meta.Git version'] == git_version]
    if config_filtered_git_df.empty:
        return pn.pane.Markdown("Pas de données disponibles pour la version Git sélectionnée.")

    # Calculer le débit moyen par version Git
    config_filtered_git_df['Throughput'] = config_filtered_git_df['Total_Bytes'] / config_filtered_git_df['Time_Spent']
    mean_throughput = config_filtered_git_df['Throughput'].mean()

    # Créer le graphique
    fig, ax = plt.subplots(figsize=(8, 4))
    ax.bar(git_version, mean_throughput, color='skyblue')
    
    ax.set_title(f"Débit moyen pour la version Git {git_version}")
    ax.set_ylabel("Débit Moyen (Bytes/s)")
    ax.set_xlabel("Version Git")
    ax.grid(True, which="both", linestyle='--', linewidth=0.5)

    return pn.pane.Matplotlib(fig, sizing_mode="stretch_width")

# Performance par niveau de bruit pour les configurations sélectionnées
def plot_performance_metrics(configs):
    config_df, task_df, performance_df, git_df, config_aliases = load_data()

    if not configs:
        return pn.pane.Markdown("Veuillez sélectionner au moins une configuration pour afficher les performances.")
    
    filtered_performance_df = performance_df[performance_df['Config_Hash'].isin(configs)]
    if filtered_performance_df.empty:
        return pn.pane.Markdown("Pas de données de performance disponibles pour les configurations sélectionnées.")

    fig, ax = plt.subplots(figsize=(8, 4))
    for config in configs:
        config_data = filtered_performance_df[filtered_performance_df['Config_Hash'] == config]
        snr = config_data['Noise_Level']
        ber = config_data['Bit Error Rate (BER) and Frame Error Rate (FER).BER']
        fer = config_data['Bit Error Rate (BER) and Frame Error Rate (FER).FER']
        
        ax.plot(snr, ber, marker='o', label=f"BER - {config}")
        ax.plot(snr, fer, marker='x', linestyle='--', label=f"FER - {config}")
    
    ax.set_title("BER et FER en fonction du SNR pour chaque configuration")
    ax.set_xlabel("Niveau de Bruit (SNR)")
    ax.set_ylabel("Taux d'Erreur")
    ax.set_yscale("log")
    ax.legend()
    plt.grid(True, which="both", linestyle='--', linewidth=0.5)
    
    return pn.pane.Matplotlib(fig, sizing_mode="stretch_width")

# Graphe de valorisation des données de tâches pour les configurations sélectionnées
def plot_task_data(configs):
    config_df, task_df, performance_df, git_df, config_aliases = load_data()
    
    if not configs:
        return pn.pane.Markdown("Veuillez sélectionner au moins une configuration pour afficher les données de tâches.")
    
    filtered_task_df = task_df[task_df['Config_Hash'].isin(configs)]
    if filtered_task_df.empty:
        return pn.pane.Markdown("Pas de données de tâches disponibles pour les configurations sélectionnées.")

    fig, ax = plt.subplots(figsize=(8, 4))
    for config in configs:
        config_data = filtered_task_df[filtered_task_df['Config_Hash'] == config]
        snr = config_data['Noise_Level']
        call_counts = config_data['Calls']  # Nombre d'appels pour chaque tâche
        
        ax.plot(snr, call_counts, marker='o', label=f"Appels - {config}")
    
    ax.set_title("Nombre d'appels en fonction du SNR pour chaque configuration")
    ax.set_xlabel("Niveau de Bruit (SNR)")
    ax.set_ylabel("Nombre d'Appels")
    ax.legend()
    plt.grid(True, which="both", linestyle='--', linewidth=0.5)
    
    return pn.pane.Matplotlib(fig, sizing_mode="stretch_width")


def update_config_selector(config_selector):
    config_df, task_df, performance_df, git_df, config_aliases = load_data()

    config_options = [
        f"{config_aliases.get(config_hash)}"
        for config_hash in config_df['Config_Hash'].unique()
    ]
    config_options = [config_aliases.get(config, config) for config in config_df['Config_Hash'].unique()]
    # Mise à jour dynamique du widget
    config_selector.options = config_options

# Configurer argparse pour gérer les arguments en ligne de commande
def parse_arguments():
    parser = argparse.ArgumentParser(description="Tableau de bord des commits.")
    parser.add_argument('-l', '--local', action="store_true", help="Local affiche le tableau de bord dans le navigateur, son absence permet son export.")  # on/off flag
    parser.add_argument('--database_path', default='./comit_dashboard/database/', help="Remplace le chemin par défaut (./comit_dashboard/database/) vers la base de données.")  # on/off flag
    return parser.parse_args()



##################################### Chargement ####################################

 # Utiliser des valeurs par défaut dans le cas d'un export qui ne supporte pas argparse
class DefaultArgs:
    local = False
    database_path = "./comit_dashboard/database/"
args = DefaultArgs()
if __name__ == "__main__":
    args = parse_arguments()  # Appel unique de argparse ici

# Initialiser Panel
pn.extension(sizing_mode="stretch_width")  # Adapter la taille des widgets et graphiques à la largeur de l'écran

# Charger les données initiales
config_df, task_df, performance_df, git_df, config_aliases = load_data()


##################################### Données ####################################

# Rafraîchir les données
# def update_config_count(event = None):
#     config_df, task_df, performance_df, git_df, config_aliases = load_data()
#     config_count.value = config_df['Config_Hash'].nunique() if not config_df.empty else 0
#     git_version_count.value = config_df['Meta.Git version'].nunique() if not config_df.empty else 0
#     commit_count.value = git_df.id.nunique() if not config_df.empty else 0
#     latest_commit_indicator.value = git_df['Date'].max()
#     update_config_selector(config_selector)


# Widgets d'affichage des informations
config_count = pn.indicators.Number(name="Nombre de configurations", value=config_df['Config_Hash'].nunique() if not config_df.empty else 0)
git_version_count = pn.indicators.Number(name="Nombre de versions Git avec des données", value=config_df['Meta.Git version'].nunique() if not config_df.empty else 0)
commit_count = pn.indicators.Number(name="Nombre de commits historisés dans Git", value=git_df ['echo sha'].nunique() if not git_df.empty else 0)


# Créer un indicateur pour afficher la date du commit le plus récent
latest_commit_date = git_df['date'].max() if not git_df.empty else "Aucune date disponible"
latest_commit_date_str = latest_commit_date.strftime('%Y-%m-%d %H:%M:%S') if latest_commit_date != "Aucune date disponible" else latest_commit_date

# Créer un composant Markdown pour afficher la date du commit le plus récent
# Extraire la date du commit le plus récent
latest_commit_date = git_df['date'].max() if not git_df.empty else "Aucune date disponible"

# Créer un widget statique pour afficher la date du commit le plus récent
latest_commit_date_display = pn.Column(
        pn.widgets.StaticText(name="Date du dernier commit",css_classes=["tittle_indicator-text"]),
        pn.widgets.StaticText(value=str(latest_commit_date),css_classes=["indicator-text"])
)

pn.config.raw_css = [
    """
    .tittle_indicator-text {
        font-size: 20px;
        font-weight: normal;
        color: #333333;
    }
    .indicator-text {
        font-size: 64px;
        font-weight: normal;
        color: #333333;
    }
    """
]

# # Bouton pour rafraîchir les données
# refresh_button = pn.widgets.Button(name="Rafraîchir les données", button_type="primary")
# refresh_button.on_click(update_config_count)

#panel de la partie data
panelData = pn.Row(config_count, git_version_count, commit_count,latest_commit_date_display,
        sizing_mode="stretch_width")

##################################### Git ####################################

def filter_data(git_df, project, date_range):
    start_date, end_date = date_range
    # Filtrage par date 
    start_date = datetime.combine(date_range[0], datetime.min.time())
    end_date = datetime.combine(date_range[1], datetime.min.time())
    
    # Convertir les dates de la colonne 'date' de git_df en tz-naive
    git_df['date'] = git_df['date'].dt.tz_localize(None)

    # Filtrage des données en fonction de la plage de dates
    filtered_df = git_df[(git_df['date'] >= start_date) & (git_df['date'] <= end_date)]   
    
    # Filtrage par projet, si ce n'est pas 'Tous'
    if project != 'Tous':
        filtered_df = filtered_df[filtered_df['Project'] == project]
    
    # Mise à jour de la table avec les données filtrées
    table_commit.value = filtered_df

# Lier le filtre au slider et au RadioButton
def update_filter(event):
    project = project_radio_button.value
    date_range = date_range_slider.value
    filter_data(git_df, project, date_range)

# Radiobouton
# Extraire les projets uniques de git_df et ajouter "Tous"
projects = git_df['Project'].unique().tolist()
projects.append('Tous')  # Ajout de l'option 'Tous'

# Créer le widget RadioButton
project_radio_button = pn.widgets.RadioButtonGroup(
    name='Sélectionner un projet',
    options=projects,
    value='Tous'  # Option par défaut
)

# Configuration de l'intervalle de dates pour le DateRangeSlider
min_date = git_df['date'].min() if not git_df.empty else datetime(2000, 1, 1)
max_date = git_df['date'].max() if not git_df.empty else datetime.now()

# Création du DateRangeSlider
date_range_slider = pn.widgets.DateRangeSlider(
    name="Sélectionnez l'intervalle de dates",
    start=min_date,
    end=max_date,
    value=(min_date, max_date),
)

#table de données Git
table_commit = pn.widgets.DataFrame(git_df, name='Table de Données', show_index=False)


# Lier les événements aux widgets
project_radio_button.param.watch(update_filter, 'value')
date_range_slider.param.watch(update_filter, 'value')

# Initialisation de la table avec les données filtrées par défaut
filter_data(git_df, project_radio_button.value, date_range_slider.value)


panelCommit = pn.Column(
    pn.Column(project_radio_button, date_range_slider),
    table_commit
)

##################################### Config ####################################

# Boutons d'agrégat
def select_all_configs(event=None):
    config_selector.value = config_options

def clear_configs(event=None):
    config_selector.value = []

# Multi-sélecteur de configurations
#config_options = config_df['Config_Hash'].unique().tolist() if not config_df.empty else []
#config_options = [config_aliases.get(config, config) for config in config_df['Config_Hash'].unique()]
config_options = [
        f"{config_aliases.get(config_hash)}"
        for config_hash in config_df['Config_Hash'].unique()
    ]
config_options = config_df['Config_Hash'].unique().tolist() if not config_df.empty else []
config_selector = pn.widgets.MultiChoice(name="Sélectionnez les configurations", options=config_options)

# Sélecteur des configs
select_all_button = pn.widgets.Button(name="Tout sélectionner", button_type="success")
clear_button = pn.widgets.Button(name="Tout désélectionner", button_type="warning")

select_all_button.on_click(select_all_configs)
clear_button.on_click(clear_configs)

# Charger config.csv et identifier les familles et leurs colonnes
def create_family_widgets(config_df):
    # Filtrer les colonnes qui suivent le format "FAMILLE.nom"
    family_columns = {}
    for col in config_df.columns:
        match = re.match(r"(\w+)\.(\w+)", col)
        if match:
            family, name = match.groups()
            if family not in family_columns:
                family_columns[family] = []
            family_columns[family].append(col)
        else:
            # Ajoute les colonnes sans famille dans une clé générale
            family_columns.setdefault("Autres", []).append(col)
    
    # Créer les widgets de sélection pour chaque famille
    family_widgets = {}
    for family, columns in family_columns.items():
        widgets = [pn.widgets.Select(name=col, options=config_df[col].unique().tolist()) for col in columns]
        family_widgets[family] = pn.Column(*widgets, name=family)

    return family_widgets

# Créer les widgets de sélection selon les familles du fichier config.csv
family_widgets = create_family_widgets(config_df)

# Ajouter chaque groupe de widgets dans un Accordion pour permettre le repli
accordion_families = pn.Accordion(*[(f"{family}", widget) for family, widget in family_widgets.items()])

# Panneau repliable avec les filtres sur les configurations
config_accordion = pn.Accordion(
    ("Sélection de configurations", pn.Column(
        accordion_families
    ))
)

# panel des configs
panelConfig = pn.Row(
    pn.Column(select_all_button, clear_button, config_selector, accordion_families, width=300),
    pn.Column(
        pn.bind(plot_performance_metrics, config_selector),
        pn.bind(plot_task_data, config_selector),
        sizing_mode="stretch_width"
    )
)


##################################### Tableau de bord ####################################

# Layout du tableau de bord avec tout dans une colonne et des arrières-plans différents
dashboard = pn.Column(
    pn.pane.HTML("<div style='font-size: 64px; font-weight: bold;'>Tableau de Bord de Suivi des Commits</div>"),
    pn.pane.HTML("<div style='font-size: 32px;background-color: #e0e0e0; padding: 10px;'><h2>Données</h2></div>"),
    panelData,
    pn.pane.HTML("<div style='font-size: 32px;background-color: #e0e0e0; padding: 10px;'><h2>Statistiques des Commits</h2></div>"),
    panelCommit,
    pn.pane.HTML("<div style='font-size: 32px;background-color: #e0e0e0; padding: 10px;'><h2>Courbes et Graphiques</h2></div>"),
    panelConfig
)


# Lancer le tableau de bord
if args.local :
    dashboard.show()
else :
    dashboard.servable()









