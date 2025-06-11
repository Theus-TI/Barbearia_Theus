@echo off
echo Configurando git...
git config --global user.name "WendersonBarboza"
git config --global user.email "wendersonbarboza@gmail.com"

echo Configurando remote...
git remote remove origin
git remote add origin https://github.com/WendersonBarboza/barbearia.git

echo Fazendo push...
git push -u origin main
