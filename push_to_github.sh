#!/bin/bash

# Configurações do git
git config --global user.name "WendersonBarboza"
git config --global user.email "wendersonbarboza@gmail.com"

# Remove o remote existente e adiciona novamente
git remote remove origin
git remote add origin https://github.com/WendersonBarboza/barbearia.git

# Tenta fazer o push usando o token diretamente
git push -u origin main
