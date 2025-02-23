#!/bin/bash

# Check that nbstripout is installed
if ! [ -x "$(command -v nbstripout)" ]; then
  echo 'Error: nbstripout is not installed, need to create venv and install requirements-dev.txt' >&2
  exit 1
fi

# Get list of .ipynb files
files=$(git diff --cached --name-only --diff-filter=ACM | grep '\.ipynb$')

# Exit if there are no staged ipynb files
if [ -z "$files" ]; then
  exit 0
fi

echo $files

# Сheck if there is a need for formatting .ipynb files
nbstripout --verify $files

# Format files if required
if [ $? -ne 0 ]; then
  nbstripout $files
  echo "Files formatted via nbstripout. Stage and commit them again."
  exit 1
fi