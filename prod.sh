#!/bin/bash

set -e

if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    echo "Ошибка: Вы не находитесь в Git репозитории"
    exit 1
fi

current_branch=$(git rev-parse --abbrev-ref HEAD)

trap "git checkout '$current_branch'" EXIT

git checkout prod
git pull local prod
git merge "$current_branch" --no-ff -m "deploy: merge $current_branch into prod"

git push local prod
git push origin prod

echo "Деплой завершен: $current_branch смержен в prod и запушен"
