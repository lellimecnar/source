# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it by emailing [security contact email]. Do **NOT** create a public GitHub issue.

We take security seriously and will respond to vulnerability reports within 48 hours.

---

## Environment Variable Management

### ✅ Secure Practices

1. **Never commit `.env` files** - All `.env` files (except `.env.example` templates) are automatically ignored by git
2. **Use `.env.example` templates** - Document required variables without exposing secrets
3. **Rotate compromised secrets immediately** - If a secret is accidentally committed, rotate it within 1 hour
4. **Use strong, unique values** - Generate cryptographically random secrets (minimum 32 characters)
5. **Limit secret access** - Use principle of least privilege for API tokens and keys

### ❌ Dangerous Practices

- Committing `.env` files to git
- Sharing secrets via Slack, email, or other plain-text channels
- Using weak or default secret values
- Reusing secrets across environments (dev, staging, production)
- Storing secrets in code comments or documentation

---

## Secret Storage Solutions

### For Local Development

- Copy `.env.example` to `.env` and fill in your secrets
- Store sensitive `.env` files in a password manager (1Password, Bitwarden, etc.)

### For Production

- **GitHub Actions**: Use GitHub Secrets (Settings → Secrets and variables → Actions)
- **Vercel**: Use Vercel Environment Variables (Project Settings → Environment Variables)
- **Recommended**: Use a dedicated secret management service:
  - [Doppler](https://www.doppler.com/)
  - [HashiCorp Vault](https://www.vaultproject.io/)
  - [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/)
  - [1Password Secrets Automation](https://1password.com/products/secrets/)

---

## Secret Rotation Procedures

### When to Rotate Secrets

Rotate secrets immediately if:

- A secret is committed to git (even if removed later)
- A secret is shared via insecure channel
- A team member with access leaves the project
- You suspect unauthorized access
- As part of regular security maintenance (every 90 days)

### How to Rotate Secrets

#### TURBO_TOKEN (Vercel Turbo Remote Cache)

1. Log in to [Vercel](https://vercel.com/)
2. Navigate to Account Settings → Tokens
3. Revoke the compromised token
4. Create a new token with same permissions
5. Update `.env` file locally
6. Update GitHub Secrets: Settings → Secrets → Actions → `TURBO_TOKEN`
7. Update team members

#### CONTEXT7_API_KEY

1. Log in to [Context7](https://context7.com/)
2. Navigate to Settings → API Keys
3. Revoke the compromised key
4. Generate a new API key
5. Update `.env` file locally
6. Update GitHub Secrets: Settings → Secrets → Actions → `CONTEXT7_API_KEY`

#### GITHUB_TOKEN

1. Log in to [GitHub](https://github.com/)
2. Navigate to Settings → Developer settings → Personal access tokens → Tokens (classic)
3. Delete the compromised token
4. Generate a new token with required scopes: `repo`, `workflow`
5. Update `.env` file locally
6. Update GitHub Secrets: Settings → Secrets → Actions → `GITHUB_TOKEN`

---

## Pre-commit Secret Scanning

This repository uses [Gitleaks](https://github.com/gitleaks/gitleaks) for automatic secret detection.

### How It Works

- Runs automatically before every commit
