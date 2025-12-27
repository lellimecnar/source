# Branch Protection Rules

This document describes the required branch protection rules for the `master` branch to ensure code quality and prevent regressions.

## GitHub Repository Settings

Navigate to: **Settings → Branches → Add branch protection rule**

### Protected Branch: `master`

#### Require a pull request before merging

- [x] **Require approvals:** 1
- [x] **Dismiss stale pull request approvals when new commits are pushed**
- [x] **Require review from Code Owners** (optional, if CODEOWNERS file exists)

#### Require status checks to pass before merging

- [x] **Require branches to be up to date before merging**
- [x] **Status checks that are required:**
  - `quality` (CI / Quality Checks)
  - `test` (CI / Tests)
  - `build` (CI / Build)

#### Require conversation resolution before merging

- [x] **Require conversation resolution before merging**

#### Require linear history

- [x] **Require linear history** (recommended - enforces rebase or squash merging)

#### Do not allow bypassing the above settings

- [x] **Do not allow bypassing the above settings**
- [ ] **Allow specified actors to bypass** (optional - for emergency hotfixes)

## Additional Settings

### General Repository Settings

Navigate to: **Settings → General**

#### Pull Requests

- [x] **Allow squash merging**
- [x] **Default to pull request title**
- [x] **Allow merge commits** (optional)
- [x] **Allow rebase merging**
- [x] **Automatically delete head branches**

### Actions Settings

Navigate to: **Settings → Actions → General**

#### Workflow permissions

- [x] **Read and write permissions** (required for Changesets to create PRs)
- [x] **Allow GitHub Actions to create and approve pull requests**

## Environment Variables & Secrets

Navigate to: **Settings → Secrets and variables → Actions**

### Required Secrets

None required initially. The `GITHUB_TOKEN` is automatically provided.

### Optional Secrets (for future enhancements)

- `TURBO_TOKEN` - For Vercel Remote Caching
- `VERCEL_TOKEN` - For preview deployments
- `CONTEXT7_API_KEY` - If needed in CI

## Enabling Branch Protection

1. Go to your GitHub repository
2. Navigate to **Settings → Branches**
3. Click **Add branch protection rule**
4. Set branch name pattern: `master`
5. Enable all checkboxes as described above
6. Under "Require status checks to pass before merging", search and add:
   - `quality`
   - `test`
   - `build`
7. Click **Create** or **Save changes**

## Verifying Branch Protection

1. Create a test branch and make a small change
2. Open a pull request to `master`
3. Verify that:
   - All CI checks run automatically
   - You cannot merge until all checks pass
   - The merge button shows "Merge blocked" until checks complete
   - Reviewers can see all status check results

## Notes

- Start with permissive settings and tighten over time as the team adapts
- Consider requiring code owners for critical packages
- The "linear history" setting is recommended but optional
- Coverage workflow is informational only and not required for merge
