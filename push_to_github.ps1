$gitConfig = {
    git config --global user.name "WendersonBarboza"
    git config --global user.email "wendersonbarboza@gmail.com"
    git config --global credential.helper store
}

$gitConfig

# Remove existing remote and add new one
Remove-Item -Path ".git/config" -Force -ErrorAction SilentlyContinue

$gitRemote = {
    git remote add origin https://github.com/WendersonBarboza/barbearia.git
}

$gitRemote

# Push to GitHub
$gitPush = {
    git push -u origin main
}

$gitPush
