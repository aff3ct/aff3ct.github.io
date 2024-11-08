importScripts("https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js");

function sendPatch(patch, buffers, msg_id) {
  self.postMessage({
    type: 'patch',
    patch: patch,
    buffers: buffers
  })
}

async function startApplication() {
  console.log("Loading pyodide!");
  self.postMessage({type: 'status', msg: 'Loading pyodide'})
  self.pyodide = await loadPyodide();
  self.pyodide.globals.set("sendPatch", sendPatch);
  console.log("Loaded!");
  await self.pyodide.loadPackage("micropip");
  const env_spec = ['https://cdn.holoviz.org/panel/wheels/bokeh-3.6.1-py3-none-any.whl', 'https://cdn.holoviz.org/panel/1.5.3/dist/wheels/panel-1.5.3-py3-none-any.whl', 'pyodide-http==0.2.1', 'matplotlib', 'pandas']
  for (const pkg of env_spec) {
    let pkg_name;
    if (pkg.endsWith('.whl')) {
      pkg_name = pkg.split('/').slice(-1)[0].split('-')[0]
    } else {
      pkg_name = pkg
    }
    self.postMessage({type: 'status', msg: `Installing ${pkg_name}`})
    try {
      await self.pyodide.runPythonAsync(`
        import micropip
        await micropip.install('${pkg}');
      `);
    } catch(e) {
      console.log(e)
      self.postMessage({
	type: 'status',
	msg: `Error while installing ${pkg_name}`
      });
    }
  }
  console.log("Packages loaded!");
  self.postMessage({type: 'status', msg: 'Executing code'})
  const code = `
  \nimport asyncio\n\nfrom panel.io.pyodide import init_doc, write_doc\n\ninit_doc()\n\nimport pandas as pd\nimport panel as pn\nfrom datetime import datetime\nimport os\nimport matplotlib.pyplot as plt\nimport argparse\n\n# Charger les donn\xe9es si elles existent\ndef load_data():\n    config_df       = pd.read_csv(config_csv_path) if os.path.exists(config_csv_path) else pd.DataFrame()\n    task_df         = pd.read_csv(task_csv_path) if os.path.exists(task_csv_path) else pd.DataFrame()\n    performance_df  = pd.read_csv(performance_csv_path) if os.path.exists(performance_csv_path) else pd.DataFrame()\n    git_df =pd.DataFrame()\n    #git_df          = pd.read_csv(git_version_csv_path) if os.path.exists(git_version_csv_path) else pd.DataFrame()\n    \n    # Cr\xe9er un dictionnaire de correspondance Config_Hash \u2192 Config_Alias\n    config_df['Config_Alias'] = config_df['Meta.Git version'] + "_"  +  config_df['Meta.Command Line'] + "(" + config_df['Config_Hash'] + ")"\n    config_aliases = dict(zip(config_df['Config_Hash'], config_df['Config_Alias']))\n    \n    return config_df, task_df, performance_df, git_df, config_aliases\n\n# 1. Graphique du d\xe9bit moyen par version Git\ndef plot_git_throughput(git_version):\n    config_df, task_df, performance_df, git_df, config_aliases = load_data()\n\n    # V\xe9rifier si une version Git est s\xe9lectionn\xe9e\n    if not git_version:\n        return pn.pane.Markdown("Veuillez s\xe9lectionner une version Git pour afficher le d\xe9bit.")\n\n    # Filtrer les donn\xe9es par la version Git s\xe9lectionn\xe9e\n    config_filtered_git_df = config_df[config_df['Meta.Git version'] == git_version]\n    if config_filtered_git_df.empty:\n        return pn.pane.Markdown("Pas de donn\xe9es disponibles pour la version Git s\xe9lectionn\xe9e.")\n\n    \n    # Calculer le d\xe9bit moyen par version Git\n    config_filtered_git_df['Throughput'] = config_filtered_git_df['Total_Bytes'] / config_filtered_git_df['Time_Spent']\n    mean_throughput = config_filtered_git_df['Throughput'].mean()\n\n    # Cr\xe9er le graphique\n    fig, ax = plt.subplots(figsize=(8, 4))\n    ax.bar(git_version, mean_throughput, color='skyblue')\n    \n    ax.set_title(f"D\xe9bit moyen pour la version Git {git_version}")\n    ax.set_ylabel("D\xe9bit Moyen (Bytes/s)")\n    ax.set_xlabel("Version Git")\n    ax.grid(True, which="both", linestyle='--', linewidth=0.5)\n\n    return pn.pane.Matplotlib(fig, sizing_mode="stretch_width")\n\n# 2. Performance par niveau de bruit pour les configurations s\xe9lectionn\xe9es\ndef plot_performance_metrics(configs):\n    config_df, task_df, performance_df, git_df, config_aliases = load_data()\n\n    if not configs:\n        return pn.pane.Markdown("Veuillez s\xe9lectionner au moins une configuration pour afficher les performances.")\n    \n    filtered_performance_df = performance_df[performance_df['Config_Hash'].isin(configs)]\n    if filtered_performance_df.empty:\n        return pn.pane.Markdown("Pas de donn\xe9es de performance disponibles pour les configurations s\xe9lectionn\xe9es.")\n\n    fig, ax = plt.subplots(figsize=(8, 4))\n    for config in configs:\n        config_data = filtered_performance_df[filtered_performance_df['Config_Hash'] == config]\n        snr = config_data['Noise_Level']\n        ber = config_data['Bit Error Rate (BER) and Frame Error Rate (FER).BER']\n        fer = config_data['Bit Error Rate (BER) and Frame Error Rate (FER).FER']\n        \n        ax.plot(snr, ber, marker='o', label=f"BER - {config}")\n        ax.plot(snr, fer, marker='x', linestyle='--', label=f"FER - {config}")\n    \n    ax.set_title("BER et FER en fonction du SNR pour chaque configuration")\n    ax.set_xlabel("Niveau de Bruit (SNR)")\n    ax.set_ylabel("Taux d'Erreur")\n    ax.set_yscale("log")\n    ax.legend()\n    plt.grid(True, which="both", linestyle='--', linewidth=0.5)\n    \n    return pn.pane.Matplotlib(fig, sizing_mode="stretch_width")\n\n# 3. Graphe de valorisation des donn\xe9es de t\xe2ches pour les configurations s\xe9lectionn\xe9es\ndef plot_task_data(configs):\n    config_df, task_df, performance_df, git_df, config_aliases = load_data()\n    \n    if not configs:\n        return pn.pane.Markdown("Veuillez s\xe9lectionner au moins une configuration pour afficher les donn\xe9es de t\xe2ches.")\n    \n    filtered_task_df = task_df[task_df['Config_Hash'].isin(configs)]\n    if filtered_task_df.empty:\n        return pn.pane.Markdown("Pas de donn\xe9es de t\xe2ches disponibles pour les configurations s\xe9lectionn\xe9es.")\n\n    fig, ax = plt.subplots(figsize=(8, 4))\n    for config in configs:\n        config_data = filtered_task_df[filtered_task_df['Config_Hash'] == config]\n        snr = config_data['Noise_Level']\n        call_counts = config_data['Calls']  # Nombre d'appels pour chaque t\xe2che\n        \n        ax.plot(snr, call_counts, marker='o', label=f"Appels - {config}")\n    \n    ax.set_title("Nombre d'appels en fonction du SNR pour chaque configuration")\n    ax.set_xlabel("Niveau de Bruit (SNR)")\n    ax.set_ylabel("Nombre d'Appels")\n    ax.legend()\n    plt.grid(True, which="both", linestyle='--', linewidth=0.5)\n    \n    return pn.pane.Matplotlib(fig, sizing_mode="stretch_width")\n\n\ndef update_config_selector(config_selector):\n    config_df, task_df, performance_df, git_df, config_aliases = load_data()\n\n    config_options = [\n        f"{config_aliases.get(config_hash)}"\n        for config_hash in config_df['Config_Hash'].unique()\n    ]\n    \n    # Mise \xe0 jour dynamique du widget\n    config_selector.options = config_options\n\n# Configurer argparse pour g\xe9rer les arguments en ligne de commande\ndef parse_arguments():\n    parser = argparse.ArgumentParser(description="Tableau de bord des commits.")\n    parser.add_argument('-l', '--local', action="store_true", help="Local affiche le tableau de bord dans le navigateur, son absence permet son export.")  # on/off flag\n    parser.add_argument('--database_path', default='./comit_dashboard/database/', help="Remplace le chemin par d\xe9faut (./comit_dashboard/database/) vers la base de donn\xe9es.")  # on/off flag\n    return parser.parse_args()\n\ndef initialize_dashboard(args):\n    # Initialisez ici votre tableau de bord avec les arguments \`args\`\n    print("Initialisation du tableau de bord avec les arguments:", args)\n\n\n\n # Utiliser des valeurs par d\xe9faut dans le cas d'un export\nclass DefaultArgs:\n    local = False\n    database_path = "./comit_dashboard/database/"\nargs = DefaultArgs()\n\nif __name__ == "__main__":\n    args = parse_arguments()  # Appel unique de argparse ici\n\n# Initialiser Panel\npn.extension(sizing_mode="stretch_width")  # Adapter la taille des widgets et graphiques \xe0 la largeur de l'\xe9cran\n\n# Chemins vers les fichiers CSV\nconfig_csv_path = args.database_path + 'config.csv'\ntask_csv_path = args.database_path + 'task_noise.csv'\nperformance_csv_path = args.database_path + 'performance_noise.csv'\ngit_version_csv_path = args.database_path + 'log_commit_aff3ct.csv'  # Ajouter le fichier des versions Git\n\n# Charger les donn\xe9es initiales\nconfig_df, task_df, performance_df, git_df, config_aliases = load_data()\n\n# Widgets d'affichage des informations\nconfig_count = pn.indicators.Number(name="Nombre de configurations", value=config_df['Config_Hash'].nunique() if not config_df.empty else 0)\ngit_version_count = pn.indicators.Number(name="Nombre de versions Git avec des donn\xe9es", value=config_df['Meta.Git version'].nunique() if not config_df.empty else 0)\ncommit_count = pn.indicators.Number(name="Nombre de commits historis\xe9s dans Git", value=config_df['Meta.Git version'].nunique() if not config_df.empty else 0)\n\nlast_commit_date = pn.widgets.DatetimePicker(name="Derni\xe8re mise \xe0 jour", value=datetime.now())\n\n# Multi-s\xe9lecteur de configurations\n#config_options = config_df['Config_Hash'].unique().tolist() if not config_df.empty else []\nconfig_options = [config_aliases.get(config, config) for config in config_df['Config_Hash'].unique()]\nconfig_selector = pn.widgets.MultiChoice(name="S\xe9lectionnez les configurations", options=config_options)\n\n# S\xe9lecteur de version Git\ngit_versions = config_df['Meta.Git version'].unique().tolist() if not config_df.empty else []\ngit_version_selector = pn.widgets.Select(name="S\xe9lectionnez la version Git", options=git_versions)\n\n# Rafra\xeechir les donn\xe9es\ndef update_config_count(event = None):\n    config_df, task_df, performance_df, git_df, config_aliases = load_data()\n    config_count.value = config_df['Config_Hash'].nunique() if not config_df.empty else 0\n    git_version_count.value = config_df['Meta.Git version'].nunique() if not config_df.empty else 0\n    commit_count.value = git_df[0].nunique() if not config_df.empty else 0\n    last_commit_date.value = datetime.now()\n    update_config_selector(config_selector)\n\n# Boutons d'agr\xe9gat\ndef select_all_configs(event=None):\n    config_selector.value = config_options\n\ndef clear_configs(event=None):\n    config_selector.value = []\n\ntable_commit = pn.widgets.DataFrame(git_df, name='Table de Donn\xe9es', width=400, height=200)\n\n# Bouton pour rafra\xeechir les donn\xe9es\nrefresh_button = pn.widgets.Button(name="Rafra\xeechir les donn\xe9es", button_type="primary")\nrefresh_button.on_click(update_config_count)\n\n# Multi-s\xe9lecteur de configurations\nconfig_options = [\n        f"{config_aliases.get(config_hash)}"\n        for config_hash in config_df['Config_Hash'].unique()\n    ]\n#config_options = config_df['Config_Hash'].unique().tolist() if not config_df.empty else []\nconfig_selector = pn.widgets.MultiChoice(name="S\xe9lectionnez les configurations", options=config_options)\n\n# S\xe9lecteur de version Git\n#git_versions = git_version_df['Meta.Git version'].unique().tolist() if not git_version_df.empty else []\ngit_versions = config_df['Meta.Git version'].unique().tolist() if not config_df.empty else []\ngit_version_selector = pn.widgets.Select(name="S\xe9lectionnez la version Git", options=git_versions)\n\n# S\xe9lecteur des configs\nselect_all_button = pn.widgets.Button(name="Tout s\xe9lectionner", button_type="success")\nclear_button = pn.widgets.Button(name="Tout d\xe9s\xe9lectionner", button_type="warning")\n\nselect_all_button.on_click(select_all_configs)\nclear_button.on_click(clear_configs)\n\n# Layout du tableau de bord avec tout dans une colonne et des arri\xe8res-plans diff\xe9rents\ndashboard = pn.Column(\n    "# Tableau de Bord de Suivi des Commits",\n    pn.pane.HTML("<div style='background-color: #f0f0f0; padding: 10px;'><h2>Donn\xe9es</h2></div>"),\n    pn.Row(\n        pn.Column(pn.Row(config_count, git_version_count), last_commit_date, refresh_button),\n        sizing_mode="stretch_width"\n    ),\n    pn.pane.HTML("<div style='background-color: #e0e0e0; padding: 10px;'><h2>Statistiques des Commits</h2></div>"),\n    pn.Row(\n        pn.Column(git_version_selector, table_commit),\n        sizing_mode="stretch_width"\n    ),\n\n    #pn.Row(\n    #    pn.bind(plot_git_throughput, git_version_selector),\n    #    sizing_mode="stretch_width"\n    #    ), \n\n    pn.pane.HTML("<div style='background-color: #d0d0d0; padding: 10px;'><h2>Courbes et Graphiques</h2></div>"),\n    pn.Row(\n        pn.Column(select_all_button, clear_button),\n        pn.Column(config_selector),\n        sizing_mode="stretch_width"\n    ),    \n    pn.Row(\n        pn.bind(plot_performance_metrics, config_selector),\n        pn.bind(plot_task_data, config_selector),\n        sizing_mode="stretch_width"\n    )\n)\n\n#dashboard.save(filename='test_dashboard.html', embed=True)\n\n\n# Lancer le tableau de bord\nif args.local :\n    dashboard.show()\nelse :\n    dashboard.servable()\n\n\n\n\nawait write_doc()
  `

  try {
    const [docs_json, render_items, root_ids] = await self.pyodide.runPythonAsync(code)
    self.postMessage({
      type: 'render',
      docs_json: docs_json,
      render_items: render_items,
      root_ids: root_ids
    })
  } catch(e) {
    const traceback = `${e}`
    const tblines = traceback.split('\n')
    self.postMessage({
      type: 'status',
      msg: tblines[tblines.length-2]
    });
    throw e
  }
}

self.onmessage = async (event) => {
  const msg = event.data
  if (msg.type === 'rendered') {
    self.pyodide.runPythonAsync(`
    from panel.io.state import state
    from panel.io.pyodide import _link_docs_worker

    _link_docs_worker(state.curdoc, sendPatch, setter='js')
    `)
  } else if (msg.type === 'patch') {
    self.pyodide.globals.set('patch', msg.patch)
    self.pyodide.runPythonAsync(`
    from panel.io.pyodide import _convert_json_patch
    state.curdoc.apply_json_patch(_convert_json_patch(patch), setter='js')
    `)
    self.postMessage({type: 'idle'})
  } else if (msg.type === 'location') {
    self.pyodide.globals.set('location', msg.location)
    self.pyodide.runPythonAsync(`
    import json
    from panel.io.state import state
    from panel.util import edit_readonly
    if state.location:
        loc_data = json.loads(location)
        with edit_readonly(state.location):
            state.location.param.update({
                k: v for k, v in loc_data.items() if k in state.location.param
            })
    `)
  }
}

startApplication()