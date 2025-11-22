#!/bin/bash
# Initialize conda
eval "$(/opt/miniconda3/bin/conda shell.bash hook)"
conda activate budget-env

cd backend
pip install -r requirements.txt
python main.py