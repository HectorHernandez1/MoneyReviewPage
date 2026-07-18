#!/bin/bash
# Auto-deploy script for budget app
# Pulls from GitHub, fixes server names, deploys to production
# Intended to run via cron every 5 minutes

LOCK_FILE="/tmp/budget-auto-deploy.lock"
STAGING_DIR="$HOME/deployment/budget"
STATUS_FILE="$STAGING_DIR/auto-deploy.status"
DEPLOY_DIR="/var/www/sites/budget"
PLACEHOLDER="your-server.local"
# Derived, not hardcoded — this script is committed to a public repo
REAL_HOSTNAME="$(hostname).local"

# Files that need hostname replacement
HOSTNAME_FILES=(
    "README.md"
    "deploy-production.sh"
    "manage-production.sh"
    "backend/main.py"
)

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Write a single-line status snapshot readable at a glance:
#   status "OK" "message"   or   status "FAILED" "reason"
status() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1 - $2" > "$STATUS_FILE"
}

# Log an error, record FAILED status, and exit non-zero.
fail() {
    log "ERROR: $1"
    status "FAILED" "$1"
    exit 1
}

cleanup() {
    rm -f "$LOCK_FILE"
}

# Acquire lock
if [ -f "$LOCK_FILE" ]; then
    # Check if the process that created the lock is still running
    LOCK_PID=$(cat "$LOCK_FILE" 2>/dev/null)
    if [ -n "$LOCK_PID" ] && kill -0 "$LOCK_PID" 2>/dev/null; then
        log "Another instance is running (PID $LOCK_PID). Exiting."
        exit 0
    else
        log "Stale lock file found. Removing."
        rm -f "$LOCK_FILE"
    fi
fi

echo $$ > "$LOCK_FILE"
trap cleanup EXIT

cd "$STAGING_DIR" || fail "Cannot cd to $STAGING_DIR"

# Fetch latest from origin
git fetch origin 2>&1

LOCAL_HEAD=$(git rev-parse HEAD)
REMOTE_HEAD=$(git rev-parse origin/main)

if [ "$LOCAL_HEAD" = "$REMOTE_HEAD" ]; then
    log "No new commits. Local and remote both at ${LOCAL_HEAD:0:7}."
    status "OK" "no new commits; at ${LOCAL_HEAD:0:7}"
    exit 0
fi

log "New commits detected. Local: ${LOCAL_HEAD:0:7} -> Remote: ${REMOTE_HEAD:0:7}"

# Force the working tree to match remote. We can't `git pull` because the
# hostname sed below edits tracked files, and those uncommitted edits would
# block a merge the moment an upstream commit touches the same files.
# The tree is disposable here (hostname is re-derived by sed every run),
# so hard-reset to origin/main instead.
git reset --hard origin/main 2>&1 || fail "git reset failed"

# Replace placeholder hostname with real hostname
for file in "${HOSTNAME_FILES[@]}"; do
    if [ -f "$file" ]; then
        if grep -q "$PLACEHOLDER" "$file"; then
            sed -i "s/$PLACEHOLDER/$REAL_HOSTNAME/g" "$file"
            log "Fixed hostname in $file"
        fi
    fi
done

# Stamp the deployed version from the staging checkout. Prod's own .git is
# stale (rsync excludes it), so nothing on the deploy target may ask git what
# version it is — this stamp is the truth. Written into staging so the rsync
# below carries it over, replacing any stale stamp from a previous deploy.
GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "")
if [ -n "$GIT_SHA" ]; then
    BUILD_NUM=$(git rev-list --count HEAD 2>/dev/null || echo "0")
    VERSION="v${BUILD_NUM}-${GIT_SHA}"
else
    VERSION="unknown"
fi
echo "$VERSION" > "$STAGING_DIR/VERSION"
log "Stamped version $VERSION"

# Copy files to production (exclude .git, logs, and the auto-deploy log)
log "Copying files to $DEPLOY_DIR..."
rsync -a --exclude='.git' --exclude='auto-deploy.log' --exclude='auto-deploy.status' --exclude='node_modules' \
    --exclude='venv' --exclude='.env' --exclude='build' \
    "$STAGING_DIR/" "$DEPLOY_DIR/" || fail "rsync to $DEPLOY_DIR failed"

# Build frontend
log "Building frontend..."
cd "$DEPLOY_DIR/frontend" || fail "Cannot cd to frontend dir"
npm install 2>&1 || fail "npm install failed"
REACT_APP_GIT_SHA="$VERSION" REACT_APP_BUILD_TIME="$(date '+%Y-%m-%d %H:%M')" \
    CI=false npm run build 2>&1 || fail "Frontend build failed"

# Restart backend
log "Restarting backend..."
cd "$DEPLOY_DIR/backend" || fail "Cannot cd to backend dir"
source venv/bin/activate
pip install -r requirements.txt -q 2>&1 || fail "pip install failed"
pm2 restart budget-backend 2>&1 || fail "pm2 restart failed"

# Reload nginx
log "Reloading nginx..."
sudo /usr/bin/systemctl reload nginx 2>&1 || fail "nginx reload failed"

DEPLOYED_AT=$(git -C "$STAGING_DIR" rev-parse --short HEAD)
log "Deploy complete. Now at $DEPLOYED_AT."
status "OK" "deployed $DEPLOYED_AT"
