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
- Scans staged files for potential secrets
- Blocks the commit if secrets are detected
- Prevents accidental secret exposure

### If Your Commit is Blocked

```

❌ SECRET DETECTED! Commit blocked for security.

```

**Action steps:**

1. Remove the detected secret from your changes
2. If it's a real secret that was already committed, rotate it immediately
3. If it's a false positive (e.g., example code), update `.gitleaks.toml` allowlist
4. Try committing again

### Bypassing Secret Detection (DANGER)

**⚠️ Only use in emergencies and with team approval:**

```bash
git commit --no-verify -m "your message"
```

**Never bypass for actual secrets!**

---

## GitHub Actions Security Workflow

The `security.yml` workflow runs automatically on:

- Every push to any branch
- All pull requests to master/main
- Daily at 2 AM UTC (scheduled scan)

### What It Does

1. **Secret Scanning** - Scans entire git history with Gitleaks
2. **Dependency Scanning** - Checks for vulnerable dependencies with `pnpm audit`
3. **CodeQL Analysis** - Static analysis for JavaScript/TypeScript security issues
4. **SARIF Reporting** - Uploads findings to GitHub Security tab

### Viewing Results

- Go to repository → Security tab → Code scanning alerts
- Check GitHub Actions tab for detailed logs

---

## Incident Response

If a secret is exposed:

### Immediate Actions (Within 1 hour)

1. **Rotate the secret immediately** - Use procedures above
2. **Document the incident** - Create an issue with `security` label
3. **Notify the team** - Alert all team members via secure channel
4. **Assess impact** - Check logs for unauthorized usage

### Follow-up Actions (Within 24 hours)

1. **Purge from git history** - Use BFG Repo-Cleaner or git-filter-repo
2. **Review access logs** - Check if the exposed secret was used
3. **Update documentation** - Document lessons learned
4. **Conduct post-mortem** - Review how the exposure occurred

### Prevention

1. Enable GitHub secret scanning (Settings → Security → Code security)
2. Use pre-commit hooks (already configured in this repo)
3. Regular security training for team members
4. Quarterly secret rotation

---

## Security Checklist for Contributors

Before submitting a pull request:

- [ ] No secrets in code, comments, or commit messages
- [ ] All `.env` files are in `.gitignore`
- [ ] Environment variables use `.env.example` templates
- [ ] Pre-commit hooks are installed and working
- [ ] No hard-coded credentials or API keys
- [ ] Dependencies are up-to-date and vulnerability-free
- [ ] Security workflow passes all checks

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
- [Gitleaks Documentation](https://github.com/gitleaks/gitleaks)
- [pnpm Security](https://pnpm.io/security)

---

**Last Updated:** December 21, 2025
**Security Contact:** [Add your security contact email]
