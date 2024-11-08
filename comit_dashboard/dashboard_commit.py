import pandas as pd
import panel as pn
from datetime import datetime
import os
import matplotlib.pyplot as plt
import argparse

# Charger les données si elles existent
def load_data():
    config_df       = pd.read_csv(config_csv_path) if os.path.exists(config_csv_path) else pd.DataFrame()
    task_df         = pd.read_csv(task_csv_path) if os.path.exists(task_csv_path) else pd.DataFrame()
    performance_df  = pd.read_csv(performance_csv_path) if os.path.exists(performance_csv_path) else pd.DataFrame()
    git_df =pd.DataFrame()
    #git_df          = pd.read_csv(git_version_csv_path) if os.path.exists(git_version_csv_path) else pd.DataFrame()
    
    # Créer un dictionnaire de correspondance Config_Hash → Config_Alias
    config_df['Config_Alias'] = config_df['Meta.Git version'] + "_"  +  config_df['Meta.Command Line'] + "(" + config_df['Config_Hash'] + ")"
    config_aliases = dict(zip(config_df['Config_Hash'], config_df['Config_Alias']))
    
    return config_df, task_df, performance_df, git_df, config_aliases

# 1. Graphique du débit moyen par version Git
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

# 2. Performance par niveau de bruit pour les configurations sélectionnées
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

# 3. Graphe de valorisation des données de tâches pour les configurations sélectionnées
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
    
    # Mise à jour dynamique du widget
    config_selector.options = config_options

# Configurer argparse pour gérer les arguments en ligne de commande
def parse_arguments():
    parser = argparse.ArgumentParser(description="Tableau de bord des commits.")
    parser.add_argument('-l', '--local', action="store_true", help="Local affiche le tableau de bord dans le navigateur, son absence permet son export.")  # on/off flag
    parser.add_argument('--database_path', default='./comit_dashboard/database/', help="Remplace le chemin par défaut (./comit_dashboard/database/) vers la base de données.")  # on/off flag
    return parser.parse_args()

def initialize_dashboard(args):
    # Initialisez ici votre tableau de bord avec les arguments `args`
    print("Initialisation du tableau de bord avec les arguments:", args)



 # Utiliser des valeurs par défaut dans le cas d'un export
class DefaultArgs:
    local = False
    database_path = "./comit_dashboard/database/"
args = DefaultArgs()

if __name__ == "__main__":
    args = parse_arguments()  # Appel unique de argparse ici

# Initialiser Panel
pn.extension(sizing_mode="stretch_width")  # Adapter la taille des widgets et graphiques à la largeur de l'écran

# Chemins vers les fichiers CSV
config_csv_path = args.database_path + 'config.csv'
task_csv_path = args.database_path + 'task_noise.csv'
performance_csv_path = args.database_path + 'performance_noise.csv'
git_version_csv_path = args.database_path + 'log_commit_aff3ct.csv'  # Ajouter le fichier des versions Git

# Charger les données initiales
config_df, task_df, performance_df, git_df, config_aliases = load_data()

# Widgets d'affichage des informations
config_count = pn.indicators.Number(name="Nombre de configurations", value=config_df['Config_Hash'].nunique() if not config_df.empty else 0)
git_version_count = pn.indicators.Number(name="Nombre de versions Git avec des données", value=config_df['Meta.Git version'].nunique() if not config_df.empty else 0)
commit_count = pn.indicators.Number(name="Nombre de commits historisés dans Git", value=config_df['Meta.Git version'].nunique() if not config_df.empty else 0)

last_commit_date = pn.widgets.DatetimePicker(name="Dernière mise à jour", value=datetime.now())

# Multi-sélecteur de configurations
#config_options = config_df['Config_Hash'].unique().tolist() if not config_df.empty else []
config_options = [config_aliases.get(config, config) for config in config_df['Config_Hash'].unique()]
config_selector = pn.widgets.MultiChoice(name="Sélectionnez les configurations", options=config_options)

# Sélecteur de version Git
git_versions = config_df['Meta.Git version'].unique().tolist() if not config_df.empty else []
git_version_selector = pn.widgets.Select(name="Sélectionnez la version Git", options=git_versions)

# Rafraîchir les données
def update_config_count(event = None):
    config_df, task_df, performance_df, git_df, config_aliases = load_data()
    config_count.value = config_df['Config_Hash'].nunique() if not config_df.empty else 0
    git_version_count.value = config_df['Meta.Git version'].nunique() if not config_df.empty else 0
    commit_count.value = git_df[0].nunique() if not config_df.empty else 0
    last_commit_date.value = datetime.now()
    update_config_selector(config_selector)

# Boutons d'agrégat
def select_all_configs(event=None):
    config_selector.value = config_options

def clear_configs(event=None):
    config_selector.value = []

table_commit = pn.widgets.DataFrame(git_df, name='Table de Données', width=400, height=200)

# Bouton pour rafraîchir les données
refresh_button = pn.widgets.Button(name="Rafraîchir les données", button_type="primary")
refresh_button.on_click(update_config_count)

# Multi-sélecteur de configurations
config_options = [
        f"{config_aliases.get(config_hash)}"
        for config_hash in config_df['Config_Hash'].unique()
    ]
#config_options = config_df['Config_Hash'].unique().tolist() if not config_df.empty else []
config_selector = pn.widgets.MultiChoice(name="Sélectionnez les configurations", options=config_options)

# Sélecteur de version Git
#git_versions = git_version_df['Meta.Git version'].unique().tolist() if not git_version_df.empty else []
git_versions = config_df['Meta.Git version'].unique().tolist() if not config_df.empty else []
git_version_selector = pn.widgets.Select(name="Sélectionnez la version Git", options=git_versions)

# Sélecteur des configs
select_all_button = pn.widgets.Button(name="Tout sélectionner", button_type="success")
clear_button = pn.widgets.Button(name="Tout désélectionner", button_type="warning")

select_all_button.on_click(select_all_configs)
clear_button.on_click(clear_configs)

# Layout du tableau de bord avec tout dans une colonne et des arrières-plans différents
dashboard = pn.Column(
    "# Tableau de Bord de Suivi des Commits",
    pn.pane.HTML("<div style='background-color: #f0f0f0; padding: 10px;'><h2>Données</h2></div>"),
    pn.Row(
        pn.Column(pn.Row(config_count, git_version_count), last_commit_date, refresh_button),
        sizing_mode="stretch_width"
    ),
    pn.pane.HTML("<div style='background-color: #e0e0e0; padding: 10px;'><h2>Statistiques des Commits</h2></div>"),
    pn.Row(
        pn.Column(git_version_selector, table_commit),
        sizing_mode="stretch_width"
    ),

    #pn.Row(
    #    pn.bind(plot_git_throughput, git_version_selector),
    #    sizing_mode="stretch_width"
    #    ), 

    pn.pane.HTML("<div style='background-color: #d0d0d0; padding: 10px;'><h2>Courbes et Graphiques</h2></div>"),
    pn.Row(
        pn.Column(select_all_button, clear_button),
        pn.Column(config_selector),
        sizing_mode="stretch_width"
    ),    
    pn.Row(
        pn.bind(plot_performance_metrics, config_selector),
        pn.bind(plot_task_data, config_selector),
        sizing_mode="stretch_width"
    )
)

#dashboard.save(filename='test_dashboard.html', embed=True)


# Lancer le tableau de bord
if args.local :
    dashboard.show()
else :
    dashboard.servable()


