#!/usr/bin/env bash
# Deploy app to Renova EC2: SSH, git pull, npm ci, pm2 restart.
# Prereqs: AWS CLI configured, key pair .pem for the instance, stack RenovaEC2Stack deployed.
#
# Usage:
#   ./scripts/deploy-ec2.sh
#   EC2_HOST=1.2.3.4 SSH_KEY=~/.ssh/renova-ec2-deploy.pem ./scripts/deploy-ec2.sh
#
# First time on server: ensure repo is cloned at /var/app/renova-tu-ludoteca-back
# (clone manually or set GIT_REPO_URL and the script will clone if dir is empty).

set -e

STACK_NAME="${STACK_NAME:-RenovaEC2Stack}"
APP_DIR="${APP_DIR:-/var/app/renova-tu-ludoteca-back}"
SSH_USER="${SSH_USER:-ec2-user}"
BRANCH="${BRANCH:-main}"
# Optional: if set and APP_DIR is empty, clone this repo (e.g. https://github.com/you/renova-tu-ludoteca-back.git)
GIT_REPO_URL="${GIT_REPO_URL:-}"

if [[ -z "${EC2_HOST:-}" ]]; then
  echo "Resolving EC2 host from stack ${STACK_NAME}..."
  EC2_HOST=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey=='PublicIp'].OutputValue" \
    --output text 2>/dev/null || true)
  if [[ -z "$EC2_HOST" || "$EC2_HOST" == "None" ]]; then
    EC2_HOST=$(aws cloudformation describe-stacks \
      --stack-name "$STACK_NAME" \
      --query "Stacks[0].Outputs[?OutputKey=='PublicDnsName'].OutputValue" \
      --output text 2>/dev/null || true)
  fi
fi

if [[ -z "${EC2_HOST:-}" || "$EC2_HOST" == "None" ]]; then
  echo "Error: could not get EC2 host. Set EC2_HOST or deploy the stack and ensure PublicIp/PublicDnsName output exists."
  exit 1
fi

SSH_KEY="${SSH_KEY:-$HOME/.ssh/renova-ec2-deploy.pem}"
if [[ ! -f "$SSH_KEY" ]]; then
  echo "Error: SSH key not found at $SSH_KEY. Set SSH_KEY to your .pem path."
  exit 1
fi

echo "Deploying to $SSH_USER@$EC2_HOST (branch=$BRANCH, app_dir=$APP_DIR) ..."

ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 "$SSH_USER@$EC2_HOST" bash -s -- "$APP_DIR" "$BRANCH" "$GIT_REPO_URL" << 'REMOTE'
set -e
APP_DIR=$1
BRANCH=$2
GIT_REPO_URL=$3

if [[ ! -d "$APP_DIR" ]] || [[ ! -f "$APP_DIR/.git/HEAD" ]]; then
  if [[ -n "$GIT_REPO_URL" ]]; then
    echo "Cloning repo into $APP_DIR ..."
    sudo mkdir -p "$(dirname "$APP_DIR")"
    sudo chown "$USER:$(id -gn)" "$(dirname "$APP_DIR")"
    [[ -d "$APP_DIR" ]] && rm -rf "$APP_DIR"
    git clone "$GIT_REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
  else
    echo "Error: $APP_DIR does not exist or is not a git repo. Clone the repo there first or set GIT_REPO_URL."
    exit 1
  fi
else
  cd "$APP_DIR"
  git fetch origin
  git checkout "$BRANCH"
  git pull origin "$BRANCH"
fi

npm ci
npm run build
if [[ ! -f dist/server.js ]]; then
  echo "Error: dist/server.js not found after build. Ensure the repo has src/ and tsconfig.server.json (push your Express server code to GitHub)."
  exit 1
fi
if pm2 describe renova-api >/dev/null 2>&1; then
  pm2 restart renova-api --update-env
else
  pm2 start dist/server.js --name renova-api
fi
pm2 save 2>/dev/null || true
echo "Deploy done."
REMOTE

echo "Done."
