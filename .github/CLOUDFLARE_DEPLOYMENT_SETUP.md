# Cloudflare Pages Deployment Setup Guide

This guide explains how to configure your GitHub repository for automatic deployment to Cloudflare Pages.

## Overview

The project uses GitHub Actions to automatically deploy to Cloudflare Pages when code is pushed to the `master` branch. The workflow includes:

1. **Linting** - Code quality checks
2. **Unit Tests** - Automated testing with coverage
3. **Deployment** - Build and deploy to Cloudflare Pages

## Prerequisites

- Cloudflare account with Pages access
- GitHub repository with admin access
- Cloudflare Pages project created (named: `10x-pull-up-trainer`)

## Required GitHub Secrets

You need to configure the following secrets in your GitHub repository under **Settings > Secrets and variables > Actions > Environments > production**:

### Cloudflare Secrets

| Secret Name | Description | How to Obtain |
|------------|-------------|---------------|
| `CLOUDFLARE_API_TOKEN` | API token with Pages write permissions | 1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)<br>2. Click "Create Token"<br>3. Use "Edit Cloudflare Workers" template<br>4. Add "Cloudflare Pages:Edit" permission<br>5. Copy the generated token |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare Account ID | 1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)<br>2. Select your domain/site<br>3. Find Account ID in the right sidebar |

### Supabase Secrets

| Secret Name | Description | How to Obtain |
|------------|-------------|---------------|
| `PUBLIC_SUPABASE_URL` | Your Supabase project URL | 1. Go to [Supabase Dashboard](https://supabase.com/dashboard)<br>2. Select your project<br>3. Go to Settings > API<br>4. Copy "Project URL" |
| `PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | 1. In Supabase Dashboard<br>2. Go to Settings > API<br>3. Copy "anon public" key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | 1. In Supabase Dashboard<br>2. Go to Settings > API<br>3. Copy "service_role" key<br>⚠️ **Keep this secret!** |

### Application Secrets

| Secret Name | Description | How to Obtain |
|------------|-------------|---------------|
| `OPENROUTER_API_KEY` | OpenRouter.ai API key | 1. Go to [OpenRouter.ai](https://openrouter.ai/)<br>2. Sign in or create account<br>3. Go to Keys section<br>4. Create new API key |
| `PUBLIC_APP_URL` | Production app URL | Your Cloudflare Pages URL<br>(e.g., `https://10x-pull-up-trainer.pages.dev`) |

## Step-by-Step Configuration

### 1. Create Cloudflare Pages Project

```bash
# Navigate to your project directory
cd /home/ppasek/projects/10xdevs-pull-up-trainer

# Login to Cloudflare (if not already logged in)
npx wrangler login

# Create Pages project (first time only)
npx wrangler pages project create 10x-pull-up-trainer
```

### 2. Configure GitHub Environment

1. Go to your GitHub repository
2. Navigate to **Settings > Environments**
3. Click **New environment**
4. Name it `production`
5. Click **Configure environment**

### 3. Add GitHub Secrets

For each secret listed above:

1. In the environment configuration page, scroll to **Environment secrets**
2. Click **Add secret**
3. Enter the secret name (e.g., `CLOUDFLARE_API_TOKEN`)
4. Paste the secret value
5. Click **Add secret**

### 4. Verify Workflow

After configuring all secrets:

1. Push a commit to the `master` branch
2. Go to **Actions** tab in your GitHub repository
3. You should see the "Master CI/CD" workflow running
4. Monitor the deployment progress

## Workflow File Details

The deployment workflow is defined in `.github/workflows/master.yml`:

- **Trigger**: Automatic on push to `master`
- **Node Version**: Uses version from `.nvmrc` (22.14.0)
- **Build Command**: `npm run build`
- **Deploy Target**: Cloudflare Pages project `10x-pull-up-trainer`
- **Branch**: `production` (Cloudflare Pages branch)

## Environment Variables in Build

The following environment variables are available during the build process:

- `PUBLIC_SUPABASE_URL` - Publicly accessible Supabase URL
- `PUBLIC_SUPABASE_ANON_KEY` - Publicly accessible Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Server-side only Supabase key
- `OPENROUTER_API_KEY` - Server-side only OpenRouter key
- `PUBLIC_APP_URL` - Application URL for CORS and redirects
- `PUBLIC_ENV_NAME` - Set to `prod` for production environment

## Troubleshooting

### Deployment Fails with "Project not found"

**Solution**: Create the Cloudflare Pages project first:
```bash
npx wrangler pages project create 10x-pull-up-trainer
```

### Deployment Fails with "Authentication error"

**Solution**: Verify that:
1. `CLOUDFLARE_API_TOKEN` has correct permissions (Cloudflare Pages:Edit)
2. `CLOUDFLARE_ACCOUNT_ID` matches your account
3. Token hasn't expired

### Build Fails with Missing Environment Variables

**Solution**: Ensure all required secrets are configured in the `production` environment in GitHub.

### Application Doesn't Load After Deployment

**Solution**: Check that:
1. `PUBLIC_APP_URL` matches your actual Cloudflare Pages URL
2. Supabase credentials are correct
3. Check browser console for errors

## Monitoring Deployments

### Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages**
3. Select `10x-pull-up-trainer`
4. View deployment history and logs

### GitHub Actions

1. Go to your repository's **Actions** tab
2. Select the workflow run
3. View detailed logs for each job

## Rollback Procedure

If a deployment causes issues:

1. Go to Cloudflare Dashboard > Workers & Pages > `10x-pull-up-trainer`
2. Click on **Deployments** tab
3. Find a previous working deployment
4. Click **...** menu > **Rollback to this deployment**

## Additional Resources

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Astro Cloudflare Adapter](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)

## Support

For issues or questions:
- Check [GitHub Issues](https://github.com/your-username/10xdevs-pull-up-trainer/issues)
- Review [Cloudflare Community](https://community.cloudflare.com/)
- Consult [Astro Discord](https://astro.build/chat)

