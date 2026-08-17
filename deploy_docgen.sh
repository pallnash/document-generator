#!/bin/bash
# Запускать на сервере (tmdata@10.10.0.177).
#
# Раздельно staging и runtime — тот же паттерн, что у filter-app/filter-app-graphs
# (deploy_frontend.sh): git-чекаут, node_modules, npm install/build живут в
# STAGING_DIR (обычный домашний путь, не /opt), а в RUNTIME_DIR (/opt/tmdata-frontend/docgen,
# откуда systemd реально запускает node) попадает только собранный рантайм через
# rsync --delete — без .git/src/dev-файлов. esbuild собирает server.ts с
# --packages=external (см. package.json), поэтому в рантайме, помимо dist/,
# нужен ещё и node_modules — просто рсинкнуть dist/ недостаточно, сервер не найдёт
# express и т.п.

set -e

GIT_REMOTE="local"
GIT_URL="ssh://wms@10.10.0.165/home/wms/git-repos/tmdata/doc-generator.git"
STAGING_DIR="/home/tmdata/develop/frontend/doc-generator"
RUNTIME_DIR="/opt/tmdata-frontend/docgen"

echo "=== DOC-GENERATOR DEPLOY: $(date) ==="

if [[ ! -d "$STAGING_DIR/.git" ]]; then
    echo "→ Первичный чекаут в $STAGING_DIR..."
    mkdir -p "$(dirname "$STAGING_DIR")"
    git clone -o "$GIT_REMOTE" "$GIT_URL" "$STAGING_DIR"
    cd "$STAGING_DIR"
    git checkout prod
else
    cd "$STAGING_DIR"
fi

echo "→ Обновление кода..."
git pull "$GIT_REMOTE" prod
echo "  ✓ $(git log -1 --oneline)"

if ! command -v node &>/dev/null; then
    echo "ОШИБКА: Node.js не установлен"
    exit 1
fi

echo "→ Установка зависимостей и сборка..."
npm install
npm run build
echo "  ✓ Сборка завершена"

echo "→ Синхронизация рантайма в $RUNTIME_DIR..."
mkdir -p "$RUNTIME_DIR"
# --delete с несколькими source-аргументами чистит только ВНУТРИ dist/node_modules,
# а не посторонние top-level файлы назначения (.git, src, *.md...) — им просто неоткуда
# взяться среди источников, поэтому --delete их не видит. Include/exclude-фильтр на
# едином source ($STAGING_DIR/) — единственный способ реально удалить всё лишнее.
rsync -a --delete \
    --include='/dist/' --include='/dist/**' \
    --include='/node_modules/' --include='/node_modules/**' \
    --include='/package.json' \
    --exclude='*' \
    "$STAGING_DIR/" "$RUNTIME_DIR/"
echo "  ✓ Рантайм синхронизирован (dist/, node_modules/, package.json — без .git/src/dev-файлов)"

# Синхронизация systemd-юнита с репозиторием — без этого правки в
# systemd/docgen.service остаются только в git, живой /etc/systemd/system/docgen.service
# не обновляется сам по себе (та же ловушка, на которой уже спотыкались с nginx.conf:
# источник в репо и то, что реально применено, — разные файлы, если их не синхронизировать).
echo "→ Синхронизация systemd-юнита..."
sudo mkdir -p /var/log/tmdata
sudo chown -R tmdata:tmdata /var/log/tmdata
if ! sudo cmp -s systemd/docgen.service /etc/systemd/system/docgen.service; then
    sudo cp systemd/docgen.service /etc/systemd/system/docgen.service
    sudo systemctl daemon-reload
    echo "  ✓ Юнит обновлён"
else
    echo "  ✓ Юнит не изменился"
fi
sudo systemctl enable docgen >/dev/null 2>&1 || true

echo "→ Перезапуск сервиса..."
sudo systemctl restart docgen
sleep 1
sudo systemctl status docgen --no-pager -l || true

echo "=== DOC-GENERATOR DEPLOY DONE: $(date) ==="
