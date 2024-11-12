import pandas as pd
import panel as pn
from datetime import datetime
import os
import csv


#prépare la base de données Git
# la dernière colonne du log de Git contient des ",".

def format_git_log(git_version_csv_path, key) :

    with open(git_version_csv_path, "r", newline="") as fp:
        reader = csv.reader(fp, delimiter=",")
        rows = [x[:4] + [','.join(x[4:-1])] for x in reader] 
        git_df = pd.DataFrame(rows)
        
    new_header = git_df.iloc[0] #grab the first row for the header
    git_df = git_df[1:] #take the data less the header row
    git_df.columns = new_header #set the header row as the df header
    
    git_df["Project"] = key
    
    return git_df

database_path = "./comit_dashboard/database/"
log_affect_git_path  = database_path + 'log_commit_aff3ct.csv'  
log_streampu_git_path  = database_path + 'log_commit_streampu.csv'  

df_git_aff3ct = format_git_log(log_affect_git_path  , "Aff3ct")
df_git_spu    = format_git_log(log_streampu_git_path, "StreamPu")


df_git = pd.concat([df_git_aff3ct, df_git_spu], ignore_index=True)

df_git['date'] = pd.to_datetime(df_git['date'])  # Conversion au format datetime

df_git = df_git.reindex(['Project','date','contributor', 'echo sha', 'message' ], axis=1)



df_git.to_parquet(database_path + 'log_git.parquet',  engine="pyarrow")



