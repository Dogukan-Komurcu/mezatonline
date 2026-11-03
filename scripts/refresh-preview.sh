#!/bin/zsh
# Tek tıkla açılan önizlemeyi (Mezatonline-Ac.html) master'ın son commit'inden yeniler.
# Commit ve pull sonrası git kancası arka planda çalıştırır; kurmak için: scripts/refresh-preview.sh --install
# Derleme ayrı bir kopyada yapılır: çalışma klasöründeki kaydedilmemiş değişiklikler önizlemeye girmez.

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE GIT_PREFIX

REPO="$(cd "$(dirname "$0")/.." && git rev-parse --path-format=absolute --git-common-dir)"
REPO="${REPO:h}"
CACHE="$HOME/Library/Caches/mezatonline-preview"
TREE="$CACHE/tree"
LOCK="$CACHE/lock"
LOG="$HOME/Library/Logs/mezatonline-preview.log"
TARGETS=("$REPO/Mezatonline-Ac.html" "$HOME/Desktop/DogukanMezatonline/Mezatonline-Ac.html")

if [[ "$1" == "--install" ]]; then
  HOOKS="$REPO/.git/hooks"
  for hook in post-commit post-merge; do
    print -r -- '#!/bin/sh
# Mezatonline: master değişince tek tıkla açılan önizlemeyi arka planda yeniler
nohup /bin/zsh "$(git rev-parse --path-format=absolute --git-common-dir)/../scripts/refresh-preview.sh" >/dev/null 2>&1 &' > "$HOOKS/$hook"
    chmod +x "$HOOKS/$hook"
  done
  print "Kancalar kuruldu: $HOOKS/post-commit, post-merge"
  exit 0
fi

mkdir -p "$CACHE" "${LOG:h}"
# Aynı anda tek derleme: devam eden derleme bitince master'ı yeniden kontrol eder
mkdir "$LOCK" 2>/dev/null || exit 0
trap 'rmdir "$LOCK" 2>/dev/null' EXIT

notify_failure() {
  osascript -e 'display notification "Son değişiklikler önizlemeye girmedi. Ayrıntı: ~/Library/Logs/mezatonline-preview.log" with title "Mezatonline önizlemesi yenilenemedi"' 2>/dev/null
}

exec >> "$LOG" 2>&1
while true; do
  SHA="$(git -C "$REPO" rev-parse master)" || exit 1
  [[ "$(cat "$CACHE/built-sha" 2>/dev/null)" == "$SHA" && "$1" != "--force" ]] && exit 0
  print "$(date '+%F %T') derleme başladı: $SHA"

  [[ -e "$TREE/.git" ]] || git -C "$REPO" worktree add --detach "$TREE" "$SHA" || { notify_failure; exit 1; }
  git -C "$TREE" checkout --detach --force "$SHA" || { notify_failure; exit 1; }
  # node_modules kilit dosyası değişince yenilenir; APFS kopyası ek disk yeri kaplamaz
  if ! cmp -s "$REPO/package-lock.json" "$CACHE/package-lock.json"; then
    rm -rf "$TREE/node_modules"
    cp -cR "$REPO/node_modules" "$TREE/node_modules" || { notify_failure; exit 1; }
    cp "$REPO/package-lock.json" "$CACHE/package-lock.json"
  fi

  if ! (cd "$TREE" && node scripts/build-preview.mjs); then
    print "$(date '+%F %T') derleme başarısız: $SHA"
    notify_failure
    exit 1
  fi

  # Yarım dosya açılmasın: önce kopyala, sonra tek hamlede yerine koy
  for target in $TARGETS; do
    [[ -d "${target:h}" ]] || continue
    cp "$TREE/Mezatonline-Ac.html" "$target.tmp" && mv -f "$target.tmp" "$target"
  done
  print -r -- "$SHA" > "$CACHE/built-sha"
  print "$(date '+%F %T') tamam: $SHA"
  set -- ""
done
