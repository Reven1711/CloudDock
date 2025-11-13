# GitHub Setup Guide

## 🔐 Authentication

### Option 1: Personal Access Token (HTTPS)

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
   https://github.com/settings/tokens

2. Click "Generate new token (classic)"

3. Configure token:
   - Note: "CloudDock Project"
   - Expiration: Choose duration
   - Select scopes:
     - ✅ `repo` (Full control of private repositories)
     - ✅ `workflow` (Update GitHub Action workflows)

4. Generate token and **COPY IT** (you won't see it again!)

5. Use token when pushing:
   ```bash
   git push -u origin main
   # Username: your-github-username
   # Password: paste-your-token-here
   ```

### Option 2: SSH Key (Recommended for frequent use)

1. Generate SSH key:
   ```bash
   ssh-keygen -t ed25519 -C "your.email@example.com"
   # Press Enter to accept default location
   # Enter passphrase (optional)
   ```

2. Copy public key:
   ```bash
   # Windows (PowerShell)
   Get-Content ~/.ssh/id_ed25519.pub | Set-Clipboard
   
   # Or manually copy from:
   cat ~/.ssh/id_ed25519.pub
   ```

3. Add to GitHub:
   - Go to https://github.com/settings/keys
   - Click "New SSH key"
   - Paste your public key
   - Give it a title (e.g., "My Laptop")

4. Test connection:
   ```bash
   ssh -T git@github.com
   ```

5. Use SSH remote URL:
   ```bash
   git remote set-url origin git@github.com:yourusername/CloudDock.git
   ```

### Option 3: GitHub CLI (Easiest)

1. Install GitHub CLI: https://cli.github.com/

2. Authenticate:
   ```bash
   gh auth login
   # Follow prompts to authenticate
   ```

3. Create and push repository:
   ```bash
   gh repo create CloudDock --private --source=. --remote=origin --push
   ```

---

## 📦 Initial Setup Commands

```bash
# 1. Navigate to project
cd E:\SEM-7\cloud\project_cloud\CloudDock

# 2. Configure Git (if not done)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# 3. Check if Git is initialized
git status

# 4. If not initialized:
git init

# 5. Add remote (replace with YOUR URL)
git remote add origin https://github.com/yourusername/CloudDock.git

# 6. Create .gitignore (if not exists)
# See .gitignore template below

# 7. Stage all files
git add .

# 8. Commit
git commit -m "Initial commit: CloudDock microservices architecture"

# 9. Push to GitHub
git branch -M main
git push -u origin main
```

---

## 📝 Recommended .gitignore

```gitignore
# Dependencies
node_modules/
Backend/node_modules/
Frontend/node_modules/
Backend/microservices/*/node_modules/

# Environment Variables
.env
.env.local
.env.production
Backend/microservices/.env
Backend/microservices/*/.env
Backend/.env
Frontend/.env

# Build outputs
dist/
build/
out/
Backend/dist/
Frontend/dist/

# Logs
*.log
logs/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Docker
docker-compose.override.yml

# Testing
coverage/
.nyc_output/

# Temporary files
*.tmp
.cache/
```

---

## 🔄 Common Git Commands

```bash
# Check status
git status

# Stage specific file
git add filename.txt

# Stage all changes
git add .

# Commit with message
git commit -m "Your commit message"

# Push to GitHub
git push

# Pull latest changes
git pull

# Create new branch
git checkout -b feature-name

# Switch branches
git checkout main

# View commit history
git log --oneline

# View remotes
git remote -v
```

---

## 🚨 Important: Before First Push

### 1. Review .gitignore
Make sure `.env` files are NOT being committed:
```bash
git status
# Should NOT see .env files in the list
```

### 2. Remove Sensitive Files if Already Staged
```bash
# Remove from staging
git rm --cached Backend/microservices/.env
git rm --cached Backend/.env
git rm --cached Frontend/.env

# Add to .gitignore
echo .env >> .gitignore

# Commit the removal
git commit -m "Remove .env files from tracking"
```

### 3. Check File Size
Large files (>100MB) can cause issues:
```bash
# Check for large files
git ls-files | xargs ls -lh | sort -k5 -hr | head -20
```

---

## 🎯 Quick Start (After GitHub Repo Created)

```bash
# Windows CMD/PowerShell
cd E:\SEM-7\cloud\project_cloud\CloudDock

git init
git add .
git commit -m "Initial commit: CloudDock microservices"
git remote add origin https://github.com/yourusername/CloudDock.git
git branch -M main
git push -u origin main
```

---

## 📚 Additional Resources

- [GitHub Documentation](https://docs.github.com/)
- [Git Basics](https://git-scm.com/book/en/v2/Getting-Started-Git-Basics)
- [SSH Key Setup](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)
- [Personal Access Tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)

