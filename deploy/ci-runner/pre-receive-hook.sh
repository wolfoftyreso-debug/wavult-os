#!/bin/bash
# Gitea pre-receive hook — enforce GPG-signed commits on main/release
# Installation (on Gitea server):
#   cp pre-receive-hook.sh /path/to/gitea/data/gitea/repositories/wavult/wavult-os.git/hooks/pre-receive
#   chmod +x /path/to/gitea/data/gitea/repositories/wavult/wavult-os.git/hooks/pre-receive

while read oldrev newrev refname; do
  # Only check main and release branches
  if [[ "$refname" != "refs/heads/main" && "$refname" != "refs/heads/release" ]]; then
    continue
  fi

  echo "🔒 Checking GPG signatures on ${refname}..."

  # Get all new commits
  if [ "$oldrev" = "0000000000000000000000000000000000000000" ]; then
    COMMITS=$(git log --format="%H" "$newrev")
  else
    COMMITS=$(git log --format="%H" "$oldrev..$newrev")
  fi

  for commit in $COMMITS; do
    SIGNATURE=$(git log --format="%G?" -n 1 "$commit")
    case "$SIGNATURE" in
      "G") echo "✅ Commit $commit: Good GPG signature" ;;
      "U") echo "❌ Commit $commit: Untrusted GPG signature — REJECTED"; exit 1 ;;
      "N") echo "❌ Commit $commit: No GPG signature — REJECTED"
           echo "   Configure: git config --global commit.gpgsign true"
           echo "   Sign commits: git commit -S -m 'your message'"
           exit 1 ;;
      "E") echo "❌ Commit $commit: Signature error — REJECTED"; exit 1 ;;
      *)   echo "❌ Commit $commit: Unknown signature status '$SIGNATURE' — REJECTED"; exit 1 ;;
    esac
  done
done

echo "✅ All commits verified"
exit 0
